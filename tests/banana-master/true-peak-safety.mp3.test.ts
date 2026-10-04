import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";
import { expect, it } from "vitest";
import { analyzeAudio } from "../../src/banana-master/analysis/analyzeAudio";
import { measureTruePeak } from "../../src/banana-master/analysis/truePeak/truePeak";
import type { AudioData } from "../../src/banana-master/audio/audioTypes";
import { buildFormalMasterPlan } from "../../src/banana-master/decision/formalDecision";
import { toDecisionInputs } from "../../src/banana-master/decision/decisionInputs";
import { executeFormalPlan } from "../../src/banana-master/dsp/formalDsp";
import { encodeWav } from "../../src/banana-master/export/wavEncoder";
import { verifyFormalMaster } from "../../src/banana-master/render/verifyFormalMaster";

const root = resolve(process.cwd());
const output = join(root, "reports", "banana-master", "true-peak-safety");
const source = join(root, "reports", "banana-master", "true-peak-audit", "measurements.json");
const names = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"] as const;
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
function gcd(a: number, b: number): number { while (b) [a, b] = [b, a % b]; return a; }
// Identical evaluation resampler to calibration-phase2 (24-tap windowed sinc).
function resampleChannel(source: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === 48000) return source;
  const count = Math.round(source.length * 48000 / sourceRate), target = new Float32Array(count);
  const radius = 12, cutoff = Math.min(1, 48000 / sourceRate), divisor = gcd(sourceRate, 48000);
  const numerator = sourceRate / divisor, denominator = 48000 / divisor;
  const kernels = Array.from({ length: denominator }, (_, phase) => Float64Array.from({ length: radius * 2 }, (_, index) => {
    const distance = phase / denominator - (index - radius + 1);
    return cutoff * sinc(distance * cutoff) * sinc(distance / radius);
  }));
  for (let i = 0; i < count; i++) {
    const scaled = i * numerator, center = Math.floor(scaled / denominator), weights = kernels[scaled % denominator];
    let sum = 0, weight = 0;
    for (let index = 0; index < radius * 2; index++) {
      const tap = center + index - radius + 1;
      if (tap < 0 || tap >= source.length) continue;
      const kernel = weights[index]; sum += source[tap] * kernel; weight += kernel;
    }
    target[i] = weight ? sum / weight : 0;
  }
  return target;
}
const pcmHash = (audio: AudioData) => audio.channels.map((channel) => sha(new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength)));

it.skipIf(process.env.BANANA_TP_SAFETY_MP3_RUN !== "1")("reprocesses audited highest five MP3s including the final 0.82 seconds", async () => {
  const audit = JSON.parse(readFileSync(source, "utf8")) as { inputRoot: string; representative: {
    trackId: string; relativePath: string; inputSha256: string; appAt48k: { truePeakDbTp: number } }[] };
  const selected = audit.representative.slice(0, 5);
  expect(selected).toHaveLength(5);
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const rows: Record<string, unknown>[] = [];
  mkdirSync(output, { recursive: true });
  try {
    for (const item of selected) {
      const path = resolve(audit.inputRoot, item.relativePath);
      expect(path.startsWith(resolve(audit.inputRoot) + "\\")).toBe(true);
      const bytes = readFileSync(path);
      expect(sha(bytes)).toBe(item.inputSha256);
      const decoded = decoder.decode(bytes);
      expect(decoded.errors.length, item.trackId).toBe(0);
      const original: AudioData = { sampleRate: 48000,
        channels: decoded.channelData.map((channel: Float32Array) => resampleChannel(channel, decoded.sampleRate)) };
      await decoder.reset();
      const originalHash = pcmHash(original);
      const pre = analyzeAudio(original), plan = buildFormalMasterPlan(toDecisionInputs(pre));
      const { master, execution } = executeFormalPlan(original, plan, pre, decoded.errors.length);
      const post = analyzeAudio(master), verification = verifyFormalMaster(master, pre, post, execution);
      const gain = 10 ** (execution.peakProtection.appliedGainDb / 20);
      const beforeSafety: AudioData = gain === 1 ? master : { sampleRate: 48000,
        channels: master.channels.map((channel) => Float32Array.from(channel, (value) => value / gain)) };
      const beforeSafetyAnalysis = gain === 1 ? post : analyzeAudio(beforeSafety);
      const detectorChanges = names.filter((name) => beforeSafetyAnalysis.artifacts[name].status !== post.artifacts[name].status
        || beforeSafetyAnalysis.artifacts[name].detected !== post.artifacts[name].detected);
      const wav = encodeWav(master);
      const first = new Uint8Array(await wav.slice(44, 50).arrayBuffer());
      expect(first.length).toBe(6);
      const tailStart = Math.max(0, original.channels[0].length - Math.ceil(0.82 * 48000));
      const inputTail = measureTruePeak({ sampleRate: 48000, channels: original.channels.map((channel) => channel.subarray(tailStart)) });
      const finalTail = measureTruePeak({ sampleRate: 48000, channels: master.channels.map((channel) => channel.subarray(tailStart)) });
      const row = { trackId: item.trackId, relativePath: item.relativePath, inputSha256: item.inputSha256,
        durationSeconds: original.channels[0].length / 48000,
        originalPcmUnchanged: JSON.stringify(pcmHash(original)) === JSON.stringify(originalHash),
        inputTruePeakDbTp: pre.truePeak.status === "valid" ? pre.truePeak.truePeakDbTp : null,
        preSafetyTruePeakDbTp: execution.peakProtection.preSafetyTruePeakDbTp,
        appliedSafetyGainDb: execution.peakProtection.appliedGainDb,
        finalTruePeakDbTp: post.truePeak.status === "valid" ? post.truePeak.truePeakDbTp : null,
        finalSamplePeak: post.basic.samplePeak, clippingSamples: post.basic.clippingSamples,
        inputTailTruePeakDbTp: inputTail.status === "valid" ? inputTail.truePeakDbTp : null,
        finalTailTruePeakDbTp: finalTail.status === "valid" ? finalTail.truePeakDbTp : null,
        ceilingDbTp: execution.peakProtection.ceilingDbTp, verificationStatus: execution.peakProtection.verificationStatus,
        outputVerified: verification.success, decoderWarningCount: decoded.errors.length,
        detectorChangesFromSafety: detectorChanges, wavBytes: wav.size };
      rows.push(row);
      writeFileSync(join(output, "top5-mpg123.json"), JSON.stringify({ source: "mpg123-decoder plus calibration-phase2 sinc-24", tracks: rows }, null, 2) + "\n");
      expect(row.inputTruePeakDbTp, item.trackId).toBeCloseTo(item.appAt48k.truePeakDbTp, 2);
      expect(row.originalPcmUnchanged, item.trackId).toBe(true);
      expect(row.outputVerified, item.trackId).toBe(true);
      expect(row.finalTruePeakDbTp, item.trackId).toBeLessThanOrEqual(-1);
      expect(row.finalSamplePeak, item.trackId).toBeLessThan(1);
      expect(row.clippingSamples, item.trackId).toBe(0);
      expect(detectorChanges, item.trackId).toEqual([]);
      if (item.trackId === "track-0036") {
        expect(row.inputTailTruePeakDbTp).toBeGreaterThan(10);
        expect(row.finalTailTruePeakDbTp).toBeLessThanOrEqual(-1);
      }
      process.stdout.write(`True Peak safety top MP3 ${rows.length}/5\n`);
    }
  } finally { decoder.free(); }
}, 900_000);

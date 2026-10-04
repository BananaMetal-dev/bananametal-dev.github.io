import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { expect, it } from "vitest";
import { analyzeAudio } from "../../src/banana-master/analysis/analyzeAudio";
import type { AudioData } from "../../src/banana-master/audio/audioTypes";
import { buildFormalMasterPlan } from "../../src/banana-master/decision/formalDecision";
import { toDecisionInputs } from "../../src/banana-master/decision/decisionInputs";
import { executeFormalPlan } from "../../src/banana-master/dsp/formalDsp";
import { encodeWav } from "../../src/banana-master/export/wavEncoder";
import { verifyFormalMaster } from "../../src/banana-master/render/verifyFormalMaster";
import { readPcm16WavPath } from "./fixture";

const base = resolve(process.cwd(), "reports/banana-master/real-tracks-v1");
const output = resolve(process.cwd(), "reports/banana-master/true-peak-safety");
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const detectorNames = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"] as const;

it.skipIf(process.env.BANANA_TP_SAFETY_RUN !== "1")("reprocesses the same 20 SHA-256 inputs with True Peak safety", async () => {
  const selection = JSON.parse(readFileSync(join(base, "selection.json"), "utf8")) as { sourceRoot: string; tracks: string[] };
  const previous = JSON.parse(readFileSync(join(base, "findings.json"), "utf8")) as { tracks: { inputSha256: string; filename: string }[] };
  expect(selection.tracks).toHaveLength(20);
  expect(previous.tracks).toHaveLength(20);
  mkdirSync(output, { recursive: true });
  const rows: Record<string, unknown>[] = [];
  for (const [index, relative] of selection.tracks.entries()) {
    const path = resolve(selection.sourceRoot, relative);
    expect(path.startsWith(resolve(selection.sourceRoot) + "\\")).toBe(true);
    expect(existsSync(path)).toBe(true);
    const bytes = readFileSync(path), inputSha256 = hash(bytes);
    expect(inputSha256, `${index + 1} input hash`).toBe(previous.tracks[index].inputSha256);
    const original = readPcm16WavPath(path);
    const pcmHash = (audio: AudioData) => audio.channels.map((channel) =>
      hash(new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength)));
    const originalHashBefore = pcmHash(original);
    const pre = analyzeAudio(original), plan = buildFormalMasterPlan(toDecisionInputs(pre));
    const { master, execution } = executeFormalPlan(original, plan, pre, 0);
    const post = analyzeAudio(master), verification = verifyFormalMaster(master, pre, post, execution);
    const gain = 10 ** (execution.peakProtection.appliedGainDb / 20);
    const preSafety: AudioData = gain === 1 ? master : { sampleRate: master.sampleRate,
      channels: master.channels.map((channel) => Float32Array.from(channel, (value) => value / gain)) };
    const beforeSafety = gain === 1 ? post : analyzeAudio(preSafety);
    const detectorChanges = detectorNames.filter((name) => beforeSafety.artifacts[name].status !== post.artifacts[name].status
      || beforeSafety.artifacts[name].detected !== post.artifacts[name].detected);
    const wav = encodeWav(master);
    expect(wav.size).toBe(44 + master.channels[0].length * 6);
    const sampleChecks: number[] = [];
    for (const frame of [0, 1, 1000, Math.floor(master.channels[0].length / 2), master.channels[0].length - 1]) {
      const part = new Uint8Array(await wav.slice(44 + frame * 6, 44 + frame * 6 + 6).arrayBuffer());
      for (let channel = 0; channel < 2; channel++) {
        let value = part[channel * 3] | (part[channel * 3 + 1] << 8) | (part[channel * 3 + 2] << 16);
        if (value & 0x800000) value -= 0x1000000;
        const source = master.channels[channel][frame];
        const expected = Math.round(source * (source < 0 ? 8388608 : 8388607));
        expect(value).toBe(expected);
        sampleChecks.push(frame);
      }
    }
    const row = { index: index + 1, filename: basename(path), inputSha256,
      originalPcmUnchanged: JSON.stringify(pcmHash(original)) === JSON.stringify(originalHashBefore),
      preTruePeakDbTp: pre.truePeak.status === "valid" ? pre.truePeak.truePeakDbTp : null,
      preSafetyTruePeakDbTp: execution.peakProtection.preSafetyTruePeakDbTp,
      appliedSafetyGainDb: execution.peakProtection.appliedGainDb,
      finalTruePeakDbTp: post.truePeak.status === "valid" ? post.truePeak.truePeakDbTp : null,
      finalSamplePeak: post.basic.samplePeak, clippingSamples: post.basic.clippingSamples,
      ceilingDbTp: execution.peakProtection.ceilingDbTp, verificationStatus: execution.peakProtection.verificationStatus,
      outputVerified: verification.success, decoderWarning: execution.peakProtection.decoderWarning,
      plannedActions: plan.actions.map((action) => action.kind), appliedActions: execution.actions.filter((action) => action.status === "applied").map((action) => action.kind),
      detectorChangesFromSafety: detectorChanges, wavBytes: wav.size, checkedPcm24Samples: sampleChecks.length };
    rows.push(row);
    writeFileSync(join(output, "real20.json"), JSON.stringify({ dataset: "same-input-sha256-real20", tracks: rows }, null, 2) + "\n");
    expect(row.originalPcmUnchanged, row.filename).toBe(true);
    expect(row.outputVerified, row.filename).toBe(true);
    expect(row.finalSamplePeak, row.filename).toBeLessThan(1);
    expect(row.clippingSamples, row.filename).toBe(0);
    expect(row.finalTruePeakDbTp, row.filename).toBeLessThanOrEqual(-1);
    expect(detectorChanges, row.filename).toEqual([]);
    process.stdout.write(`True Peak safety real ${index + 1}/20\n`);
  }
}, 900_000);

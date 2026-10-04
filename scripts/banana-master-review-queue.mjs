#!/usr/bin/env node
// Second-stage, review-only feature scan. It never changes formal detector thresholds.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const root = resolve(process.cwd());
const reportDir = join(root, "reports", "banana-master", "calibration-phase2");
const read = (name) => JSON.parse(readFileSync(join(reportDir, name), "utf8"));
const save = (name, value) => writeFileSync(join(reportDir, name), JSON.stringify(value, null, 2) + "\n");
const inventory = read("inventory.json"), screening = read("screening-results.json"), selection = read("candidate-selection.json");
const byId = new Map(screening.tracks.map((row) => [row.trackId, row]));
const groups = [
  ["strongPositive", "anomaly", "Detector positive; listen to decide whether the symptom is audible."],
  ["possibleMissedArtifacts", "possible-missed", "Formal detectors are negative but a sampled local score is elevated; this is not a confirmed miss."],
  ["thresholdBoundary", "boundary", "Persistence evidence is near a detector gate; listen on both sides of the threshold."],
  ["cleanControl", "clean-control", "Detector negative and near middle of loudness distribution; normality is unconfirmed."],
  ["dynamicQuiet", "dynamic-quiet", "Relatively quiet track; evaluate underrepresented material."],
];
const persistenceGates = { highBandExcess: 0.3, hfSmear: 0.25, metallicRinging: 0.08,
  hfHiss: 0.25, mud: 0.3, boom: 0.3, harshness: 0.3, lowBandPhase: 0.2 };
const queue = [];
for (const [group, kind, reason] of groups) for (const trackId of selection[group]) {
  const row = byId.get(trackId);
  if (!row) continue;
  let detector = Object.entries(row.analysis.detectors).filter(([, value]) => value.status === "valid")
    .sort((a, b) => (b[1].severity ?? 0) - (a[1].severity ?? 0))[0];
  let selectionReason = reason;
  if (kind === "boundary") {
    const nearest = Object.entries(persistenceGates).map(([name, gate]) => {
      const result = row.analysis.detectors[name], value = result.evidence[name === "lowBandPhase" ? "antiPhasePersistence" : "persistence"];
      return { name, gate, value, distance: result.status === "valid" && result.confidence >= 0.6 && typeof value === "number"
        ? Math.abs(value - gate) : Infinity };
    }).sort((a, b) => a.distance - b.distance)[0];
    if (nearest?.distance <= 0.05) {
      detector = [nearest.name, row.analysis.detectors[nearest.name]];
      selectionReason += ` ${nearest.name} persistence ${nearest.value.toFixed(3)} vs gate ${nearest.gate.toFixed(3)}.`;
    }
  }
  if (kind === "possible-missed") {
    const local = ["hfSmear", "metallicRinging", "harshness"].map((name) => ({ name, result: row.analysis.detectors[name],
      peak: [...(row.analysis.detectors[name].timeline ?? [])].sort((a, b) => b.score - a.score)[0] }))
      .sort((a, b) => (b.peak?.score ?? 0) - (a.peak?.score ?? 0))[0];
    if (local?.peak) detector = [local.name, local.result];
  }
  const timeline = detector?.[1].timeline ?? [];
  const peak = [...timeline].sort((a, b) => b.score - a.score)[0];
  const center = peak?.time ?? row.durationSeconds / 2;
  const clipStart = Math.max(0, Math.min(center - 8, row.durationSeconds - 16));
  queue.push({ id: `review-${String(queue.length + 1).padStart(3, "0")}`, trackId, fileHash: row.sha256,
    filename: row.filename, relativePath: row.relativePath, timeRange: { startSeconds: clipStart, endSeconds: Math.min(row.durationSeconds, clipStart + 16) },
    candidateType: kind, symptomType: detector?.[0] ?? "unknown", severity: detector?.[1].severity ?? null,
    confidence: detector?.[1].confidence ?? null, evidence: detector?.[1].evidence ?? {},
    selectionReason, reviewStatus: "Unreviewed", datasetRole: queue.length % 5 === 4 ? "holdout" : "calibration" });
}
// Stage two: the selected tracks get three short, dense windows (beginning, middle, end).
// Window-relative extraction uses every nominal 1024-sample hop for <=20 s windows.
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom" });
const { extractSpectralFeatures, NOMINAL_HOP, FFT_SIZE } = await vite.ssrLoadModule("/src/banana-master/analysis/artifacts/features.ts");
const decoder = new MPEGDecoder(); await decoder.ready;
const dense = [];
const denseSkipped = [];
const sinc = (x) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function resample(source, sourceRate) {
  if (sourceRate === 48000) return source;
  const count = Math.round(source.length * 48000 / sourceRate), output = new Float32Array(count);
  const radius = 12, cutoff = Math.min(1, 48000 / sourceRate);
  const divisor = gcd(sourceRate, 48000), numerator = sourceRate / divisor, denominator = 48000 / divisor;
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
      sum += source[tap] * weights[index]; weight += weights[index];
    }
    output[i] = weight ? sum / weight : 0;
  }
  return output;
}
function score(frame) {
  const hfContrast = frame.hfDb - frame.midDb;
  const burst = Math.max(0, Math.min(1, (hfContrast + 10) / 18)) * Math.max(0, Math.min(1, frame.hfFlux / 0.5));
  const ring = frame.ringProminenceDb >= 15 && frame.ringWidthHz <= 100 && frame.ringToMidDb > 0
    ? Math.max(0, Math.min(1, (frame.ringProminenceDb - 15) / 20)) : 0;
  return { total: Math.max(burst, ring), kind: ring > burst ? "short-ringing-candidate"
    : hfContrast > 0 && frame.hfFlux > 0.7 ? "short-hf-burst" : "transient-hf-candidate", hfContrast, burst, ring };
}
try {
  for (const item of queue.filter((item) => ["anomaly", "possible-missed", "boundary"].includes(item.candidateType))) {
    const row = byId.get(item.trackId);
    if (row?.format !== "mp3") { denseSkipped.push({ trackId: item.trackId, reason: "dense-MP3-path-unavailable" }); continue; }
    const decoded = decoder.decode(readFileSync(join(inventory.inputRoot, row.relativePath)));
    if (decoded.channelData.length !== 2) { await decoder.reset(); continue; }
    const suspectTime = (item.timeRange.startSeconds + item.timeRange.endSeconds) / 2;
    const windows = [...new Set([0, Math.max(0, row.durationSeconds / 2 - 10),
      Math.max(0, row.durationSeconds - 20), Math.max(0, Math.min(row.durationSeconds - 20, suspectTime - 10))]
      .map((value) => Math.round(value * 1000) / 1000))];
    let best = null;
    const windowSummaries = [];
    for (const start of windows) {
      const from = Math.floor(start * decoded.sampleRate), length = Math.min(Math.floor(20 * decoded.sampleRate), decoded.samplesDecoded - from);
      if (length < FFT_SIZE) continue;
      const channels = decoded.channelData.map((channel) => resample(channel.subarray(from, from + length), decoded.sampleRate));
      const features = extractSpectralFeatures({ sampleRate: 48000, channels });
      const active = features.frames.filter((frame) => frame.rmsDb >= features.rmsFloorDb);
      if (active.length) windowSummaries.push({ start, meanHfToMidDb: active.reduce((sum, frame) => sum + frame.hfDb - frame.midDb, 0) / active.length });
      for (const frame of features.frames) {
        const metric = score(frame);
        if (!best || metric.total > best.severity) best = { timeSeconds: start + frame.time, severity: metric.total,
          candidateType: metric.kind, evidence: { hfToMidDb: metric.hfContrast, hfFlux: frame.hfFlux,
            ringProminenceDb: frame.ringProminenceDb, ringWidthHz: frame.ringWidthHz, ringToMidDb: frame.ringToMidDb,
            analysisWindowStartSeconds: start, fftSize: FFT_SIZE, hopSamples: NOMINAL_HOP,
            frameIntervalSeconds: NOMINAL_HOP / 48000, windowDurationSeconds: FFT_SIZE / 48000 } };
      }
    }
    if (windowSummaries.length >= 2) {
      const ordered = [...windowSummaries].sort((a, b) => a.meanHfToMidDb - b.meanHfToMidDb);
      const hottest = ordered[ordered.length - 1], baseline = ordered[Math.floor((ordered.length - 1) / 2)];
      const contrast = hottest.meanHfToMidDb - baseline.meanHfToMidDb;
      const severity = Math.max(0, Math.min(1, contrast / 15));
      if (contrast >= 6 && (!best || severity > best.severity)) best = {
        timeSeconds: hottest.start + 10, severity, candidateType: "section-local-spectral-anomaly",
        evidence: { contrastDb: contrast, windowMeans: windowSummaries, analysisWindowStartSeconds: hottest.start,
          fftSize: FFT_SIZE, hopSamples: NOMINAL_HOP, frameIntervalSeconds: NOMINAL_HOP / 48000,
          windowDurationSeconds: FFT_SIZE / 48000 },
      };
    }
    if (best) {
      dense.push({ trackId: item.trackId, fileHash: item.fileHash, ...best,
        status: "Review Candidate; not a confirmed false negative",
        formalDetectorPositive: Object.values(row.analysis.detectors).some((result) => result.detected === true) });
      if (best.severity >= 0.4) {
        const start = Math.max(0, Math.min(best.timeSeconds - 8, row.durationSeconds - 16));
        item.timeRange = { startSeconds: start, endSeconds: Math.min(row.durationSeconds, start + 16) };
        item.denseEvidence = best.evidence;
        if (!Object.values(row.analysis.detectors).some((result) => result.detected === true)) {
          item.selectionReason += " Dense scan found a local high-band review candidate despite negative formal flags.";
          item.symptomType = best.candidateType;
        }
      }
    }
    await decoder.reset();
    process.stdout.write(`Dense ${dense.length}/${queue.filter((q) => ["anomaly", "possible-missed", "boundary"].includes(q.candidateType)).length}: ${item.trackId}\n`);
  }
} finally { decoder.free(); await vite.close(); }
const shortEventReport = { policy: "review-only-v1", sourceSha256: screening.sourceSha256,
  methodSha256: createHash("sha256").update(readFileSync(join(root, "scripts", "banana-master-review-queue.mjs"))).digest("hex"),
  method: "Up to four 20-second windows per selected positive, possible-missed, or boundary track: beginning, middle, end, and around the sparse candidate. Nominal 1024-sample hop at 48 kHz, 8192-sample FFT. This does not cover every time position.",
  frameIntervalSeconds: NOMINAL_HOP / 48000, windowDurationSeconds: FFT_SIZE / 48000, candidates: dense,
  skipped: denseSkipped };
const queueId = createHash("sha256").update(JSON.stringify(queue)).digest("hex");
const existingLabels = (() => { try { return read("listening-labels.json"); } catch { return null; } })();
if (existingLabels?.labels?.length && existingLabels.queueId !== queueId) {
  throw new Error("Saved human labels belong to another review queue. Keep this version separate before regenerating.");
}
const m4aEntries = queue.filter((item) => item.relativePath.toLowerCase().endsWith(".m4a"));
if (m4aEntries.length) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const clipDir = join(reportDir, "clips"); mkdirSync(clipDir, { recursive: true });
  try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    await page.evaluate(() => { const input = document.createElement("input"); input.type = "file"; input.id = "source-audio"; document.body.append(input); });
    for (const item of m4aEntries) {
      await page.locator("#source-audio").setInputFiles(join(inventory.inputRoot, item.relativePath));
      const base64 = await page.evaluate(async ({ start, end }) => {
        const file = document.querySelector("#source-audio").files[0];
        const context = new AudioContext({ sampleRate: 48000 });
        try {
          const decoded = await context.decodeAudioData(await file.arrayBuffer());
          const from = Math.floor(start * decoded.sampleRate), to = Math.min(decoded.length, Math.ceil(end * decoded.sampleRate));
          const buffer = new ArrayBuffer(44 + (to - from) * 4), view = new DataView(buffer), bytes = new Uint8Array(buffer);
          const tag = (offset, value) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
          tag(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); tag(8, "WAVEfmt ");
          view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
          view.setUint32(24, decoded.sampleRate, true); view.setUint32(28, decoded.sampleRate * 4, true);
          view.setUint16(32, 4, true); view.setUint16(34, 16, true); tag(36, "data"); view.setUint32(40, buffer.byteLength - 44, true);
          const left = decoded.getChannelData(0), right = decoded.getChannelData(1);
          for (let i = from; i < to; i++) for (const [channel, samples] of [left, right].entries()) {
            const sample = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + (i - from) * 4 + channel * 2, Math.round(sample < 0 ? sample * 32768 : sample * 32767), true);
          }
          let encoded = "";
          for (let offset = 0; offset < bytes.length; offset += 32768) encoded += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
          return btoa(encoded);
        } finally { await context.close(); }
      }, { start: item.timeRange.startSeconds, end: item.timeRange.endSeconds }, { timeout: 120000 });
      writeFileSync(join(clipDir, `${item.id}.wav`), Buffer.from(base64, "base64"));
    }
  } finally { await browser.close(); }
}
save("short-event-screening.json", shortEventReport);
save("review-queue.json", { sourceSha256: screening.sourceSha256, queueId, createdAt: new Date().toISOString(), entries: queue });
if (!existingLabels?.labels?.length) save("listening-labels.json", { sourceSha256: screening.sourceSha256, queueId, labels: [] });
process.stdout.write(`Review queue: ${queue.length} entries\n`);

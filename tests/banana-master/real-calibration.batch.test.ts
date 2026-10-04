import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { expect, it } from "vitest";
import { analyzeAudio } from "../../src/banana-master/analysis/analyzeAudio";
import { buildFormalMasterPlan } from "../../src/banana-master/decision/formalDecision";
import { buildMasterPlan } from "../../src/banana-master/decision/decisionEngine";
import { toDecisionInputs } from "../../src/banana-master/decision/decisionInputs";
import { executeFormalPlan } from "../../src/banana-master/dsp/formalDsp";
import { verifyFormalMaster } from "../../src/banana-master/render/verifyFormalMaster";
import { makeDebugReport } from "../../src/banana-master/debug/debugReport";
import { readPcm16WavPath } from "./fixture";

const output = resolve(process.cwd(), "reports/banana-master/real-tracks-v1");
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const sourceFiles = (path: string): string[] => readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
  const child = join(path, entry.name);
  return entry.isDirectory() ? sourceFiles(child) : entry.isFile() && child.endsWith(".ts") && !child.endsWith(".test.ts") ? [child] : [];
});
const detectorNames = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"] as const;
const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

it.skipIf(process.env.BANANA_REAL_CALIBRATION_RUN !== "1")("records the frozen 20-song unlabeled calibration batch", () => {
  const selection = JSON.parse(readFileSync(join(output, "selection.json"), "utf8")) as {
    dataset: string; sourceRoot: string; selectionPolicy: string; tracks: string[] };
  expect(selection.tracks).toHaveLength(20);
  expect(new Set(selection.tracks).size).toBe(20);
  const frozenFiles = sourceFiles(resolve(process.cwd(), "src/banana-master")).sort();
  const sourceHashes = Object.fromEntries(frozenFiles.map((path) => [path.replace(process.cwd() + "\\", "").replaceAll("\\", "/"), sha(readFileSync(path))]));
  const sourceSha256 = sha(JSON.stringify(sourceHashes));
  const syntheticFreeze = JSON.parse(readFileSync(resolve(process.cwd(), "reports/banana-master/calibration-v2/processing-freeze.json"), "utf8")) as { sourceSha256: string };
  expect(sourceSha256, "Processing source changed after provisional-v1 freeze").toBe(syntheticFreeze.sourceSha256);
  mkdirSync(join(output, "debug"), { recursive: true });
  const freeze = { policy: "provisional-v1", sourceSha256, sourceFiles: sourceHashes, sourceSelection: "selection.json",
    sourceSelectionSha256: sha(readFileSync(join(output, "selection.json"))),
    note: "No per-track threshold, Detector, Decision or DSP changes. Node batch uses the same processing modules as the browser Worker." };
  writeFileSync(join(output, "processing-freeze.json"), JSON.stringify(freeze, null, 2));
  const rows: Record<string, unknown>[] = [];
  for (const [index, relative] of selection.tracks.entries()) {
    const path = resolve(selection.sourceRoot, relative);
    if (!path.startsWith(resolve(selection.sourceRoot) + "\\") || !existsSync(path)) throw new Error(`Invalid selected path: ${relative}`);
    const fileBytes = readFileSync(path), inputSha256 = sha(fileBytes), fileBytesLength = fileBytes.byteLength;
    const decodeStart = performance.now(), audio = readPcm16WavPath(path), decodeMs = performance.now() - decodeStart;
    const pcmHash = (channels: readonly Float32Array[]) => channels.map((channel) =>
      sha(new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength)));
    const originalPcmHashBefore = pcmHash(audio.channels);
    const analysisStart = performance.now(), pre = analyzeAudio(audio), analysisMs = performance.now() - analysisStart;
    const decisionStart = performance.now(), formalPlan = buildFormalMasterPlan(toDecisionInputs(pre));
    const legacyPlan = buildMasterPlan(pre), decisionMs = performance.now() - decisionStart;
    const renderStart = performance.now(), { master, execution } = executeFormalPlan(audio, formalPlan, pre);
    const post = analyzeAudio(master), verification = verifyFormalMaster(master, pre, post, execution);
    const renderMs = performance.now() - renderStart;
    const duration = audio.channels[0].length / audio.sampleRate;
    const input = { filename: basename(path), format: "wav", duration, sampleRate: audio.sampleRate, channels: audio.channels.length };
    const report = makeDebugReport(input, pre, legacyPlan, formalPlan, verification,
      { decodeMs, analysisMs, decisionMs, renderMs, encodeMs: 0, exportMs: 0, workerUsed: false,
        approximateMemoryBytes: fileBytesLength + audio.channels.reduce((sum, channel) => sum + channel.byteLength, 0)
          + master.channels.reduce((sum, channel) => sum + channel.byteLength, 0) }, execution, post);
    const stem = `${String(index + 1).padStart(2, "0")}-${basename(path)}.debug.json`;
    writeFileSync(join(output, "debug", stem), JSON.stringify(report, null, 2));
    const originalPcmUnchanged = JSON.stringify(pcmHash(audio.channels)) === JSON.stringify(originalPcmHashBefore);
    let masterMaxDelta = 0;
    for (let c = 0; c < 2; c++) for (let i = 0; i < audio.channels[c].length; i++) {
      if (!execution.executedActions && !execution.peakProtection.applied)
        masterMaxDelta = Math.max(masterMaxDelta, Math.abs(audio.channels[c][i] - master.channels[c][i]));
    }
    const detectors = Object.fromEntries(detectorNames.map((name) => {
      const result = pre.artifacts[name];
      return [name, result.status === "valid" ? { status: result.status, detected: result.detected, severity: result.severity, confidence: result.confidence }
        : { status: result.status, reason: result.reason }];
    }));
    const unknown = [
      ...detectorNames.filter((name) => pre.artifacts[name].status === "unknown").map((name) => `pre.${name}`),
      ...detectorNames.filter((name) => post.artifacts[name].status === "unknown").map((name) => `post.${name}`),
      ...(pre.loudness.status === "unknown" ? ["pre.loudness"] : []), ...(post.loudness.status === "unknown" ? ["post.loudness"] : []),
      ...(pre.truePeak.status === "unknown" ? ["pre.truePeak"] : []), ...(post.truePeak.status === "unknown" ? ["post.truePeak"] : []),
      "truePeakCeiling", "qualityGroundTruth", "blindListeningPreference",
    ];
    const applied = execution.actions.filter((action) => action.status === "applied" && action.actualMaxDb > 0)
      .map((action) => ({ id: action.id, kind: action.kind, maxControlDepthDb: action.actualMaxDb, centerHz: action.centerHz, timeRanges: action.timeRanges }));
    const observations = [
      ...execution.actions.filter((action) => action.status === "skipped").map((action) =>
        ({ layer: "DSP", category: "skipped-action", evidence: `${action.id}: ${action.reason}` })),
      ...(!verification.success ? [{ layer: "DSP", category: "output-verification-failed", evidence: verification.reason }] : []),
      ...(!originalPcmUnchanged ? [{ layer: "DSP", category: "original-mutated", evidence: "Original PCM SHA-256 changed" }] : []),
      ...(!execution.executedActions && !execution.peakProtection.applied && masterMaxDelta !== 0
        ? [{ layer: "DSP", category: "no-change-violation", evidence: `max delta ${masterMaxDelta}` }] : []),
      ...verification.actions.filter((action) => action.status === "unknown").map((action) =>
        ({ layer: "Verification", category: "action-result-unknown", evidence: `${action.id}: post detector did not verify correction` })),
      ...applied.filter((action) => action.maxControlDepthDb >= 1.5).map((action) =>
        ({ layer: "Decision", category: "high-control-depth-review", evidence: `${action.kind}: ${action.maxControlDepthDb.toFixed(2)} dB; no quality label` })),
    ];
    let timeLocal: Record<string, number | null> | null = null;
    const action = execution.actions.find((candidate) => candidate.kind === "time-local-hf-reduction" && candidate.status === "applied");
    if (action?.timeRanges.length) {
      const start = Math.floor(action.timeRanges[0].startSeconds * audio.sampleRate);
      const end = Math.min(audio.channels[0].length, Math.ceil(action.timeRanges[0].endSeconds * audio.sampleRate));
      const maxDelta = (from: number, to: number) => {
        let max = 0;
        for (let i = from; i < to; i++) for (let c = 0; c < 2; c++) max = Math.max(max, Math.abs(audio.channels[c][i] - master.channels[c][i]));
        return max;
      };
      timeLocal = { startSeconds: action.timeRanges[0].startSeconds, endSeconds: action.timeRanges[0].endSeconds,
        beforeMaxPcmDelta: maxDelta(0, start), insideMaxPcmDelta: maxDelta(start, end),
        afterMaxPcmDelta: end < audio.channels[0].length ? maxDelta(end, audio.channels[0].length) : null };
    }
    const row = { index: index + 1, sourceRelativePath: relative, filename: basename(path), inputSha256, fileBytes: fileBytesLength,
      sampleRate: audio.sampleRate, channels: audio.channels.length, durationSeconds: duration,
      qualityLabel: "unknown", preLufs: pre.loudness.status === "valid" ? pre.loudness.integratedLufs : null,
      postLufs: post.loudness.status === "valid" ? post.loudness.integratedLufs : null,
      preSamplePeak: pre.basic.samplePeak, postSamplePeak: post.basic.samplePeak,
      preTruePeakDbTp: pre.truePeak.status === "valid" ? pre.truePeak.truePeakDbTp : null,
      postTruePeakDbTp: post.truePeak.status === "valid" ? post.truePeak.truePeakDbTp : null,
      decisionState: formalPlan.state, planStatus: formalPlan.status, detectors,
      planned: formalPlan.actions.map((action) => ({ id: action.id, kind: action.kind })), applied,
      skipped: execution.actions.filter((action) => action.status === "skipped").map((action) => ({ id: action.id, reason: action.reason })),
      peakProtection: execution.peakProtection, outputVerified: verification.success,
      originalPcmUnchanged, noChangeMaxPcmDelta: !execution.executedActions && !execution.peakProtection.applied ? masterMaxDelta : null,
      timeLocal, observations, unknown, decodeMs, analysisMs, decisionMs, renderMs,
      approximateMemoryBytes: report.performance.approximateMemoryBytes,
      debugReport: `debug/${stem}` };
    rows.push(row);
    expect(originalPcmUnchanged, basename(path)).toBe(true);
    expect(verification.success, basename(path)).toBe(true);
    expect(masterMaxDelta, basename(path)).toBe(0);
  }
  const findings = { dataset: selection.dataset, classification: "real-recordings-unlabeled", freeze, tracks: rows };
  writeFileSync(join(output, "findings.json"), JSON.stringify(findings, null, 2));
  const columns = ["index", "filename", "durationSeconds", "decisionState", "planned", "applied", "peakProtection", "preLufs", "postLufs", "outputVerified", "observations", "unknown"] as const;
  writeFileSync(join(output, "summary.csv"), [columns.join(","), ...rows.map((row) => columns.map((name) =>
    quote(typeof row[name] === "object" ? JSON.stringify(row[name]) : row[name])).join(","))].join("\n"));
  writeFileSync(join(output, "listening-pending.csv"), ["index,filename,blindPreference,problemTimeSeconds,notes",
    ...rows.map((row) => `${row.index},${quote(row.filename)},,,`)].join("\n"));
  expect(rows).toHaveLength(20);
}, 600_000);

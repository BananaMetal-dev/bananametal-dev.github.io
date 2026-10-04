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

const dataset = resolve(process.cwd(), "../Banana Master/Banana_Master_Musical_Calibration_V2");
const output = resolve(process.cwd(), "reports/banana-master/calibration-v2");
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const sourceFiles = (path: string): string[] => readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
  const child = join(path, entry.name);
  return entry.isDirectory() ? sourceFiles(child) : entry.isFile() && child.endsWith(".ts") && !child.endsWith(".test.ts") ? [child] : [];
});
const detectorNames = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"] as const;
type DetectorName = typeof detectorNames[number];
const expectedByCondition: Record<string, readonly DetectorName[]> = {
  normal: [], smear: ["hfSmear", "hfHiss"], ringing: ["metallicRinging"], mud_boom: ["mud", "boom"],
  harsh: ["harshness"], low_phase: ["lowBandPhase"], end: ["sectionDegradation"], hiss: ["hfHiss"],
};
type ManifestTrack = { file: string; pair: string; condition: string; synthetic: boolean; expected: string };

it.skipIf(process.env.BANANA_CALIBRATION_RUN !== "1")("records the frozen 16-track calibration pretest", () => {
  if (!existsSync(dataset)) throw new Error(`Dataset unavailable: ${dataset}`);
  const manifest = JSON.parse(readFileSync(join(dataset, "manifest.json"), "utf8")) as { tracks: ManifestTrack[]; version: string };
  expect(manifest.tracks).toHaveLength(16);
  expect(manifest.tracks.every((track) => track.synthetic)).toBe(true);
  mkdirSync(join(output, "debug"), { recursive: true });
  const frozenFiles = sourceFiles(resolve(process.cwd(), "src/banana-master")).sort();
  const codeHashes = Object.fromEntries(frozenFiles.map((path) => [path.replace(process.cwd() + "\\", "").replaceAll("\\", "/"), sha(readFileSync(path))]));
  const freeze = { policy: "provisional-v1", app: "0.1.0", datasetManifestVersion: manifest.version,
    sourceSha256: sha(JSON.stringify(codeHashes)), sourceFiles: codeHashes,
    notes: "All Analyzer, Detector, Decision and DSP source files frozen for this batch; no per-track threshold changes." };
  writeFileSync(join(output, "processing-freeze.json"), JSON.stringify(freeze, null, 2));
  const findings: Record<string, unknown>[] = [];
  for (const track of manifest.tracks) {
    const path = join(dataset, track.file), bytes = readFileSync(path), audio = readPcm16WavPath(path);
    const analyzeStart = performance.now(), pre = analyzeAudio(audio), analysisMs = performance.now() - analyzeStart;
    const decisionStart = performance.now(), formalPlan = buildFormalMasterPlan(toDecisionInputs(pre));
    const legacyPlan = buildMasterPlan(pre), decisionMs = performance.now() - decisionStart;
    const renderStart = performance.now(), { master, execution } = executeFormalPlan(audio, formalPlan, pre);
    const post = analyzeAudio(master), verification = verifyFormalMaster(master, pre, post, execution);
    const renderMs = performance.now() - renderStart;
    const input = { filename: track.file, format: "wav", duration: audio.channels[0].length / audio.sampleRate,
      sampleRate: audio.sampleRate, channels: audio.channels.length };
    const report = makeDebugReport(input, pre, legacyPlan, formalPlan, verification,
      { decodeMs: 0, analysisMs, decisionMs, renderMs, encodeMs: 0, exportMs: 0, workerUsed: false,
        approximateMemoryBytes: bytes.length + audio.channels.reduce((sum, ch) => sum + ch.byteLength, 0)
          + master.channels.reduce((sum, ch) => sum + ch.byteLength, 0) }, execution, post);
    const expected = expectedByCondition[track.condition];
    if (!expected) throw new Error(`Unknown condition: ${track.condition}`);
    const missed = expected.filter((name) => pre.artifacts[name].status !== "valid" || !pre.artifacts[name].detected);
    const unexpected = detectorNames.filter((name) => !expected.includes(name) && pre.artifacts[name].status === "valid" && pre.artifacts[name].detected);
    const applied = execution.actions.filter((action) => action.status === "applied" && action.actualMaxDb > 0);
    const unknown = [
      ...detectorNames.filter((name) => pre.artifacts[name].status === "unknown").map((name) => `pre.${name}`),
      ...detectorNames.filter((name) => post.artifacts[name].status === "unknown").map((name) => `post.${name}`),
      ...(pre.loudness.status === "unknown" ? ["pre.loudness"] : []), ...(post.loudness.status === "unknown" ? ["post.loudness"] : []),
      ...(pre.truePeak.status === "unknown" ? ["pre.truePeak"] : []), ...(post.truePeak.status === "unknown" ? ["post.truePeak"] : []),
      "truePeakCeiling", "subjectiveListening",
    ];
    const observations = [
      ...missed.map((name) => ({ layer: "Detection", category: "candidate-false-negative", evidence: `${name}: expected by controlled stimulus; detector did not flag` })),
      ...unexpected.map((name) => ({ layer: "Detection", category: track.condition === "normal" ? "candidate-false-positive" : "co-detected-unlabeled",
        evidence: `${name}: flagged outside the stimulus label; ${track.condition === "normal" ? "normal control needs listening review" : "co-occurring symptom is possible"}` })),
      ...(track.condition === "normal" && applied.length ? [{ layer: "Decision", category: "candidate-overcorrection",
        evidence: `normal control received ${applied.map((action) => `${action.kind} ${action.actualMaxDb.toFixed(2)} dB`).join(", ")}` }] : []),
      ...expected.filter((name) => pre.artifacts[name].status === "valid" && pre.artifacts[name].detected
        && !formalPlan.trace.some((trace) => trace.detector === name && trace.actionId)).map((name) =>
        ({ layer: "Decision", category: "candidate-under-correction", evidence: `${name} detected but no action; trace gate must be reviewed` })),
      ...execution.actions.filter((action) => action.status === "skipped").map((action) =>
        ({ layer: "DSP", category: "skipped-action", evidence: `${action.id}: ${action.reason}` })),
      ...(!verification.success ? [{ layer: "DSP", category: "output-verification-failed", evidence: verification.reason }] : []),
    ];
    let timeLocal: Record<string, number | null> | null = null;
    const ranges = execution.actions.filter((action) => action.kind === "time-local-hf-reduction" && action.status === "applied").flatMap((action) => action.timeRanges);
    if (ranges.length) {
      const start = Math.floor(ranges[0].startSeconds * audio.sampleRate), end = Math.min(audio.channels[0].length, Math.ceil(ranges[0].endSeconds * audio.sampleRate));
      const maxDelta = (from: number, to: number) => {
        let max = 0;
        for (let i = from; i < to; i++) for (let c = 0; c < 2; c++) max = Math.max(max, Math.abs(audio.channels[c][i] - master.channels[c][i]));
        return max;
      };
      timeLocal = { startSeconds: ranges[0].startSeconds, endSeconds: ranges[0].endSeconds,
        beforeMaxPcmDelta: maxDelta(0, start), insideMaxPcmDelta: maxDelta(start, end),
        afterMaxPcmDelta: end < audio.channels[0].length ? maxDelta(end, audio.channels[0].length) : null };
    }
    const row = { filename: track.file, inputSha256: sha(bytes), pair: track.pair, condition: track.condition, synthetic: track.synthetic,
      decisionState: formalPlan.state, planStatus: formalPlan.status, planned: formalPlan.actions.map((a) => a.kind),
      applied: applied.map((a) => ({ kind: a.kind, maxControlDepthDb: a.actualMaxDb, centerHz: a.centerHz })),
      skipped: execution.actions.filter((a) => a.status === "skipped").map((a) => ({ kind: a.kind, reason: a.reason })),
      missed, unexpected, observations, unknown, timeLocal, verifiedOutput: verification.success,
      preLufs: pre.loudness.status === "valid" ? pre.loudness.integratedLufs : null,
      postLufs: post.loudness.status === "valid" ? post.loudness.integratedLufs : null,
      peakBefore: pre.basic.samplePeak, peakAfter: post.basic.samplePeak,
      reportFile: `debug/${track.file}.debug.json` };
    findings.push(row);
    writeFileSync(join(output, "debug", `${track.file}.debug.json`), JSON.stringify(report, null, 2));
    expect(verification.success, track.file).toBe(true);
  }
  writeFileSync(join(output, "findings.json"), JSON.stringify({ freeze, dataset: "synthetic-music-like-pretest", findings }, null, 2));
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csvColumns = ["filename", "pair", "condition", "decisionState", "planned", "applied", "missed", "unexpected", "observations", "preLufs", "postLufs", "peakBefore", "peakAfter", "verifiedOutput", "unknown"] as const;
  writeFileSync(join(output, "summary.csv"), [csvColumns.join(","), ...findings.map((row) => csvColumns.map((key) => quote(Array.isArray(row[key]) ? JSON.stringify(row[key]) : row[key])).join(","))].join("\n"));
  const listeningColumns = ["filename", "blindAFile", "blindBFile", "loudnessMatched", "preference", "problemTimeSeconds", "notes"];
  writeFileSync(join(output, "listening-pending.csv"), [listeningColumns.join(","), ...manifest.tracks.map((track) => `${quote(track.file)},,,,,,`)].join("\n"));
  expect(findings).toHaveLength(16);
  console.log(`Calibration pretest: 16 synthetic tracks; ${findings.reduce((n, row) => n + (row.observations as unknown[]).length, 0)} classified candidates; reports in ${output}`);
}, 120_000);

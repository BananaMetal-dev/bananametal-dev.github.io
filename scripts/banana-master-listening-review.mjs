#!/usr/bin/env node
// Compares human labels with the frozen Phase 2 analysis. It never changes thresholds or source audio.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";
import { createServer } from "vite";

const root = resolve(process.cwd());
const dataset = process.argv.find((value) => value.startsWith("--dataset="))?.slice("--dataset=".length) ?? "calibration-phase2";
if (!/^calibration-[a-z0-9-]+$/.test(dataset)) throw new Error("Invalid calibration dataset name");
const reportDir = join(root, "reports", "banana-master", dataset);
const read = (name) => JSON.parse(readFileSync(join(reportDir, name), "utf8"));
const queue = read("review-queue.json"), labelsFile = read("listening-labels.json"), screening = read("screening-results.json");
const freeze = read("processing-freeze.json");
const sourceHashStatus = Object.fromEntries(Object.entries(freeze.sourceFiles).map(([name, expected]) => {
  const actual = createHash("sha256").update(readFileSync(join(root, name))).digest("hex");
  return [name, { matchesFreeze: actual === expected, expected, actual }];
}));
const changedFormalSources = Object.entries(sourceHashStatus).filter(([name, value]) =>
  !name.includes("/dsp/") && !value.matchesFreeze);
if (changedFormalSources.length) throw new Error(`Frozen measurement/detector/decision sources changed: ${changedFormalSources.map(([name]) => name).join(", ")}`);
if (queue.entries.length !== 30 || labelsFile.queueId !== queue.queueId || labelsFile.sourceSha256 !== queue.sourceSha256
  || screening.sourceSha256 !== queue.sourceSha256 || !Array.isArray(labelsFile.labels)) throw new Error("Frozen queue or label identity mismatch");
const byTrack = new Map(screening.tracks.map((track) => [track.trackId, track]));
const byReview = new Map(queue.entries.map((item) => [item.id, item]));
const allowedStatus = new Set(["Confirmed Symptom", "Benign Musical Content", "Unclear", "Pending"]);
const allowedNeed = new Set(["Needed", "Not Needed", "Unclear", "Unknown"]);
const detectorNames = new Set(["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom",
  "harshness", "lowBandPhase", "sectionDegradation"]);
const formalName = (symptom) => symptom === "short-ringing-candidate" ? "metallicRinging" : symptom;
const labelMap = new Map();
for (const label of labelsFile.labels) {
  const item = byReview.get(label.reviewId), track = item && byTrack.get(item.trackId);
  if (!item || !track || labelMap.has(label.reviewId) || label.queueId !== queue.queueId
    || label.trackId !== item.trackId || label.fileHash !== item.fileHash || track.sha256 !== item.fileHash
    || !allowedStatus.has(label.reviewStatus) || !allowedNeed.has(label.correctionNeed ?? "Unknown")
    || !Number.isFinite(label.startSeconds) || !Number.isFinite(label.endSeconds)
    || label.startSeconds < item.timeRange.startSeconds || label.endSeconds > item.timeRange.endSeconds
    || label.startSeconds >= label.endSeconds) throw new Error(`Invalid or duplicate label: ${label.reviewId}`);
  labelMap.set(label.reviewId, label);
}

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

const denseTargets = queue.entries.filter((item) => {
  const label = labelMap.get(item.id), name = formalName(label?.symptomType);
  const detector = byTrack.get(item.trackId)?.analysis?.detectors?.[name];
  return label?.reviewStatus === "Confirmed Symptom" && detectorNames.has(name)
    && detector?.status === "valid" && detector.detected === false;
});
const denseByReview = new Map();
if (denseTargets.length) {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom" });
  const decoder = new MPEGDecoder(); await decoder.ready;
  try {
    const { extractSpectralFeatures, NOMINAL_HOP, FFT_SIZE } = await vite.ssrLoadModule("/src/banana-master/analysis/artifacts/features.ts");
    const detectors = await vite.ssrLoadModule("/src/banana-master/analysis/artifacts/detectors.ts");
    for (const item of denseTargets) {
      const label = labelMap.get(item.id), track = byTrack.get(item.trackId);
      if (track.format !== "mp3") { denseByReview.set(item.id, { status: "unknown", reason: "dense-decoder-unavailable" }); continue; }
      const file = resolve(read("inventory.json").inputRoot, item.relativePath);
      if (!file.startsWith(resolve(read("inventory.json").inputRoot) + sep)) throw new Error("Invalid input path");
      const bytes = readFileSync(file);
      if (createHash("sha256").update(bytes).digest("hex") !== item.fileHash) throw new Error(`Input hash changed: ${item.trackId}`);
      const decoded = decoder.decode(bytes);
      try {
        if (decoded.channelData.length !== 2) { denseByReview.set(item.id, { status: "unknown", reason: "stereo-required" }); continue; }
        const from = Math.floor(label.startSeconds * decoded.sampleRate), to = Math.min(decoded.samplesDecoded, Math.ceil(label.endSeconds * decoded.sampleRate));
        const channels = decoded.channelData.map((channel) => resample(channel.subarray(from, to), decoded.sampleRate));
        const features = extractSpectralFeatures({ sampleRate: 48000, channels });
        if (!features.frames.length) { denseByReview.set(item.id, { status: "unknown", reason: "insufficient-frames" }); continue; }
        const name = formalName(label.symptomType);
        const local = name === "lowBandPhase"
          ? detectors.lowBandPhase({ sampleRate: 48000, channels })
          : name === "sectionDegradation"
            ? detectors.sectionDegradation(features, channels[0].length / 48000)
            : detectors[name](features);
        denseByReview.set(item.id, { status: local.status, detected: local.status === "valid" ? local.detected : null,
          severity: local.severity, confidence: local.confidence, evidence: local.evidence,
          sampledFrames: features.sampledFrames, candidateFrames: features.candidateFrames,
          maxFrameGapSeconds: features.maxFrameGapSeconds, nominalFrameIntervalSeconds: NOMINAL_HOP / 48000,
          fftWindowSeconds: FFT_SIZE / 48000, note: "Local-window detection is diagnostic; its persistence denominator differs from the full track." });
      } finally { await decoder.reset(); }
    }
  } finally { decoder.free(); await vite.close(); }
}

const rows = queue.entries.map((item) => {
  const track = byTrack.get(item.trackId), label = labelMap.get(item.id) ?? null;
  const symptom = label?.symptomType ?? item.symptomType;
  const detectorName = formalName(symptom);
  const detector = track?.analysis?.detectors?.[detectorName] ?? null;
  const decision = track?.analysis?.decision ?? null;
  const complete = !!label && !["Pending", "Unreviewed"].includes(label.reviewStatus);
  const correctionNeedKnown = complete && !!label.correctionNeed && label.correctionNeed !== "Unknown";
  let classification = "Pending";
  if (complete && label.reviewStatus === "Unclear") classification = "Unknown";
  else if (complete && !symptom) classification = "Unknown: symptom type unspecified";
  else if (complete && !detector) classification = "Unknown: no matching formal detector";
  else if (complete && detector.status !== "valid") classification = "Unknown: detector measurement unavailable";
  else if (complete && label.reviewStatus === "Confirmed Symptom") classification = detector.detected
    ? "Detection agreement candidate" : "False Negative candidate";
  else if (complete && label.reviewStatus === "Benign Musical Content") classification = detector.detected
    ? "False Positive candidate" : "Benign control agreement candidate";
  const actions = decision?.actions ?? [];
  const decisionFinding = !complete || label.reviewStatus === "Unclear" || !correctionNeedKnown ? "Unknown"
    : label.correctionNeed === "Needed" && detector?.status === "valid" && !detector.detected
      ? "Detection review first; a negative detector cannot trigger this correction"
      : label.correctionNeed === "Needed" && actions.length === 0 ? "Potential under-correction; DSP need remains unverified"
      : label.correctionNeed === "Not Needed" && actions.length > 0 ? "Potential over-correction; compare local action and audio"
        : "No decision conflict identified from the available track-level plan";
  const dense = denseByReview.get(item.id) ?? null;
  const missAnalysis = classification !== "False Negative candidate" ? null
    : !dense || dense.status !== "valid" ? "Unknown: dense reanalysis unavailable"
      : dense.detected ? "Local detector responds; full-track frame sampling or persistence denominator needs review"
        : "Local detector remains negative; inspect features and algorithm before changing thresholds";
  const responsibilityCandidates = !complete || label.reviewStatus === "Unclear" || !symptom ? ["Unknown"]
    : detector?.status !== "valid" ? ["Measurement"]
      : [classification.includes("False") ? "Detection" : null,
        decisionFinding.startsWith("Potential") ? "Decision" : null,
        !correctionNeedKnown ? "Unknown" : null].filter(Boolean);
  return { reviewId: item.id, trackId: item.trackId, fileHash: item.fileHash, filename: item.filename,
    datasetRole: item.datasetRole, candidateType: item.candidateType, formalDetectorName: detectorName,
    candidateRange: item.timeRange, humanLabel: label && { startSeconds: label.startSeconds, endSeconds: label.endSeconds,
      symptomType: label.symptomType, reviewStatus: label.reviewStatus, correctionNeed: label.correctionNeed,
      notes: label.notes, updatedAt: label.updatedAt }, complete, correctionNeedKnown, classification, decisionFinding,
    missAnalysis, responsibilityCandidates,
    detector: detector && { status: detector.status, detected: detector.detected ?? null, severity: detector.severity,
      confidence: detector.confidence, evidence: detector.evidence },
    decision: decision && { state: decision.state, actions, trace: decision.trace?.filter((entry) => entry.detector === detectorName) ?? [] },
    denseReanalysis: dense };
});
const completed = rows.filter((row) => row.complete).length;
const correctionNeedKnownCount = rows.filter((row) => row.correctionNeedKnown).length;
const statusCounts = Object.fromEntries(["Confirmed Symptom", "Benign Musical Content", "Unclear", "Pending"].map((name) =>
  [name, rows.filter((row) => row.humanLabel?.reviewStatus === name).length]));
const denseRows = rows.filter((row) => row.denseReanalysis);
const report = { result: "CONTINUE", reviewStage: completed === 30 ? "LABELS_COMPLETE_REVIEW_REQUIRED" : "WAITING_FOR_HUMAN_LABELS",
  sourceSha256: queue.sourceSha256, queueId: queue.queueId, thresholdPolicy: "provisional-v1",
  processingFreeze: { policy: freeze.policy, sourceHashStatus,
    note: sourceHashStatus["src/banana-master/dsp/formalDsp.ts"].matchesFreeze
      ? "All frozen source hashes match." : "The DSP source hash differs from this snapshot; this review did not audit the reason." },
  completed, correctionNeedKnownCount, total: 30, statusCounts,
  denseReanalysisCount: denseRows.length, densePositiveCount: denseRows.filter((row) => row.denseReanalysis.detected === true).length,
  unknownCounts: { correctionNeed: rows.filter((row) => !row.correctionNeedKnown).length,
    symptomType: rows.filter((row) => row.complete && !row.humanLabel.symptomType).length,
    dspMethod: 30, dspAmount: 30 }, rows,
  classificationCounts: Object.fromEntries([...new Set(rows.map((row) => row.classification))].map((type) =>
    [type, rows.filter((row) => row.classification === type).length])),
  responsibilityCounts: Object.fromEntries(["Measurement", "Detection", "Decision", "DSP Method", "DSP Amount", "Unknown"].map((kind) =>
    [kind, rows.filter((row) => row.responsibilityCandidates.includes(kind)).length])),
  calibrationCandidates: completed === 30 ? rows.filter((row) => row.responsibilityCandidates.some((kind) =>
    ["Measurement", "Detection", "Decision"].includes(kind))).map((row) => ({ reviewId: row.reviewId,
    trackId: row.trackId, responsibility: row.responsibilityCandidates, evidence: { humanLabel: row.humanLabel,
      detector: row.detector, decision: row.decision, denseReanalysis: row.denseReanalysis, missAnalysis: row.missAnalysis } })) : [],
  truePeakOutlier: dataset === "calibration-phase2" ? { trackId: "track-0036", reviewId: "review-028", futureUse: "Limiter validation candidate",
    knownEvent: "Final 0.82 seconds include the extreme input peak; current True Peak Safety must continue to include it.",
    safetyPolicyChange: "none" } : null,
  unknown: ["Human listening status is based on saved UI labels; independent verification of listening is unavailable.",
    "A track-level detector flag cannot by itself prove that the labeled seconds were detected.",
    "DSP Method and DSP Amount require level-matched Original/Master listening and are not inferred from detector scores.",
    "Local-window reanalysis can distinguish a sparse-sampling candidate from a local algorithm response, but does not prove full-track false negatives.",
    "Only 60 of 327 inventoried BMB2 files were formally screened; this is a 30-case listening review, not a whole-library performance estimate."],
  calibrationPolicy: completed === 30 ? "Review candidates by responsibility; thresholds remain frozen pending correction-need review and regression." : "Thresholds frozen until all 30 human labels are complete." };
writeFileSync(join(reportDir, "listening-review-results.json"), JSON.stringify(report, null, 2) + "\n");
const lines = ["# Banana Master — Real-track Listening & Calibration Review", "", `RESULT: ${report.result}`, "",
  `Symptom labels: ${completed}/30. Correction need known: ${correctionNeedKnownCount}/30. Queue ID: ${queue.queueId}. Threshold policy: provisional-v1.`, "",
  "## Human labels", "", ...Object.entries(report.statusCounts).map(([name, count]) => `- ${name}: ${count}`), "",
  "## Classification", "", ...Object.entries(report.classificationCounts).map(([name, count]) =>
    `- ${name}: ${count}${count ? ` (${rows.filter((row) => row.classification === name).map((row) => row.reviewId).join(", ")})` : ""}`), "",
  "## Targeted reanalysis", "", `${report.denseReanalysisCount} human-confirmed, full-track-detector-negative intervals were rescanned with nominal 1024-sample hops. Local detector positive: ${report.densePositiveCount}. A local negative result points to feature/algorithm review, but does not by itself prove a threshold defect.`, "",
  "## Responsibility candidates", "", ...Object.entries(report.responsibilityCounts).map(([name, count]) => `- ${name}: ${count}`), "",
  `Correction need remains Unknown in ${report.unknownCounts.correctionNeed} cases; symptom type is unspecified in ${report.unknownCounts.symptomType} case. DSP method and amount were not evaluated by Original-only listening.`, "",
  "## Calibration policy", "", report.calibrationPolicy, "",
  "## Processing freeze", "", `Measurement, Detector and Decision source hashes match provisional-v1. ${report.processingFreeze.note}`, "",
  ...(report.truePeakOutlier ? ["## True Peak outlier", "", "track-0036 (review-028) remains a future limiter-validation case. The final 0.82 seconds must remain in True Peak Safety checks; no safety policy was changed.", ""] : []),
  "## Unknown", "", ...report.unknown.map((entry) => `- ${entry}`), "",
  "Detailed labels, Detector evidence, Decision trace and targeted reanalysis are in `listening-review-results.json`.", ""];
writeFileSync(join(reportDir, "listening-review-findings.md"), lines.join("\n"));
process.stdout.write(`${report.result}: ${completed}/30 symptom labels, ${correctionNeedKnownCount}/30 correction judgments, ${denseTargets.length} targeted reanalyses\n`);

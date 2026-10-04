#!/usr/bin/env node
// Build a separate listening queue from the frozen BMB2 screening, without assigning human labels.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const folder = join(resolve(process.cwd()), "reports", "banana-master", "calibration-bmb2");
const read = (name) => JSON.parse(readFileSync(join(folder, name), "utf8"));
const screening = read("screening-results.json"), selection = read("candidate-selection.json"), freeze = read("processing-freeze.json");
const inventory = read("inventory.json");
if (screening.sourceSha256 !== freeze.sourceSha256 || inventory.inputRoot !== freeze.inputRoot) throw new Error("Screening freeze mismatch");
const rows = screening.tracks.filter((row) => row.status === "analyzed" && row.analysis?.detectors && !row.decodeWarnings?.length);
if (rows.length < 30) throw new Error(`At least 30 analyzed tracks are required; found ${rows.length}`);
const byId = new Map(rows.map((row) => [row.trackId, row]));
const used = new Set(), chosen = [];
function pick(ids, kind, limit, reason) {
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || used.has(row.sha256) || chosen.length >= 30 || limit <= 0) continue;
    chosen.push({ row, kind, reason }); used.add(row.sha256); limit--;
  }
}
pick(selection.strongPositive, "strong-positive", 6, "Formal detector positive; the audible symptom and need for correction remain unverified.");
pick(selection.possibleMissedArtifacts, "possible-missed", 8, "Formal flag negative, but a sampled local score merits listening; not a confirmed miss.");
pick(selection.thresholdBoundary, "boundary", 6, "Detector evidence near a provisional decision gate.");
pick(selection.intentionalExtremes, "spectral-extreme", 4, "Band balance is relatively extreme; an intentional musical choice is possible.");
pick(selection.dynamicQuiet, "dynamic-quiet", 3, "Relatively quiet or dynamic material, selected for coverage.");
pick(selection.cleanControl, "control-candidate", 6, "Formal flags are negative; normal sound quality is not assumed.");
const reserve = [...rows].sort((a, b) => {
  const severity = (row) => Math.max(...Object.values(row.analysis.detectors).map((value) => value.severity ?? 0));
  return severity(b) - severity(a);
});
pick(reserve.map((row) => row.trackId), "coverage-fill", 30, "Additional screened track for 30-item coverage; no human label assigned.");
if (chosen.length !== 30) throw new Error(`Could only select ${chosen.length} unique tracks`);
const gates = { highBandExcess: .3, hfSmear: .25, metallicRinging: .08, hfHiss: .25,
  mud: .3, boom: .3, harshness: .3, lowBandPhase: .2 };
function chooseDetector(row, kind) {
  const detectors = row.analysis.detectors;
  if (kind === "boundary") {
    const nearest = Object.entries(gates).map(([name, gate]) => {
      const result = detectors[name], key = name === "lowBandPhase" ? "antiPhasePersistence" : "persistence";
      const value = result?.evidence?.[key];
      return { name, distance: typeof value === "number" ? Math.abs(value - gate) : Infinity };
    }).sort((a, b) => a.distance - b.distance)[0];
    if (nearest && Number.isFinite(nearest.distance)) return nearest.name;
  }
  if (kind === "possible-missed") {
    const local = ["hfSmear", "metallicRinging", "harshness"].map((name) => ({ name,
      score: Math.max(0, ...(detectors[name]?.timeline ?? []).map((point) => point.score)) }))
      .sort((a, b) => b.score - a.score)[0];
    if (local?.score > 0) return local.name;
  }
  return Object.entries(detectors).filter(([, value]) => value.status === "valid")
    .sort((a, b) => (b[1].detected - a[1].detected) || (b[1].severity ?? 0) - (a[1].severity ?? 0))[0]?.[0] ?? "harshness";
}
const entries = chosen.map(({ row, kind, reason }, index) => {
  const symptomType = chooseDetector(row, kind), detector = row.analysis.detectors[symptomType];
  const peak = [...(detector?.timeline ?? [])].sort((a, b) => b.score - a.score)[0];
  const duration = row.durationSeconds, center = peak?.time ?? duration / 2;
  const start = Math.max(0, Math.min(center - 8, duration - 16));
  return { id: `review-${String(index + 1).padStart(3, "0")}`, trackId: row.trackId, fileHash: row.sha256,
    filename: row.filename, relativePath: row.relativePath,
    timeRange: { startSeconds: start, endSeconds: Math.min(duration, start + 16) },
    candidateType: kind, symptomType, severity: detector?.severity ?? null, confidence: detector?.confidence ?? null,
    evidence: detector?.evidence ?? {}, selectionReason: reason,
    reviewStatus: "Unreviewed", datasetRole: index % 5 === 4 ? "holdout" : "calibration" };
});
const queueId = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
const labelsPath = join(folder, "listening-labels.json"), queuePath = join(folder, "review-queue.json");
if (existsSync(labelsPath) || existsSync(queuePath)) throw new Error("Existing BMB2 queue or labels; refusing to overwrite them");
writeFileSync(queuePath, JSON.stringify({ sourceSha256: freeze.sourceSha256, queueId, displayName: "BananaMetalBand2",
  inputRoot: inventory.inputRoot, screenedTracks: rows.length, totalInventoryTracks: inventory.tracks.length,
  selectionPolicy: "Thirty review candidates selected from an evenly spaced 60-track screen. Categories are hypotheses, not human labels.",
  createdAt: new Date().toISOString(), entries }, null, 2) + "\n");
writeFileSync(labelsPath, JSON.stringify({ sourceSha256: freeze.sourceSha256, queueId, labels: [] }, null, 2) + "\n");
process.stdout.write(`BMB2 review queue: ${entries.length} tracks from ${rows.length} analyzed / ${inventory.tracks.length} inventoried; queueId ${queueId}\n`);

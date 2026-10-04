#!/usr/bin/env node
// Loopback-only development server. MP3 data never leaves the local machine.
import { createServer } from "node:http";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";

const projectRoot = resolve(process.cwd());
const dataset = process.argv.find((value) => value.startsWith("--dataset="))?.slice("--dataset=".length) ?? "calibration-phase2";
if (!/^calibration-[a-z0-9-]+$/.test(dataset)) throw new Error("Invalid calibration dataset name");
const reportDir = join(projectRoot, "reports", "banana-master", dataset);
const uiDir = join(projectRoot, "apps", "banana-master", "calibration-review");
const inventory = JSON.parse(readFileSync(join(reportDir, "inventory.json"), "utf8"));
const queue = JSON.parse(readFileSync(join(reportDir, "review-queue.json"), "utf8"));
const labelPath = join(reportDir, "listening-labels.json");
const byId = new Map(queue.entries.map((item) => [item.id, item]));
const statuses = new Set(["Confirmed Symptom", "Benign Musical Content", "Unclear", "Pending"]);
const correctionNeeds = new Set(["Needed", "Not Needed", "Unclear", "Unknown"]);
const symptomTypes = new Set(["", "highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom",
  "harshness", "lowBandPhase", "sectionDegradation", "short-hf-burst", "short-ringing-candidate",
  "transient-hf-candidate", "section-local-spectral-anomaly", "other"]);
const decoder = new MPEGDecoder(); await decoder.ready;
let busy = Promise.resolve();
function send(response, status, type, body) {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; media-src 'self' blob:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
  response.end(body);
}
function readLabels() {
  const data = JSON.parse(readFileSync(labelPath, "utf8"));
  if (data.sourceSha256 !== queue.sourceSha256 || data.queueId !== queue.queueId || !Array.isArray(data.labels)) {
    throw new Error("Saved labels belong to a different review queue");
  }
  return data;
}
function saveLabel(payload) {
  const { sourceSha256, queueId, label } = payload ?? {};
  if (sourceSha256 !== queue.sourceSha256 || queueId !== queue.queueId || !label || typeof label !== "object") throw new Error("Queue mismatch");
  const item = byId.get(label.reviewId);
  if (!item || label.queueId !== queueId || label.trackId !== item.trackId || label.fileHash !== item.fileHash
    || label.filename !== item.filename || label.candidateType !== item.candidateType || label.datasetRole !== item.datasetRole) {
    throw new Error("Review identity mismatch");
  }
  if (!statuses.has(label.reviewStatus) || !correctionNeeds.has(label.correctionNeed)
    || !symptomTypes.has(label.symptomType) || typeof label.notes !== "string" || label.notes.length > 4000
    || !Number.isFinite(label.startSeconds) || !Number.isFinite(label.endSeconds)
    || label.startSeconds < item.timeRange.startSeconds || label.endSeconds > item.timeRange.endSeconds
    || label.startSeconds >= label.endSeconds || Number.isNaN(Date.parse(label.updatedAt))) throw new Error("Invalid review label");
  const data = readLabels();
  const clean = { queueId, reviewId: item.id, trackId: item.trackId, fileHash: item.fileHash, filename: item.filename,
    startSeconds: label.startSeconds, endSeconds: label.endSeconds, candidateType: item.candidateType,
    datasetRole: item.datasetRole, symptomType: label.symptomType, reviewStatus: label.reviewStatus,
    correctionNeed: label.correctionNeed, notes: label.notes, updatedAt: label.updatedAt };
  const index = data.labels.findIndex((entry) => entry.reviewId === item.id);
  if (index < 0) data.labels.push(clean); else data.labels[index] = clean;
  data.labels.sort((a, b) => a.reviewId.localeCompare(b.reviewId));
  const temp = `${labelPath}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(data, null, 2) + "\n");
  renameSync(temp, labelPath);
  return clean;
}
function wavPcm16(channels, sampleRate, fromSeconds, toSeconds) {
  const start = Math.max(0, Math.floor(fromSeconds * sampleRate));
  const end = Math.min(channels[0].length, Math.ceil(toSeconds * sampleRate));
  const length = Math.max(0, end - start), buffer = Buffer.alloc(44 + length * 4);
  let peak = 0;
  for (let i = start; i < end; i++) for (let channel = 0; channel < 2; channel++) {
    const value = channels[channel][i];
    if (!Number.isFinite(value)) throw new Error("Non-finite decoded PCM in review clip");
    peak = Math.max(peak, Math.abs(value));
  }
  const auditionGain = peak > 0.98 ? 0.98 / peak : 1;
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 4, 28);
  buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(length * 4, 40);
  for (let i = 0; i < length; i++) for (let channel = 0; channel < 2; channel++) {
    const sample = channels[channel][start + i] * auditionGain;
    buffer.writeInt16LE(Math.round(sample < 0 ? sample * 32768 : sample * 32767), 44 + i * 4 + channel * 2);
  }
  return buffer;
}
async function clip(item) {
  if (item.relativePath.toLowerCase().endsWith(".m4a")) return readFileSync(join(reportDir, "clips", `${item.id}.wav`));
  const file = resolve(inventory.inputRoot, item.relativePath);
  if (!file.startsWith(resolve(inventory.inputRoot) + sep)) throw new Error("Invalid input path");
  const decoded = decoder.decode(readFileSync(file));
  try {
    if (decoded.channelData.length !== 2) throw new Error("Stereo MP3 required");
    return wavPcm16(decoded.channelData, decoded.sampleRate, item.timeRange.startSeconds, item.timeRange.endSeconds);
  } finally { await decoder.reset(); }
}
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/api/labels" && request.method === "POST") {
    if (request.headers.origin !== "http://127.0.0.1:5191" || request.headers["content-type"] !== "application/json") {
      return send(response, 403, "text/plain", "Origin or content type rejected");
    }
    let input = "";
    request.on("data", (chunk) => { input += chunk; if (input.length > 16_384) request.destroy(); });
    request.on("end", () => {
      try { send(response, 200, "application/json; charset=utf-8", JSON.stringify(saveLabel(JSON.parse(input)))); }
      catch (error) { send(response, 400, "text/plain", String(error.message)); }
    });
    return;
  }
  if (request.method !== "GET") return send(response, 405, "text/plain", "Method not allowed");
  if (url.pathname === "/" || url.pathname === "/index.html") return send(response, 200, "text/html; charset=utf-8", readFileSync(join(uiDir, "index.html")));
  if (url.pathname === "/review.js") return send(response, 200, "text/javascript; charset=utf-8", readFileSync(join(uiDir, "review.js")));
  if (url.pathname === "/api/queue") return send(response, 200, "application/json; charset=utf-8", JSON.stringify({
    sourceSha256: queue.sourceSha256, queueId: queue.queueId, displayName: queue.displayName ?? "旧ライブラリー評価キュー", entries: queue.entries }));
  if (url.pathname === "/api/labels") return send(response, 200, "application/json; charset=utf-8", JSON.stringify(readLabels()));
  if (url.pathname.startsWith("/clip/")) {
    const item = byId.get(url.pathname.slice(6));
    if (!item) return send(response, 404, "text/plain", "Unknown review ID");
    busy = busy.catch(() => {}).then(() => clip(item).then((body) => send(response, 200, "audio/wav", body),
      (error) => send(response, 500, "text/plain", String(error.message))));
    return;
  }
  send(response, 404, "text/plain", "Not found");
});
server.listen(5191, "127.0.0.1", () => process.stdout.write("Calibration Review: http://127.0.0.1:5191/\n"));
process.on("SIGINT", () => { server.close(); decoder.free(); });

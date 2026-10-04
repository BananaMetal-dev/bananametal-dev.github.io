#!/usr/bin/env node
// Read-only audio audit. Writes measurements only inside the workspace.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";

const root = resolve(process.cwd());
const base = join(root, "reports", "banana-master", "calibration-phase2");
const data = JSON.parse(readFileSync(join(base, "screening-results.json"), "utf8"));
const inventory = JSON.parse(readFileSync(join(base, "inventory.json"), "utf8"));
const freeze = JSON.parse(readFileSync(join(base, "processing-freeze.json"), "utf8"));
if (data.sourceSha256 !== freeze.sourceSha256) throw new Error("Screening source freeze mismatch");
if (resolve(inventory.inputRoot) !== resolve(freeze.inputRoot)) throw new Error("Input root mismatch");
const rows = data.tracks.filter((row) => row.status === "analyzed" && row.analysis?.truePeak?.status === "valid");
if (rows.length !== inventory.tracks.length) throw new Error("Incomplete screening data");
function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const at = (q) => sorted.length ? sorted[Math.floor((sorted.length - 1) * q)] : null;
  return { count: sorted.length, min: at(0), p10: at(.1), p25: at(.25), median: at(.5), p75: at(.75), p90: at(.9), max: at(1) };
}
const tp = (row) => row.analysis.truePeak.truePeakDbTp;
const sp = (row) => row.analysis.truePeak.samplePeakDbFs;
const ordered = [...rows].sort((a, b) => tp(b) - tp(a));
const selected = [ ...ordered.slice(0, 5), ordered[Math.floor(ordered.length / 2)], ordered.at(-1), rows.find((row) => row.trackId === "track-0316") ];
const unique = [...new Map(selected.filter(Boolean).map((row) => [row.sha256, row])).values()];
const ffmpeg = process.argv[2] ?? null;
function ffmeasure(path, filter, kind) {
  if (!ffmpeg) return null;
  const result = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", path, "-af", filter, "-f", "null", "NUL"],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(`FFmpeg ${kind} failed: ${result.error?.message ?? result.stderr?.slice(-400)}`);
  const log = result.stderr;
  const match = kind === "tp" ? /True peak:\s*Peak:\s*([-+\d.]+) dBFS/g : /Overall\s+[\s\S]*?Peak level dB:\s*([-+\d.]+)/g;
  const matches = [...log.matchAll(match)];
  if (!matches.length) throw new Error(`FFmpeg ${kind} value absent`);
  return Number(matches.at(-1)[1]);
}
const decoder = new MPEGDecoder();
await decoder.ready;
const representative = [];
try {
  for (const row of unique) {
    const path = join(inventory.inputRoot, row.relativePath);
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (hash !== row.sha256) throw new Error(`Input changed: ${row.trackId}`);
    const item = { trackId: row.trackId, relativePath: row.relativePath, format: row.format,
      nativeRateHz: row.sampleRate, appAt48k: { samplePeakDbFs: sp(row), truePeakDbTp: tp(row), differenceDb: tp(row) - sp(row) },
      inputSha256: hash };
    if (row.format === "mp3") {
      const decoded = decoder.decode(readFileSync(path));
      let peak = 0;
      for (const channel of decoded.channelData) for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
      item.mpg123Native = { samplePeakDbFs: 20 * Math.log10(peak), sampleRateHz: decoded.sampleRate,
        decodeWarningCount: decoded.errors.length };
      await decoder.reset();
    }
    if (ffmpeg) {
      item.ffmpegNative = { samplePeakDbFs: ffmeasure(path, "aformat=sample_fmts=flt,astats=metadata=0:reset=0", "sp"),
        truePeakDbTp: ffmeasure(path, "ebur128=peak=true:framelog=verbose", "tp") };
      item.ffmpegAt48k = { samplePeakDbFs: ffmeasure(path, "aresample=48000,aformat=sample_fmts=flt,astats=metadata=0:reset=0", "sp"),
        truePeakDbTp: ffmeasure(path, "aresample=48000,ebur128=peak=true:framelog=verbose", "tp") };
    }
    representative.push(item);
    process.stdout.write(`Audited ${row.trackId}\n`);
  }
} finally { decoder.free(); }
const output = { sourceSha256: freeze.sourceSha256, inputRoot: inventory.inputRoot, count: rows.length,
  measurementPoint: "app: decoded PCM resampled to 48 kHz; FFmpeg native: decoded PCM at source rate; FFmpeg 48k: decoded PCM after aresample=48000",
  distributions: { samplePeakDbFs: stats(rows.map(sp)), truePeakDbTp: stats(rows.map(tp)), tpMinusSpDb: stats(rows.map((row) => tp(row) - sp(row))) },
  counts: { samplePeakAbove0: rows.filter((row) => sp(row) > 0).length,
    truePeakAbove0: rows.filter((row) => tp(row) > 0).length,
    tpMinusSpAbove1: rows.filter((row) => tp(row) - sp(row) > 1).length }, representative,
  tools: { ffmpeg: ffmpeg ? "8.1.1 essentials build (local executable)" : "not run", mpg123: "mpg123-decoder package" } };
const outDir = join(root, "reports", "banana-master", "true-peak-audit");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "measurements.json"), JSON.stringify(output, null, 2) + "\n");
process.stdout.write(JSON.stringify({ distributions: output.distributions, counts: output.counts, representatives: representative.length }, null, 2) + "\n");

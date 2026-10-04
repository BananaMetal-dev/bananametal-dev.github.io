#!/usr/bin/env node
// Audit native-rate PCM peaks without writing to the input library.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";

const root = resolve(process.cwd());
const base = join(root, "reports", "banana-master", "calibration-phase2");
const outDir = join(root, "reports", "banana-master", "true-peak-audit");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "native-sample-peaks.json");
const inventory = JSON.parse(readFileSync(join(base, "inventory.json"), "utf8"));
const freeze = JSON.parse(readFileSync(join(base, "processing-freeze.json"), "utf8"));
if (resolve(inventory.inputRoot) !== resolve(freeze.inputRoot)) throw new Error("Input root mismatch");
const prior = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : { sourceSha256: freeze.sourceSha256, tracks: [] };
if (prior.sourceSha256 !== freeze.sourceSha256) throw new Error("Source freeze mismatch");
const done = new Set(prior.tracks.map((item) => item.sha256));
const decoder = new MPEGDecoder();
await decoder.ready;
try {
  for (const item of inventory.tracks.filter((row) => row.format === "mp3")) {
    if (done.has(item.sha256)) continue;
    const bytes = readFileSync(join(inventory.inputRoot, item.relativePath));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== item.sha256) throw new Error(`Input changed: ${item.trackId}`);
    let warnings = 0;
    const originalError = console.error;
    console.error = (...args) => { if (String(args[0]).startsWith("mpg123-decoder:")) warnings++; else originalError(...args); };
    let decoded;
    try { decoded = decoder.decode(bytes); } finally { console.error = originalError; }
    let peak = 0;
    for (const channel of decoded.channelData) for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
    prior.tracks.push({ trackId: item.trackId, sha256, sampleRateHz: decoded.sampleRate,
      samplePeakDbFs: peak ? 20 * Math.log10(peak) : null, decodeWarnings: Math.max(warnings, decoded.errors.length) });
    done.add(sha256);
    await decoder.reset();
    if (prior.tracks.length % 25 === 0) {
      writeFileSync(outPath, JSON.stringify(prior, null, 2) + "\n");
      process.stdout.write(`Native SP ${prior.tracks.length}/745\n`);
    }
  }
} finally { decoder.free(); }
writeFileSync(outPath, JSON.stringify(prior, null, 2) + "\n");
process.stdout.write(`Native SP complete: ${prior.tracks.length}\n`);

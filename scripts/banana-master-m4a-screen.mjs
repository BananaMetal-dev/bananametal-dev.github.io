#!/usr/bin/env node
// Browser AAC decode path for the one M4A in this local library.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(process.cwd());
const reportDir = join(root, "reports", "banana-master", "calibration-phase2");
const inventory = JSON.parse(readFileSync(join(reportDir, "inventory.json"), "utf8"));
const frozen = JSON.parse(readFileSync(join(reportDir, "processing-freeze.json"), "utf8"));
const item = inventory.tracks.find((track) => track.format === "m4a");
if (!item) throw new Error("No M4A in inventory");
const mediaBytes = readFileSync(join(inventory.inputRoot, item.relativePath));
const sampleEntry = mediaBytes.indexOf(Buffer.from("mp4a"));
const nativeRate = sampleEntry >= 0 ? mediaBytes.readUInt32BE(sampleEntry + 28) / 65536 : null;
const nativeChannels = sampleEntry >= 0 ? mediaBytes.readUInt16BE(sampleEntry + 20) : null;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5190/apps/banana-master/");
  await page.evaluate(() => { const input = document.createElement("input"); input.type = "file"; input.id = "calibration-m4a"; document.body.append(input); });
  await page.locator("#calibration-m4a").setInputFiles(join(inventory.inputRoot, item.relativePath));
  const measured = await page.evaluate(async () => {
    const file = document.querySelector("#calibration-m4a").files[0];
    const context = new AudioContext({ sampleRate: 48000 });
    const started = performance.now();
    try {
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      if (decoded.numberOfChannels !== 2) throw new Error("requires-stereo-audio");
      const audio = { sampleRate: 48000, channels: [decoded.getChannelData(0), decoded.getChannelData(1)] };
      const { analyzeAudio } = await import("/src/banana-master/analysis/analyzeAudio.ts");
      const { toDecisionInputs } = await import("/src/banana-master/decision/decisionInputs.ts");
      const { buildFormalMasterPlan } = await import("/src/banana-master/decision/formalDecision.ts");
      const analysis = analyzeAudio(audio), decision = buildFormalMasterPlan(toDecisionInputs(analysis));
      return { durationSeconds: decoded.duration, analysis, decision, elapsedMs: performance.now() - started };
    } finally { await context.close(); }
  }, undefined, { timeout: 120000 });
  const result = { trackId: item.trackId, relativePath: item.relativePath, filename: item.filename, sha256: item.sha256,
    format: "m4a", sampleRate: nativeRate, channels: nativeChannels, durationSeconds: measured.durationSeconds,
    decodeStatus: "decoded", status: "analyzed", nativeSampleRateStatus: nativeRate ? "MP4 audio sample entry" : "unknown",
    analysis: { inputSampleRate: nativeRate, evaluationSampleRate: 48000, preprocessing: "Chrome AudioContext decodeAudioData at 48 kHz",
      basic: measured.analysis.basic, loudness: measured.analysis.loudness, truePeak: measured.analysis.truePeak,
      bands: Object.fromEntries(measured.analysis.spectrum.bands.map((band) => [band.name, band.db])),
      detectorMeasurement: measured.analysis.artifacts.measurement,
      detectors: Object.fromEntries(["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"]
        .map((name) => [name, measured.analysis.artifacts[name]])),
      decision: { status: measured.decision.status, state: measured.decision.state,
        actions: measured.decision.actions, trace: measured.decision.trace, warnings: measured.decision.warnings },
      elapsedMs: measured.elapsedMs, processMemory: null } };
  writeFileSync(join(reportDir, "m4a-screening-pending.json"), JSON.stringify({ sourceSha256: frozen.sourceSha256, result }, null, 2) + "\n");
  process.stdout.write(`M4A decoded and analyzed: ${item.trackId}\n`);
} finally { await browser.close(); }

#!/usr/bin/env node
// Re-analyzes files with unreliable Node decode through the local Chrome decoder.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(process.cwd()), reportDir = join(root, "reports", "banana-master", "calibration-phase2");
const read = (name) => JSON.parse(readFileSync(join(reportDir, name), "utf8"));
const inventory = read("inventory.json"), screening = read("screening-results.json");
const candidates = screening.tracks.filter((row) => row.format === "mp3" && (row.decodeWarnings?.length || row.status !== "analyzed"));
const pending = { sourceSha256: screening.sourceSha256, results: [] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5190/apps/banana-master/");
  await page.evaluate(() => { const input = document.createElement("input"); input.type = "file"; input.id = "calibration-fallback"; document.body.append(input); });
  for (const row of candidates) {
    try {
      await page.locator("#calibration-fallback").setInputFiles(join(inventory.inputRoot, row.relativePath));
      const measured = await page.evaluate(async () => {
        const file = document.querySelector("#calibration-fallback").files[0];
        const context = new AudioContext({ sampleRate: 48000 }), started = performance.now();
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
      pending.results.push({ trackId: row.trackId, relativePath: row.relativePath, filename: row.filename, sha256: row.sha256,
        format: row.format, sampleRate: row.sampleRate, channels: 2, durationSeconds: measured.durationSeconds,
        decodeStatus: "decoded-browser", status: "analyzed", browserFallback: { originalDecoderWarningCount: row.decodeWarnings?.length ?? 0,
          originalStatus: row.status, originalTruePeakDbTp: row.analysis?.truePeak?.truePeakDbTp ?? null,
          originalLufs: row.analysis?.loudness?.integratedLufs ?? null },
        analysis: { inputSampleRate: row.sampleRate, evaluationSampleRate: 48000,
          preprocessing: "Chrome AudioContext decodeAudioData at 48 kHz",
          basic: measured.analysis.basic, loudness: measured.analysis.loudness, truePeak: measured.analysis.truePeak,
          bands: Object.fromEntries(measured.analysis.spectrum.bands.map((band) => [band.name, band.db])),
          detectorMeasurement: measured.analysis.artifacts.measurement,
          detectors: Object.fromEntries(["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"]
            .map((name) => [name, measured.analysis.artifacts[name]])),
          decision: { status: measured.decision.status, state: measured.decision.state,
            actions: measured.decision.actions, trace: measured.decision.trace, warnings: measured.decision.warnings },
          elapsedMs: measured.elapsedMs, processMemory: null } });
      writeFileSync(join(reportDir, "browser-fallback-pending.json"), JSON.stringify(pending, null, 2) + "\n");
      process.stdout.write(`Browser fallback analyzed: ${row.trackId}\n`);
    } catch (error) {
      pending.results.push({ ...row, status: "unknown", reason: `browser-fallback-failed:${String(error.message)}` });
      writeFileSync(join(reportDir, "browser-fallback-pending.json"), JSON.stringify(pending, null, 2) + "\n");
      process.stdout.write(`Browser fallback unknown: ${row.trackId}\n`);
    }
  }
} finally { await browser.close(); }
process.stdout.write(`Browser fallback complete: ${pending.results.length} candidates\n`);

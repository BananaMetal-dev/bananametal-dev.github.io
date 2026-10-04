import { existsSync } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { encodeFixtureMp3 } from "./mp3-fixture";

const fixtures = process.env.BANANA_MASTER_FIXTURES ?? resolve(process.cwd(), "../Banana Master/Banana_Master_Test_Tracks_V1");
const fixture = (name: string) => resolve(fixtures, name);

test("01 browser worker returns no-change and exports the canonical master", async ({ page }) => {
  test.skip(!existsSync(fixture("01_balanced_reference.wav")), "External fixtures unavailable");
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(fixture("01_balanced_reference.wav"));
  await expect(page.getByRole("heading", { name: "補正なし" })).toBeVisible();
  await expect(page.getByText("出力検証済み")).toBeVisible();
  await page.getByLabel("開発用 Debug Mode").check();
  const debug = page.locator("pre");
  await expect(debug).toContainText('"filename": "01_balanced_reference.wav"');
  await expect(debug).toContainText('"workerUsed": true');
  await expect(debug).toContainText('"action": "no-change"');
  const formal = JSON.parse(await debug.innerText()).analysis;
  expect(formal.loudness).toMatchObject({ status: "valid", standard: "ITU-R BS.1770-5", conformance: "unknown" });
  expect(formal.truePeak).toMatchObject({ status: "valid", standard: "ITU-R BS.1770-5 Annex 2", conformance: "unknown" });
  expect(formal.truePeak.truePeakDbTp).toBeGreaterThanOrEqual(formal.truePeak.samplePeakDbFs);
  const decision = JSON.parse(await debug.innerText()).decisionEngine;
  expect(decision).toMatchObject({ status: "valid", state: "OK", actions: [] });
  await expect(page.getByRole("heading", { name: "DECISION ENGINE" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ARTIFACT ANALYSIS" })).toBeVisible();
  expect(formal.artifacts.hfSmear).toMatchObject({ status: "valid", detected: false });
  expect(formal.artifacts.metallicRinging).toMatchObject({ status: "valid", detected: false });
  for (const name of ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"]) {
    expect(formal.artifacts[name]).toMatchObject({ status: "valid", detected: false });
    expect(formal.artifacts[name].evidence).toBeTruthy();
  }
  await page.getByRole("button", { name: "Original 再生" }).click();
  await expect(page.getByRole("button", { name: "Original 再生" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Master 再生" }).click();
  await expect(page.getByRole("button", { name: "Master 再生" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "停止" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "24-bit WAV保存" }).click()]);
  expect(download.suggestedFilename()).toBe("01_balanced_reference-banana-master.wav");
  const [debugDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Debug JSON保存" }).click()]);
  expect(debugDownload.suggestedFilename()).toBe("01_balanced_reference.wav.debug.json");
});

test("02 applies one HF action through formal DSP", async ({ page }) => {
  test.skip(!existsSync(fixture("02_hf_smear.wav")), "External fixtures unavailable");
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(fixture("02_hf_smear.wav"));
  await expect(page.getByText("出力検証済み")).toBeVisible();
  await page.getByLabel("開発用 Debug Mode").check();
  const report = JSON.parse(await page.locator("pre").innerText());
  expect(report.decisionEngine.actions.map((action: { kind: string }) => action.kind)).toEqual(["dynamic-high-band-reduction"]);
  expect(report.decisionEngine.actions[0].execution).toBe("planned-only");
  expect(report.processing.selectedDsp).toContain("dynamic-high-band-reduction");
  expect(report.dspExecution.actions[0].actualMaxDb).toBeGreaterThan(0);
  expect(report.postAnalysis.loudness.status).toBe("valid");
});

test("03 ringing is measured in the browser worker and preserved in Debug JSON", async ({ page }) => {
  test.skip(!existsSync(fixture("03_metallic_ringing_14k7.wav")), "External fixtures unavailable");
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(fixture("03_metallic_ringing_14k7.wav"));
  await expect(page.getByText("出力検証済み")).toBeVisible();
  await page.getByLabel("開発用 Debug Mode").check();
  const report = JSON.parse(await page.locator("pre").innerText());
  expect(report.analysis.artifacts.metallicRinging).toMatchObject({ status: "valid", detected: true });
  expect(report.decisionEngine.actions.map((action: { kind: string }) => action.kind)).toContain("dynamic-notch");
  expect(Math.abs(report.analysis.artifacts.metallicRinging.evidence.peakFrequencyHz - 14700)).toBeLessThanOrEqual(20);
  expect(report.analysis.artifacts.metallicRinging.timeline.length).toBeGreaterThan(0);
  expect(report.performance.workerUsed).toBe(true);
});

test("05 browser worker contains peak", async ({ page }) => {
  test.skip(!existsSync(fixture("05_hot_loud_peaks.wav")), "External fixtures unavailable");
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(fixture("05_hot_loud_peaks.wav"));
  await expect(page.getByRole("heading", { name: "ピークを抑制" })).toBeVisible();
  await expect(page.getByText("出力検証済み")).toBeVisible();
});

test("08 ten-minute file completes in the browser worker", async ({ page }) => {
  test.skip(!existsSync(fixture("08_stress_10min_48k_stereo.wav")), "External fixtures unavailable");
  test.setTimeout(120_000);
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(fixture("08_stress_10min_48k_stereo.wav"));
  const responsiveStart = Date.now();
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
  expect(Date.now() - responsiveStart).toBeLessThan(2000);
  await expect(page.getByText("出力検証済み")).toBeVisible({ timeout: 110_000 });
  await page.getByLabel("開発用 Debug Mode").check();
  await expect(page.locator("pre")).toContainText('"workerUsed": true');
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "24-bit WAV保存" }).click()]);
  const savedPath = await download.path();
  expect(savedPath).toBeTruthy();
  expect((await stat(savedPath!)).size).toBe(172_800_044);
  const file = await open(savedPath!, "r");
  try {
    const header = Buffer.alloc(44);
    await file.read(header, 0, header.length, 0);
    expect(header.toString("ascii", 0, 4)).toBe("RIFF");
    expect(header.toString("ascii", 8, 12)).toBe("WAVE");
    expect(header.readUInt16LE(34)).toBe(24);
    expect(header.readUInt32LE(40)).toBe(172_800_000);
  } finally { await file.close(); }
  await expect(page.locator("pre")).toContainText('"encodeMs":');
  const report = JSON.parse(await page.locator("pre").innerText());
  expect(report.analysis.loudness.status).toBe("valid");
  expect(report.postAnalysis.loudness.status).toBe("valid");
  expect(report.dspExecution.processingMs).toBeGreaterThan(0);
  expect(report.verification.success).toBe(true);
  expect(report.analysis.truePeak.status).toBe("valid");
  expect(report.analysis.artifacts.measurement.sampledFrames).toBeGreaterThan(0);
  expect(report.analysis.artifacts.measurement.sampledFrames).toBeLessThanOrEqual(2400);
  expect(report.performance.analysisMs).toBeGreaterThan(0);
  expect(report.performance.decisionMs).toBeGreaterThan(0);
  expect(report.performance.encodeMs).toBeGreaterThan(0);
  expect(report.performance.approximateMemoryBytes).toBeGreaterThan(172_800_044);
  console.log(`Banana Master 10min: analysis ${report.performance.analysisMs.toFixed(0)} ms, DSP+post ${report.performance.renderMs.toFixed(0)} ms, encode ${report.performance.encodeMs.toFixed(0)} ms, approx memory ${Math.round(report.performance.approximateMemoryBytes / 1048576)} MiB`);
});

test("MP3 audio completes local decode, worker, playback, WAV and Debug export", async ({ page }, testInfo) => {
  const suppliedMp3 = process.env.BANANA_MASTER_REAL_MP3;
  test.skip(!suppliedMp3 && !existsSync(fixture("01_balanced_reference.wav")), "External fixtures unavailable");
  test.setTimeout(90_000);
  const mp3Path = suppliedMp3 ?? testInfo.outputPath("balanced-reference.mp3");
  if (!suppliedMp3) await encodeFixtureMp3(fixture("01_balanced_reference.wav"), mp3Path);
  const filename = basename(mp3Path);
  expect((await stat(mp3Path)).size).toBeGreaterThan(100_000);
  const outbound: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method()) || !request.url().startsWith("http://127.0.0.1:5190/")) outbound.push(`${request.method()} ${request.url()}`);
  });
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(mp3Path);
  await expect(page.getByText("出力検証済み")).toBeVisible();
  await expect(page.getByText(filename, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Original 再生" }).click();
  await expect(page.getByRole("button", { name: "Original 再生" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Master 再生" }).click();
  await expect(page.getByRole("button", { name: "Master 再生" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "停止" }).click();
  await page.getByLabel("開発用 Debug Mode").check();
  const [wavDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "24-bit WAV保存" }).click()]);
  const wavPath = await wavDownload.path();
  expect(wavPath).toBeTruthy();
  expect((await stat(wavPath!)).size).toBeGreaterThan(100_000);
  const [debugDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Debug JSON保存" }).click()]);
  const debugPath = await debugDownload.path();
  const report = JSON.parse(await readFile(debugPath!, "utf8"));
  expect(report.testedFile.filename).toBe(filename);
  expect(report.performance.workerUsed).toBe(true);
  expect(report.analysis.artifacts.hfSmear.status).toBe("valid");
  expect(report.decisionEngine.actions.every((action: { execution: string }) => action.execution === "planned-only")).toBe(true);
  expect(report.output.success).toBe(true);
  expect(report.privacy.audioUpload).toBe(false);
  expect(outbound).toEqual([]);
});

test("blind listening uses matched preview gain and preserves a shared playback position", async ({ page }) => {
  test.skip(!existsSync(fixture("01_balanced_reference.wav")), "External fixtures unavailable");
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(fixture("01_balanced_reference.wav"));
  await expect(page.getByText("出力検証済み")).toBeVisible();
  const panel = page.getByRole("region", { name: "音量一致ブラインド比較" });
  await expect(panel.getByRole("note")).toContainText("試聴比較は不要");
  await panel.getByRole("button", { name: "比較を開始" }).click();
  await expect(page.getByRole("button", { name: "Original 再生" })).toHaveCount(0);
  await panel.getByRole("slider", { name: "比較再生位置" }).fill("5");
  await panel.getByRole("button", { name: "A 再生" }).click();
  await expect(panel.getByRole("button", { name: "A 再生" })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "B 再生" }).click();
  await expect(panel.getByRole("button", { name: "B 再生" })).toHaveAttribute("aria-pressed", "true");
  expect(Number(await panel.getByRole("slider", { name: "比較再生位置" }).inputValue())).toBeGreaterThanOrEqual(5);
  await panel.getByRole("button", { name: "差が分からない" }).click();
  await expect(panel.getByRole("status")).toContainText("回答: no-difference");
  await panel.getByRole("spinbutton", { name: "問題の時間位置" }).fill("5.2");
  await panel.getByRole("textbox", { name: "試聴コメント" }).fill("test note");
  const [download] = await Promise.all([page.waitForEvent("download"), panel.getByRole("button", { name: "試聴結果JSON保存" }).click()]);
  const record = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(record).toMatchObject({ filename: "01_balanced_reference.wav", preference: "no-difference", problemTimeSeconds: 5.2,
    exportMasterBufferModified: false, loudnessMatch: { status: "matched" } });
  expect(record.loudnessMatch.originalGain).toBeLessThanOrEqual(1);
  expect(record.loudnessMatch.masterGain).toBeLessThanOrEqual(1);
  expect(JSON.stringify(record)).not.toContain("channels");
});

test("selected real recording runs through the browser Worker and Debug report", async ({ page }) => {
  const selectionPath = resolve(process.cwd(), "reports/banana-master/real-tracks-v1/selection.json");
  test.skip(!existsSync(selectionPath), "Real-track selection unavailable");
  const selection = JSON.parse(await readFile(selectionPath, "utf8")) as { sourceRoot: string; tracks: string[] };
  const realTrack = resolve(selection.sourceRoot, selection.tracks[15]);
  test.skip(!existsSync(realTrack), "Selected real recording unavailable");
  test.setTimeout(90_000);
  await page.goto("/apps/banana-master/");
  await page.locator('input[type="file"]').setInputFiles(realTrack);
  await expect(page.getByText("出力検証済み")).toBeVisible({ timeout: 80_000 });
  await page.getByLabel("開発用 Debug Mode").check();
  const report = JSON.parse(await page.locator("pre").innerText());
  expect(report.testedFile.filename).toBe(basename(realTrack));
  expect(report.performance.workerUsed).toBe(true);
  expect(report.processingVersions.decision).toBe("provisional-v1");
  expect(report.preAnalysis.loudness.status).toBe("valid");
  expect(report.postAnalysis.loudness.status).toBe("valid");
  expect(report.verification.success).toBe(true);
  expect(report.privacy.audioUpload).toBe(false);
  await expect(page.getByRole("region", { name: "音量一致ブラインド比較" })).toBeVisible();
});

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const auditPath = resolve(process.cwd(), "reports/banana-master/true-peak-audit/measurements.json");
const audit = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, "utf8")) as {
  inputRoot: string; representative: { trackId: string; relativePath: string; inputSha256: string;
    appAt48k: { truePeakDbTp: number } }[] } : null;
const output = resolve(process.cwd(), "reports/banana-master/true-peak-safety");

test.describe("top-five MP3 True Peak safety", () => {
  test.skip(process.env.BANANA_TP_SAFETY_MP3_RUN !== "1" || !audit, "Real MP3 safety run is opt-in");
  for (const item of audit?.representative.slice(0, 5) ?? []) {
    test(`${item.trackId} full-length browser Worker and 24-bit export`, async ({ page }) => {
      test.setTimeout(180_000);
      const path = resolve(audit!.inputRoot, item.relativePath);
      expect(path.startsWith(resolve(audit!.inputRoot) + "\\")).toBe(true);
      expect(existsSync(path)).toBe(true);
      const sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
      expect(sha256).toBe(item.inputSha256);
      const outbound: string[] = [];
      page.on("request", (request) => {
        if (!["GET", "HEAD"].includes(request.method()) || !request.url().startsWith("http://127.0.0.1:5190/")) outbound.push(`${request.method()} ${request.url()}`);
      });
      await page.goto("/apps/banana-master/");
      await page.locator('input[type="file"]').setInputFiles(path);
      await expect(page.getByText("出力検証済み")).toBeVisible({ timeout: 150_000 });
      await page.getByLabel("開発用 Debug Mode").check();
      const debug = JSON.parse(await page.locator("pre").innerText());
      expect(debug.testedFile.filename).toBe(basename(path));
      expect(debug.truePeakSafety.ceilingDbTp).toBe(-1);
      expect(debug.truePeakSafety.verificationStatus).toBe("verified");
      expect(debug.truePeakSafety.decoderWarning).toBe("none-observed");
      expect(debug.truePeakSafety.finalTruePeakDbTp).toBeLessThanOrEqual(-1);
      expect(debug.verification.peak).toBeLessThan(1);
      expect(debug.verification.clippingSamples).toBe(0);
      expect(debug.verification.success).toBe(true);
      expect(debug.performance.workerUsed).toBe(true);
      expect(Number.isFinite(debug.truePeakSafety.inputTruePeakDbTp)).toBe(true);
      expect(debug.truePeakSafety.inputTruePeakDbTp).toBeCloseTo(item.appAt48k.truePeakDbTp, 2);
      if (item.trackId === "track-0036") expect(debug.truePeakSafety.inputTruePeakDbTp).toBeGreaterThan(10);
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "24-bit WAV保存" }).click()]);
      const saved = await download.path();
      expect(saved).toBeTruthy();
      const handle = await open(saved!, "r");
      const header = Buffer.alloc(44);
      try { await handle.read(header, 0, 44, 0); } finally { await handle.close(); }
      expect(header.toString("ascii", 0, 4)).toBe("RIFF");
      expect(header.toString("ascii", 8, 12)).toBe("WAVE");
      expect(header.readUInt16LE(34)).toBe(24);
      expect((await stat(saved!)).size).toBe(header.readUInt32LE(40) + 44);
      expect(outbound).toEqual([]);
      mkdirSync(output, { recursive: true });
      const row = { trackId: item.trackId, filename: basename(path), inputSha256: sha256,
        durationSeconds: debug.input.duration, auditInputTruePeakDbTp: item.appAt48k.truePeakDbTp,
        inputRms: debug.analysis.basic.rms, inputSamplePeakDbFs: debug.truePeakSafety.inputSamplePeakDbFs,
        inputTruePeakDbTp: debug.truePeakSafety.inputTruePeakDbTp,
        preSafetyTruePeakDbTp: debug.truePeakSafety.preSafetyTruePeakDbTp,
        appliedSafetyGainDb: debug.truePeakSafety.appliedSafetyGainDb,
        finalSamplePeakDbFs: debug.truePeakSafety.finalSamplePeakDbFs,
        finalTruePeakDbTp: debug.truePeakSafety.finalTruePeakDbTp,
        verificationStatus: debug.truePeakSafety.verificationStatus,
        decoderWarning: debug.truePeakSafety.decoderWarning,
        originalPcmUnchanged: debug.dspExecution.originalUnchanged,
        clippingSamples: debug.verification.clippingSamples, outputVerified: debug.verification.success,
        wavBytes: (await stat(saved!)).size, outboundRequests: outbound.length };
      const file = join(output, "top5-browser.json");
      const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as { tracks: typeof row[] } : { tracks: [] as typeof row[] };
      const tracks = [...previous.tracks.filter((entry) => entry.trackId !== item.trackId), row].sort((a, b) => a.trackId.localeCompare(b.trackId));
      writeFileSync(file, JSON.stringify({ source: "Browser mpg123 decode, windowed-sinc 48 kHz resample, Chrome DSP Worker", tracks }, null, 2) + "\n");
    });
  }
  test("track-0316 decoder warnings are retained and export is blocked", async ({ page }) => {
    test.setTimeout(180_000);
    const item = audit?.representative.find((entry) => entry.trackId === "track-0316");
    expect(item).toBeTruthy();
    const path = resolve(audit!.inputRoot, item!.relativePath);
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(item!.inputSha256);
    await page.goto("/apps/banana-master/");
    await page.locator('input[type="file"]').setInputFiles(path);
    await expect(page.getByText("出力検証失敗")).toBeVisible({ timeout: 150_000 });
    await page.getByLabel("開発用 Debug Mode").check();
    const debug = JSON.parse(await page.locator("pre").innerText());
    expect(debug.truePeakSafety.decoderWarning).toBe("present");
    expect(debug.truePeakSafety.decoderWarningCount).toBeGreaterThan(0);
    expect(debug.truePeakSafety.verificationStatus).toBe("decoder-warning");
    expect(debug.verification.success).toBe(false);
    await expect(page.getByRole("button", { name: "24-bit WAV保存" })).toBeDisabled();
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, "warning-case.json"), JSON.stringify({ trackId: item!.trackId,
      inputSha256: item!.inputSha256, decoderWarningCount: debug.truePeakSafety.decoderWarningCount,
      inputTruePeakDbTp: debug.truePeakSafety.inputTruePeakDbTp,
      finalTruePeakDbTp: debug.truePeakSafety.finalTruePeakDbTp,
      verificationStatus: debug.truePeakSafety.verificationStatus,
      outputVerified: debug.verification.success, exportEnabled: false }, null, 2) + "\n");
  });
});

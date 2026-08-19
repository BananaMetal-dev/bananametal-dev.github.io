import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("converts WAV to MP3, downloads it, and converts the MP3 back to WAV", async ({ page }, testInfo) => {
  await page.goto("/apps/wav-mp3-converter/");
  await expect(page.getByRole("heading", { name: "WAV ⇄ MP3 バッチ変換" })).toBeVisible();

  await page.locator("#file-input").setInputFiles({ name: "tone.wav", mimeType: "audio/wav", buffer: makeWav() });
  await expect(page.getByText("tone.wav", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /変換を開始/ }).click();
  await expect(page.getByText("処理が完了しました")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("完了", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存" }).click();
  const download = await downloadPromise;
  const mp3Path = join(testInfo.outputDir, "tone.mp3");
  await download.saveAs(mp3Path);
  expect((await readFile(mp3Path)).byteLength).toBeGreaterThan(1000);

  await page.getByRole("button", { name: "MP3 → WAV" }).click();
  await expect(page.getByText(/失われた音質は復元されません/)).toBeVisible();
  await page.locator("#file-input").setInputFiles(mp3Path);
  await page.getByRole("button", { name: /変換を開始/ }).click();
  await expect(page.getByText("処理が完了しました")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("完了", { exact: true })).toBeVisible();
});

test("switches every interface label to English and fits a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/apps/wav-mp3-converter/");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: "WAV ⇄ MP3 Batch Converter" })).toBeVisible();
  await expect(page.getByText("Conversion settings")).toBeVisible();
  await expect(page.getByText("Conversion queue")).toBeVisible();
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("cancels active work and exposes the app from the Apps catalog", async ({ page }) => {
  await page.goto("/apps/wav-mp3-converter/");
  await page.locator("#file-input").setInputFiles({ name: "long.wav", mimeType: "audio/wav", buffer: makeWav(20) });
  await page.getByRole("button", { name: /変換を開始/ }).click();
  await page.getByRole("button", { name: "キャンセル" }).click();
  await expect(page.getByText("キャンセル済み", { exact: true })).toBeVisible();

  await page.goto("/apps/");
  const converterCard = page.locator("article").filter({ hasText: "WAV ⇄ MP3" });
  const appLink = converterCard.getByRole("link");
  await expect(appLink).toHaveAttribute("href", "/apps/wav-mp3-converter/");
  const preview = converterCard.locator('img[src*="wav-mp3-converter-preview"]');
  await expect(preview).toBeVisible();
  expect(await preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

function makeWav(durationSeconds = 0.25): Buffer {
  const sampleRate = 44_100;
  const frames = Math.round(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + frames * 2, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(frames * 2, 40);
  for (let index = 0; index < frames; index += 1) buffer.writeInt16LE(Math.round(Math.sin(index / sampleRate * Math.PI * 2 * 440) * 12_000), 44 + index * 2);
  return buffer;
}

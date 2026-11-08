import { expect, test } from "@playwright/test";
import { join } from "node:path";

test("loops an animated GIF through WebM export and hides the visualizer", async ({ page }) => {
  await page.goto("/apps/visualizer/index.html");
  await page.locator("#imageFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-loop.gif"));
  await expect(page.locator("#imageAssetState")).toHaveText("読み込み済み");
  await page.locator("#shapeSelect").selectOption("none");
  await expect(page.locator("#shapeSelect")).toHaveValue("none");
  await page.locator("#timelineSilentButton").click();
  await page.locator("#durationInput").fill("0.7");
  await page.locator("#playButton").click();
  const previewColors = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#previewCanvas")!;
    const context = canvas.getContext("2d")!;
    const sequence: string[] = [];
    const deadline = performance.now() + 1500;
    while (performance.now() < deadline && sequence.join("").indexOf("RBR") === -1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const pixel = context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      const color = pixel[0] > pixel[2] + 80 ? "R" : pixel[2] > pixel[0] + 80 ? "B" : "?";
      if (sequence.at(-1) !== color) sequence.push(color);
    }
    return sequence.join("");
  });
  expect(previewColors).toContain("RBR");
  await page.locator("#playButton").click();
  await page.locator("#durationInput").fill("0.5");
  await page.locator("#fpsSelect").selectOption("30");
  await page.locator("#renderButton").click();
  await expect(page.locator("#statusText")).toHaveText("書き出しが完了しました", { timeout: 45_000 });

  const colors = await page.evaluate(async () => {
    const video = document.querySelector<HTMLVideoElement>("#resultVideo")!;
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) return resolve();
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const sample = async (time: number) => {
      await new Promise<void>((resolve) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
        video.currentTime = time;
      });
      context.drawImage(video, 0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };
    return [await sample(0.05), await sample(0.15), await sample(0.25)];
  });
  expect(colors[0][0]).toBeGreaterThan(colors[0][2] + 80);
  expect(colors[1][2]).toBeGreaterThan(colors[1][0] + 80);
  expect(colors[2][0]).toBeGreaterThan(colors[2][2] + 80);

  await expect(page.locator("#mp4Button")).toBeEnabled();
  await page.locator("#mp4Button").click();
  await expect(page.locator("#statusText")).toHaveText("MP4変換が完了しました", { timeout: 45_000 });
  await expect(page.locator("#mp4DownloadLink")).toHaveAttribute("href", /^blob:/);
});

test("still images continue to load after animated GIF support is added", async ({ page }) => {
  await page.goto("/apps/visualizer/index.html");
  await page.locator("#imageFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-still.png"));
  await expect(page.locator("#imageAssetState")).toHaveText("読み込み済み");
  await page.locator("#shapeSelect").selectOption("none");
  await expect.poll(() => page.locator("#previewCanvas").evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d")!;
    const center = context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    const lower = context.getImageData(canvas.width / 2, canvas.height * 0.65, 1, 1).data;
    return center[1] > center[0] + 80 && center[1] > center[2] + 80
      && [0, 1, 2].every((channel) => Math.abs(center[channel] - lower[channel]) < 10);
  })).toBe(true);
});

test("loops the GIF until the audio ends", async ({ page }) => {
  await page.goto("/apps/visualizer/index.html");
  await page.locator("#imageFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-loop.gif"));
  await expect(page.locator("#imageAssetState")).toHaveText("読み込み済み");
  await page.locator("#audioFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-half-second.wav"));
  await expect(page.locator("#audioAssetState")).toHaveText("読み込み済み");
  await page.locator("#shapeSelect").selectOption("none");
  await page.locator("#fpsSelect").selectOption("30");
  await page.locator("#renderButton").click();
  await expect(page.locator("#statusText")).toHaveText("書き出しが完了しました", { timeout: 45_000 });
  const result = await page.evaluate(async () => {
    const video = document.querySelector<HTMLVideoElement>("#resultVideo")!;
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) return resolve();
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.currentTime = 0.25;
    });
    context.drawImage(video, 0, 0, 1, 1);
    return { duration: video.duration, pixel: Array.from(context.getImageData(0, 0, 1, 1).data) };
  });
  expect(result.duration).toBeGreaterThanOrEqual(0.5);
  expect(result.duration).toBeLessThan(0.6);
  expect(result.pixel[0]).toBeGreaterThan(result.pixel[2] + 80);
});

test("offers low frame rates and keeps the selected output duration at 1 fps", async ({ page }) => {
  await page.goto("/apps/visualizer/index.html");
  await page.locator("#imageFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-still.png"));
  await expect(page.locator("#imageAssetState")).toHaveText("読み込み済み");
  for (const fps of ["5", "10", "20", "1"]) {
    await page.locator("#fpsSelect").selectOption(fps);
    await expect(page.locator("#previewReadout")).toContainText(`${fps}fps`);
  }
  await page.locator("#timelineSilentButton").click();
  await page.locator("#durationInput").fill("1.5");
  await page.locator("#renderButton").click();
  await expect(page.locator("#statusText")).toHaveText("書き出しが完了しました", { timeout: 45_000 });
  const duration = await page.locator("#resultVideo").evaluate(async (video: HTMLVideoElement) => {
    if (video.readyState < 1) {
      await new Promise<void>((resolve) => video.addEventListener("loadedmetadata", () => resolve(), { once: true }));
    }
    return video.duration;
  });
  expect(duration).toBeGreaterThan(1.45);
  expect(duration).toBeLessThan(1.55);
});

test("changing frame rate keeps imported media and the preview", async ({ page }) => {
  await page.goto("/apps/visualizer/index.html");
  await page.locator("#imageFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-still.png"));
  await page.locator("#audioFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-half-second.wav"));
  await page.locator("#watermarkFileInput").setInputFiles(join(process.cwd(), "tests/fixtures/visualizer-still.png"));
  for (const kind of ["image", "audio", "watermark"]) {
    await expect(page.locator(`#${kind}AssetState`)).toHaveText("読み込み済み");
  }
  await page.locator("#shapeSelect").selectOption("none");
  const centerPixel = () => page.locator("#previewCanvas").evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext("2d")!.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    return Array.from(data).slice(0, 3);
  });
  await expect.poll(async () => {
    const pixel = await centerPixel();
    return pixel[1] > pixel[0] + 80 && pixel[1] > pixel[2] + 80;
  }).toBe(true);

  for (const fps of ["1", "5", "10", "20", "30", "60"]) {
    await page.locator("#fpsSelect").selectOption(fps);
    await expect(page.locator("#previewReadout")).toContainText(`${fps}fps`);
    for (const kind of ["image", "audio", "watermark"]) {
      await expect(page.locator(`#${kind}AssetState`)).toHaveText("読み込み済み");
    }
    const pixel = await centerPixel();
    expect(pixel[1]).toBeGreaterThan(pixel[0] + 80);
    expect(pixel[1]).toBeGreaterThan(pixel[2] + 80);
  }
});

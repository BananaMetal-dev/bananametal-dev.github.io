import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join, basename } from "node:path";

const distDir = "dist";
const routeDirs = ["apps", "apps/key-player", "music", "contact", "privacy"];
const sourceIndex = join(distDir, "index.html");

await Promise.all(
  routeDirs.map(async (route) => {
    const targetDir = join(distDir, route);
    await mkdir(targetDir, { recursive: true });
    await copyFile(sourceIndex, join(targetDir, "index.html"));
  }),
);

const fingerprintTargets = [
  "favicon.svg",
  "shared-language.js",
  "apps/visualizer/styles.css",
  "apps/visualizer/mediabunny.js",
  "apps/visualizer/webcodecs-renderer.js",
  "apps/visualizer/app.js",
  "apps/prompt-generator/styles.css",
  "apps/prompt-generator/app.js",
];

const rewrittenAssets = new Map();

for (const target of fingerprintTargets) {
  const sourcePath = join(distDir, target);
  const assetBuffer = await readFile(sourcePath);
  const hash = createHash("sha256").update(assetBuffer).digest("hex").slice(0, 8);
  const ext = extname(target);
  const base = basename(target, ext);
  const dir = dirname(target);
  const fingerprintedPath = join(dir, `${base}.${hash}${ext}`);
  const fingerprintedFsPath = join(distDir, fingerprintedPath);

  await writeFile(fingerprintedFsPath, assetBuffer);
  await unlink(sourcePath);
  rewrittenAssets.set(normalizeUrlPath(target), normalizeUrlPath(fingerprintedPath));
}

const htmlFiles = await collectHtmlFiles(distDir);
for (const htmlFile of htmlFiles) {
  const htmlPath = join(distDir, htmlFile);
  let html = await readFile(htmlPath, "utf8");

  for (const [originalPath, fingerprintedPath] of rewrittenAssets.entries()) {
    const fingerprintedUrl = fingerprintedPath.startsWith("apps/")
      ? fingerprintedPath.split("/").slice(-1)[0]
      : `/${fingerprintedPath}`;

    if (originalPath === "favicon.svg") {
      html = html.replaceAll("/favicon.svg", fingerprintedUrl);
      continue;
    }

    if (originalPath === "shared-language.js") {
      html = html.replaceAll("/shared-language.js", fingerprintedUrl);
      continue;
    }

    if (originalPath.endsWith("styles.css")) {
      html = html.replaceAll(
        new RegExp(`href="(?:\\./|/)?styles\\.css(?:\\?[^"]*)?"`, "g"),
        `href="${fingerprintedUrl}"`,
      );
      continue;
    }

    if (originalPath.endsWith("app.js")) {
      html = html.replaceAll(
        new RegExp(`src="(?:\\./|/)?app\\.js"`, "g"),
        `src="${fingerprintedUrl}"`,
      );
      continue;
    }

    if (originalPath.endsWith("mediabunny.js") || originalPath.endsWith("webcodecs-renderer.js")) {
      html = html.replaceAll(
        new RegExp(`src="(?:\\./|/)?${basename(originalPath, ".js")}\\.js"`, "g"),
        `src="${fingerprintedUrl}"`,
      );
      continue;
    }
  }

  await writeFile(htmlPath, html);
}

async function collectHtmlFiles(dir, base = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const relativePath = base ? join(base, entry.name) : entry.name;
    const absolutePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await collectHtmlFiles(absolutePath, relativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(relativePath);
    }
  }

  return results;
}

function normalizeUrlPath(filePath) {
  return filePath.split("\\").join("/");
}

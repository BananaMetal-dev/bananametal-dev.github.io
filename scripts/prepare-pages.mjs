import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const distDir = "dist";
const routeDirs = ["apps", "music", "contact", "privacy"];
const sourceIndex = join(distDir, "index.html");

await Promise.all(
  routeDirs.map(async (route) => {
    const targetDir = join(distDir, route);
    await mkdir(targetDir, { recursive: true });
    await copyFile(sourceIndex, join(targetDir, "index.html"));
  }),
);

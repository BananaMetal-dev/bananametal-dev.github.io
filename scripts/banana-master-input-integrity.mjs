#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const folder = join(resolve(process.cwd()), "reports", "banana-master", "calibration-phase2");
const before = JSON.parse(readFileSync(join(folder, "inventory-prevalidation.json"), "utf8"));
const after = JSON.parse(readFileSync(join(folder, "inventory.json"), "utf8"));
if (before.inputRoot !== after.inputRoot) throw new Error("Input root changed");
const earlier = new Map(before.tracks.map((item) => [item.relativePath, item.sha256]));
const changed = after.tracks.filter((item) => earlier.get(item.relativePath) !== item.sha256).map((item) => item.relativePath);
const removed = before.tracks.filter((item) => !after.tracks.some((later) => later.relativePath === item.relativePath)).map((item) => item.relativePath);
const result = { beforeCount: before.tracks.length, afterCount: after.tracks.length,
  matchingSha256: after.tracks.length - changed.length, changed, removed, status: changed.length || removed.length ? "changed" : "unchanged" };
writeFileSync(join(folder, "input-integrity.json"), JSON.stringify(result, null, 2) + "\n");
process.stdout.write(`Input integrity: ${result.status}, ${result.matchingSha256}/${result.afterCount} matching SHA-256\n`);

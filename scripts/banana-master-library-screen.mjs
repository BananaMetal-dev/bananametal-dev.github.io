#!/usr/bin/env node
// Local, resumable calibration screening. Input files are opened read-only.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { MPEGDecoder } from "mpg123-decoder";
import { createServer } from "vite";

const root = resolve(process.cwd());
if (!process.argv[2] || process.argv[2].startsWith("--")) throw new Error("Usage: node scripts/banana-master-library-screen.mjs <audio-directory> [--inventory-only|--restart|--max=N]");
const inputRoot = resolve(process.argv[2]);
const dataset = process.argv.find((value) => value.startsWith("--dataset="))?.slice("--dataset=".length) ?? "calibration-phase2";
if (!/^calibration-[a-z0-9-]+$/.test(dataset)) throw new Error("Invalid calibration dataset name");
const output = join(root, "reports", "banana-master", dataset);
const flags = new Set(process.argv.slice(3));
const maxTracks = Number(process.argv.find((value) => value.startsWith("--max="))?.split("=")[1] ?? Infinity);
const sampleTracks = Number(process.argv.find((value) => value.startsWith("--sample="))?.split("=")[1] ?? Infinity);
if (!(sampleTracks === Infinity || Number.isInteger(sampleTracks) && sampleTracks > 0)) throw new Error("Invalid sample count");
const detectorNames = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"];
const sourceFiles = [
  "analysis/analyzeAudio.ts", "analysis/artifacts/analyzeArtifacts.ts", "analysis/artifacts/detectors.ts",
  "analysis/artifacts/features.ts", "analysis/basic/metrics.ts", "analysis/loudness/integrated.ts",
  "analysis/spectrum/bandEnergy.ts", "analysis/truePeak/truePeak.ts", "decision/decisionInputs.ts",
  "decision/formalDecision.ts", "decision/formalMasterPlan.ts", "dsp/formalDsp.ts",
].map((path) => `src/banana-master/${path}`);

mkdirSync(output, { recursive: true });
function save(name, value) {
  const target = join(output, name), temporary = `${target}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, (_key, item) => typeof item === "number" && !Number.isFinite(item) ? null : item, 2) + "\n");
  renameSync(temporary, target);
}
function load(name, fallback) {
  const file = join(output, name);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
}
function listAudio(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listAudio(path) : entry.isFile() && [".mp3", ".m4a", ".wav", ".flac"].includes(extname(path).toLowerCase()) ? [path] : [];
  }).sort((a, b) => a.localeCompare(b));
}
async function fileHash(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function sourceFreeze() {
  const files = Object.fromEntries(sourceFiles.map((path) => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]));
  return { policy: "provisional-v1", sourceFiles: files,
    sourceSha256: createHash("sha256").update(JSON.stringify(files)).digest("hex"),
    preprocessing: "MP3 decoded with mpg123-decoder; non-48-kHz stereo resampled for evaluation using 24-tap windowed sinc. Resulting formal measurements describe the evaluation PCM, not a native-rate conformance claim.",
    inputRoot, createdAt: new Date().toISOString() };
}
function sinc(x) { return x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); }
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function resampleChannel(source, sourceRate) {
  if (sourceRate === 48000) return source;
  const count = Math.round(source.length * 48000 / sourceRate);
  const target = new Float32Array(count);
  const radius = 12, cutoff = Math.min(1, 48000 / sourceRate);
  const divisor = gcd(sourceRate, 48000), numerator = sourceRate / divisor, denominator = 48000 / divisor;
  const kernels = Array.from({ length: denominator }, (_, phase) => Float64Array.from({ length: radius * 2 }, (_, index) => {
    const distance = phase / denominator - (index - radius + 1);
    return cutoff * sinc(distance * cutoff) * sinc(distance / radius);
  }));
  for (let i = 0; i < count; i++) {
    const scaled = i * numerator, center = Math.floor(scaled / denominator), weights = kernels[scaled % denominator];
    let sum = 0, weight = 0;
    for (let index = 0; index < radius * 2; index++) {
      const tap = center + index - radius + 1;
      if (tap < 0 || tap >= source.length) continue;
      const kernel = weights[index];
      sum += source[tap] * kernel; weight += kernel;
    }
    target[i] = weight ? sum / weight : 0;
  }
  return target;
}
function summarize(analysis, decision, originalRate, elapsedMs, memory) {
  const { basic, loudness, truePeak, spectrum, artifacts } = analysis;
  const bands = Object.fromEntries(spectrum.bands.map((band) => [band.name, band.db]));
  return {
    inputSampleRate: originalRate, evaluationSampleRate: 48000, preprocessing: originalRate === 48000 ? "none" : "windowed-sinc-24-tap",
    basic, loudness, truePeak, bands, detectorMeasurement: artifacts.measurement,
    detectors: Object.fromEntries(detectorNames.map((name) => [name, artifacts[name]])),
    decision: { status: decision.status, state: decision.state, actions: decision.actions, trace: decision.trace, warnings: decision.warnings },
    elapsedMs, processMemory: memory,
  };
}
function numeric(value) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function quantiles(values) {
  const sorted = values.filter((value) => numeric(value) !== null).sort((a, b) => a - b);
  const at = (fraction) => sorted.length ? sorted[Math.floor((sorted.length - 1) * fraction)] : null;
  return { count: sorted.length, min: at(0), p10: at(0.1), p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9), max: at(1) };
}
function distribution(rows) {
  const valid = rows.filter((row) => row.status === "analyzed");
  const metric = (getter) => quantiles(valid.map(getter));
  return { totalFiles: rows.length, analyzedFiles: valid.length,
    durationSeconds: metric((row) => row.durationSeconds),
    integratedLufs: metric((row) => row.analysis.loudness.integratedLufs),
    truePeakDbTp: metric((row) => row.analysis.truePeak.truePeakDbTp),
    crestFactorDb: metric((row) => row.analysis.basic.crestFactorDb),
    stereoCorrelation: metric((row) => row.analysis.basic.stereoCorrelation),
    lowBalanceDb: metric((row) => row.analysis.bands.boom - row.analysis.bands.mid),
    highBalanceDb: metric((row) => row.analysis.bands.high - row.analysis.bands.mid),
    detectors: Object.fromEntries(detectorNames.map((name) => [name, metric((row) => row.analysis.detectors[name].severity)])) };
}
function choose(rows) {
  const valid = rows.filter((row) => row.status === "analyzed");
  const severity = (row) => Math.max(0, ...detectorNames.map((name) => row.analysis.detectors[name].severity ?? 0));
  const score = (row) => detectorNames.filter((name) => row.analysis.detectors[name].detected).length;
  const localScore = (row) => Math.max(0, ...["hfSmear", "metallicRinging", "harshness"]
    .flatMap((name) => row.analysis.detectors[name].timeline ?? []).map((point) => point.score));
  const strongScore = (row) => Math.max(0, ...detectorNames.map((name) => {
    const result = row.analysis.detectors[name];
    return result.detected && result.confidence >= 0.7 && result.severity >= 0.4
      ? result.severity * result.confidence : 0;
  }));
  const persistenceThresholds = { highBandExcess: 0.3, hfSmear: 0.25, metallicRinging: 0.08,
    hfHiss: 0.25, mud: 0.3, boom: 0.3, harshness: 0.3, lowBandPhase: 0.2 };
  const boundaryDistance = (row) => Math.min(...Object.entries(persistenceThresholds).map(([name, threshold]) => {
    const detector = row.analysis.detectors[name];
    if (detector.status !== "valid" || detector.confidence < 0.6) return Infinity;
    const value = detector.evidence[name === "lowBandPhase" ? "antiPhasePersistence" : "persistence"];
    return numeric(value) === null ? Infinity : Math.abs(value - threshold);
  }));
  const detected = valid.filter((row) => strongScore(row) > 0).sort((a, b) => strongScore(b) - strongScore(a));
  const missed = valid.filter((row) => score(row) === 0).sort((a, b) => localScore(b) - localScore(a));
  const boundary = [...valid].filter((row) => boundaryDistance(row) <= 0.05)
    .sort((a, b) => boundaryDistance(a) - boundaryDistance(b));
  const lufs = (row) => row.analysis.loudness.integratedLufs ?? -Infinity;
  const quiet = [...valid].sort((a, b) => lufs(a) - lufs(b));
  const dynamic = [...valid].sort((a, b) => b.analysis.basic.crestFactorDb - a.analysis.basic.crestFactorDb);
  const middle = [...valid].sort((a, b) => Math.abs(lufs(a) + 14) - Math.abs(lufs(b) + 14));
  const lowBalance = (row) => row.analysis.bands.boom - row.analysis.bands.mid;
  const highBalance = (row) => row.analysis.bands.high - row.analysis.bands.mid;
  const lowRange = quantiles(valid.map(lowBalance)), highRange = quantiles(valid.map(highBalance));
  const stereoRange = quantiles(valid.map((row) => row.analysis.basic.stereoCorrelation));
  const moderate = (row) => lowBalance(row) >= lowRange.p10 && lowBalance(row) <= lowRange.p90
    && highBalance(row) >= highRange.p10 && highBalance(row) <= highRange.p90
    && row.analysis.basic.stereoCorrelation >= stereoRange.p10 && row.analysis.basic.stereoCorrelation <= stereoRange.p90;
  const extreme = [...valid].sort((a, b) => Math.max(
    Math.abs(b.analysis.bands.high - b.analysis.bands.mid), Math.abs(b.analysis.bands.boom - b.analysis.bands.mid))
    - Math.max(Math.abs(a.analysis.bands.high - a.analysis.bands.mid), Math.abs(a.analysis.bands.boom - a.analysis.bands.mid)));
  const used = new Set();
  const pick = (list, count) => {
    const selected = [];
    for (const row of list) if (!used.has(row.sha256) && selected.length < count) { selected.push(row); used.add(row.sha256); }
    return selected;
  };
  const strongPositive = pick(detected, 6);
  const possibleMissedArtifacts = pick(missed.filter((row) => localScore(row) > 0.2), 12 - strongPositive.length);
  const thresholdBoundary = pick(boundary, 6);
  const cleanControl = pick(middle.filter((row) => score(row) === 0 && severity(row) < 0.25 && moderate(row)), 6);
  const dynamicQuiet = [...pick(quiet, 3), ...pick(dynamic, 3)];
  return { strongPositive: strongPositive.map((row) => row.trackId),
    possibleMissedArtifacts: possibleMissedArtifacts.map((row) => row.trackId),
    thresholdBoundary: thresholdBoundary.map((row) => row.trackId),
    cleanControl: cleanControl.map((row) => row.trackId),
    dynamicQuiet: dynamicQuiet.map((row) => row.trackId),
    intentionalExtremes: extreme.slice(0, 6).map((row) => row.trackId),
    selectionPolicy: "Candidate labels are review categories, not confirmed sound-quality judgments. Strong positives require detected=true, severity>=0.4, confidence>=0.7. Boundary candidates are within 0.05 of a detector persistence gate at confidence>=0.6; possible-missed ranking uses sparse detector timelines while formal flags are negative. Extremes use band balance only and may be intentional." };
}

if (!existsSync(inputRoot)) throw new Error(`Input library is unavailable: ${inputRoot}`);
const files = listAudio(inputRoot);
const previous = load("inventory.json", { tracks: [] });
const old = new Map(previous.tracks.map((item) => [item.relativePath, item]));
const inventory = { inputRoot, createdAt: previous.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), tracks: [] };
for (let i = 0; i < files.length; i++) {
  const path = files[i], relativePath = relative(inputRoot, path).replaceAll("\\", "/"), prior = old.get(relativePath);
  const stat = statSync(path);
  const sha256 = prior?.sha256 && prior.sizeBytes === stat.size && prior.modifiedAtMs === stat.mtimeMs
    ? prior.sha256 : await fileHash(path);
  inventory.tracks.push({ trackId: `track-${String(i + 1).padStart(4, "0")}`, relativePath, filename: basename(path), sha256,
    sizeBytes: stat.size, modifiedAtMs: stat.mtimeMs,
    format: extname(path).slice(1).toLowerCase(), sampleRate: prior?.sampleRate ?? null,
    channels: prior?.channels ?? null, durationSeconds: prior?.durationSeconds ?? null,
    bitDepth: null, decodeStatus: prior?.decodeStatus ?? "pending", analysisStatus: prior?.analysisStatus ?? "pending" });
  if (i % 25 === 24) { save("inventory.json", inventory); process.stdout.write(`Inventory ${i + 1}/${files.length}\n`); }
}
save("inventory.json", inventory);
const frozen = sourceFreeze(), earlier = load("processing-freeze.json", null);
if (earlier && earlier.sourceSha256 !== frozen.sourceSha256) throw new Error("Processing source hash changed. Use a new output version; results cannot be mixed.");
if (earlier && earlier.inputRoot !== inputRoot) throw new Error("Input library path changed. Use a new output directory; results cannot be mixed.");
if (!earlier) save("processing-freeze.json", frozen);
if (flags.has("--inventory-only")) { process.stdout.write(`Inventory complete: ${files.length} audio files\n`); process.exit(0); }

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom" });
const { analyzeAudio } = await vite.ssrLoadModule("/src/banana-master/analysis/analyzeAudio.ts");
const { toDecisionInputs } = await vite.ssrLoadModule("/src/banana-master/decision/decisionInputs.ts");
const { buildFormalMasterPlan } = await vite.ssrLoadModule("/src/banana-master/decision/formalDecision.ts");
const decoder = new MPEGDecoder(); await decoder.ready;
const results = flags.has("--restart") ? { policy: "provisional-v1", sourceSha256: frozen.sourceSha256, tracks: [] }
  : load("screening-results.json", { policy: "provisional-v1", sourceSha256: frozen.sourceSha256, tracks: [] });
if (results.sourceSha256 !== frozen.sourceSha256) throw new Error("Existing results use another source hash.");
const browserDecoded = load("m4a-screening-pending.json", null);
const browserFallback = load("browser-fallback-pending.json", null);
for (const pending of [browserDecoded?.sourceSha256 === frozen.sourceSha256 ? browserDecoded.result : null,
  ...(browserFallback?.sourceSha256 === frozen.sourceSha256 ? browserFallback.results : [])]) {
  if (!pending || !inventory.tracks.some((item) => item.sha256 === pending.sha256)) continue;
  const existing = results.tracks.findIndex((row) => row.sha256 === pending.sha256);
  if (existing >= 0) results.tracks[existing] = pending;
  else results.tracks.push(pending);
}
const inventoryById = new Map(inventory.tracks.map((item) => [item.trackId, item]));
const sampleIndexes = Number.isFinite(sampleTracks) && sampleTracks < inventory.tracks.length
  ? new Set(Array.from({ length: sampleTracks }, (_, i) => sampleTracks === 1 ? 0
    : Math.round(i * (inventory.tracks.length - 1) / (sampleTracks - 1)))) : null;
if (results.tracks.some((row) => inventoryById.get(row.trackId)?.sha256 !== row.sha256)) {
  throw new Error("An input file changed or the inventory order changed. Start a new screening version.");
}
const completed = new Map(results.tracks.map((row) => [row.sha256, row]));
let processed = 0;
try {
  for (const [index, item] of inventory.tracks.entries()) {
    if (sampleIndexes && !sampleIndexes.has(index)) continue;
    const cached = completed.get(item.sha256);
    if (cached) {
      item.decodeStatus = cached.decodeStatus; item.analysisStatus = cached.status;
      item.sampleRate = cached.sampleRate; item.channels = cached.channels; item.durationSeconds = cached.durationSeconds;
      if (!results.tracks.some((row) => row.trackId === item.trackId)) results.tracks.push({ ...cached, trackId: item.trackId, duplicateOf: cached.trackId, relativePath: item.relativePath, filename: item.filename });
      continue;
    }
    if (processed >= maxTracks) break;
    const started = performance.now();
    const row = { trackId: item.trackId, relativePath: item.relativePath, filename: item.filename, sha256: item.sha256,
      format: item.format, sampleRate: null, channels: null, durationSeconds: null, decodeStatus: "pending", status: "pending" };
    try {
      if (item.format !== "mp3") throw new Error("decode-unsupported-format");
      const encoded = readFileSync(join(inputRoot, item.relativePath));
      const decoded = decoder.decode(encoded);
      if (decoded.errors.length) row.decodeWarnings = decoded.errors.map((error) => error.message);
      row.sampleRate = decoded.sampleRate || null; row.channels = decoded.channelData.length;
      row.durationSeconds = decoded.sampleRate ? decoded.samplesDecoded / decoded.sampleRate : null;
      if (!decoded.samplesDecoded || decoded.channelData.length !== 2) throw new Error("requires-stereo-audio");
      row.decodeStatus = "decoded";
      const audio = { sampleRate: 48000, channels: decoded.channelData.map((channel) => resampleChannel(channel, decoded.sampleRate)) };
      const analysis = analyzeAudio(audio), decision = buildFormalMasterPlan(toDecisionInputs(analysis));
      row.analysis = summarize(analysis, decision, decoded.sampleRate, performance.now() - started, process.memoryUsage());
      row.status = "analyzed";
    } catch (error) { row.status = "unknown"; row.reason = String(error?.message ?? error); row.decodeStatus = row.decodeStatus === "pending" ? "unknown" : row.decodeStatus; }
    await decoder.reset();
    results.tracks.push(row); completed.set(item.sha256, row);
    item.decodeStatus = row.decodeStatus; item.analysisStatus = row.status;
    item.sampleRate = row.sampleRate; item.channels = row.channels; item.durationSeconds = row.durationSeconds;
    processed++;
    save("screening-results.json", results); save("inventory.json", inventory);
    process.stdout.write(`${item.trackId} ${row.status} ${Math.round(performance.now() - started)}ms; ${results.tracks.length}/${inventory.tracks.length}\n`);
  }
} finally { decoder.free(); await vite.close(); }
save("screening-results.json", results); save("inventory.json", inventory);
save("distribution.json", distribution(results.tracks));
const selection = choose(results.tracks);
selection.methodSha256 = createHash("sha256").update(readFileSync(join(root, "scripts", "banana-master-library-screen.mjs"))).digest("hex");
save("candidate-selection.json", selection);
process.stdout.write(`Screening checkpoint: ${results.tracks.length}/${inventory.tracks.length}\n`);

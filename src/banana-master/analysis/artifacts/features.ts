import type { AudioData } from "../../audio/audioTypes";

export const FFT_SIZE = 8192;
export const NOMINAL_HOP = 1024;
const MAX_FRAMES = 2400;
const binsPerHz = FFT_SIZE / 48_000;
const window = Float64Array.from({ length: FFT_SIZE }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
const stages = Array.from({ length: 13 }, (_, stage) => {
  const half = 1 << stage, cos = new Float64Array(half), sin = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    const angle = -Math.PI * i / half;
    cos[i] = Math.cos(angle); sin[i] = Math.sin(angle);
  }
  return { half, cos, sin };
});

export type SpectralFrame = Readonly<{
  time: number; rmsDb: number; subDb: number; boomDb: number; upperBassDb: number; mudDb: number;
  midDb: number; presenceDb: number; brillianceDb: number; airDb: number; hfDb: number;
  hfFlatness: number; hfOccupancy: number; hfFlux: number;
  ringHz: number; ringProminenceDb: number; ringWidthHz: number; ringToMidDb: number;
}>;
export type SpectralFeatures = Readonly<{ frames: readonly SpectralFrame[]; candidateFrames: number; sampledFrames: number; maxFrameGapSeconds: number; rmsFloorDb: number }>;

const db = (power: number) => 10 * Math.log10(Math.max(power, 1e-20));
const bin = (hz: number) => Math.max(1, Math.ceil(hz * binsPerHz));
function mean(power: Float64Array, lowHz: number, highHz: number): number {
  const start = bin(lowHz), end = Math.min(power.length, bin(highHz));
  let total = 0;
  for (let i = start; i < end; i++) total += power[i];
  return total / Math.max(1, end - start);
}
function median(values: number[]): number {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}
function fftPower(re: Float64Array, im: Float64Array, power: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (const { half, cos, sin } of stages) {
    const length = half * 2;
    for (let start = 0; start < n; start += length) for (let i = 0; i < half; i++) {
      const k = start + i + half;
      const tr = re[k] * cos[i] - im[k] * sin[i], ti = re[k] * sin[i] + im[k] * cos[i];
      re[k] = re[start + i] - tr; im[k] = im[start + i] - ti;
      re[start + i] += tr; im[start + i] += ti;
    }
  }
  for (let i = 0; i < power.length; i++) power[i] = re[i] * re[i] + im[i] * im[i];
}

export function extractSpectralFeatures(audio: AudioData): SpectralFeatures {
  const [left, right] = audio.channels;
  if (audio.sampleRate !== 48_000 || !left || !right || left.length !== right.length || left.length < FFT_SIZE) {
    return { frames: [], candidateFrames: 0, sampledFrames: 0, maxFrameGapSeconds: 0, rmsFloorDb: -Infinity };
  }
  const candidateFrames = Math.floor((left.length - FFT_SIZE) / NOMINAL_HOP) + 1;
  const sampledFrames = Math.min(candidateFrames, MAX_FRAMES);
  const frames: SpectralFrame[] = [];
  const re = new Float64Array(FFT_SIZE), im = new Float64Array(FFT_SIZE), power = new Float64Array(FFT_SIZE / 2 + 1);
  let previousHf: Float64Array | null = null, maximumRmsDb = -Infinity, maxFrameGapSeconds = 0, previousTime = 0;
  for (let frame = 0; frame < sampledFrames; frame++) {
    const candidate = sampledFrames === 1 ? 0 : Math.round(frame * (candidateFrames - 1) / (sampledFrames - 1));
    const offset = candidate * NOMINAL_HOP, time = (offset + FFT_SIZE / 2) / audio.sampleRate;
    if (frame) maxFrameGapSeconds = Math.max(maxFrameGapSeconds, time - previousTime);
    previousTime = time;
    let rmsPower = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const sample = (left[offset + i] + right[offset + i]) * 0.5;
      rmsPower += sample * sample;
      re[i] = sample * window[i]; im[i] = 0;
    }
    const rmsDb = db(rmsPower / FFT_SIZE);
    maximumRmsDb = Math.max(maximumRmsDb, rmsDb);
    fftPower(re, im, power);
    const hfStart = bin(6000), hfEnd = Math.min(power.length, bin(18000));
    let hfSum = 0, logSum = 0, occupied = 0, flux = 0;
    const currentHf = new Float64Array(hfEnd - hfStart);
    for (let i = hfStart; i < hfEnd; i++) hfSum += power[i];
    const hfMean = hfSum / (hfEnd - hfStart);
    for (let i = hfStart; i < hfEnd; i++) {
      const value = power[i];
      currentHf[i - hfStart] = value / Math.max(hfSum, 1e-20);
      logSum += Math.log(Math.max(value, hfMean * 1e-8, 1e-20));
      if (value > hfMean * 0.1) occupied++;
      if (previousHf) flux += Math.max(0, currentHf[i - hfStart] - previousHf[i - hfStart]);
    }
    previousHf = currentHf;
    let ringProminenceDb = 0, ringHz = 0, ringWidthHz = 0, ringToMidDb = -Infinity;
    const midPower = mean(power, 450, 2000);
    const peakCandidates: number[] = [];
    for (let i = bin(8000); i < bin(18000); i++) {
      if (power[i] < power[i - 1] || power[i] < power[i + 1]) continue;
      peakCandidates.push(i);
    }
    peakCandidates.sort((a, b) => power[b] - power[a]);
    for (const i of peakCandidates.slice(0, 12)) {
      const neighbours: number[] = [];
      for (let j = i - 24; j <= i + 24; j++) if (Math.abs(j - i) > 3 && j >= 0 && j < power.length) neighbours.push(power[j]);
      const prominence = db(power[i]) - db(median(neighbours));
      if (prominence > ringProminenceDb) {
        ringProminenceDb = prominence; ringHz = i * audio.sampleRate / FFT_SIZE;
        ringToMidDb = db(power[i]) - db(midPower);
        let lo = i, hi = i;
        while (lo > 0 && power[lo - 1] > power[i] / 2) lo--;
        while (hi + 1 < power.length && power[hi + 1] > power[i] / 2) hi++;
        ringWidthHz = Math.max(1, hi - lo + 1) * audio.sampleRate / FFT_SIZE;
      }
    }
    frames.push({ time, rmsDb, subDb: db(mean(power, 20, 60)), boomDb: db(mean(power, 60, 120)),
      upperBassDb: db(mean(power, 120, 200)), mudDb: db(mean(power, 200, 450)), midDb: db(midPower),
      presenceDb: db(mean(power, 2000, 6000)), brillianceDb: db(mean(power, 6000, 12000)),
      airDb: db(mean(power, 12000, 20000)), hfDb: db(hfMean),
      hfFlatness: Math.exp(logSum / (hfEnd - hfStart)) / Math.max(hfMean, 1e-20),
      hfOccupancy: occupied / (hfEnd - hfStart), hfFlux: flux,
      ringHz, ringProminenceDb, ringWidthHz, ringToMidDb });
  }
  return { frames, candidateFrames, sampledFrames, maxFrameGapSeconds, rmsFloorDb: Math.max(-65, maximumRmsDb - 30) };
}

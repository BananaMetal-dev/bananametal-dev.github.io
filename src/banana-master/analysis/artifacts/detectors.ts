import type { AudioData } from "../../audio/audioTypes";
import type { SpectralFeatures, SpectralFrame } from "./features";

export type TimeScore = Readonly<{ time: number; score: number }>;
export type DetectorResult =
  | Readonly<{ status: "valid"; detected: boolean; severity: number; confidence: number; evidence: Readonly<Record<string, number | string | boolean | readonly number[]>>; timeline?: readonly TimeScore[] }>
  | Readonly<{ status: "unknown"; reason: string; severity: null; confidence: null; evidence: Readonly<Record<string, number | string | boolean | readonly number[]>> }>;
export type ArtifactAnalysis = Readonly<{
  highBandExcess: DetectorResult; hfSmear: DetectorResult; metallicRinging: DetectorResult; hfHiss: DetectorResult;
  mud: DetectorResult; boom: DetectorResult; harshness: DetectorResult; lowBandPhase: DetectorResult; sectionDegradation: DetectorResult;
  measurement: Readonly<{ fftSize: 8192; nominalHop: 1024; sampledFrames: number; candidateFrames: number; maxFrameGapSeconds: number;
    formalSpectrumFftSize: number; formalSpectrumSampledFrames: number; wholeBandCorrelation: number; thresholdPolicy: "provisional-v1" }>;
}>;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const average = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const unknown = (reason: string): DetectorResult => ({ status: "unknown", reason, severity: null, confidence: null, evidence: {} });
function valid(detected: boolean, severity: number, confidence: number, evidence: DetectorResult["evidence"], timeline?: readonly TimeScore[]): DetectorResult {
  return { status: "valid", detected, severity: clamp(severity), confidence: clamp(confidence), evidence, ...(timeline ? { timeline } : {}) };
}
function active(features: SpectralFeatures): SpectralFrame[] {
  return features.frames.filter((frame) => frame.rmsDb >= features.rmsFloorDb);
}
function reliability(features: SpectralFeatures, frames: readonly SpectralFrame[]): number {
  return clamp((0.55 + 0.4 * Math.min(1, frames.length / 100)) * Math.min(1, 0.1 / Math.max(features.maxFrameGapSeconds, 0.021)));
}
function timeline(frames: readonly SpectralFrame[], score: (frame: SpectralFrame) => number): TimeScore[] {
  const stride = Math.max(1, Math.ceil(frames.length / 120));
  return frames.filter((_, index) => index % stride === 0).map((frame) => ({ time: frame.time, score: clamp(score(frame)) }));
}
function requireFrames(features: SpectralFeatures): SpectralFrame[] | null {
  const frames = active(features);
  return frames.length >= 5 ? frames : null;
}
const hfRelative = (frame: SpectralFrame) => frame.hfDb - frame.midDb;
const boomContrast = (frame: SpectralFrame) => frame.boomDb - (frame.subDb + frame.upperBassDb) / 2;
const mudContrast = (frame: SpectralFrame) => frame.mudDb - (frame.upperBassDb + frame.midDb) / 2;

export function highBandExcess(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const ratios = frames.map(hfRelative);
  const presence = average(frames.map((f) => f.presenceDb - f.midDb));
  const brilliance = average(frames.map((f) => f.brillianceDb - f.presenceDb));
  const air = average(frames.map((f) => f.airDb - f.brillianceDb));
  const persistence = frames.filter((f) => hfRelative(f) > -12 && f.brillianceDb - f.presenceDb > -4).length / frames.length;
  const excess = average(ratios) + 12;
  return valid(persistence > 0.3 && excess > 0, Math.max(clamp(excess / 12), persistence * 0.7), reliability(features, frames),
    { hfToMidDb: average(ratios), presenceToMidDb: presence, brillianceToPresenceDb: brilliance, airToBrillianceDb: air, persistence,
      presenceHz: "2000-6000", brillianceHz: "6000-12000", airHz: "12000-20000", provisionalHfToMidDb: -12 });
}

export function hfSmear(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const qualifies = (f: SpectralFrame) => hfRelative(f) > -12 && f.hfFlatness > 0.35 && f.hfOccupancy > 0.65 && f.hfFlux < 0.4;
  const persistence = frames.filter(qualifies).length / frames.length;
  let longest = 0, run = 0;
  for (const frame of frames) { run = qualifies(frame) ? run + 1 : 0; longest = Math.max(longest, run); }
  const duration = longest * Math.max(0.021, features.maxFrameGapSeconds);
  return valid(persistence > 0.25 && duration >= 0.5, Math.min(1, persistence * 1.5), reliability(features, frames),
    { hfToMidDb: average(frames.map(hfRelative)), flatness: average(frames.map((f) => f.hfFlatness)),
      occupancy: average(frames.map((f) => f.hfOccupancy)), spectralFlux: average(frames.map((f) => f.hfFlux)),
      persistence, longestDurationSeconds: duration, provisionalHfToMidDb: -12 }, timeline(frames, (f) => qualifies(f) ? 1 : 0));
}

export function metallicRinging(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const candidates = frames.filter((f) => f.ringProminenceDb >= 15 && f.ringWidthHz <= 100 && f.ringToMidDb > 0);
  const counts = new Map<number, SpectralFrame[]>();
  for (const frame of candidates) {
    const key = Math.round(frame.ringHz / 25) * 25;
    const group = counts.get(key) ?? [];
    group.push(frame); counts.set(key, group);
  }
  const dominant = [...counts.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const persistence = dominant.length / frames.length;
  const peakHz = dominant.length ? average(dominant.map((f) => f.ringHz)) : 0;
  let longestRun = 0, run = 0, previousTime = -Infinity;
  for (const frame of dominant) {
    run = frame.time - previousTime <= features.maxFrameGapSeconds * 1.5 ? run + 1 : 1;
    longestRun = Math.max(longestRun, run); previousTime = frame.time;
  }
  const duration = longestRun * Math.max(0.021, features.maxFrameGapSeconds);
  const prominence = dominant.length ? average(dominant.map((f) => f.ringProminenceDb)) : 0;
  const width = dominant.length ? average(dominant.map((f) => f.ringWidthHz)) : 0;
  return valid(persistence > 0.08 && duration >= 0.5, persistence * 2, reliability(features, frames),
    { peakFrequencyHz: peakHz, localMedianContrastDb: prominence, durationSeconds: duration, bandwidthHz: width,
      equivalentQ: width ? peakHz / width : 0, persistence, candidateFrames: candidates.length, provisionalProminenceDb: 15 },
    timeline(frames, (f) => dominant.length && Math.abs(f.ringHz - peakHz) < 20 && f.ringProminenceDb >= 15 && f.ringToMidDb > 0 ? f.ringProminenceDb / 30 : 0));
}

export function hfHiss(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const persistence = frames.filter((f) => hfRelative(f) > -12 && f.hfFlatness > 0.42 && f.hfOccupancy > 0.75).length / frames.length;
  return valid(persistence > 0.25, persistence * 1.5, reliability(features, frames),
    { hfToMidDb: average(frames.map(hfRelative)), spectralFlatness: average(frames.map((f) => f.hfFlatness)),
      occupancy: average(frames.map((f) => f.hfOccupancy)), persistence, bandwidthHz: 12000, provisionalHfToMidDb: -12 });
}

export function mud(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const contrast = average(frames.map(mudContrast));
  const persistence = frames.filter((f) => mudContrast(f) > 18).length / frames.length;
  return valid(contrast > 18 && persistence > 0.3, (contrast - 18) / 12, reliability(features, frames),
    { bandHz: "200-450", meanNeighbourContrastDb: contrast, persistence, provisionalContrastDb: 18 });
}

export function boom(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const contrast = average(frames.map(boomContrast));
  const persistence = frames.filter((f) => boomContrast(f) > 22).length / frames.length;
  return valid(contrast > 22 && persistence > 0.3, (contrast - 22) / 12, reliability(features, frames),
    { bandHz: "60-120", meanNeighbourContrastDb: contrast, persistence, provisionalContrastDb: 22 });
}

export function harshness(features: SpectralFeatures): DetectorResult {
  const frames = requireFrames(features);
  if (!frames) return unknown("insufficient-active-frames");
  const qualifies = (f: SpectralFrame) => f.presenceDb - f.midDb > -4;
  const persistence = frames.filter(qualifies).length / frames.length;
  const contrast = average(frames.map((f) => f.presenceDb - f.midDb));
  return valid(persistence > 0.3 && contrast > -4, (contrast + 4) / 12, reliability(features, frames),
    { presenceHz: "2000-6000", presenceToMidDb: contrast, persistence, transientBurstFraction: frames.filter((f) => qualifies(f) && f.hfFlux > 0.4).length / frames.length,
      provisionalPresenceToMidDb: -4 });
}

type LowPhaseMeasurement = Readonly<{ correlation: number; sideToMidDb: number; antiPhaseFraction: number; activeWindows: number; windowSeconds: number }>;
function lowPhaseMeasurement(audio: AudioData): LowPhaseMeasurement | null {
  const [left, right] = audio.channels;
  if (audio.sampleRate !== 48_000 || !left || !right || left.length !== right.length || left.length < 24_000) return null;
  const omega = 2 * Math.PI * 120 / audio.sampleRate, cosine = Math.cos(omega), alpha = Math.sin(omega) / Math.SQRT2;
  const a0 = 1 + alpha, b0 = (1 - cosine) / (2 * a0), b1 = (1 - cosine) / a0;
  const a1 = -2 * cosine / a0, a2 = (1 - alpha) / a0;
  let lx1 = 0, lx2 = 0, ly1 = 0, ly2 = 0, rx1 = 0, rx2 = 0, ry1 = 0, ry2 = 0;
  let ll = 0, rr = 0, lr = 0, mid = 0, side = 0, windows = 0, anti = 0, correlationSum = 0, ratioSum = 0;
  const windowSamples = 24_000;
  for (let i = 0; i < left.length; i++) {
    const l = b0 * left[i] + b1 * lx1 + b0 * lx2 - a1 * ly1 - a2 * ly2;
    const r = b0 * right[i] + b1 * rx1 + b0 * rx2 - a1 * ry1 - a2 * ry2;
    lx2 = lx1; lx1 = left[i]; ly2 = ly1; ly1 = l;
    rx2 = rx1; rx1 = right[i]; ry2 = ry1; ry1 = r;
    ll += l * l; rr += r * r; lr += l * r;
    mid += (l + r) ** 2; side += (l - r) ** 2;
    if ((i + 1) % windowSamples === 0) {
      if (ll / windowSamples > 1e-10 && rr / windowSamples > 1e-10) {
        const correlation = lr / Math.sqrt(ll * rr);
        correlationSum += correlation; ratioSum += 10 * Math.log10((side + 1e-20) / (mid + 1e-20));
        if (correlation < -0.2 && side > mid * 2) anti++;
        windows++;
      }
      ll = 0; rr = 0; lr = 0; mid = 0; side = 0;
    }
  }
  return windows ? { correlation: correlationSum / windows, sideToMidDb: ratioSum / windows,
    antiPhaseFraction: anti / windows, activeWindows: windows, windowSeconds: 0.5 } : null;
}

export function lowBandPhase(audio: AudioData): DetectorResult {
  const measurement = lowPhaseMeasurement(audio);
  if (!measurement) return unknown("insufficient-low-band-energy-or-duration");
  return valid(measurement.antiPhaseFraction > 0.2 && measurement.correlation < -0.2,
    Math.max(measurement.antiPhaseFraction, clamp(-measurement.correlation)), Math.min(0.95, 0.55 + measurement.activeWindows / 40),
    { lowPassHz: 120, correlation: measurement.correlation, sideToMidDb: measurement.sideToMidDb,
      antiPhasePersistence: measurement.antiPhaseFraction, activeWindows: measurement.activeWindows, windowSeconds: measurement.windowSeconds });
}

export function sectionDegradation(features: SpectralFeatures, durationSeconds: number): DetectorResult {
  const frames = requireFrames(features);
  if (!frames || durationSeconds < 4) return unknown("insufficient-section-data");
  const sections = [frames.filter((f) => f.time < durationSeconds * 0.25),
    frames.filter((f) => f.time >= durationSeconds * 0.25 && f.time < durationSeconds * 0.75),
    frames.filter((f) => f.time >= durationSeconds * 0.75)];
  if (sections.some((section) => section.length < 3)) return unknown("insufficient-section-data");
  const score = (f: SpectralFrame) => clamp(Math.max(0, hfRelative(f) + 15) / 20
    + (f.ringProminenceDb > 15 && f.ringWidthHz < 100 && f.ringToMidDb > 0 ? 0.25 : 0)
    + (hfRelative(f) > -12 && f.hfFlatness > 0.42 ? 0.15 : 0));
  const scores = sections.map((section) => average(section.map(score)));
  const tilts = sections.map((section) => average(section.map(hfRelative)));
  const excess = scores[2] - Math.max(scores[0], scores[1]);
  return valid(scores[2] > 0.25 && excess > 0.2, excess, reliability(features, frames),
    { startScore: scores[0], middleScore: scores[1], endScore: scores[2],
      startSpectralTiltDb: tilts[0], middleSpectralTiltDb: tilts[1], endSpectralTiltDb: tilts[2],
      startFrameCount: sections[0].length, middleFrameCount: sections[1].length, endFrameCount: sections[2].length,
      startRange: "0-25%", middleRange: "25-75%", endRange: "75-100%",
      endStartSeconds: durationSeconds * 0.75, endEndSeconds: durationSeconds },
    timeline(frames, score));
}

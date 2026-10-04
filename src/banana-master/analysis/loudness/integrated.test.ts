import { describe, expect, it } from "vitest";
import { measureIntegratedLoudness } from "./integrated";
import { analyzeAudio } from "../analyzeAudio";

const rate = 48_000;
function sine(seconds: number, peakDbFs: number): Float32Array {
  const amplitude = 10 ** (peakDbFs / 20);
  return Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin(2 * Math.PI * 1000 * i / rate));
}
function valid(result: ReturnType<typeof measureIntegratedLoudness>): number {
  expect(result.status).toBe("valid");
  if (result.status !== "valid") throw new Error(result.reason);
  return result.integratedLufs;
}

describe("ITU-R BS.1770-5 Annex 1 integrated loudness", () => {
  it("meets EBU Tech 3341 test 1: 20 s stereo 1 kHz at -23 dBFS is -23.0 ±0.1 LUFS", () => {
    const channel = sine(20, -23);
    expect(valid(measureIntegratedLoudness({ sampleRate: rate, channels: [channel, channel] }))).toBeCloseTo(-23, 1);
  });
  it("meets EBU Tech 3341 alignment: stereo 1 kHz at -18 dBFS is -18.0 LUFS", () => {
    const channel = sine(5, -18);
    expect(Math.abs(valid(measureIntegratedLoudness({ sampleRate: rate, channels: [channel, channel] })) + 18)).toBeLessThanOrEqual(0.1);
  });
  it("adds identical stereo channel energies instead of averaging", () => {
    const channel = sine(2, -23);
    const mono = valid(measureIntegratedLoudness({ sampleRate: rate, channels: [channel] }));
    const stereo = valid(measureIntegratedLoudness({ sampleRate: rate, channels: [channel, channel] }));
    expect(stereo - mono).toBeCloseTo(10 * Math.log10(2), 5);
  });
  it("adds unequal stereo energies", () => {
    const left = sine(2, -23), right = sine(2, -29);
    const mono = valid(measureIntegratedLoudness({ sampleRate: rate, channels: [left] }));
    const stereo = valid(measureIntegratedLoudness({ sampleRate: rate, channels: [left, right] }));
    expect(stereo - mono).toBeCloseTo(10 * Math.log10(1 + 10 ** (-6 / 10)), 3);
  });
  it("returns unknown for silence, very short input and unsupported sample rate", () => {
    expect(measureIntegratedLoudness({ sampleRate: rate, channels: [new Float32Array(rate)] })).toMatchObject({ status: "unknown", reason: "below-absolute-gate" });
    expect(measureIntegratedLoudness({ sampleRate: rate, channels: [new Float32Array(100)] })).toMatchObject({ status: "unknown", reason: "insufficient-duration" });
    expect(measureIntegratedLoudness({ sampleRate: 44_100, channels: [new Float32Array(44_100)] })).toMatchObject({ status: "unknown", reason: "unsupported-sample-rate" });
    expect(analyzeAudio({ sampleRate: rate, channels: [new Float32Array(100), new Float32Array(100)] }).loudness).toMatchObject({ status: "unknown", reason: "insufficient-duration" });
  });
  it("gates a quiet section below the relative threshold", () => {
    const quiet = sine(10, -50), loud = sine(30, -23), channel = new Float32Array(quiet.length + loud.length + quiet.length);
    channel.set(quiet); channel.set(loud, quiet.length); channel.set(quiet, quiet.length + loud.length);
    const result = measureIntegratedLoudness({ sampleRate: rate, channels: [channel, channel] });
    expect(Math.abs(valid(result) + 23)).toBeLessThan(0.1);
    if (result.status === "valid") expect(result.gatedBlocks).toBeLessThan(result.totalBlocks);
  });
  it("keeps loud sections and averages retained blocks in linear energy", () => {
    const quiet = sine(20, -26), loud = sine(20.1, -20), channel = new Float32Array(quiet.length * 2 + loud.length);
    channel.set(quiet); channel.set(loud, quiet.length); channel.set(quiet, quiet.length + loud.length);
    const result = valid(measureIntegratedLoudness({ sampleRate: rate, channels: [channel, channel] }));
    // EBU Tech 3341 Table 1, test 5: target -23.0 ±0.1 LUFS.
    expect(Math.abs(result + 23)).toBeLessThanOrEqual(0.1);
  });
});

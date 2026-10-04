import { describe, expect, it } from "vitest";
import { measureTruePeak } from "./truePeak";

function sine(sampleRate: number, cyclesPerSample: number, phaseDegrees: number, amplitude: number, seconds = 0.2): Float32Array {
  const phase = phaseDegrees * Math.PI / 180, length = Math.round(sampleRate * seconds);
  const fade = Math.round(sampleRate * 0.01);
  return Float32Array.from({ length }, (_, i) => amplitude * Math.sin(2 * Math.PI * cyclesPerSample * i + phase)
    * Math.min(1, i / fade, (length - 1 - i) / fade));
}
function valid(result: ReturnType<typeof measureTruePeak>) {
  expect(result.status).toBe("valid");
  if (result.status !== "valid") throw new Error(result.reason);
  return result;
}

describe("ITU-R BS.1770-5 Annex 2 true peak", () => {
  it("separates sample peak and an intersample peak (EBU Tech 3341 test 16)", () => {
    const channel = sine(48_000, 1 / 4, 45, 0.5);
    const result = valid(measureTruePeak({ sampleRate: 48_000, channels: [channel, channel] }));
    expect(result.truePeakLinear).toBeGreaterThan(10 ** (result.samplePeakDbFs / 20));
    expect(result.truePeakDbTp).toBeGreaterThanOrEqual(-6.4);
    expect(result.truePeakDbTp).toBeLessThanOrEqual(-5.8);
  });
  it("meets EBU Tech 3341 test 15 at 48 kHz stereo", () => {
    const channel = sine(48_000, 1 / 4, 0, 0.5);
    const result = valid(measureTruePeak({ sampleRate: 48_000, channels: [channel, channel] }));
    expect(result.truePeakDbTp).toBeGreaterThanOrEqual(-6.4);
    expect(result.truePeakDbTp).toBeLessThanOrEqual(-5.8);
  });
  it("meets EBU Tech 3341 tests 17 and 18 at 48 kHz stereo", () => {
    for (const [cyclesPerSample, phaseDegrees] of [[1 / 6, 60], [1 / 8, 67.5]]) {
      const channel = sine(48_000, cyclesPerSample, phaseDegrees, 0.5);
      const result = valid(measureTruePeak({ sampleRate: 48_000, channels: [channel, channel] }));
      expect(result.truePeakDbTp).toBeGreaterThanOrEqual(-6.4);
      expect(result.truePeakDbTp).toBeLessThanOrEqual(-5.8);
    }
  });
  it("meets EBU Tech 3341 test 19 above sample full-scale", () => {
    const channel = sine(48_000, 1 / 4, 45, 1.41);
    const result = valid(measureTruePeak({ sampleRate: 48_000, channels: [channel] }));
    expect(result.truePeakDbTp).toBeGreaterThanOrEqual(2.6);
    expect(result.truePeakDbTp).toBeLessThanOrEqual(3.2);
  });
  it("handles mono, stereo and silence distinctly", () => {
    const channel = sine(48_000, 1 / 8, 67.5, 0.5);
    const mono = valid(measureTruePeak({ sampleRate: 48_000, channels: [channel] }));
    const stereo = valid(measureTruePeak({ sampleRate: 48_000, channels: [channel, channel] }));
    expect(stereo.truePeakDbTp).toBeCloseTo(mono.truePeakDbTp, 8);
    expect(measureTruePeak({ sampleRate: 48_000, channels: [new Float32Array(100)] })).toMatchObject({ status: "unknown", reason: "silence" });
  });
  it("does not assign 48 kHz FIR results to 44.1 or 96 kHz inputs", () => {
    for (const sampleRate of [44_100, 96_000]) {
      const result = measureTruePeak({ sampleRate, channels: [sine(sampleRate, 1 / 8, 0, 0.5)] });
      expect(result).toMatchObject({ status: "unknown", reason: "unsupported-sample-rate" });
      expect(result.samplePeakDbFs).not.toBeNull();
    }
  });
});

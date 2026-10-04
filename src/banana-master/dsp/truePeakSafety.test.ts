import { describe, expect, it } from "vitest";
import type { AudioData } from "../audio/audioTypes";
import { measureTruePeak } from "../analysis/truePeak/truePeak";
import { applyTruePeakSafety } from "./truePeakSafety";

const signal = (amplitude: number, rate = 48_000): AudioData => {
  const channel = Float32Array.from({ length: rate / 10 }, (_, i) =>
    amplitude * Math.sin(2 * Math.PI * i / 4 + Math.PI / 4));
  return { sampleRate: rate, channels: [channel, channel.slice()] };
};

describe("final True Peak safety", () => {
  it("attenuates float PCM above full scale once and keeps input unchanged", () => {
    const input = signal(1.5), snapshot = input.channels[0].slice();
    const pre = measureTruePeak(input);
    if (pre.status !== "valid") throw new Error("fixture must be measurable");
    const { master, safety } = applyTruePeakSafety(input, pre.truePeakDbTp, pre.samplePeakDbFs, 0);
    expect(safety.applied).toBe(true);
    expect(safety.verificationStatus).toBe("verified");
    expect(safety.appliedGainDb).toBeCloseTo(-1 - pre.truePeakDbTp - 0.0001, 5);
    expect(safety.finalTruePeakDbTp).toBeLessThanOrEqual(-1);
    expect(safety.finalSamplePeakDbFs).toBeLessThan(0);
    expect(master.channels[0][25]).toBeCloseTo(input.channels[0][25] * 10 ** (safety.appliedGainDb / 20), 6);
    expect(input.channels[0]).toEqual(snapshot);
    expect(master.channels[0]).not.toBe(input.channels[0]);
  });
  it("does not raise or change audio already below the ceiling", () => {
    const input = signal(0.1), pre = measureTruePeak(input);
    if (pre.status !== "valid") throw new Error("fixture must be measurable");
    const { master, safety } = applyTruePeakSafety(input, pre.truePeakDbTp, pre.samplePeakDbFs, 0);
    expect(safety.applied).toBe(false);
    expect(safety.appliedGainDb).toBe(0);
    expect(master).toBe(input);
    expect(safety.verificationStatus).toBe("verified");
  });
  it("keeps unsupported rate, non-finite output and decoder warning distinct", () => {
    const unsupported = signal(0.5, 44_100);
    expect(applyTruePeakSafety(unsupported, null, null, 0).safety.verificationStatus).toBe("measurement-unknown");
    const nonFinite = signal(0.5);
    nonFinite.channels[0][0] = Number.NaN;
    expect(applyTruePeakSafety(nonFinite, null, null, 0).safety.verificationStatus).toBe("non-finite");
    const warned = signal(1.2), pre = measureTruePeak(warned);
    if (pre.status !== "valid") throw new Error("fixture must be measurable");
    const result = applyTruePeakSafety(warned, pre.truePeakDbTp, pre.samplePeakDbFs, 2).safety;
    expect(result.verificationStatus).toBe("decoder-warning");
    expect(result.finalTruePeakDbTp).toBeLessThanOrEqual(-1);
  });
});

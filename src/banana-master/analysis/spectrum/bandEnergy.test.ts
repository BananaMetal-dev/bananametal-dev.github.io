import { describe, expect, it } from "vitest";
import { measureSpectrum } from "./bandEnergy";

function tone(hz: number, amplitude: number) {
  const channel = Float32Array.from({ length: 48000 }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * i / 48000));
  return { sampleRate: 48000, channels: [channel, channel] };
}

describe("spectrum measurement", () => {
  it("finds a persistent narrow high-frequency tone", () => {
    const spectrum = measureSpectrum(tone(14700, 0.5));
    expect(spectrum.hopSize).toBe(2048);
    expect(spectrum.sampledFrames).toBeLessThanOrEqual(24);
    expect(Math.abs(spectrum.peaks[0].hz - 14700)).toBeLessThan(12);
  });
  it("compares per-bin mean power instead of summed band power", () => {
    const spectrum = measureSpectrum(tone(80, 0.5));
    expect(spectrum.bands.find((band) => band.name === "boom")!.meanPower).toBeGreaterThan(spectrum.bands.find((band) => band.name === "air")!.meanPower);
  });
  it("zero-pads a short frame so loudness can report insufficient duration", () => {
    const short = new Float32Array(100);
    expect(measureSpectrum({ sampleRate: 48000, channels: [short, short] }).sampledFrames).toBe(1);
  });
});

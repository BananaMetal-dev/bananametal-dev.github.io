import { describe, expect, it } from "vitest";
import type { AudioData } from "../../audio/audioTypes";
import { extractSpectralFeatures } from "./features";
import { boom, harshness, hfHiss, hfSmear, lowBandPhase, metallicRinging, mud, sectionDegradation } from "./detectors";

const sampleRate = 48_000;
function tone(hz: number, seconds: number, amplitude = 0.25): Float32Array {
  return Float32Array.from({ length: sampleRate * seconds }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * i / sampleRate));
}
function mix(...channels: Float32Array[]): Float32Array {
  return Float32Array.from(channels[0], (_, i) => channels.reduce((sum, channel) => sum + channel[i], 0));
}
function stereo(channel: Float32Array, right = channel): AudioData { return { sampleRate, channels: [channel, right] }; }
function noise(seconds: number, amplitude = 0.15): Float32Array {
  let state = 0xdeadbeef;
  return Float32Array.from({ length: sampleRate * seconds }, () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return ((state >>> 0) / 0xffffffff * 2 - 1) * amplitude;
  });
}

describe("artifact detectors: synthetic positive, negative and boundary", () => {
  it("separates broadband hiss and smear from a narrow 14.7 kHz tone", () => {
    const broad = extractSpectralFeatures(stereo(mix(tone(1000, 3, 0.1), noise(3, 0.25))));
    expect(hfHiss(broad)).toMatchObject({ status: "valid", detected: true });
    expect(hfSmear(broad)).toMatchObject({ status: "valid", detected: true });
    expect(metallicRinging(broad)).toMatchObject({ status: "valid", detected: false });
    const narrow = extractSpectralFeatures(stereo(mix(tone(1000, 3, 0.1), tone(14700, 3, 0.25))));
    expect(metallicRinging(narrow)).toMatchObject({ status: "valid", detected: true });
    expect(hfHiss(narrow)).toMatchObject({ status: "valid", detected: false });
  });

  it("does not call a short isolated high tone persistent ringing", () => {
    const reference = tone(1000, 3, 0.15), burst = new Float32Array(reference.length);
    for (let i = sampleRate; i < sampleRate + 3000; i++) burst[i] = 0.25 * Math.sin(2 * Math.PI * 14700 * i / sampleRate);
    const result = metallicRinging(extractSpectralFeatures(stereo(mix(reference, burst))));
    expect(result).toMatchObject({ status: "valid", detected: false });
  });

  it("distinguishes low-band anti-phase from identical stereo", () => {
    const low = tone(80, 3, 0.2), body = tone(1000, 3, 0.1);
    expect(lowBandPhase(stereo(mix(low, body), mix(Float32Array.from(low, (value) => -value), body))))
      .toMatchObject({ status: "valid", detected: true });
    expect(lowBandPhase(stereo(mix(low, body)))).toMatchObject({ status: "valid", detected: false });
  });

  it("detects persistent boom, mud and presence harshness using neighbouring bands", () => {
    const low = extractSpectralFeatures(stereo(mix(tone(82, 3, 0.25), tone(310, 3, 0.25), tone(1000, 3, 0.05))));
    expect(boom(low)).toMatchObject({ status: "valid", detected: true });
    expect(mud(low)).toMatchObject({ status: "valid", detected: true });
    const presence = extractSpectralFeatures(stereo(mix(tone(1000, 3, 0.05), tone(4200, 3, 0.25))));
    expect(harshness(presence)).toMatchObject({ status: "valid", detected: true });
  });

  it("compares the end against both earlier sections", () => {
    const base = tone(1000, 4, 0.1), endNoise = noise(4, 0.18);
    const degrading = Float32Array.from(base, (value, i) => value + (i >= 3 * sampleRate ? endNoise[i] : 0));
    const result = sectionDegradation(extractSpectralFeatures(stereo(degrading)), 4);
    expect(result).toMatchObject({ status: "valid", detected: true });
    expect(Number(result.evidence.endScore)).toBeGreaterThan(Number(result.evidence.middleScore));
    const stable = sectionDegradation(extractSpectralFeatures(stereo(base)), 4);
    expect(stable).toMatchObject({ status: "valid", detected: false });
  });

  it("reports unknown on insufficient data instead of negative", () => {
    const silence = stereo(new Float32Array(sampleRate));
    expect(hfSmear(extractSpectralFeatures(silence))).toMatchObject({ status: "unknown" });
    expect(lowBandPhase(silence)).toMatchObject({ status: "unknown" });
    const short = stereo(new Float32Array(1000));
    expect(metallicRinging(extractSpectralFeatures(short))).toMatchObject({ status: "unknown" });
  });
});

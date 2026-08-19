import { describe, expect, it } from "vitest";
import { decodeMp3ToWav } from "./mp3Decoder";
import { encodeMp3 } from "./mp3Encoder";
import { parseWav } from "./wavParser";

describe("local WASM codecs", () => {
  it("encodes WAV PCM to MP3 and decodes it back to a valid WAV", async () => {
    const sampleRate = 44_100;
    const samples = new Float32Array(sampleRate / 4);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.sin((index / sampleRate) * Math.PI * 2 * 440) * 0.4;
    const mp3 = await encodeMp3({ sampleRate, channelData: [samples], frames: samples.length }, 128, () => undefined);
    expect(mp3.byteLength).toBeGreaterThan(1000);
    const decodedWav = await decodeMp3ToWav(mp3);
    const decoded = parseWav(decodedWav.slice().buffer as ArrayBuffer);
    expect(decoded.sampleRate).toBe(sampleRate);
    expect([1, 2]).toContain(decoded.channelData.length);
    expect(decoded.frames).toBeGreaterThan(samples.length * 0.8);
  });

  it("rejects invalid MP3 bytes without producing a WAV", async () => {
    await expect(decodeMp3ToWav(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/no audio/i);
  });
});

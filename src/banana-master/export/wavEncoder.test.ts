import { expect, it } from "vitest";
import { encodeWav } from "./wavEncoder";

it("writes stereo 24-bit PCM WAV from the provided master buffer", async () => {
  const blob = encodeWav({ sampleRate: 48000, channels: [new Float32Array([0, 0.5]), new Float32Array([0, -0.5])] });
  const view = new DataView(await blob.arrayBuffer());
  expect(blob.size).toBe(56);
  expect(view.getUint16(22, true)).toBe(2);
  expect(view.getUint16(34, true)).toBe(24);
  expect(view.getUint32(40, true)).toBe(12);
  expect(view.getUint8(52)).not.toBe(0);
});

it("refuses integer conversion that would clip or contain non-finite PCM", () => {
  for (const value of [1.01, -1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => encodeWav({ sampleRate: 48000, channels: [new Float32Array([value]), new Float32Array([0])] })).toThrow();
  }
});

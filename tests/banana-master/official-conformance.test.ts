import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AudioData } from "../../src/banana-master/audio/audioTypes";
import { measureIntegratedLoudness } from "../../src/banana-master/analysis/loudness/integrated";

// Files distributed by ITU for Report BS.2217-1. Keep these outside version control.
const directory = process.env.BANANA_MASTER_ITU_FIXTURES ?? resolve(process.cwd(), "tests/fixtures/itu-official/wav");
function load(name: string): AudioData {
  const bytes = readFileSync(resolve(directory, name));
  let offset = 12, data = 0, dataBytes = 0, rate = 0, channels = 0, bits = 0;
  while (offset + 8 <= bytes.length) {
    const tag = bytes.toString("ascii", offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (tag === "fmt ") { channels = bytes.readUInt16LE(offset + 10); rate = bytes.readUInt32LE(offset + 12); bits = bytes.readUInt16LE(offset + 22); }
    if (tag === "data") { data = offset + 8; dataBytes = size; break; }
    offset += 8 + size + size % 2;
  }
  if (rate !== 48_000 || bits !== 16 || (channels !== 1 && channels !== 2) || !dataBytes) throw new Error("Unexpected official fixture format");
  const frames = dataBytes / (channels * 2);
  const pcm = Array.from({ length: channels }, () => new Float32Array(frames));
  for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < channels; channel++) {
    pcm[channel][frame] = bytes.readInt16LE(data + (frame * channels + channel) * 2) / 32768;
  }
  return { sampleRate: rate, channels: pcm };
}

const cases = [
  ["1770-2_Comp_23LKFS_1000Hz_2ch.wav", -23],
  ["1770-2_Comp_23LKFS_25Hz_2ch.wav", -23],
  ["1770-2_Comp_23LKFS_100Hz_2ch.wav", -23],
  ["1770-2_Comp_23LKFS_10000Hz_2ch.wav", -23],
  ["1770-2_Comp_AbsGateTest.wav", -69.5],
  ["1770-2_Comp_RelGateTest.wav", -10],
  ["1770-2 Conf Mono Voice+Music-23LKFS.wav", -23],
  ["1770-2 Conf Stereo VinL+R-23LKFS.wav", -23],
] as const;

describe("ITU-R BS.2217-1 official test files (±0.1 LKFS)", () => {
  for (const [name, expected] of cases) {
    (existsSync(resolve(directory, name)) ? it : it.skip)(name, () => {
      const measured = measureIntegratedLoudness(load(name));
      expect(measured.status).toBe("valid");
      if (measured.status === "valid") expect(Math.abs(measured.integratedLufs - expected)).toBeLessThanOrEqual(0.1);
    });
  }
});

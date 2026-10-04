import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AudioData } from "../../src/banana-master/audio/audioTypes";

export const fixtureDir = process.env.BANANA_MASTER_FIXTURES ?? resolve(process.cwd(), "../Banana Master/Banana_Master_Test_Tracks_V1");
export const fixture = (name: string) => resolve(fixtureDir, name);

export function readPcm16Wav(name: string): AudioData {
  return readPcm16WavPath(fixture(name));
}

export function readPcm16WavPath(path: string): AudioData {
  const bytes = readFileSync(path);
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not WAV");
  let offset = 12, sampleRate = 0, channels = 0, bitDepth = 0, pcmOffset = 0, pcmSize = 0;
  while (offset + 8 <= bytes.length) {
    const chunk = bytes.toString("ascii", offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (chunk === "fmt ") { channels = bytes.readUInt16LE(offset + 10); sampleRate = bytes.readUInt32LE(offset + 12); bitDepth = bytes.readUInt16LE(offset + 22); }
    if (chunk === "data") { pcmOffset = offset + 8; pcmSize = size; break; }
    offset += 8 + size + (size % 2);
  }
  if (channels !== 2 || sampleRate !== 48000 || bitDepth !== 16 || !pcmSize) throw new Error("Fixture format mismatch");
  const frames = pcmSize / 4, left = new Float32Array(frames), right = new Float32Array(frames);
  for (let i = 0, position = pcmOffset; i < frames; i++, position += 4) {
    left[i] = bytes.readInt16LE(position) / 32768; right[i] = bytes.readInt16LE(position + 2) / 32768;
  }
  return { sampleRate, channels: [left, right] };
}

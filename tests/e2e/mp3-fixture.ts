import { readFile, writeFile } from "node:fs/promises";
import { createMp3Encoder } from "wasm-media-encoders";

export async function encodeFixtureMp3(wavPath: string, mp3Path: string): Promise<void> {
  const wav = await readFile(wavPath);
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV fixture");
  const channels = wav.readUInt16LE(22), sampleRate = wav.readUInt32LE(24), bitDepth = wav.readUInt16LE(34);
  if (channels !== 2 || sampleRate !== 48_000 || bitDepth !== 16 || wav.toString("ascii", 36, 40) !== "data") throw new Error("Fixture must be 48 kHz stereo PCM16");
  const frames = wav.readUInt32LE(40) / 4;
  const encoder = await createMp3Encoder();
  encoder.configure({ channels: 2, sampleRate, bitrate: 192 });
  const chunks: Uint8Array[] = [];
  const frameChunk = 1152 * 32;
  for (let start = 0; start < frames; start += frameChunk) {
    const length = Math.min(frameChunk, frames - start);
    const left = new Float32Array(length), right = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      left[i] = wav.readInt16LE(44 + (start + i) * 4) / 32768;
      right[i] = wav.readInt16LE(46 + (start + i) * 4) / 32768;
    }
    const chunk = encoder.encode([left, right]);
    if (chunk.length) chunks.push(chunk.slice());
  }
  const last = encoder.finalize();
  if (last.length) chunks.push(last.slice());
  await writeFile(mp3Path, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

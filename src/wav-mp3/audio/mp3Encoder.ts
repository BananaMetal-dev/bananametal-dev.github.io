import { createMp3Encoder } from "wasm-media-encoders";
import type { ParsedWav } from "./wavParser";

export async function encodeMp3(wav: ParsedWav, bitrate: 128 | 192 | 256 | 320, onProgress: (progress: number) => void): Promise<Uint8Array> {
  const encoder = await createMp3Encoder();
  encoder.configure({ channels: wav.channelData.length as 1 | 2, sampleRate: wav.sampleRate, bitrate });
  const chunks: Uint8Array[] = [];
  const framesPerChunk = 1152 * 32;
  for (let offset = 0; offset < wav.frames; offset += framesPerChunk) {
    const end = Math.min(wav.frames, offset + framesPerChunk);
    const encoded = encoder.encode(wav.channelData.map((channel) => channel.subarray(offset, end)));
    if (encoded.length) chunks.push(encoded.slice());
    onProgress(end / wav.frames);
  }
  const finalChunk = encoder.finalize();
  if (finalChunk.length) chunks.push(finalChunk.slice());
  return join(chunks);
}
function join(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

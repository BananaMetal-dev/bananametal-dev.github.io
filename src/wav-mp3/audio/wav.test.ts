import { describe, expect, it } from "vitest";
import { parseWav } from "./wavParser";
import { writePcm16Wav } from "./wavWriter";

describe("WAV parser and writer", () => {
  it("writes and reads 16-bit mono PCM", () => {
    const samples = new Float32Array([-1, -0.5, 0, 0.5, 1]);
    const wav = writePcm16Wav([samples], 44_100);
    const parsed = parseWav(owned(wav));
    expect(parsed.sampleRate).toBe(44_100);
    expect(parsed.channelData).toHaveLength(1);
    expect(parsed.frames).toBe(samples.length);
    expect(parsed.channelData[0][0]).toBeCloseTo(-1, 4);
    expect(parsed.channelData[0][4]).toBeCloseTo(1, 4);
  });

  it("preserves two separate channels", () => {
    const wav = writePcm16Wav([new Float32Array([0.25, 0.5]), new Float32Array([-0.25, -0.5])], 48_000);
    const parsed = parseWav(owned(wav));
    expect(parsed.channelData).toHaveLength(2);
    expect(parsed.channelData[0][1]).toBeCloseTo(0.5, 4);
    expect(parsed.channelData[1][1]).toBeCloseTo(-0.5, 4);
  });

  it("walks unknown odd-sized RIFF chunks with padding", () => {
    const source = writePcm16Wav([new Float32Array([0, 0.25])], 44_100);
    const output = new Uint8Array(source.length + 10);
    output.set(source.subarray(0, 12), 0);
    output.set([0x4a, 0x55, 0x4e, 0x4b, 1, 0, 0, 0, 7, 0], 12);
    output.set(source.subarray(12), 22);
    new DataView(output.buffer).setUint32(4, output.length - 8, true);
    expect(parseWav(output.buffer).frames).toBe(2);
  });

  it("rejects files with more than two channels", () => {
    const wav = writePcm16Wav([new Float32Array([0])], 44_100);
    const view = new DataView(wav.buffer);
    view.setUint16(22, 3, true);
    expect(() => parseWav(owned(wav))).toThrow(/mono and stereo/);
  });

  it.each([
    [1, 8, false],
    [1, 24, false],
    [1, 32, false],
    [3, 32, false],
    [1, 24, true],
    [3, 32, true],
  ])("parses format %i at %i-bit (extensible: %s)", (format, bits, extensible) => {
    const parsed = parseWav(makeSingleSampleWav(format, bits, extensible));
    expect(parsed.channelData[0][0]).toBeCloseTo(0.5, 2);
  });
});

function owned(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function makeSingleSampleWav(format: number, bits: number, extensible: boolean): ArrayBuffer {
  const bytesPerSample = bits / 8;
  const formatSize = extensible ? 40 : 16;
  const dataOffset = 12 + 8 + formatSize + 8;
  const buffer = new ArrayBuffer(dataOffset + bytesPerSample + (bytesPerSample & 1));
  const view = new DataView(buffer);
  write(view, 0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); write(view, 8, "WAVE");
  write(view, 12, "fmt "); view.setUint32(16, formatSize, true); view.setUint16(20, extensible ? 0xfffe : format, true);
  view.setUint16(22, 1, true); view.setUint32(24, 44_100, true); view.setUint32(28, 44_100 * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true); view.setUint16(34, bits, true);
  if (extensible) { view.setUint16(36, 22, true); view.setUint16(38, bits, true); view.setUint16(44, format, true); }
  write(view, 12 + 8 + formatSize, "data"); view.setUint32(16 + 8 + formatSize, bytesPerSample, true);
  if (format === 3) view.setFloat32(dataOffset, 0.5, true);
  else if (bits === 8) view.setUint8(dataOffset, 192);
  else if (bits === 24) { view.setUint8(dataOffset, 0); view.setUint8(dataOffset + 1, 0); view.setUint8(dataOffset + 2, 0x40); }
  else view.setInt32(dataOffset, 1_073_741_824, true);
  return buffer;
}

function write(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

import type { AudioData } from "../audio/audioTypes";

export function encodeWav(master: AudioData): Blob {
  const [left, right] = master.channels;
  if (!left || !right || left.length !== right.length) throw new Error("ステレオ出力が必要です。");
  for (const channel of [left, right]) for (const sample of channel) {
    if (!Number.isFinite(sample) || Math.abs(sample) > 1) throw new Error("整数PCMの範囲外です。WAV出力を中止しました。");
  }
  const bytes = new ArrayBuffer(44 + left.length * 6), view = new DataView(bytes);
  const ascii = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  ascii(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); ascii(8, "WAVE"); ascii(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, master.sampleRate, true); view.setUint32(28, master.sampleRate * 6, true);
  view.setUint16(32, 6, true); view.setUint16(34, 24, true); ascii(36, "data");
  view.setUint32(40, left.length * 6, true);
  let offset = 44;
  for (let i = 0; i < left.length; i++) for (const value of [left[i], right[i]]) {
    const sample = Math.round(value * (value < 0 ? 8388608 : 8388607));
    view.setUint8(offset++, sample & 255); view.setUint8(offset++, (sample >> 8) & 255); view.setUint8(offset++, (sample >> 16) & 255);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export type ParsedWav = { sampleRate: number; channelData: Float32Array[]; frames: number };
const PCM = 0x0001;
const IEEE_FLOAT = 0x0003;
const EXTENSIBLE = 0xfffe;

export function parseWav(buffer: ArrayBuffer): ParsedWav {
  const view = new DataView(buffer);
  if (view.byteLength < 44 || text(view, 0, 4) !== "RIFF" || text(view, 8, 4) !== "WAVE") {
    throw new Error("Unsupported or invalid WAV container.");
  }
  let format: { code: number; channels: number; sampleRate: number; blockAlign: number; bits: number } | undefined;
  let dataOffset = -1;
  let dataSize = 0;
  for (let offset = 12; offset + 8 <= view.byteLength; ) {
    const id = text(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const payload = offset + 8;
    if (payload + size > view.byteLength) throw new Error(`Invalid WAV chunk: ${id}`);
    if (id === "fmt ") {
      if (size < 16) throw new Error("Invalid WAV format chunk.");
      let code = view.getUint16(payload, true);
      const channels = view.getUint16(payload + 2, true);
      const sampleRate = view.getUint32(payload + 4, true);
      const blockAlign = view.getUint16(payload + 12, true);
      const bits = view.getUint16(payload + 14, true);
      if (code === EXTENSIBLE) {
        if (size < 40) throw new Error("Invalid WAVE_FORMAT_EXTENSIBLE header.");
        code = view.getUint16(payload + 24, true);
      }
      format = { code, channels, sampleRate, blockAlign, bits };
    } else if (id === "data" && dataOffset < 0) {
      dataOffset = payload;
      dataSize = size;
    }
    offset = payload + size + (size & 1);
  }
  if (!format || dataOffset < 0) throw new Error("WAV is missing format or audio data.");
  if (format.channels < 1 || format.channels > 2) throw new Error("Only mono and stereo WAV files are supported.");
  if (format.sampleRate < 8000 || format.sampleRate > 384000) throw new Error("Unsupported WAV sample rate.");
  if (format.code !== PCM && format.code !== IEEE_FLOAT) throw new Error(`Unsupported WAV format code: ${format.code}`);
  if (format.code === IEEE_FLOAT && format.bits !== 32) throw new Error("Only 32-bit float WAV is supported.");
  if (format.code === PCM && ![8, 16, 24, 32].includes(format.bits)) throw new Error(`Unsupported PCM bit depth: ${format.bits}`);
  const expectedAlign = format.channels * (format.bits / 8);
  if (format.blockAlign !== expectedAlign || dataSize % format.blockAlign !== 0) throw new Error("Invalid WAV block alignment.");
  const frames = dataSize / format.blockAlign;
  const channelData = Array.from({ length: format.channels }, () => new Float32Array(frames));
  const bytes = format.bits / 8;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < format.channels; channel += 1) {
      const offset = dataOffset + frame * format.blockAlign + channel * bytes;
      channelData[channel][frame] = decodeSample(view, offset, format.code, format.bits);
    }
  }
  return { sampleRate: format.sampleRate, channelData, frames };
}

function decodeSample(view: DataView, offset: number, code: number, bits: number): number {
  if (code === IEEE_FLOAT) return clamp(view.getFloat32(offset, true));
  if (bits === 8) return (view.getUint8(offset) - 128) / 128;
  if (bits === 16) return view.getInt16(offset, true) / 32768;
  if (bits === 24) {
    let value = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
    if (value & 0x800000) value |= ~0xffffff;
    return value / 8388608;
  }
  return view.getInt32(offset, true) / 2147483648;
}
function text(view: DataView, offset: number, length: number): string {
  return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, length));
}
function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

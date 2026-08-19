export function writePcm16Wav(channelData: Float32Array[], sampleRate: number): Uint8Array {
  if (channelData.length < 1 || channelData.length > 2) throw new Error("Only mono and stereo output is supported.");
  const frames = channelData[0].length;
  if (!channelData.every((channel) => channel.length === frames)) throw new Error("Audio channels have different lengths.");
  const channels = channelData.length;
  const dataSize = frames * channels * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeText(view, 0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeText(view, 8, "WAVE");
  writeText(view, 12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true); writeText(view, 36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] || 0));
      view.setInt16(offset, sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767), true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}
function writeText(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

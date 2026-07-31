const WAV_HEADER_BYTES = 44;

export function encodePcm16Wav(buffer: AudioBuffer) {
  const channelCount = Math.min(buffer.numberOfChannels, 2);
  const bytesPerSample = 2;
  const dataBytes = buffer.length * channelCount * bytesPerSample;
  if (dataBytes > 0xffff_ffff - WAV_HEADER_BYTES) {
    throw new Error("WAV_TOO_LARGE");
  }

  const output = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(output);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  const channels = Array.from({ length: channelCount }, (_, index) => buffer.getChannelData(index));
  let byteOffset = WAV_HEADER_BYTES;
  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(byteOffset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      byteOffset += bytesPerSample;
    }
  }

  return new Blob([output], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createWavFileName(sourceName: string, semitones: number) {
  const baseName = sourceName.replace(/\.[^.]+$/, "");
  const keyLabel = semitones > 0 ? `+${semitones}` : `${semitones}`;
  return `${baseName}_key${keyLabel}.wav`;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

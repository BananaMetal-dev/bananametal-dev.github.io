import type { AudioData } from "../audio/audioTypes";

export function applyGain(original: AudioData, linear: number): AudioData {
  if (!(linear > 0 && linear <= 1)) throw new Error("ゲインが範囲外です。");
  return { sampleRate: original.sampleRate, channels: original.channels.map((channel) => {
    const result = new Float32Array(channel.length);
    for (let i = 0; i < channel.length; i++) result[i] = channel[i] * linear;
    return result;
  }) };
}

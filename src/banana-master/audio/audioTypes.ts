export type AudioData = Readonly<{
  sampleRate: number;
  channels: readonly Float32Array[];
}>;

export type FileInfo = Readonly<{
  filename: string;
  format: string;
  duration: number;
  sampleRate: number;
  channels: number;
}>;

export function durationOf(audio: AudioData): number {
  return (audio.channels[0]?.length ?? 0) / audio.sampleRate;
}

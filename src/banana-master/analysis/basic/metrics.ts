import type { AudioData } from "../../audio/audioTypes";

export type BasicMetrics = Readonly<{ samplePeak: number; rms: number; crestFactorDb: number; stereoCorrelation: number; clippingSamples: number }>;

export function measureBasic(audio: AudioData): BasicMetrics {
  const [left, right] = audio.channels;
  if (!left || !right || left.length !== right.length || left.length === 0) throw new Error("有効なステレオ音源ではありません。");
  let peak = 0, sum = 0, ll = 0, rr = 0, lr = 0, clipping = 0;
  for (let i = 0; i < left.length; i++) {
    const l = left[i], r = right[i];
    if (!Number.isFinite(l) || !Number.isFinite(r)) throw new Error("無効なPCM値です。");
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    sum += l * l + r * r;
    ll += l * l; rr += r * r; lr += l * r;
    if (Math.abs(l) >= 1) clipping++;
    if (Math.abs(r) >= 1) clipping++;
  }
  const rms = Math.sqrt(sum / (left.length * 2));
  return { samplePeak: peak, rms, crestFactorDb: rms ? 20 * Math.log10(peak / rms) : 0,
    stereoCorrelation: ll && rr ? lr / Math.sqrt(ll * rr) : 0, clippingSamples: clipping };
}

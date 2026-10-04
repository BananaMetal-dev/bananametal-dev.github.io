import type { AudioData } from "../../audio/audioTypes";

export type Band = Readonly<{ name: string; lowHz: number; highHz: number; meanPower: number; db: number }>;
export type Spectrum = Readonly<{ fftSize: number; hopSize: number; sampledFrames: number; candidateFrames: number; window: "hann"; bands: readonly Band[]; peaks: readonly { hz: number; db: number }[] }>;
const ranges = [
  ["sub", 20, 60], ["boom", 60, 120], ["upperBass", 120, 200], ["mud", 200, 450], ["mid", 450, 2000],
  ["presence", 2000, 6000], ["high", 6000, 12000], ["air", 12000, 20000],
] as const;

function fftPower(samples: Float32Array): Float64Array {
  const n = samples.length, re = new Float64Array(n), im = new Float64Array(n);
  let windowSum = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
    windowSum += w;
    re[i] = samples[i] * w;
  }
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const theta = -2 * Math.PI / len;
    for (let start = 0; start < n; start += len) {
      for (let j = 0; j < len / 2; j++) {
        const c = Math.cos(theta * j), s = Math.sin(theta * j), k = start + j + len / 2;
        const tr = re[k] * c - im[k] * s, ti = re[k] * s + im[k] * c;
        re[k] = re[start + j] - tr; im[k] = im[start + j] - ti;
        re[start + j] += tr; im[start + j] += ti;
      }
    }
  }
  const power = new Float64Array(n / 2 + 1);
  for (let k = 0; k < power.length; k++) power[k] = (re[k] ** 2 + im[k] ** 2) / windowSum ** 2 * (k === 0 || k === n / 2 ? 1 : 4);
  return power;
}

export function measureSpectrum(audio: AudioData): Spectrum {
  const size = 4096, hopSize = 2048, [left, right] = audio.channels;
  if (!left || !right || left.length !== right.length || !left.length) throw new Error("有効なステレオ音源ではありません。");
  const total = new Float64Array(size / 2 + 1);
  const candidateFrames = left.length < size ? 1 : Math.floor((left.length - size) / hopSize) + 1;
  const frameCount = Math.min(24, candidateFrames);
  for (let frame = 0; frame < frameCount; frame++) {
    const candidateIndex = Math.floor(frame * (candidateFrames - 1) / Math.max(1, frameCount - 1));
    const offset = candidateIndex * hopSize;
    const leftFrame = new Float32Array(size), rightFrame = new Float32Array(size);
    leftFrame.set(left.subarray(offset, offset + size));
    rightFrame.set(right.subarray(offset, offset + size));
    const lp = fftPower(leftFrame);
    const rp = fftPower(rightFrame);
    for (let k = 0; k < total.length; k++) total[k] += (lp[k] + rp[k]) / (2 * frameCount);
  }
  const hzPerBin = audio.sampleRate / size;
  const bands = ranges.map(([name, lowHz, highHz]) => {
    let sum = 0, count = 0;
    for (let k = 0; k < total.length; k++) if (k * hzPerBin >= lowHz && k * hzPerBin < highHz) { sum += total[k]; count++; }
    const meanPower = count ? sum / count : 0;
    return { name, lowHz, highHz, meanPower, db: 10 * Math.log10(Math.max(meanPower, 1e-20)) };
  });
  const peaks = Array.from(total, (power, k) => ({ hz: k * hzPerBin, db: 10 * Math.log10(Math.max(power, 1e-20)) }))
    .filter((peak) => peak.hz >= 20).sort((a, b) => b.db - a.db).slice(0, 12);
  return { fftSize: size, hopSize, sampledFrames: frameCount, candidateFrames, window: "hann", bands, peaks };
}

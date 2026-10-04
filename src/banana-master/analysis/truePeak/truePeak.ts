import type { AudioData } from "../../audio/audioTypes";

// ITU-R BS.1770-5 Annex 2: example 48th-order, 4-phase FIR interpolation coefficients.
// Each row is a tap; each column is a phase. Floating point needs no 12.04 dB headroom shift.
const taps = [
  [0.0017089843750, -0.0291748046875, -0.0189208984375, -0.0083007812500],
  [0.0109863281250, 0.0292968750000, 0.0330810546875, 0.0148925781250],
  [-0.0196533203125, -0.0517578125000, -0.0582275390625, -0.0266113281250],
  [0.0332031250000, 0.0891113281250, 0.1015625000000, 0.0476074218750],
  [-0.0594482421875, -0.1665039062500, -0.2003173828125, -0.1022949218750],
  [0.1373291015625, 0.4650878906250, 0.7797851562500, 0.9721679687500],
  [0.9721679687500, 0.7797851562500, 0.4650878906250, 0.1373291015625],
  [-0.1022949218750, -0.2003173828125, -0.1665039062500, -0.0594482421875],
  [0.0476074218750, 0.1015625000000, 0.0891113281250, 0.0332031250000],
  [-0.0266113281250, -0.0582275390625, -0.0517578125000, -0.0196533203125],
  [0.0148925781250, 0.0330810546875, 0.0292968750000, 0.0109863281250],
  [-0.0083007812500, -0.0189208984375, -0.0291748046875, 0.0017089843750],
] as const;
const phases = [0, 1, 2, 3].map((phase) => Float64Array.from(taps.map((row) => row[phase])));

export type TruePeakResult =
  | Readonly<{ status: "valid"; truePeakLinear: number; truePeakDbTp: number; samplePeakDbFs: number; differenceDb: number; standard: "ITU-R BS.1770-5 Annex 2"; conformance: "unknown"; oversampleFactor: 4 }>
  | Readonly<{ status: "unknown"; reason: "unsupported-sample-rate" | "empty-input" | "silence"; samplePeakDbFs: number | null; standard: "ITU-R BS.1770-5 Annex 2"; conformance: "unknown" }>;

export function measureTruePeak(audio: AudioData): TruePeakResult {
  if (audio.sampleRate !== 48_000) {
    let peak = 0;
    for (const channel of audio.channels) for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
    return { status: "unknown", reason: "unsupported-sample-rate", samplePeakDbFs: peak ? 20 * Math.log10(peak) : null,
      standard: "ITU-R BS.1770-5 Annex 2", conformance: "unknown" };
  }
  const length = audio.channels[0]?.length ?? 0;
  if (!length) return { status: "unknown", reason: "empty-input", samplePeakDbFs: null, standard: "ITU-R BS.1770-5 Annex 2", conformance: "unknown" };
  if (audio.channels.some((channel) => channel.length !== length)) throw new Error("Channel lengths differ");
  let samplePeak = 0, interpolatedPeak = 0;
  for (const channel of audio.channels) {
    for (let n = 0; n < length; n++) {
      const sample = Math.abs(channel[n]);
      if (sample > samplePeak) samplePeak = sample;
      for (const coefficients of phases) {
        let interpolated = 0;
        for (let tap = 0; tap < 12; tap++) {
          const index = n + 6 - tap;
          if (index >= 0 && index < length) interpolated += coefficients[tap] * channel[index];
        }
        const magnitude = Math.abs(interpolated);
        if (magnitude > interpolatedPeak) interpolatedPeak = magnitude;
      }
    }
  }
  if (!samplePeak) return { status: "unknown", reason: "silence", samplePeakDbFs: null, standard: "ITU-R BS.1770-5 Annex 2", conformance: "unknown" };
  const truePeakLinear = Math.max(samplePeak, interpolatedPeak);
  const samplePeakDbFs = 20 * Math.log10(samplePeak), truePeakDbTp = 20 * Math.log10(truePeakLinear);
  return { status: "valid", truePeakLinear, truePeakDbTp, samplePeakDbFs, differenceDb: truePeakDbTp - samplePeakDbFs,
    standard: "ITU-R BS.1770-5 Annex 2", conformance: "unknown", oversampleFactor: 4 };
}

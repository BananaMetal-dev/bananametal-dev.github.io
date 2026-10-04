import type { AudioData } from "../audio/audioTypes";
import { measureTruePeak } from "../analysis/truePeak/truePeak";

export const TRUE_PEAK_CEILING_DBTP = -1.0;

export type TruePeakSafety = Readonly<{
  ceilingDbTp: -1.0;
  inputSamplePeakDbFs: number | null;
  inputTruePeakDbTp: number | null;
  preSafetyTruePeakDbTp: number | null;
  applied: boolean;
  appliedGainDb: number;
  gainDb: number;
  finalSamplePeakDbFs: number | null;
  finalTruePeakDbTp: number | null;
  verificationStatus: "verified" | "measurement-unknown" | "non-finite" | "ceiling-unmet" | "decoder-warning";
  decoderWarning: "none-observed" | "present" | "unknown";
  decoderWarningCount: number | null;
}>;

function hasNonFinite(audio: AudioData): boolean {
  for (const channel of audio.channels) for (const sample of channel) if (!Number.isFinite(sample)) return true;
  return false;
}

export function applyTruePeakSafety(dspOutput: AudioData,
  inputTruePeakDbTp: number | null, inputSamplePeakDbFs: number | null,
  decoderWarningCount: number | null = null): { master: AudioData; safety: TruePeakSafety } {
  const warning = decoderWarningCount === null ? "unknown" : decoderWarningCount > 0 ? "present" : "none-observed";
  const base = { ceilingDbTp: TRUE_PEAK_CEILING_DBTP, inputSamplePeakDbFs, inputTruePeakDbTp,
    decoderWarning: warning, decoderWarningCount } as const;
  if (hasNonFinite(dspOutput)) return { master: dspOutput, safety: { ...base, preSafetyTruePeakDbTp: null,
    applied: false, appliedGainDb: 0, gainDb: 0, finalSamplePeakDbFs: null, finalTruePeakDbTp: null, verificationStatus: "non-finite" } };
  const pre = measureTruePeak(dspOutput);
  if (pre.status !== "valid" || !Number.isFinite(pre.truePeakDbTp)) return { master: dspOutput,
    safety: { ...base, preSafetyTruePeakDbTp: null, applied: false, appliedGainDb: 0, gainDb: 0,
      finalSamplePeakDbFs: pre.samplePeakDbFs, finalTruePeakDbTp: null, verificationStatus: "measurement-unknown" } };

  // The tiny margin covers Float32 rounding after a single gain pass.
  const requiredDb = pre.truePeakDbTp > TRUE_PEAK_CEILING_DBTP
    ? TRUE_PEAK_CEILING_DBTP - pre.truePeakDbTp - 0.0001 : 0;
  const gain = Math.pow(10, requiredDb / 20);
  const master = gain === 1 ? dspOutput : { sampleRate: dspOutput.sampleRate,
    channels: dspOutput.channels.map((channel) => Float32Array.from(channel, (sample) => sample * gain)) };
  const final = measureTruePeak(master);
  const finalValid = final.status === "valid" && Number.isFinite(final.truePeakDbTp)
    && final.truePeakDbTp <= TRUE_PEAK_CEILING_DBTP && final.samplePeakDbFs <= 0;
  const status = !finalValid ? final.status !== "valid" ? "measurement-unknown" : "ceiling-unmet"
    : warning === "present" ? "decoder-warning" : "verified";
  return { master, safety: { ...base, preSafetyTruePeakDbTp: pre.truePeakDbTp,
    applied: gain !== 1, appliedGainDb: requiredDb, gainDb: requiredDb,
    finalSamplePeakDbFs: final.samplePeakDbFs, finalTruePeakDbTp: final.status === "valid" ? final.truePeakDbTp : null,
    verificationStatus: status } };
}

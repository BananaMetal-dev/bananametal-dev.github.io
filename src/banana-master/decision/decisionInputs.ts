import type { Analysis } from "../analysis/analyzeAudio";
import type { ArtifactAnalysis } from "../analysis/artifacts/detectors";
import type { LoudnessResult } from "../analysis/loudness/integrated";
import type { Spectrum } from "../analysis/spectrum/bandEnergy";
import type { TruePeakResult } from "../analysis/truePeak/truePeak";

export type DecisionInputs = Readonly<{
  loudness: LoudnessResult;
  samplePeak: Readonly<{ status: "valid" | "unknown"; linear: number; dbFs: number | null }>;
  truePeak: TruePeakResult;
  dynamics: Readonly<{ status: "valid" | "unknown"; rms: number; crestFactorDb: number }>;
  spectrum: Spectrum;
  stereo: Readonly<{ status: "valid" | "unknown"; wholeBandCorrelation: number }>;
  artifacts: ArtifactAnalysis;
}>;

export function toDecisionInputs(analysis: Analysis): DecisionInputs {
  const peak = analysis.basic.samplePeak, rms = analysis.basic.rms;
  return { loudness: analysis.loudness,
    samplePeak: { status: peak > 0 ? "valid" : "unknown", linear: peak, dbFs: peak > 0 ? 20 * Math.log10(peak) : null },
    truePeak: analysis.truePeak,
    dynamics: { status: rms > 0 ? "valid" : "unknown", rms, crestFactorDb: analysis.basic.crestFactorDb },
    spectrum: analysis.spectrum,
    stereo: { status: rms > 0 ? "valid" : "unknown", wholeBandCorrelation: analysis.basic.stereoCorrelation },
    artifacts: analysis.artifacts };
}

import type { AudioData } from "../audio/audioTypes";
import { measureBasic, type BasicMetrics } from "./basic/metrics";
import { measureSpectrum, type Spectrum } from "./spectrum/bandEnergy";
import { measureIntegratedLoudness, type LoudnessResult } from "./loudness/integrated";
import { measureTruePeak, type TruePeakResult } from "./truePeak/truePeak";
import { analyzeArtifacts } from "./artifacts/analyzeArtifacts";
import type { ArtifactAnalysis } from "./artifacts/detectors";

export type Analysis = Readonly<{
  basic: BasicMetrics;
  loudness: LoudnessResult;
  truePeak: TruePeakResult;
  spectrum: Spectrum;
  artifacts: ArtifactAnalysis;
}>;

export function analyzeAudio(audio: AudioData): Analysis {
  const basic = measureBasic(audio), spectrum = measureSpectrum(audio);
  return {
    basic, loudness: measureIntegratedLoudness(audio), truePeak: measureTruePeak(audio), spectrum,
    artifacts: analyzeArtifacts(audio, spectrum, basic),
  };
}

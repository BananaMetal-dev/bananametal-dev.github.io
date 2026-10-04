import type { AudioData } from "../../audio/audioTypes";
import type { Spectrum } from "../spectrum/bandEnergy";
import type { BasicMetrics } from "../basic/metrics";
import { extractSpectralFeatures, FFT_SIZE, NOMINAL_HOP } from "./features";
import { boom, harshness, hfHiss, hfSmear, highBandExcess, lowBandPhase, metallicRinging, mud, sectionDegradation, type ArtifactAnalysis } from "./detectors";

export type ArtifactDecisionInput = Pick<ArtifactAnalysis, "highBandExcess" | "hfSmear" | "metallicRinging" | "hfHiss" | "mud" | "boom" | "harshness" | "lowBandPhase" | "sectionDegradation">;

// The formal spectrum and whole-band correlation stay independent inputs; artifact features use a longer time-resolved window.
export function analyzeArtifacts(audio: AudioData, spectrum: Spectrum, basic: BasicMetrics): ArtifactAnalysis {
  const features = extractSpectralFeatures(audio);
  return {
    highBandExcess: highBandExcess(features), hfSmear: hfSmear(features), metallicRinging: metallicRinging(features),
    hfHiss: hfHiss(features), mud: mud(features), boom: boom(features), harshness: harshness(features),
    lowBandPhase: lowBandPhase(audio), sectionDegradation: sectionDegradation(features, (audio.channels[0]?.length ?? 0) / audio.sampleRate),
    measurement: { fftSize: FFT_SIZE, nominalHop: NOMINAL_HOP, sampledFrames: features.sampledFrames,
      candidateFrames: features.candidateFrames, maxFrameGapSeconds: features.maxFrameGapSeconds,
      formalSpectrumFftSize: spectrum.fftSize, formalSpectrumSampledFrames: spectrum.sampledFrames,
      wholeBandCorrelation: basic.stereoCorrelation,
      thresholdPolicy: "provisional-v1" },
  };
}

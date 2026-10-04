import type { AudioData } from "../audio/audioTypes";
import type { Analysis } from "../analysis/analyzeAudio";
import { measureBasic } from "../analysis/basic/metrics";
import type { MasterPlan } from "../decision/masterPlan";
import { applyGain } from "../dsp/gain";

export function renderMaster(original: AudioData, plan: MasterPlan): AudioData {
  return applyGain(original, plan.gain.linear);
}

export type Verification = Readonly<{ success: boolean; peak: number; rms: number; clippingSamples: number; stereoCorrelation: number; reason: string }>;

export function verifyMaster(master: AudioData, pre: Analysis, plan: MasterPlan): Verification {
  const post = measureBasic(master);
  const success = post.samplePeak <= plan.samplePeakCeiling + 0.00001 && post.clippingSamples === 0;
  return { success, peak: post.samplePeak, rms: post.rms, clippingSamples: post.clippingSamples,
    stereoCorrelation: post.stereoCorrelation,
    reason: success ? (plan.action === "no-change" ? "補正不要" : "Sample Peakを検証済み") : "出力Peak検証失敗",
  };
}

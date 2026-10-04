import type { FileInfo } from "../audio/audioTypes";
import type { Analysis } from "../analysis/analyzeAudio";
import type { MasterPlan } from "../decision/masterPlan";
import type { FormalMasterPlan } from "../decision/formalMasterPlan";
import type { DspExecution } from "../dsp/formalDsp";
import type { FormalVerification } from "../render/verifyFormalMaster";

export type Timings = { decodeMs: number; analysisMs: number; decisionMs: number; renderMs: number; encodeMs: number; exportMs: number; workerUsed: boolean; approximateMemoryBytes: number };

export function makeDebugReport(file: FileInfo, analysis: Analysis, plan: MasterPlan, formalPlan: FormalMasterPlan,
  verification: FormalVerification, performance: Timings, execution: DspExecution, postAnalysis: Analysis) {
  return {
    version: "0.1.0", testedFile: { filename: file.filename, format: file.format }, input: file,
    processingVersions: { app: "0.1.0", analyzer: "formal-provisional-v1", detector: "provisional-v1",
      decision: formalPlan.version, dsp: "formal-dsp-true-peak-safety-v1", safety: "provisional-true-peak-v1" },
    analysis, decision: plan, legacyPreviewPlan: plan, legacyPreviewPlanApplied: false, decisionEngine: formalPlan,
    processing: { selectedDsp: execution.actions.filter((action) => action.status === "applied").map((action) => action.kind),
      gainDb: execution.peakProtection.gainDb, limiter: "unimplemented", eq: "formal-plan-controlled", stereo: "formal-plan-controlled",
      gainReductionDb: -execution.peakProtection.gainDb },
    truePeakSafety: { inputSamplePeakDbFs: execution.peakProtection.inputSamplePeakDbFs,
      inputTruePeakDbTp: execution.peakProtection.inputTruePeakDbTp,
      preSafetyTruePeakDbTp: execution.peakProtection.preSafetyTruePeakDbTp,
      appliedSafetyGainDb: execution.peakProtection.appliedGainDb,
      finalSamplePeakDbFs: execution.peakProtection.finalSamplePeakDbFs,
      finalTruePeakDbTp: execution.peakProtection.finalTruePeakDbTp,
      ceilingDbTp: execution.peakProtection.ceilingDbTp,
      verificationStatus: execution.peakProtection.verificationStatus,
      decoderWarning: execution.peakProtection.decoderWarning,
      decoderWarningCount: execution.peakProtection.decoderWarningCount },
    formalMasterPlan: formalPlan, dspExecution: execution, preAnalysis: analysis, postAnalysis, verification,
    output: verification, performance,
    environment: { browser: typeof navigator === "undefined" ? "node-calibration-batch" : navigator.userAgent },
    privacy: { audioUpload: false, pcmIncluded: false, processing: "browser-local" },
  };
}

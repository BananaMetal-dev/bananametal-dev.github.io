import type { AudioData } from "../audio/audioTypes";
import type { Analysis } from "../analysis/analyzeAudio";
import type { DspExecution } from "../dsp/formalDsp";
import type { Verification } from "./renderMaster";

export type ActionVerification = { id: string; planned: { kind: string; maxDb: number; centerHz: number | null };
  applied: { status: "applied" | "skipped"; maxDb: number; reason: string };
  measured: { detectorBefore: number | null; detectorAfter: number | null };
  status: "verified" | "failed" | "unknown" };
export type FormalVerification = Verification & { actions: ActionVerification[]; finite: boolean; truePeakCeilingDbTp: -1.0;
  truePeakStatus: Analysis["truePeak"]["status"]; safetyStatus: DspExecution["peakProtection"]["verificationStatus"];
  qualityImprovementProven: false };

export function verifyFormalMaster(master: AudioData, pre: Analysis, post: Analysis, execution: DspExecution): FormalVerification {
  let finite = true;
  for (const channel of master.channels) for (const value of channel) if (!Number.isFinite(value)) finite = false;
  const peak = post.basic.samplePeak, ceiling = execution.peakProtection.ceilingDbTp;
  const signalSafe = finite && post.truePeak.status === "valid" && post.truePeak.truePeakDbTp <= ceiling
    && peak <= 1 && post.basic.clippingSamples === 0;
  const safe = signalSafe && execution.peakProtection.verificationStatus === "verified";
  const actions: ActionVerification[] = execution.actions.map((action) => {
    const detector = action.kind === "dynamic-notch" ? "metallicRinging" : action.kind === "low-band-side-reduction" ? "lowBandPhase"
      : action.kind === "dynamic-eq" ? action.id.endsWith("mud") ? "mud" : action.id.endsWith("boom") ? "boom" : "harshness"
      : action.kind === "time-local-hf-reduction" ? "sectionDegradation" : "hfSmear";
    const before = pre.artifacts[detector], after = post.artifacts[detector];
    const measured = { detectorBefore: before.status === "valid" ? before.severity : null,
      detectorAfter: after.status === "valid" ? after.severity : null };
    const withinBudget = action.actualMaxDb <= action.allowedMaxDb + 1e-6;
    const notWorse = measured.detectorBefore !== null && measured.detectorAfter !== null
      && measured.detectorAfter <= measured.detectorBefore + 0.01;
    return { id: action.id, planned: { kind: action.kind, maxDb: action.plannedMaxDb, centerHz: action.centerHz },
      applied: { status: action.status, maxDb: action.actualMaxDb, reason: action.reason }, measured,
      status: !signalSafe || !withinBudget ? "failed" : action.status === "applied" && action.actualMaxDb > 0 && notWorse ? "verified" : "unknown" };
  });
  const actionsWithinBudget = actions.every((action) => action.status !== "failed");
  return { success: safe && actionsWithinBudget, peak, rms: post.basic.rms,
    clippingSamples: post.basic.clippingSamples, stereoCorrelation: post.basic.stereoCorrelation,
    reason: !signalSafe ? "出力安全性の検証失敗: 最終PCMの再測定が上限または有限値条件を満たしません"
      : !safe ? `出力安全性の検証失敗: ${execution.peakProtection.verificationStatus}`
        : !actionsWithinBudget ? "DSP補正上限の検証失敗"
          : "True Peak −1.0 dBTP以下とDSP上限を検証済み。音質改善の主観評価は未検証",
    actions, finite, truePeakCeilingDbTp: ceiling, truePeakStatus: post.truePeak.status,
    safetyStatus: execution.peakProtection.verificationStatus, qualityImprovementProven: false };
}

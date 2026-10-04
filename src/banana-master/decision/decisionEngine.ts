import type { Analysis } from "../analysis/analyzeAudio";
import type { MasterPlan, Mode } from "./masterPlan";

// Existing preview-only Sample Peak protection. The formal plan is built in formalDecision.ts.
export function buildMasterPlan(analysis: Analysis, mode: Mode = "standard"): MasterPlan {
  const ceiling = 0.95;
  const peak = analysis.basic.samplePeak;
  const engage = peak > ceiling;
  const linear = engage ? ceiling / peak : 1;
  const plan: MasterPlan = {
    version: 1, mode, action: engage ? "peak-containment" : "no-change",
    gain: { linear, db: 20 * Math.log10(linear) }, samplePeakCeiling: ceiling,
    reasons: engage ? ["Sample Peakが安全上限を超えました。全体ゲインを必要量だけ下げます。"] : ["測定済み項目では補正不要です。"],
    triggeredRules: engage ? ["sample-peak-ceiling"] : [],
    severity: engage ? Math.min(1, (peak - ceiling) / ceiling) : 0,
    confidence: 1, risk: "low",
  };
  return Object.freeze({ ...plan, gain: Object.freeze(plan.gain), reasons: Object.freeze(plan.reasons), triggeredRules: Object.freeze(plan.triggeredRules) });
}

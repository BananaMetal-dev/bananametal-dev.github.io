export type DecisionState = "OK" | "WATCH" | "CORRECT" | "UNKNOWN";
export type MusicalRisk = "low" | "medium" | "high";
export type DetectorName = "highBandExcess" | "hfSmear" | "metallicRinging" | "hfHiss" | "mud" | "boom" | "harshness" | "lowBandPhase" | "sectionDegradation";
export type TimeRange = Readonly<{ startSeconds: number; endSeconds: number }>;

type ActionBase = Readonly<{
  id: string; risk: MusicalRisk; priority: "artifact-safety"; execution: "planned-only";
  sourceDetectors: readonly DetectorName[]; timeRanges: readonly TimeRange[];
}>;
export type HighBandAction = ActionBase & Readonly<{
  kind: "dynamic-high-band-reduction"; bandHz: readonly [6000, 20000]; maxGainReductionDb: number;
}>;
export type NotchAction = ActionBase & Readonly<{
  kind: "dynamic-notch"; frequencyHz: number; equivalentQ: number; maxGainReductionDb: number;
}>;
export type EqAction = ActionBase & Readonly<{
  kind: "dynamic-eq"; purpose: "mud" | "boom" | "harshness"; bandHz: readonly [number, number];
  maxGainReductionDb: number; staticEqAlternativeMaxDb: number;
}>;
export type StereoAction = ActionBase & Readonly<{
  kind: "low-band-side-reduction"; belowHz: 120; direction: "narrow-only"; maxSideReductionDb: number;
}>;
export type TimeLocalAction = ActionBase & Readonly<{
  kind: "time-local-hf-reduction"; bandHz: readonly [6000, 20000]; maxGainReductionDb: number;
}>;
export type CorrectionAction = HighBandAction | NotchAction | EqAction | StereoAction | TimeLocalAction;

export type DecisionTrace = Readonly<{
  ruleId: string; detector: DetectorName | "samplePeak"; state: DecisionState; risk: MusicalRisk;
  severity: number | null; confidence: number | null; detected: boolean | null;
  evidence: Readonly<Record<string, number | string | boolean | readonly number[]>>;
  requiredSeverity: number; requiredConfidence: number;
  actionId: string | null; reason: string;
}>;
export type CorrectionBudgets = Readonly<{
  policy: "provisional-v1"; staticEqAbsDb: 1.5; dynamicEqMaxGainReductionDb: 2;
  dynamicNotchMaxGainReductionDb: 3; deEssMaxGainReductionDb: 2; lowBandSideMaxReductionDb: 1.5;
}>;
export type LoudnessDecision = Readonly<{
  status: "deferred" | "unknown"; nominalLufs: null; targetPolicy: "quality-constrained";
  stopConditions: Readonly<{ truePeakCeilingDbTp: null; minimumPlrDb: null; maximumLimiterGainReductionDb: null }>;
  reason: string;
}>;
export type FormalMasterPlan = Readonly<{
  version: "provisional-v1"; status: "valid" | "unknown"; state: DecisionState;
  actions: readonly CorrectionAction[]; trace: readonly DecisionTrace[];
  triggeredRules: readonly string[]; rejectedRules: readonly string[];
  reasons: readonly Readonly<{ code: string; text: string }>[]; warnings: readonly string[];
  risk: MusicalRisk | "none"; budgets: CorrectionBudgets; loudness: LoudnessDecision;
  priorityOrder: readonly ["artifact-safety", "tonal-preference", "loudness-preference"];
  processingOrder: readonly ["artifact", "tonal", "stereo", "loudness", "limiter"];
}>;

export const PROVISIONAL_BUDGETS: CorrectionBudgets = Object.freeze({
  policy: "provisional-v1", staticEqAbsDb: 1.5, dynamicEqMaxGainReductionDb: 2,
  dynamicNotchMaxGainReductionDb: 3, deEssMaxGainReductionDb: 2, lowBandSideMaxReductionDb: 1.5,
});

// Structured clone removes Object.freeze, so freeze both the Worker original and the received copy.
export function freezeFormalMasterPlan(plan: FormalMasterPlan): FormalMasterPlan {
  const freeze = (value: object) => {
    if (Object.isFrozen(value)) return;
    for (const child of Object.values(value)) if (child && typeof child === "object") freeze(child);
    Object.freeze(value);
  };
  freeze(plan);
  return plan;
}

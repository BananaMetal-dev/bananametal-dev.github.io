import type { DetectorResult } from "../analysis/artifacts/detectors";
import type { DecisionInputs } from "./decisionInputs";
import { freezeFormalMasterPlan, PROVISIONAL_BUDGETS, type CorrectionAction, type DecisionState, type DecisionTrace,
  type DetectorName, type FormalMasterPlan, type MusicalRisk } from "./formalMasterPlan";

type Rule = Readonly<{ id: string; detector: DetectorName; risk: MusicalRisk; severity: number; confidence: number }>;
const RULES: readonly Rule[] = [
  { id: "HIGH-BAND-01", detector: "highBandExcess", risk: "medium", severity: 0.45, confidence: 0.7 },
  { id: "HF-SMEAR-01", detector: "hfSmear", risk: "medium", severity: 0.5, confidence: 0.7 },
  { id: "RINGING-01", detector: "metallicRinging", risk: "medium", severity: 0.5, confidence: 0.7 },
  { id: "HF-HISS-01", detector: "hfHiss", risk: "medium", severity: 0.5, confidence: 0.7 },
  { id: "MUD-01", detector: "mud", risk: "medium", severity: 0.3, confidence: 0.7 },
  { id: "BOOM-01", detector: "boom", risk: "medium", severity: 0.4, confidence: 0.7 },
  { id: "HARSH-01", detector: "harshness", risk: "medium", severity: 0.5, confidence: 0.7 },
  { id: "LOW-PHASE-01", detector: "lowBandPhase", risk: "high", severity: 0.7, confidence: 0.85 },
  { id: "SECTION-01", detector: "sectionDegradation", risk: "medium", severity: 0.5, confidence: 0.7 },
];

function numeric(result: DetectorResult, key: string): number | null {
  const value = result.evidence[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function evidenceAdequate(name: DetectorName, result: DetectorResult): boolean {
  switch (name) {
    case "highBandExcess": return (numeric(result, "persistence") ?? 0) > 0.3;
    case "hfSmear": return (numeric(result, "persistence") ?? 0) > 0.25 && (numeric(result, "longestDurationSeconds") ?? 0) >= 0.5;
    case "metallicRinging": {
      const frequency = numeric(result, "peakFrequencyHz") ?? 0;
      return frequency >= 8000 && frequency <= 18000 && (numeric(result, "persistence") ?? 0) > 0.08
        && (numeric(result, "localMedianContrastDb") ?? 0) >= 15 && (numeric(result, "durationSeconds") ?? 0) >= 0.5;
    }
    case "hfHiss": return (numeric(result, "persistence") ?? 0) > 0.25;
    case "mud": case "boom": case "harshness": return (numeric(result, "persistence") ?? 0) > 0.3;
    case "lowBandPhase": return (numeric(result, "antiPhasePersistence") ?? 0) > 0.2 && (numeric(result, "correlation") ?? 1) < -0.2;
    case "sectionDegradation": return (numeric(result, "endScore") ?? 0) > Math.max(numeric(result, "startScore") ?? 0, numeric(result, "middleScore") ?? 0) + 0.2;
  }
}
function copyEvidence(result: DetectorResult): DecisionTrace["evidence"] {
  return Object.fromEntries(Object.entries(result.evidence).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
}
function assess(rule: Rule, result: DetectorResult): DecisionTrace {
  if (result.status === "unknown") return { ruleId: rule.id, detector: rule.detector, state: "UNKNOWN", risk: rule.risk,
    severity: null, confidence: null, detected: null, evidence: copyEvidence(result), requiredSeverity: rule.severity,
    requiredConfidence: rule.confidence, actionId: null, reason: `measurement-unknown:${result.reason}` };
  let state: DecisionState = "OK", reason = "no-problem-evidence";
  if (result.detected) {
    state = "WATCH";
    reason = result.confidence < rule.confidence ? "confidence-below-gate"
      : result.severity < rule.severity ? "severity-below-gate"
      : !evidenceAdequate(rule.detector, result) ? "evidence-incomplete"
      : rule.detector === "highBandExcess" ? "high-band-alone-no-action" : "eligible";
    if (reason === "eligible") state = "CORRECT";
  }
  return { ruleId: rule.id, detector: rule.detector, state, risk: rule.risk, severity: result.severity,
    confidence: result.confidence, detected: result.detected, evidence: copyEvidence(result),
    requiredSeverity: rule.severity, requiredConfidence: rule.confidence, actionId: null, reason };
}
function withAction(trace: DecisionTrace, actionId: string, reason = trace.reason): DecisionTrace {
  return { ...trace, actionId, reason };
}
function withheld(trace: DecisionTrace, reason: string): DecisionTrace {
  return { ...trace, state: "WATCH", actionId: null, reason };
}
export function buildFormalMasterPlan(inputs: DecisionInputs): FormalMasterPlan {
  const trace = RULES.map((rule) => assess(rule, inputs.artifacts[rule.detector]));
  const peakIsHigh = inputs.samplePeak.status === "valid" && inputs.samplePeak.linear > 0.95;
  trace.push({ ruleId: "SAMPLE-PEAK-01", detector: "samplePeak", state: inputs.samplePeak.status === "unknown" ? "UNKNOWN" : peakIsHigh ? "WATCH" : "OK",
    risk: "low", severity: inputs.samplePeak.status === "valid" ? Math.min(1, Math.max(0, (inputs.samplePeak.linear - 0.95) / 0.05)) : null,
    confidence: inputs.samplePeak.status === "valid" ? 1 : null, detected: inputs.samplePeak.status === "valid" ? peakIsHigh : null,
    evidence: { samplePeakLinear: inputs.samplePeak.linear, previewCeilingLinear: 0.95 },
    requiredSeverity: 0, requiredConfidence: 1, actionId: null,
    reason: inputs.samplePeak.status === "unknown" ? "sample-peak-unknown" : peakIsHigh ? "preview-peak-protection-is-separate-from-formal-plan" : "peak-below-preview-ceiling" });
  const index = Object.fromEntries(trace.map((entry, position) => [entry.detector, position])) as Record<DetectorName, number>;
  const get = (name: DetectorName) => trace[index[name]];
  const put = (name: DetectorName, entry: DecisionTrace) => { trace[index[name]] = entry; };
  const actions: CorrectionAction[] = [];

  // Safety and artifact priority: avoid simultaneous broad/narrow corrections in the same region.
  if (get("lowBandPhase").state === "CORRECT" && get("boom").state === "CORRECT") {
    put("boom", withheld(get("boom"), "deferred-to-higher-risk-low-band-phase-review"));
  }
  if (get("metallicRinging").state === "CORRECT" && get("harshness").state === "CORRECT") {
    put("harshness", withheld(get("harshness"), "deferred-to-narrow-ringing-correction"));
  }

  const hfNames = (["hfSmear", "hfHiss"] as const).filter((name) => get(name).state === "CORRECT");
  const sectionCorrect = get("sectionDegradation").state === "CORRECT";
  if (sectionCorrect) {
    const section = inputs.artifacts.sectionDegradation;
    const start = numeric(section, "endStartSeconds"), end = numeric(section, "endEndSeconds");
    if (start !== null && end !== null && end > start) {
      const sourceDetectors: DetectorName[] = ["sectionDegradation", ...hfNames];
      if (get("highBandExcess").detected && get("highBandExcess").confidence! >= 0.7) sourceDetectors.push("highBandExcess");
      const id = "time-local-hf";
      actions.push({ id, kind: "time-local-hf-reduction", risk: "medium", priority: "artifact-safety", execution: "planned-only",
        sourceDetectors, timeRanges: [{ startSeconds: start, endSeconds: end }], bandHz: [6000, 20000],
        maxGainReductionDb: Math.min(PROVISIONAL_BUDGETS.dynamicEqMaxGainReductionDb, PROVISIONAL_BUDGETS.dynamicEqMaxGainReductionDb * (get("sectionDegradation").severity ?? 0)) });
      put("sectionDegradation", withAction(get("sectionDegradation"), id));
      for (const name of hfNames) put(name, withAction(get(name), id, "merged-into-time-local-hf"));
      if (sourceDetectors.includes("highBandExcess")) put("highBandExcess", withAction(get("highBandExcess"), id, "supporting-evidence-only"));
    } else put("sectionDegradation", withheld(get("sectionDegradation"), "time-range-unavailable"));
  }
  if (!actions.some((action) => action.kind === "time-local-hf-reduction") && hfNames.length) {
    const id = "dynamic-hf";
    const sourceDetectors: DetectorName[] = [...hfNames];
    if (get("highBandExcess").detected && get("highBandExcess").confidence! >= 0.7) sourceDetectors.push("highBandExcess");
    actions.push({ id, kind: "dynamic-high-band-reduction", risk: "medium", priority: "artifact-safety", execution: "planned-only",
      sourceDetectors, timeRanges: [], bandHz: [6000, 20000],
      maxGainReductionDb: Math.min(PROVISIONAL_BUDGETS.dynamicEqMaxGainReductionDb,
        PROVISIONAL_BUDGETS.dynamicEqMaxGainReductionDb * Math.max(...hfNames.map((name) => get(name).severity ?? 0))) });
    for (const name of hfNames) put(name, withAction(get(name), id, hfNames.length > 1 ? "merged-hf-symptoms" : "eligible"));
    if (sourceDetectors.includes("highBandExcess")) put("highBandExcess", withAction(get("highBandExcess"), id, "supporting-evidence-only"));
  }

  if (get("metallicRinging").state === "CORRECT") {
    const result = inputs.artifacts.metallicRinging;
    const id = "dynamic-notch";
    actions.push({ id, kind: "dynamic-notch", risk: "medium", priority: "artifact-safety", execution: "planned-only",
      sourceDetectors: ["metallicRinging"], timeRanges: [], frequencyHz: numeric(result, "peakFrequencyHz")!,
      equivalentQ: numeric(result, "equivalentQ") ?? 0,
      maxGainReductionDb: Math.min(PROVISIONAL_BUDGETS.dynamicNotchMaxGainReductionDb,
        PROVISIONAL_BUDGETS.dynamicNotchMaxGainReductionDb * (get("metallicRinging").severity ?? 0)) });
    put("metallicRinging", withAction(get("metallicRinging"), id));
  }
  for (const [name, purpose, band] of [
    ["mud", "mud", [200, 450]], ["boom", "boom", [60, 120]], ["harshness", "harshness", [2500, 6000]],
  ] as const) if (get(name).state === "CORRECT") {
    const id = `dynamic-eq-${purpose}`;
    actions.push({ id, kind: "dynamic-eq", purpose, risk: "medium", priority: "artifact-safety", execution: "planned-only",
      sourceDetectors: [name], timeRanges: [], bandHz: band,
      maxGainReductionDb: Math.min(PROVISIONAL_BUDGETS.dynamicEqMaxGainReductionDb,
        PROVISIONAL_BUDGETS.dynamicEqMaxGainReductionDb * (get(name).severity ?? 0)),
      staticEqAlternativeMaxDb: PROVISIONAL_BUDGETS.staticEqAbsDb });
    put(name, withAction(get(name), id));
  }
  if (get("lowBandPhase").state === "CORRECT") {
    const id = "low-band-side";
    actions.push({ id, kind: "low-band-side-reduction", risk: "high", priority: "artifact-safety", execution: "planned-only",
      sourceDetectors: ["lowBandPhase"], timeRanges: [], belowHz: 120, direction: "narrow-only",
      maxSideReductionDb: Math.min(PROVISIONAL_BUDGETS.lowBandSideMaxReductionDb,
        PROVISIONAL_BUDGETS.lowBandSideMaxReductionDb * (get("lowBandPhase").severity ?? 0)) });
    put("lowBandPhase", withAction(get("lowBandPhase"), id));
  }

  const unknown = trace.some((entry) => entry.state === "UNKNOWN") || inputs.loudness.status === "unknown"
    || inputs.truePeak.status === "unknown" || inputs.samplePeak.status === "unknown";
  const state: DecisionState = actions.length ? "CORRECT" : trace.some((entry) => entry.state === "WATCH") ? "WATCH"
    : unknown ? "UNKNOWN" : "OK";
  const warnings: string[] = ["Thresholds and correction budgets are provisional; DSP execution requires separate plan validation."];
  if (inputs.truePeak.status === "unknown") warnings.push("True Peak unknown: limiter ceiling and loudness action are not determined.");
  if (inputs.loudness.status === "unknown") warnings.push("Integrated Loudness unknown: loudness action is not determined.");
  if (peakIsHigh) warnings.push("Sample Peak exceeds the provisional ceiling; peak protection is a separate final DSP stage.");
  if (trace.some((entry) => entry.state === "UNKNOWN")) warnings.push("One or more artifact decisions are unknown; no dependent action was generated.");
  const risk: FormalMasterPlan["risk"] = actions.some((action) => action.risk === "high") ? "high"
    : actions.some((action) => action.risk === "medium") ? "medium" : actions.some((action) => action.risk === "low") ? "low" : "none";
  const plan: FormalMasterPlan = {
    version: "provisional-v1", status: unknown ? "unknown" : "valid", state, actions, trace,
    triggeredRules: trace.filter((entry) => entry.actionId !== null).map((entry) => entry.ruleId),
    rejectedRules: trace.filter((entry) => entry.state === "WATCH" && entry.actionId === null).map((entry) => entry.ruleId),
    reasons: trace.map((entry) => ({ code: entry.ruleId, text: `${entry.state}: ${entry.reason}` })), warnings,
    risk, budgets: PROVISIONAL_BUDGETS,
    loudness: { status: inputs.truePeak.status === "valid" && inputs.loudness.status === "valid" ? "deferred" : "unknown",
      nominalLufs: null, targetPolicy: "quality-constrained",
      stopConditions: { truePeakCeilingDbTp: null, minimumPlrDb: null, maximumLimiterGainReductionDb: null },
      reason: "No loudness or limiter action before post-artifact processing and quality constraints are defined." },
    priorityOrder: ["artifact-safety", "tonal-preference", "loudness-preference"],
    processingOrder: ["artifact", "tonal", "stereo", "loudness", "limiter"],
  };
  return freezeFormalMasterPlan(plan);
}

import { describe, expect, it } from "vitest";
import { analyzeAudio } from "../analysis/analyzeAudio";
import type { DetectorResult } from "../analysis/artifacts/detectors";
import { toDecisionInputs, type DecisionInputs } from "./decisionInputs";
import { buildFormalMasterPlan } from "./formalDecision";
import { freezeFormalMasterPlan, type DetectorName } from "./formalMasterPlan";

const channel = Float32Array.from({ length: 48_000 }, (_, i) => 0.2 * Math.sin(2 * Math.PI * 1000 * i / 48_000));
const measured = toDecisionInputs(analyzeAudio({ sampleRate: 48_000, channels: [channel, channel] }));
const names: readonly DetectorName[] = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"];
const quiet: DetectorResult = { status: "valid", detected: false, severity: 0, confidence: 0.95, evidence: {} };
function positive(severity: number, confidence: number, evidence: DetectorResult["evidence"]): DetectorResult {
  return { status: "valid", detected: true, severity, confidence, evidence };
}
function inputs(overrides: Partial<Record<DetectorName, DetectorResult>> = {}): DecisionInputs {
  const artifacts = { ...measured.artifacts };
  for (const name of names) artifacts[name] = overrides[name] ?? quiet;
  return { ...measured, artifacts };
}
const smear = (severity = 0.8, confidence = 0.9) => positive(severity, confidence, { persistence: 0.7, longestDurationSeconds: 3 });
const hiss = positive(0.75, 0.9, { persistence: 0.6 });
const ringing = positive(0.8, 0.9, { peakFrequencyHz: 14_700, persistence: 0.4, localMedianContrastDb: 24,
  durationSeconds: 2, equivalentQ: 20 });
const boom = positive(0.8, 0.9, { persistence: 0.7 });
const phase = positive(0.9, 0.92, { antiPhasePersistence: 0.7, correlation: -0.8 });

describe("formal Decision Engine", () => {
  it("returns a deterministic, deeply immutable No Action plan", () => {
    const input = inputs();
    const plan = buildFormalMasterPlan(input);
    expect(plan).toMatchObject({ status: "valid", state: "OK", actions: [], risk: "none" });
    expect(plan.trace).toHaveLength(10);
    expect(plan.trace.every((entry) => entry.state === "OK")).toBe(true);
    expect(plan.processingOrder).toEqual(["artifact", "tonal", "stereo", "loudness", "limiter"]);
    expect(JSON.stringify(buildFormalMasterPlan(input))).toBe(JSON.stringify(plan));
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.actions)).toBe(true);
    expect(Object.isFrozen(plan.trace[0].evidence)).toBe(true);
    const transferred = structuredClone(plan);
    expect(Object.isFrozen(transferred)).toBe(false);
    expect(Object.isFrozen(freezeFormalMasterPlan(transferred).actions)).toBe(true);
    expect(Object.isFrozen(input.artifacts.hfSmear)).toBe(false);
  });

  it("merges smear, hiss and supporting high-band evidence into one bounded action", () => {
    const plan = buildFormalMasterPlan(inputs({ hfSmear: smear(), hfHiss: hiss,
      highBandExcess: positive(0.5, 0.9, { persistence: 0.6 }) }));
    expect(plan.state).toBe("CORRECT");
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ kind: "dynamic-high-band-reduction", execution: "planned-only",
      sourceDetectors: ["hfSmear", "hfHiss", "highBandExcess"], risk: "medium" });
    expect("maxGainReductionDb" in plan.actions[0] && plan.actions[0].maxGainReductionDb).toBeLessThanOrEqual(2);
  });

  it("keeps high-band excess alone at WATCH", () => {
    const plan = buildFormalMasterPlan(inputs({ highBandExcess: positive(0.9, 0.95, { persistence: 0.8 }) }));
    expect(plan).toMatchObject({ state: "WATCH", actions: [] });
    expect(plan.rejectedRules).toContain("HIGH-BAND-01");
  });

  it("records hot Sample Peak as WATCH without reusing preview gain as a formal action", () => {
    const plan = buildFormalMasterPlan({ ...inputs(), samplePeak: { status: "valid", linear: 0.98, dbFs: 20 * Math.log10(0.98) } });
    expect(plan).toMatchObject({ state: "WATCH", actions: [] });
    expect(plan.trace.find((entry) => entry.ruleId === "SAMPLE-PEAK-01")).toMatchObject({ state: "WATCH", actionId: null });
  });

  it("chooses a frequency-derived notch and defers a competing harshness action", () => {
    const plan = buildFormalMasterPlan(inputs({ metallicRinging: ringing, harshness: positive(0.85, 0.9, { persistence: 0.8 }) }));
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ kind: "dynamic-notch", frequencyHz: 14_700 });
    expect(plan.trace.find((entry) => entry.detector === "harshness")).toMatchObject({ state: "WATCH", reason: "deferred-to-narrow-ringing-correction" });
    expect(plan.rejectedRules).toContain("HARSH-01");
  });

  it("prioritizes high-risk low-band phase correction over boom EQ and only narrows", () => {
    const plan = buildFormalMasterPlan(inputs({ boom, lowBandPhase: phase }));
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ kind: "low-band-side-reduction", direction: "narrow-only", risk: "high" });
    expect(plan.trace.find((entry) => entry.detector === "boom")).toMatchObject({ state: "WATCH" });
    expect(plan.risk).toBe("high");
  });

  it("permits distinct bounded mud and boom candidates", () => {
    const plan = buildFormalMasterPlan(inputs({ mud: positive(0.6, 0.9, { persistence: 0.7 }), boom }));
    expect(plan.actions.map((action) => action.kind)).toEqual(["dynamic-eq", "dynamic-eq"]);
    expect(plan.actions.map((action) => "purpose" in action ? action.purpose : "")).toEqual(["mud", "boom"]);
    for (const action of plan.actions) if (action.kind === "dynamic-eq") {
      expect(action.maxGainReductionDb).toBeLessThanOrEqual(2);
      expect(action.staticEqAlternativeMaxDb).toBe(1.5);
    }
  });

  it("uses an end-only time range and avoids stacking a global HF action", () => {
    const plan = buildFormalMasterPlan(inputs({ hfSmear: smear(), sectionDegradation: positive(0.9, 0.9,
      { startScore: 0.1, middleScore: 0.2, endScore: 0.9, endStartSeconds: 15, endEndSeconds: 20 }) }));
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({ kind: "time-local-hf-reduction", timeRanges: [{ startSeconds: 15, endSeconds: 20 }] });
    expect(plan.actions[0].sourceDetectors).toEqual(["sectionDegradation", "hfSmear"]);
  });

  it("fixes severity and confidence boundaries, including high severity with weak evidence", () => {
    expect(buildFormalMasterPlan(inputs({ hfSmear: smear(0.499, 0.9) })).state).toBe("WATCH");
    expect(buildFormalMasterPlan(inputs({ hfSmear: smear(0.5, 0.699) })).state).toBe("WATCH");
    expect(buildFormalMasterPlan(inputs({ hfSmear: smear(0.5, 0.7) })).state).toBe("CORRECT");
    expect(buildFormalMasterPlan(inputs({ hfSmear: smear(1, 0.4) })).actions).toEqual([]);
    expect(buildFormalMasterPlan(inputs({ lowBandPhase: positive(0.9, 0.84,
      { antiPhasePersistence: 0.7, correlation: -0.8 }) })).state).toBe("WATCH");
  });

  it("propagates Unknown and leaves TP-dependent loudness and limiter actions unplanned", () => {
    const input: DecisionInputs = { ...inputs({ metallicRinging: { status: "unknown", reason: "insufficient-data", severity: null, confidence: null, evidence: {} } }),
      truePeak: { status: "unknown", reason: "unsupported-sample-rate", samplePeakDbFs: -3,
        standard: "ITU-R BS.1770-5 Annex 2", conformance: "unknown" } };
    const plan = buildFormalMasterPlan(input);
    expect(plan).toMatchObject({ status: "unknown", state: "UNKNOWN", actions: [], loudness: { status: "unknown" } });
    expect(plan.trace.find((entry) => entry.detector === "metallicRinging")).toMatchObject({ state: "UNKNOWN", actionId: null });
    expect(plan.warnings.some((warning) => warning.includes("True Peak unknown"))).toBe(true);
  });
});

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeAudio } from "../../src/banana-master/analysis/analyzeAudio";
import { buildMasterPlan } from "../../src/banana-master/decision/decisionEngine";
import { buildFormalMasterPlan } from "../../src/banana-master/decision/formalDecision";
import { toDecisionInputs } from "../../src/banana-master/decision/decisionInputs";
import { renderMaster, verifyMaster } from "../../src/banana-master/render/renderMaster";
import { fixture, readPcm16Wav } from "./fixture";

const testIfPresent = (name: string) => existsSync(fixture(name)) ? it : it.skip;

describe("Banana Master fixture regression", () => {
  testIfPresent("01_balanced_reference.wav")("01 no-change", () => {
    const original = readPcm16Wav("01_balanced_reference.wav");
    const analysis = analyzeAudio(original), plan = buildMasterPlan(analysis);
    expect(plan.action).toBe("no-change");
    expect(buildFormalMasterPlan(toDecisionInputs(analysis))).toMatchObject({ state: "OK", actions: [] });
    for (const [name, result] of Object.entries(analysis.artifacts)) {
      if (name === "measurement") continue;
      expect(result, name).toMatchObject({ status: "valid", detected: false });
      expect(result.severity, name).toBeLessThan(0.25);
      expect(result.confidence, name).toBeGreaterThanOrEqual(0);
      expect(result.confidence, name).toBeLessThanOrEqual(1);
    }
    const master = renderMaster(original, plan);
    expect(master.channels[0][1000]).toBe(original.channels[0][1000]);
    expect(verifyMaster(master, analysis, plan).success).toBe(true);
  });
  testIfPresent("02_hf_smear.wav")("02 HF smear and hiss without ringing", () => {
    const analysis = analyzeAudio(readPcm16Wav("02_hf_smear.wav"));
    const artifacts = analysis.artifacts;
    expect(artifacts.highBandExcess).toMatchObject({ status: "valid", detected: true });
    expect(artifacts.hfSmear).toMatchObject({ status: "valid", detected: true });
    expect(artifacts.hfHiss).toMatchObject({ status: "valid", detected: true });
    expect(artifacts.metallicRinging).toMatchObject({ status: "valid", detected: false });
    const plan = buildFormalMasterPlan(toDecisionInputs(analysis));
    expect(plan.actions.map((action) => action.kind)).toEqual(["dynamic-high-band-reduction"]);
    expect(plan.state).toBe("CORRECT");
  });
  testIfPresent("03_metallic_ringing_14k7.wav")("03 spectrum contains 14.7 kHz peak", () => {
    const analysis = analyzeAudio(readPcm16Wav("03_metallic_ringing_14k7.wav"));
    const { spectrum, artifacts } = analysis;
    expect(spectrum.peaks.some((peak) => Math.abs(peak.hz - 14700) < 20)).toBe(true);
    expect(artifacts.metallicRinging).toMatchObject({ status: "valid", detected: true });
    expect(Math.abs(Number(artifacts.metallicRinging.evidence.peakFrequencyHz) - 14700)).toBeLessThanOrEqual(20);
    const plan = buildFormalMasterPlan(toDecisionInputs(analysis));
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].kind).toBe("dynamic-notch");
    if (plan.actions[0].kind === "dynamic-notch") expect(Math.abs(plan.actions[0].frequencyHz - 14700)).toBeLessThanOrEqual(20);
  });
  testIfPresent("04_mud_boom.wav")("04 mud and boom detectors", () => {
    const analysis = analyzeAudio(readPcm16Wav("04_mud_boom.wav"));
    const artifacts = analysis.artifacts;
    expect(artifacts.mud).toMatchObject({ status: "valid", detected: true });
    expect(artifacts.boom).toMatchObject({ status: "valid", detected: true });
    expect(buildFormalMasterPlan(toDecisionInputs(analysis)).actions.map((action) => action.kind)).toEqual(["dynamic-eq", "dynamic-eq"]);
  });
  testIfPresent("05_hot_loud_peaks.wav")("05 peak containment and post verification", () => {
    const original = readPcm16Wav("05_hot_loud_peaks.wav");
    const analysis = analyzeAudio(original), plan = buildMasterPlan(analysis);
    expect(plan.action).toBe("peak-containment");
    expect(verifyMaster(renderMaster(original, plan), analysis, plan).success).toBe(true);
  });
  testIfPresent("06_low_band_phase_issue.wav")("06 low-band phase detector", () => {
    const analysis = analyzeAudio(readPcm16Wav("06_low_band_phase_issue.wav"));
    const result = analysis.artifacts.lowBandPhase;
    expect(result).toMatchObject({ status: "valid", detected: true });
    expect(Number(result.evidence.correlation)).toBeLessThan(-0.2);
    expect(Number(result.evidence.sideToMidDb)).toBeGreaterThan(3);
    expect(buildFormalMasterPlan(toDecisionInputs(analysis)).actions.map((action) => action.kind)).toContain("low-band-side-reduction");
  });
  testIfPresent("07_section_degradation_end.wav")("07 end-section score exceeds start and middle", () => {
    const analysis = analyzeAudio(readPcm16Wav("07_section_degradation_end.wav"));
    const result = analysis.artifacts.sectionDegradation;
    expect(result).toMatchObject({ status: "valid", detected: true });
    expect(Number(result.evidence.endScore)).toBeGreaterThan(Number(result.evidence.startScore));
    expect(Number(result.evidence.endScore)).toBeGreaterThan(Number(result.evidence.middleScore));
    const plan = buildFormalMasterPlan(toDecisionInputs(analysis));
    expect(plan.actions.map((action) => action.kind)).toContain("time-local-hf-reduction");
    expect(plan.actions.some((action) => action.kind === "dynamic-high-band-reduction")).toBe(false);
  });
  testIfPresent("08_stress_10min_48k_stereo.wav")("08 ten-minute analysis and render complete", () => {
    const original = readPcm16Wav("08_stress_10min_48k_stereo.wav");
    const analysis = analyzeAudio(original), plan = buildMasterPlan(analysis);
    const master = renderMaster(original, plan);
    expect(master.channels[0].length).toBe(28_800_000);
    expect(verifyMaster(master, analysis, plan).success).toBe(true);
  }, 120_000);
});

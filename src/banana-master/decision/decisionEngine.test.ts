import { describe, expect, it } from "vitest";
import { analyzeAudio } from "../analysis/analyzeAudio";
import { buildMasterPlan } from "./decisionEngine";
import { renderMaster, verifyMaster } from "../render/renderMaster";

const audio = (peak: number) => ({ sampleRate: 48000, channels: [Float32Array.from({ length: 4096 }, (_, i) => i === 100 ? peak : 0), Float32Array.from({ length: 4096 }, (_, i) => i === 100 ? peak : 0)] });

describe("decision and render", () => {
  it("leaves a safe original unchanged", () => {
    const original = audio(0.6), analysis = analyzeAudio(original), plan = buildMasterPlan(analysis);
    const master = renderMaster(original, plan);
    expect(plan.action).toBe("no-change");
    expect(master.channels[0]).toEqual(original.channels[0]);
    expect(master.channels[0]).not.toBe(original.channels[0]);
    expect(verifyMaster(master, analysis, plan).success).toBe(true);
  });
  it("contains hot peaks without modifying the original", () => {
    const original = audio(0.985), analysis = analyzeAudio(original), plan = buildMasterPlan(analysis);
    const before = original.channels.map((channel) => channel.slice());
    const master = renderMaster(original, plan);
    expect(plan.action).toBe("peak-containment");
    expect(original.channels[0]).toEqual(before[0]);
    expect(original.channels[1]).toEqual(before[1]);
    expect(renderMaster(original, plan).channels[0]).toEqual(master.channels[0]);
    expect(verifyMaster(master, analysis, plan).peak).toBeCloseTo(0.95);
    expect(verifyMaster(master, analysis, plan).success).toBe(true);
  });
});

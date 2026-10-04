import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeAudio } from "../../src/banana-master/analysis/analyzeAudio";
import type { AudioData } from "../../src/banana-master/audio/audioTypes";
import { buildFormalMasterPlan } from "../../src/banana-master/decision/formalDecision";
import { toDecisionInputs } from "../../src/banana-master/decision/decisionInputs";
import { biquad, executeFormalPlan, staticEq } from "../../src/banana-master/dsp/formalDsp";
import { verifyFormalMaster } from "../../src/banana-master/render/verifyFormalMaster";
import { fixture, readPcm16Wav } from "./fixture";

const available = (name: string) => existsSync(fixture(name)) ? it : it.skip;
const render = (audio: AudioData) => {
  const pre = analyzeAudio(audio), plan = buildFormalMasterPlan(toDecisionInputs(pre));
  const { master, execution } = executeFormalPlan(audio, plan, pre);
  const post = analyzeAudio(master);
  return { pre, plan, master, execution, post, verification: verifyFormalMaster(master, pre, post, execution) };
};
const maxDelta = (a: Float32Array, b: Float32Array, from = 0, to = a.length) => {
  let delta = 0;
  for (let i = from; i < to; i++) delta = Math.max(delta, Math.abs(a[i] - b[i]));
  return delta;
};

describe("Formal plan DSP", () => {
  available("01_balanced_reference.wav")("01 no-change is bit exact and Original stays intact", () => {
    const original = readPcm16Wav("01_balanced_reference.wav"), snapshot = original.channels.map((c) => c.slice());
    const result = render(original);
    expect(result.plan.actions).toHaveLength(0);
    expect(result.execution.executedActions).toBe(0);
    expect(result.execution.peakProtection.applied).toBe(false);
    for (let ch = 0; ch < 2; ch++) {
      expect(maxDelta(original.channels[ch], snapshot[ch])).toBe(0);
      expect(maxDelta(original.channels[ch], result.master.channels[ch])).toBe(0);
      expect(result.master.channels[ch]).not.toBe(original.channels[ch]);
    }
    expect(result.verification.success).toBe(true);
  }, 30000);
  available("02_hf_smear.wav")("02 one HF correction and post analysis", () => {
    const result = render(readPcm16Wav("02_hf_smear.wav"));
    expect(result.execution.actions.map((a) => a.kind)).toEqual(["dynamic-high-band-reduction"]);
    expect(result.execution.actions[0].actualMaxDb).toBeGreaterThan(0);
    expect(result.execution.actions[0].actualMaxDb).toBeLessThanOrEqual(2);
    expect(result.verification.success).toBe(true);
    expect(result.post.loudness.status).toBe("valid");
  }, 30000);
  available("03_metallic_ringing_14k7.wav")("03 notch follows measured frequency and budget", () => {
    const result = render(readPcm16Wav("03_metallic_ringing_14k7.wav"));
    const notch = result.execution.actions[0];
    expect(notch.kind).toBe("dynamic-notch");
    expect(Math.abs(notch.centerHz! - Number(result.pre.artifacts.metallicRinging.evidence.peakFrequencyHz))).toBeLessThan(1);
    expect(notch.actualMaxDb).toBeGreaterThan(0);
    expect(notch.actualMaxDb).toBeLessThanOrEqual(3);
    expect(result.post.artifacts.metallicRinging.severity).toBeLessThanOrEqual(result.pre.artifacts.metallicRinging.severity!);
    expect(result.verification.success).toBe(true);
  }, 30000);
  available("04_mud_boom.wav")("04 two tonal actions remain within independent budgets", () => {
    const result = render(readPcm16Wav("04_mud_boom.wav"));
    expect(result.execution.actions).toHaveLength(2);
    expect(result.execution.actions.every((a) => a.status === "applied" && a.actualMaxDb > 0 && a.actualMaxDb <= 2)).toBe(true);
    expect(result.verification.success).toBe(true);
  }, 30000);
  available("05_hot_loud_peaks.wav")("05 final True Peak attenuation runs once", () => {
    const original = readPcm16Wav("05_hot_loud_peaks.wav"), result = render(original);
    expect(result.execution.executedActions).toBe(0);
    expect(result.execution.peakProtection.applied).toBe(true);
    expect(result.execution.peakProtection.gainDb).toBeLessThan(0);
    const expectedGain = Math.pow(10, (-1 - result.pre.truePeak.truePeakDbTp - 0.0001) / 20);
    expect(Math.abs(result.master.channels[0][1000] - original.channels[0][1000] * expectedGain)).toBeLessThan(1e-7);
    expect(result.post.truePeak.status).toBe("valid");
    if (result.post.truePeak.status === "valid") expect(result.post.truePeak.truePeakDbTp).toBeLessThanOrEqual(-1);
    expect(result.post.basic.samplePeak).toBeLessThan(1);
    expect(result.verification.success).toBe(true);
  }, 30000);
  available("06_low_band_phase_issue.wav")("06 low side decreases with no high-band side change", () => {
    const result = render(readPcm16Wav("06_low_band_phase_issue.wav"));
    const side = result.execution.actions.find((a) => a.kind === "low-band-side-reduction");
    expect(side?.status).toBe("applied");
    expect(side!.actualMaxDb).toBeLessThanOrEqual(1.5);
    expect(result.post.artifacts.lowBandPhase.status).toBe("valid");
    expect(result.verification.success).toBe(true);
    const original = readPcm16Wav("06_low_band_phase_issue.wav");
    const projection = (audio: AudioData, hz: number) => {
      let x = 0, y = 0;
      const count = Math.min(48000, audio.channels[0].length);
      for (let i = 0; i < count; i++) {
        const side = (audio.channels[0][i] - audio.channels[1][i]) * 0.5;
        x += side * Math.cos(2 * Math.PI * hz * i / 48000);
        y += side * Math.sin(2 * Math.PI * hz * i / 48000);
      }
      return Math.hypot(x, y) / count;
    };
    expect(projection(result.master, 60)).toBeLessThan(projection(original, 60));
    expect(Math.abs(projection(result.master, 12000) - projection(original, 12000))).toBeLessThan(0.0001);
  }, 30000);
  available("07_section_degradation_end.wav")("07 section correction leaves earlier PCM unchanged", () => {
    const original = readPcm16Wav("07_section_degradation_end.wav"), result = render(original);
    const action = result.execution.actions.find((a) => a.kind === "time-local-hf-reduction");
    expect(action?.status).toBe("applied");
    const before = Math.floor(action!.timeRanges[0].startSeconds * original.sampleRate);
    const end = Math.floor(action!.timeRanges[0].endSeconds * original.sampleRate);
    expect(maxDelta(original.channels[0], result.master.channels[0], 0, before)).toBe(0);
    expect(maxDelta(original.channels[0], result.master.channels[0], before)).toBeGreaterThan(0);
    expect(Math.abs(result.master.channels[0][before] - original.channels[0][before])).toBeLessThan(0.0001);
    if (end < original.channels[0].length) expect(maxDelta(original.channels[0], result.master.channels[0], end)).toBe(0);
    expect(result.verification.success).toBe(true);
  }, 30000);
});

describe("DSP primitives", () => {
  it("static EQ bypass is exact; center frequency is affected; budget enforced", () => {
    const rate = 48000, length = rate, tone = (hz: number) => Float32Array.from({ length }, (_, i) => 0.1 * Math.sin(2 * Math.PI * hz * i / rate));
    const signal: AudioData = { sampleRate: rate, channels: [tone(1000), tone(1000)] };
    const bypass = staticEq(signal, 1000, 1, 0);
    expect(maxDelta(signal.channels[0], bypass.channels[0])).toBe(0);
    const filtered = staticEq(signal, 1000, 1, -1.5);
    expect(maxDelta(signal.channels[0], filtered.channels[0], 1000)).toBeGreaterThan(0.005);
    expect(() => staticEq(signal, 1000, 1, -1.51)).toThrow();
    expect(biquad("peak", rate, 1000, -1.5, 1).b0).toBeLessThan(1);
  });
  it("silence is finite and deterministic", () => {
    const audio: AudioData = { sampleRate: 48000, channels: [new Float32Array(48000), new Float32Array(48000)] };
    const pre = analyzeAudio(audio), plan = buildFormalMasterPlan(toDecisionInputs(pre));
    const a = executeFormalPlan(audio, plan, pre), b = executeFormalPlan(audio, plan, pre);
    expect(maxDelta(a.master.channels[0], b.master.channels[0])).toBe(0);
    expect(a.master.channels[0].every(Number.isFinite)).toBe(true);
  });
  available("04_mud_boom.wav")("unknown action is skipped while independent action executes", () => {
    const original = readPcm16Wav("04_mud_boom.wav"), pre = analyzeAudio(original);
    const plan = buildFormalMasterPlan(toDecisionInputs(pre));
    const invalid = { ...plan, actions: [{ ...plan.actions[0], maxGainReductionDb: Number.NaN }, plan.actions[1]] } as typeof plan;
    const { execution } = executeFormalPlan(original, invalid, pre);
    expect(execution.actions[0]).toMatchObject({ status: "skipped", reason: "unknown-correction-amount", actualMaxDb: 0 });
    expect(execution.actions[1]).toMatchObject({ status: "applied" });
  });
  available("02_hf_smear.wav")("stereo linked processing is deterministic for identical channels", () => {
    const fixtureAudio = readPcm16Wav("02_hf_smear.wav"), pre = analyzeAudio(fixtureAudio);
    const plan = buildFormalMasterPlan(toDecisionInputs(pre));
    const mono: AudioData = { sampleRate: fixtureAudio.sampleRate, channels: [fixtureAudio.channels[0].slice(), fixtureAudio.channels[0].slice()] };
    const first = executeFormalPlan(mono, plan, pre), second = executeFormalPlan(mono, plan, pre);
    expect(maxDelta(first.master.channels[0], first.master.channels[1])).toBe(0);
    expect(maxDelta(first.master.channels[0], second.master.channels[0])).toBe(0);
  }, 30000);
});

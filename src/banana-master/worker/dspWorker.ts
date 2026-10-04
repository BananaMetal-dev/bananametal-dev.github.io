/// <reference lib="webworker" />
import { analyzeAudio } from "../analysis/analyzeAudio";
import { buildMasterPlan } from "../decision/decisionEngine";
import { buildFormalMasterPlan } from "../decision/formalDecision";
import { toDecisionInputs } from "../decision/decisionInputs";
import { executeFormalPlan } from "../dsp/formalDsp";
import { verifyFormalMaster } from "../render/verifyFormalMaster";
import type { AudioData } from "../audio/audioTypes";

self.onmessage = (event: MessageEvent<{ id: number; audio: AudioData; decoderWarningCount: number | null }>) => {
  const { id, audio, decoderWarningCount } = event.data;
  try {
    const analysisStart = performance.now();
    const analysis = analyzeAudio(audio);
    const analysisMs = performance.now() - analysisStart;
    const decisionStart = performance.now();
    const formalPlan = buildFormalMasterPlan(toDecisionInputs(analysis));
    const decisionMs = performance.now() - decisionStart;
    // Keep the legacy decision for Debug compatibility; it is never rendered.
    const plan = buildMasterPlan(analysis);
    const renderStart = performance.now();
    const { master, execution } = executeFormalPlan(audio, formalPlan, analysis, decoderWarningCount);
    if (execution.peakProtection.verificationStatus === "non-finite") throw new Error("non-finite-dsp-output");
    const postAnalysis = analyzeAudio(master);
    const verification = verifyFormalMaster(master, analysis, postAnalysis, execution);
    const renderMs = performance.now() - renderStart;
    const transfers = master.channels.map((channel) => channel.buffer);
    self.postMessage({ id, analysis, plan, formalPlan, master, execution, postAnalysis, verification, analysisMs, decisionMs, renderMs }, { transfer: transfers });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};

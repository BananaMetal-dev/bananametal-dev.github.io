import type { AudioData } from "../audio/audioTypes";
import type { Analysis } from "../analysis/analyzeAudio";
import type { MasterPlan } from "../decision/masterPlan";
import type { FormalMasterPlan } from "../decision/formalMasterPlan";
import { freezeFormalMasterPlan } from "../decision/formalMasterPlan";
import type { DspExecution } from "../dsp/formalDsp";
import type { FormalVerification } from "../render/verifyFormalMaster";

export type WorkerResult = { analysis: Analysis; plan: MasterPlan; formalPlan: FormalMasterPlan; master: AudioData; execution: DspExecution;
  postAnalysis: Analysis; verification: FormalVerification; analysisMs: number; decisionMs: number; renderMs: number };

export function processInWorker(original: AudioData, decoderWarningCount: number | null = null): Promise<WorkerResult> {
  const worker = new Worker(new URL("./dspWorker.ts", import.meta.url), { type: "module" });
  const audio: AudioData = { sampleRate: original.sampleRate, channels: original.channels.map((channel) => channel.slice()) };
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerResult & { error?: string }>) => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else { freezeFormalMasterPlan(event.data.formalPlan); resolve(event.data); }
    };
    worker.onerror = (event) => { worker.terminate(); reject(new Error(event.message || "Worker処理に失敗しました。")); };
    worker.postMessage({ id: 1, audio, decoderWarningCount }, audio.channels.map((channel) => channel.buffer));
  });
}

/// <reference lib="webworker" />
import { decodeMp3ToWav } from "../audio/mp3Decoder";
import { encodeMp3 } from "../audio/mp3Encoder";
import { parseWav } from "../audio/wavParser";
import type { WorkerRequest, WorkerResponse } from "../types";
const scope = self as DedicatedWorkerGlobalScope;
scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    let output: Uint8Array;
    if (request.settings.mode === "wav-to-mp3") {
      output = await encodeMp3(parseWav(request.buffer), request.settings.bitrate, (progress) => post({ type: "progress", id: request.id, progress }));
    } else {
      post({ type: "progress", id: request.id, progress: 0.15 });
      output = await decodeMp3ToWav(new Uint8Array(request.buffer));
      post({ type: "progress", id: request.id, progress: 0.95 });
    }
    const result = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
    scope.postMessage({ type: "success", id: request.id, output: result } satisfies WorkerResponse, [result]);
  } catch (error) {
    post({ type: "error", id: request.id, message: error instanceof Error ? error.message : String(error) });
  }
};
function post(message: WorkerResponse): void { scope.postMessage(message); }

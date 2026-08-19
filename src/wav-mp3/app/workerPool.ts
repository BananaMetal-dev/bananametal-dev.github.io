import type { ConvertSettings, WorkerRequest, WorkerResponse } from "../types";
type Task = { id: string; buffer: ArrayBuffer; settings: ConvertSettings; onProgress: (value: number) => void; resolve: (value: Uint8Array) => void; reject: (reason: Error) => void };
type Slot = { worker: Worker; task?: Task };
export class ConverterWorkerPool {
  private slots: Slot[] = [];
  private queue: Task[] = [];
  private cancelled = false;
  constructor(size: number) { for (let index = 0; index < size; index += 1) this.slots.push(this.createSlot()); }
  convert(id: string, buffer: ArrayBuffer, settings: ConvertSettings, onProgress: (value: number) => void): Promise<Uint8Array> {
    if (this.cancelled) return Promise.reject(new Error("Conversion cancelled."));
    return new Promise((resolve, reject) => { this.queue.push({ id, buffer, settings, onProgress, resolve, reject }); this.dispatch(); });
  }
  cancel(): void {
    this.cancelled = true;
    const error = new Error("Conversion cancelled.");
    for (const task of this.queue.splice(0)) task.reject(error);
    for (const slot of this.slots) { slot.task?.reject(error); slot.worker.terminate(); slot.task = undefined; }
    this.slots = [];
  }
  close(): void { for (const slot of this.slots) slot.worker.terminate(); this.slots = []; }
  private createSlot(): Slot {
    const worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), { type: "module" });
    const slot: Slot = { worker };
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(slot, event.data);
    worker.onerror = (event) => { slot.task?.reject(new Error(event.message || "Worker failed.")); slot.task = undefined; this.dispatch(); };
    return slot;
  }
  private dispatch(): void {
    for (const slot of this.slots) {
      if (slot.task || !this.queue.length) continue;
      const task = this.queue.shift(); if (!task) return; slot.task = task;
      const request: WorkerRequest = { type: "convert", id: task.id, buffer: task.buffer, settings: task.settings };
      slot.worker.postMessage(request, [task.buffer]);
    }
  }
  private handle(slot: Slot, message: WorkerResponse): void {
    const task = slot.task; if (!task || task.id !== message.id) return;
    if (message.type === "progress") { task.onProgress(message.progress); return; }
    slot.task = undefined;
    if (message.type === "success") task.resolve(new Uint8Array(message.output)); else task.reject(new Error(message.message));
    this.dispatch();
  }
}
export function getAutoParallelism(): number { return Math.max(1, Math.min(8, Math.floor((navigator.hardwareConcurrency || 4) / 2))); }

export type ConversionMode = "wav-to-mp3" | "mp3-to-wav";
export type JobStatus = "queued" | "converting" | "success" | "skipped" | "failed" | "cancelled";
export type CollisionPolicy = "skip" | "overwrite";
export type InputFile = { id: string; file: File; relativePath: string };
export type ConversionJob = InputFile & {
  status: JobStatus;
  progress: number;
  outputName: string;
  output?: Uint8Array;
  message?: string;
};
export type ConvertSettings = { mode: ConversionMode; bitrate: 128 | 192 | 256 | 320 };
export type WorkerRequest = { type: "convert"; id: string; buffer: ArrayBuffer; settings: ConvertSettings };
export type WorkerResponse =
  | { type: "progress"; id: string; progress: number }
  | { type: "success"; id: string; output: ArrayBuffer }
  | { type: "error"; id: string; message: string };
export type Language = "ja" | "en";

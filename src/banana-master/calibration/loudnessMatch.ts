import type { Analysis } from "../analysis/analyzeAudio";

export type ListeningMatch = { status: "matched"; targetLufs: number; originalGain: number; masterGain: number }
  | { status: "unknown"; reason: string };

// Listening-path gain only. Neither AudioData nor the export Master buffer is modified.
export function listeningMatch(original: Analysis["loudness"], master: Analysis["loudness"]): ListeningMatch {
  if (original.status !== "valid" || master.status !== "valid") return { status: "unknown", reason: "Integrated LUFS unavailable" };
  if (!Number.isFinite(original.integratedLufs) || !Number.isFinite(master.integratedLufs)) return { status: "unknown", reason: "Invalid Integrated LUFS" };
  const targetLufs = Math.min(original.integratedLufs, master.integratedLufs);
  return { status: "matched", targetLufs,
    originalGain: 10 ** ((targetLufs - original.integratedLufs) / 20),
    masterGain: 10 ** ((targetLufs - master.integratedLufs) / 20) };
}

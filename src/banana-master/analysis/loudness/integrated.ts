import type { AudioData } from "../../audio/audioTypes";

// ITU-R BS.1770-5 Annex 1, Tables 1 and 2: 48 kHz K-weighting coefficients.
const shelf = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585] as const;
const highPass = [1, -2, 1, -1.99004745483398, 0.99007225036621] as const;
const ABSOLUTE_GATE_LKFS = -70;
const OFFSET = -0.691;
const BLOCK_SAMPLES = 19_200;
const HOP_SAMPLES = 4_800;

export type LoudnessResult =
  | Readonly<{ status: "valid"; integratedLufs: number; standard: "ITU-R BS.1770-5"; conformance: "unknown"; gatedBlocks: number; totalBlocks: number }>
  | Readonly<{ status: "unknown"; reason: "insufficient-duration" | "unsupported-sample-rate" | "unsupported-channel-count" | "below-absolute-gate"; standard: "ITU-R BS.1770-5"; conformance: "unknown" }>;
type UnknownReason = Extract<LoudnessResult, { status: "unknown" }>["reason"];

type FilterState = { x1: number; x2: number; y1: number; y2: number };
function filter(x: number, coefficients: readonly number[], state: FilterState): number {
  const y = coefficients[0] * x + coefficients[1] * state.x1 + coefficients[2] * state.x2
    - coefficients[3] * state.y1 - coefficients[4] * state.y2;
  state.x2 = state.x1; state.x1 = x;
  state.y2 = state.y1; state.y1 = y;
  return y;
}
const state = (): FilterState => ({ x1: 0, x2: 0, y1: 0, y2: 0 });
const unknown = (reason: UnknownReason): LoudnessResult =>
  ({ status: "unknown", reason, standard: "ITU-R BS.1770-5", conformance: "unknown" });

export function measureIntegratedLoudness(audio: AudioData): LoudnessResult {
  if (audio.sampleRate !== 48_000) return unknown("unsupported-sample-rate");
  if (audio.channels.length < 1 || audio.channels.length > 2) return unknown("unsupported-channel-count");
  const length = audio.channels[0].length;
  if (length < BLOCK_SAMPLES) return unknown("insufficient-duration");
  if (audio.channels.some((channel) => channel.length !== length)) throw new Error("Channel lengths differ");

  const shelves = audio.channels.map(state), highPasses = audio.channels.map(state);
  const quarters = new Float64Array(4);
  const energies: number[] = [];
  let quarterEnergy = 0, quarterIndex = 0;
  for (let i = 0; i < length; i++) {
    for (let channelIndex = 0; channelIndex < audio.channels.length; channelIndex++) {
      const weighted = filter(filter(audio.channels[channelIndex][i], shelf, shelves[channelIndex]), highPass, highPasses[channelIndex]);
      quarterEnergy += weighted * weighted; // L and R each have weight 1; no channel-count division.
    }
    if ((i + 1) % HOP_SAMPLES === 0) {
      quarters[quarterIndex % 4] = quarterEnergy / HOP_SAMPLES;
      quarterEnergy = 0;
      quarterIndex++;
      if (quarterIndex >= 4) energies.push((quarters[0] + quarters[1] + quarters[2] + quarters[3]) / 4);
    }
  }

  const absoluteEnergy = 10 ** ((ABSOLUTE_GATE_LKFS - OFFSET) / 10);
  let absoluteSum = 0, absoluteCount = 0;
  for (const energy of energies) if (energy > absoluteEnergy) { absoluteSum += energy; absoluteCount++; }
  if (!absoluteCount) return unknown("below-absolute-gate");
  const relativeEnergy = absoluteSum / absoluteCount / 10;
  let gatedSum = 0, gatedCount = 0;
  for (const energy of energies) if (energy > absoluteEnergy && energy > relativeEnergy) { gatedSum += energy; gatedCount++; }
  if (!gatedCount) return unknown("below-absolute-gate");
  return { status: "valid", integratedLufs: OFFSET + 10 * Math.log10(gatedSum / gatedCount),
    standard: "ITU-R BS.1770-5", conformance: "unknown", gatedBlocks: gatedCount, totalBlocks: energies.length };
}

import { describe, expect, it } from "vitest";
import { listeningMatch } from "./loudnessMatch";

const valid = (integratedLufs: number) => ({ status: "valid" as const, integratedLufs,
  standard: "ITU-R BS.1770-5" as const, conformance: "unknown" as const, gatedBlocks: 2, totalBlocks: 2 });

describe("calibration listening gain", () => {
  it("attenuates only the louder path", () => {
    const original = valid(-18), master = valid(-16);
    const match = listeningMatch(original, master);
    expect(match).toMatchObject({ status: "matched", targetLufs: -18, originalGain: 1 });
    if (match.status === "matched") expect(match.masterGain).toBeCloseTo(10 ** (-2 / 20), 10);
    expect(original.integratedLufs).toBe(-18);
    expect(master.integratedLufs).toBe(-16);
  });
  it("keeps an unknown measurement unknown", () => {
    expect(listeningMatch({ status: "unknown", reason: "unsupported-sample-rate", standard: "ITU-R BS.1770-5", conformance: "unknown" }, valid(-18))).toMatchObject({ status: "unknown" });
  });
});

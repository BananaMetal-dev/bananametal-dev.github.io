export type Mode = "standard";
export type MasterPlan = Readonly<{
  version: 1;
  mode: Mode;
  action: "no-change" | "peak-containment";
  gain: Readonly<{ linear: number; db: number }>;
  samplePeakCeiling: number;
  reasons: readonly string[];
  triggeredRules: readonly string[];
  severity: number;
  confidence: number;
  risk: "low";
}>;

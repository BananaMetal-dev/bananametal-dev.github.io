import type { AudioData } from "../audio/audioTypes";
import type { Analysis } from "../analysis/analyzeAudio";
import type { CorrectionAction, FormalMasterPlan, TimeRange } from "../decision/formalMasterPlan";
import { applyTruePeakSafety, type TruePeakSafety } from "./truePeakSafety";

type Filter = { b0: number; b1: number; b2: number; a1: number; a2: number };
type Shape = "peak" | "shelf" | "lowpass";
export type ActionExecution = { id: string; kind: CorrectionAction["kind"]; plannedMaxDb: number; allowedMaxDb: number;
  actualMaxDb: number; status: "applied" | "skipped"; reason: string; centerHz: number | null;
  filterQ: number | null; timeRanges: readonly TimeRange[] };
export type DspExecution = { plannedActions: number; executedActions: number; skippedActions: number;
  actions: ActionExecution[]; budgetEvents: string[]; peakProtection: TruePeakSafety;
  processingMs: number; originalUnchanged: true };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const finitePositive = (x: number) => Number.isFinite(x) && x > 0;
const copy = (audio: AudioData): AudioData => ({ sampleRate: audio.sampleRate, channels: audio.channels.map((c) => c.slice()) });

// RBJ-style normalized biquads. Each channel has its own filter memory; the control signal is shared.
export function biquad(shape: Shape, sampleRate: number, hz: number, gainDb: number, q = 1): Filter {
  const w = 2 * Math.PI * clamp(hz, 1, sampleRate * 0.48) / sampleRate;
  const c = Math.cos(w), s = Math.sin(w), a = Math.pow(10, gainDb / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (shape === "peak") {
    const alpha = s / (2 * q);
    b0 = 1 + alpha * a; b1 = -2 * c; b2 = 1 - alpha * a;
    a0 = 1 + alpha / a; a1 = -2 * c; a2 = 1 - alpha / a;
  } else if (shape === "shelf") {
    const alpha = s / Math.SQRT2, root = 2 * Math.sqrt(a) * alpha;
    b0 = a * ((a + 1) + (a - 1) * c + root);
    b1 = -2 * a * ((a - 1) + (a + 1) * c);
    b2 = a * ((a + 1) + (a - 1) * c - root);
    a0 = (a + 1) - (a - 1) * c + root;
    a1 = 2 * ((a - 1) - (a + 1) * c);
    a2 = (a + 1) - (a - 1) * c - root;
  } else {
    const alpha = s / Math.SQRT2;
    b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0;
    a0 = 1 + alpha; a1 = -2 * c; a2 = 1 - alpha;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

class FilterState {
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  constructor(private readonly f: Filter) {}
  process(x: number): number {
    const y = this.f.b0 * x + this.f.b1 * this.x1 + this.f.b2 * this.x2 - this.f.a1 * this.y1 - this.f.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function rangeMix(sample: number, rate: number, ranges: readonly TimeRange[]): number {
  if (!ranges.length) return 1;
  const time = sample / rate;
  let mix = 0;
  for (const range of ranges) {
    if (time <= range.startSeconds || time >= range.endSeconds) continue;
    const ramp = Math.min(0.05, (range.endSeconds - range.startSeconds) / 4);
    mix = Math.max(mix, Math.min(1, (time - range.startSeconds) / ramp, (range.endSeconds - time) / ramp));
  }
  return mix;
}

function validAction(action: CorrectionAction, plan: FormalMasterPlan, analysis: Analysis, duration: number, rate: number): string | null {
  if (action.priority !== "artifact-safety" || action.execution !== "planned-only") return "unsupported-action-state";
  // High-band excess can support a correction, but cannot authorize one by itself.
  if (!action.sourceDetectors.some((name) => name !== "highBandExcess" && plan.trace.some((t) => t.detector === name && t.actionId === action.id && t.state === "CORRECT"))
    || action.sourceDetectors.some((name) => name !== "highBandExcess" && !plan.trace.some((t) => t.detector === name && t.actionId === action.id && t.state === "CORRECT")))
    return "unapproved-or-unknown-detector";
  for (const r of action.timeRanges) if (!Number.isFinite(r.startSeconds) || !Number.isFinite(r.endSeconds) || r.startSeconds < 0 || r.endSeconds > duration + 1 / rate || r.endSeconds <= r.startSeconds) return "invalid-time-range";
  if (action.kind === "time-local-hf-reduction" && !action.timeRanges.length) return "missing-time-range";
  const amount = action.kind === "low-band-side-reduction" ? action.maxSideReductionDb : action.maxGainReductionDb;
  if (!finitePositive(amount)) return "unknown-correction-amount";
  if (action.kind === "low-band-side-reduction") return action.direction === "narrow-only" && action.belowHz === 120 ? null : "invalid-stereo-scope";
  if (action.kind === "dynamic-notch") {
    const evidence = analysis.artifacts.metallicRinging.evidence.peakFrequencyHz;
    return finitePositive(action.frequencyHz) && action.frequencyHz < rate * 0.48 && finitePositive(action.equivalentQ)
      && typeof evidence === "number" && Number.isFinite(evidence) && Math.abs(evidence - action.frequencyHz) < 30 ? null : "unknown-notch-frequency";
  }
  return action.bandHz.every((hz) => finitePositive(hz)) && action.bandHz[0] < action.bandHz[1] && action.bandHz[1] <= rate * 0.5
    ? null : "invalid-band";
}

function overlap(a: CorrectionAction, b: CorrectionAction): boolean {
  if (a.kind === "low-band-side-reduction" || b.kind === "low-band-side-reduction") return false;
  const band = (x: CorrectionAction): [number, number] => x.kind === "dynamic-notch" ? [x.frequencyHz * 0.98, x.frequencyHz * 1.02]
    : x.kind === "low-band-side-reduction" ? [0, x.belowHz] : [x.bandHz[0], x.bandHz[1]];
  const x = band(a), y = band(b);
  return x[0] < y[1] && y[0] < x[1];
}

// The current formal plan has no static-EQ action. This primitive is available only for a future explicit plan field.
export function staticEq(audio: AudioData, centerHz: number, q: number, gainDb: number): AudioData {
  if (!Number.isFinite(gainDb) || Math.abs(gainDb) > 1.5 || !finitePositive(centerHz) || centerHz >= audio.sampleRate * 0.48 || !finitePositive(q)) throw new Error("invalid-static-eq-plan");
  if (gainDb === 0) return copy(audio);
  const f = biquad("peak", audio.sampleRate, centerHz, gainDb, q);
  return { sampleRate: audio.sampleRate, channels: audio.channels.map((channel) => {
    const out = new Float32Array(channel.length), state = new FilterState(f);
    for (let i = 0; i < out.length; i++) out[i] = state.process(channel[i]);
    return out;
  }) };
}

export function executeFormalPlan(original: AudioData, plan: FormalMasterPlan, analysis: Analysis,
  decoderWarningCount: number | null = null): { master: AudioData; execution: DspExecution } {
  const start = performance.now(), rate = original.sampleRate, length = original.channels[0]?.length ?? 0;
  if (!finitePositive(rate) || original.channels.length !== 2 || original.channels[1].length !== length || !length) throw new Error("invalid-stereo-audio");
  const duration = length / rate;
  let master = copy(original);
  const records: ActionExecution[] = [], budgetEvents: string[] = [];
  const executed: { action: CorrectionAction; cap: number }[] = [];
  const ids = new Set<string>();
  for (const action of plan.actions) {
    const effectiveRanges = action.kind === "dynamic-notch" && action.timeRanges.length === 0
      ? plan.actions.filter((other) => other.kind === "time-local-hf-reduction" && overlap(action, other)).flatMap((other) => other.timeRanges)
      : action.timeRanges;
    const requested = action.kind === "low-band-side-reduction" ? action.maxSideReductionDb : action.maxGainReductionDb;
    let reason = ids.has(action.id) ? "duplicate-action" : validAction(action, plan, analysis, duration, rate);
    ids.add(action.id);
    const limit = action.kind === "dynamic-notch" ? Math.min(3, plan.budgets.dynamicNotchMaxGainReductionDb)
      : action.kind === "low-band-side-reduction" ? Math.min(1.5, plan.budgets.lowBandSideMaxReductionDb)
      : action.kind === "dynamic-high-band-reduction" || action.kind === "time-local-hf-reduction" ? Math.min(2, plan.budgets.deEssMaxGainReductionDb)
      : Math.min(2, plan.budgets.dynamicEqMaxGainReductionDb);
    if (!finitePositive(limit)) reason = "unknown-budget";
    let cap = Math.min(requested, limit);
    // Conservatively constrain the sum of correction depths in overlapping bands.
    const previous = executed.filter((item) => overlap(item.action, action)).reduce((sum, item) => sum + item.cap, 0);
    if (action.kind !== "low-band-side-reduction") cap = Math.max(0, Math.min(cap, Math.max(limit, previous) - previous));
    if (cap < requested - 1e-6) budgetEvents.push(`${action.id}: ${requested.toFixed(3)} dB -> ${cap.toFixed(3)} dB; overlapping/respective budget`);
    if (cap <= 1e-6) reason = reason ?? "overlap-budget-exhausted";
    const record: ActionExecution = { id: action.id, kind: action.kind, plannedMaxDb: requested, allowedMaxDb: reason ? 0 : cap,
      actualMaxDb: 0, status: reason ? "skipped" : "applied", reason: reason ?? "executed", centerHz: action.kind === "dynamic-notch" ? action.frequencyHz
        : action.kind === "low-band-side-reduction" ? action.belowHz : action.kind === "dynamic-eq" ? Math.sqrt(action.bandHz[0] * action.bandHz[1]) : 7500,
      filterQ: action.kind === "dynamic-notch" ? clamp(action.equivalentQ, 2, 1000)
        : action.kind === "dynamic-eq" ? Math.sqrt(action.bandHz[0] * action.bandHz[1]) / (action.bandHz[1] - action.bandHz[0]) : null,
      timeRanges: effectiveRanges };
    records.push(record);
    if (reason) continue;
    const [left, right] = master.channels;
    const outL = new Float32Array(length), outR = new Float32Array(length);
    if (action.kind === "low-band-side-reduction") {
      const f = biquad("lowpass", rate, 120, 0), state = new FilterState(f);
      const attenuation = 1 - Math.pow(10, -cap / 20);
      for (let i = 0; i < length; i++) {
        const lowSide = state.process((left[i] - right[i]) * 0.5);
        const mix = rangeMix(i, rate, effectiveRanges);
        outL[i] = left[i] - lowSide * attenuation * mix;
        outR[i] = right[i] + lowSide * attenuation * mix;
        if (mix > 0 && Math.abs(lowSide) > 1e-8) record.actualMaxDb = Math.max(record.actualMaxDb, cap * mix);
      }
    } else {
      const center = action.kind === "dynamic-notch" ? action.frequencyHz
        : action.kind === "dynamic-eq" ? Math.sqrt(action.bandHz[0] * action.bandHz[1]) : 7500;
      const q = action.kind === "dynamic-notch" ? clamp(action.equivalentQ, 2, 1000)
        : action.kind === "dynamic-eq" ? center / (action.bandHz[1] - action.bandHz[0]) : 1;
      const shape: Shape = action.kind === "dynamic-high-band-reduction" || action.kind === "time-local-hf-reduction" ? "shelf" : "peak";
      const f = biquad(shape, rate, center, -cap, q), lState = new FilterState(f), rState = new FilterState(f);
      const attack = Math.exp(-1 / (0.02 * rate)), release = Math.exp(-1 / (0.12 * rate));
      const threshold = Math.max(analysis.basic.rms * 0.12, 1e-5);
      let envelope = 0;
      const ringTimeline = action.kind === "dynamic-notch" && analysis.artifacts.metallicRinging.status === "valid"
        ? analysis.artifacts.metallicRinging.timeline : undefined;
      let timelineIndex = 0;
      for (let i = 0; i < length; i++) {
        const l = left[i], r = right[i], wetL = lState.process(l), wetR = rState.process(r);
        const activity = Math.max(Math.abs(l - wetL), Math.abs(r - wetR));
        envelope = (activity > envelope ? attack : release) * envelope + (1 - (activity > envelope ? attack : release)) * activity;
        let mix = clamp((envelope - threshold * 0.1) / (threshold * 0.9), 0, 1) * rangeMix(i, rate, effectiveRanges);
        if (ringTimeline?.length) {
          const t = i / rate;
          while (timelineIndex + 1 < ringTimeline.length && ringTimeline[timelineIndex + 1].time <= t) timelineIndex++;
          const near = ringTimeline[timelineIndex];
          const next = ringTimeline[timelineIndex + 1];
          const nearMix = near && near.score > 0.4 ? clamp((0.5 - Math.abs(t - near.time)) / 0.05, 0, 1) : 0;
          const nextMix = next && next.score > 0.4 ? clamp((0.5 - Math.abs(t - next.time)) / 0.05, 0, 1) : 0;
          mix *= Math.max(nearMix, nextMix);
        }
        outL[i] = l + (wetL - l) * mix;
        outR[i] = r + (wetR - r) * mix;
        record.actualMaxDb = Math.max(record.actualMaxDb, cap * mix);
      }
    }
    if (record.actualMaxDb <= 1e-6) { record.status = "skipped"; record.reason = "no-signal-in-scope"; continue; }
    master = { sampleRate: rate, channels: [outL, outR] };
    executed.push({ action, cap });
  }
  const safety = applyTruePeakSafety(master,
    analysis.truePeak.status === "valid" ? analysis.truePeak.truePeakDbTp : null,
    analysis.truePeak.samplePeakDbFs, decoderWarningCount);
  master = safety.master;
  return { master, execution: { plannedActions: plan.actions.length, executedActions: records.filter((r) => r.status === "applied").length,
    skippedActions: records.filter((r) => r.status === "skipped").length, actions: records, budgetEvents,
    peakProtection: safety.safety, processingMs: performance.now() - start,
    originalUnchanged: true } };
}

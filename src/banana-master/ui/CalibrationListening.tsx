import { useEffect, useRef, useState } from "react";
import type { AudioData, FileInfo } from "../audio/audioTypes";
import type { Analysis } from "../analysis/analyzeAudio";
import { listeningMatch } from "../calibration/loudnessMatch";
import type { DspExecution } from "../dsp/formalDsp";

type Props = { original: AudioData; master: AudioData; pre: Analysis; post: Analysis; file: FileInfo;
  execution: DspExecution; onBegin: () => void; onFinish: () => void };
type Identity = "original" | "master";
type Vote = "A" | "B" | "no-difference";

export function CalibrationListening({ original, master, pre, post, file, execution, onBegin, onFinish }: Props) {
  const match = listeningMatch(pre.loudness, post.loudness);
  const [assignment] = useState<{ A: Identity; B: Identity }>(() => crypto.getRandomValues(new Uint8Array(1))[0] % 2
    ? { A: "original", B: "master" } : { A: "master", B: "original" });
  const [active, setActive] = useState(false), [playing, setPlaying] = useState<"A" | "B" | null>(null);
  const [position, setPosition] = useState(0), [vote, setVote] = useState<Vote | null>(null);
  const [problemTime, setProblemTime] = useState(""), [notes, setNotes] = useState("");
  const context = useRef<AudioContext | null>(null), node = useRef<AudioBufferSourceNode | null>(null), gainNode = useRef<GainNode | null>(null);
  const buffers = useRef<Record<Identity, AudioBuffer> | null>(null);
  const playStart = useRef(0), playOffset = useRef(0);
  const duration = file.duration;

  function currentPosition() {
    return node.current && context.current ? Math.min(duration, playOffset.current + context.current.currentTime - playStart.current) : playOffset.current;
  }
  function stop(reset = false) {
    const next = reset ? 0 : currentPosition();
    if (node.current) { node.current.onended = null; node.current.stop(); node.current.disconnect(); node.current = null; }
    gainNode.current?.disconnect(); gainNode.current = null;
    playOffset.current = next; setPosition(next); setPlaying(null);
  }
  useEffect(() => {
    const timer = window.setInterval(() => { if (node.current) setPosition(currentPosition()); }, 100);
    return () => { window.clearInterval(timer); if (node.current) { node.current.onended = null; node.current.stop(); node.current.disconnect(); }
      gainNode.current?.disconnect();
      void context.current?.close(); };
  }, []);

  function makeBuffer(ctx: AudioContext, audio: AudioData) {
    const buffer = ctx.createBuffer(2, audio.channels[0].length, audio.sampleRate);
    buffer.copyToChannel(new Float32Array(audio.channels[0]), 0); buffer.copyToChannel(new Float32Array(audio.channels[1]), 1);
    return buffer;
  }
  async function switchTo(label: "A" | "B") {
    if (!active || match.status !== "matched") return;
    const offset = currentPosition();
    stop();
    const ctx = context.current ?? new AudioContext(); context.current = ctx;
    await ctx.resume();
    buffers.current ??= { original: makeBuffer(ctx, original), master: makeBuffer(ctx, master) };
    const identity = assignment[label], source = ctx.createBufferSource(), gain = ctx.createGain();
    gain.gain.value = identity === "original" ? match.originalGain : match.masterGain;
    source.buffer = buffers.current[identity]; source.connect(gain); gain.connect(ctx.destination); gainNode.current = gain;
    source.onended = () => { if (node.current === source) { source.disconnect(); gain.disconnect(); gainNode.current = null;
      node.current = null; playOffset.current = duration; setPosition(duration); setPlaying(null); } };
    const startAt = offset >= duration ? 0 : offset;
    playOffset.current = startAt; playStart.current = ctx.currentTime; node.current = source;
    source.start(0, startAt); setPlaying(label); setPosition(startAt);
  }
  function recordVote(next: Vote) { stop(); setVote(next); onFinish(); }
  function exportVote() {
    if (!vote || match.status !== "matched") return;
    const record = { version: "calibration-listening-v1", filename: file.filename, blindAssignment: assignment,
      loudnessMatch: match, preference: vote, problemTimeSeconds: problemTime === "" ? null : Number(problemTime), notes,
      status: "listener-reported", exportMasterBufferModified: false };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file.filename}.listening.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return <section className="calibration-listening" aria-label="音量一致ブラインド比較">
    <h3>音量一致ブラインド比較</h3>
    <p>試聴経路だけを低い方のIntegrated LUFSに合わせます。WAV保存用のMaster Bufferは変更しません。</p>
    {execution.executedActions === 0 && <p role="note">この曲にはArtifact補正がありません。{execution.peakProtection.applied
      ? "Masterは一律のPeak用音量調整のみです。音量一致後のA/Bはほぼ同じ信号になるため、試聴比較は不要です。"
      : "OriginalとMasterのPCMは同じため、試聴比較は不要です。"}</p>}
    {match.status === "unknown" ? <p role="status">比較不可: {match.reason}</p> : <>
      <p>目標 {match.targetLufs.toFixed(1)} LUFS。A/B切替は同じ再生位置から始まります。</p>
      {!active && !vote && <button onClick={() => { onBegin(); setActive(true); }}>比較を開始</button>}
      {active && !vote && <>
        <div className="controls"><button onClick={() => void switchTo("A")} aria-pressed={playing === "A"}>A 再生</button>
          <button onClick={() => void switchTo("B")} aria-pressed={playing === "B"}>B 再生</button>
          <button onClick={() => stop()}>停止</button></div>
        <label className="seek-label">再生位置 {position.toFixed(1)} 秒 <input aria-label="比較再生位置" type="range" min="0" max={duration} step="0.1" value={position}
          onChange={(event) => { stop(); playOffset.current = Number(event.target.value); setPosition(playOffset.current); }} /></label>
        <div className="controls"><button onClick={() => recordVote("A")}>Aが良い</button>
          <button onClick={() => recordVote("B")}>Bが良い</button>
          <button onClick={() => recordVote("no-difference")}>差が分からない</button></div>
      </>}
      {vote && <><p role="status">回答: {vote}。A={assignment.A === "original" ? "Original" : "Master"}、B={assignment.B === "original" ? "Original" : "Master"}。</p>
        <label>問題がある時間位置（秒） <input aria-label="問題の時間位置" type="number" min="0" max={duration} step="0.1" value={problemTime} onChange={(e) => setProblemTime(e.target.value)} /></label>
        <label>コメント <textarea aria-label="試聴コメント" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <button onClick={exportVote}>試聴結果JSON保存</button></>}
    </>}
  </section>;
}

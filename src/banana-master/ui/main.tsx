import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { decodeAudio } from "../audio/decodeAudio";
import { durationOf, type AudioData, type FileInfo } from "../audio/audioTypes";
import { processInWorker, type WorkerResult } from "../worker/workerClient";
import { encodeWav } from "../export/wavEncoder";
import { makeDebugReport, type Timings } from "../debug/debugReport";
import { CalibrationListening } from "./CalibrationListening";
import "./styles.css";

type Ready = { original: AudioData; result: WorkerResult; file: FileInfo; timings: Timings };
const artifactLabels = [
  ["highBandExcess", "High-band Excess"], ["hfSmear", "HF Smear"], ["metallicRinging", "Metallic Ringing"],
  ["hfHiss", "HF Hiss"], ["mud", "Mud"], ["boom", "Boom"], ["harshness", "Harshness"],
  ["lowBandPhase", "Low-band Phase"], ["sectionDegradation", "Section Degradation"],
] as const;

function App() {
  const [ready, setReady] = useState<Ready | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState(false);
  const [source, setSource] = useState<"original" | "master">("master");
  const [playing, setPlaying] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioBufferSourceNode | null>(null);
  const generationRef = useRef(0);

  function stop() {
    nodeRef.current?.stop();
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    setPlaying(false);
  }

  useEffect(() => () => { nodeRef.current?.stop(); void contextRef.current?.close(); }, []);

  async function load(file: File) {
    const generation = ++generationRef.current;
    stop(); setBlindMode(false); setReady(null); setBusy(true); setError("");
    try {
      const start = performance.now();
      const decoded = await decodeAudio(file), original = decoded.audio;
      const decodeMs = performance.now() - start;
      const result = await processInWorker(original, decoded.decoderWarningCount);
      if (generation !== generationRef.current) return;
      const info: FileInfo = { filename: file.name, format: file.name.split(".").pop()?.toLowerCase() ?? "unknown", duration: durationOf(original), sampleRate: original.sampleRate, channels: original.channels.length };
      setReady({ original, result, file: info, timings: { decodeMs, analysisMs: result.analysisMs, decisionMs: result.decisionMs, renderMs: result.renderMs, encodeMs: 0, exportMs: 0, workerUsed: true, approximateMemoryBytes: file.size + original.channels.reduce((sum, channel) => sum + channel.byteLength, 0) + result.master.channels.reduce((sum, channel) => sum + channel.byteLength, 0) } });
    } catch (caught) {
      if (generation === generationRef.current) setError(caught instanceof Error ? caught.message : String(caught));
    } finally { if (generation === generationRef.current) setBusy(false); }
  }

  async function play(next: "original" | "master") {
    if (!ready) return;
    stop(); setSource(next);
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    await context.resume();
    const audio = next === "original" ? ready.original : ready.result.master;
    const buffer = context.createBuffer(2, audio.channels[0].length, audio.sampleRate);
    buffer.copyToChannel(new Float32Array(audio.channels[0]), 0); buffer.copyToChannel(new Float32Array(audio.channels[1]), 1);
    const node = context.createBufferSource(); node.buffer = buffer; node.connect(context.destination);
    node.onended = () => { if (nodeRef.current === node) { nodeRef.current = null; setPlaying(false); } };
    nodeRef.current = node; node.start(); setPlaying(true);
  }

  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function exportMaster() {
    if (!ready) return;
    try {
      const start = performance.now();
      const wav = encodeWav(ready.result.master);
      const timings = { ...ready.timings, encodeMs: performance.now() - start,
        approximateMemoryBytes: ready.timings.approximateMemoryBytes + (ready.timings.encodeMs ? 0 : wav.size * 2) };
      save(wav, ready.file.filename.replace(/\.(wav|mp3)$/i, "") + "-banana-master.wav");
      timings.exportMs = performance.now() - start;
      setReady({ ...ready, timings });
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  }

  function exportDebug() {
    if (!ready) return;
    const report = makeDebugReport(ready.file, ready.result.analysis, ready.result.plan, ready.result.formalPlan, ready.result.verification, ready.timings, ready.result.execution, ready.result.postAnalysis);
    save(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), ready.file.filename + ".debug.json");
  }

  const report = ready && makeDebugReport(ready.file, ready.result.analysis, ready.result.plan, ready.result.formalPlan, ready.result.verification, ready.timings, ready.result.execution, ready.result.postAnalysis);
  return <main>
    <header><span className="eyebrow">BANANA METAL / AUDIO LAB</span><h1>Banana Master</h1><p>音源を測り、必要と判定した分だけ整える。ブラウザ内で処理する暫定版です。</p></header>
    <section className="workspace">
      <label className="dropzone"><strong>WAV / MP3を選択</strong><span>ステレオ音源を48 kHzで処理。音声は外部へ送信されません。</span><input type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void load(file); }} /></label>
      {busy && <p role="status">解析・マスター生成中…</p>}{error && <p className="error" role="alert">{error}</p>}
      {ready && <div className="result">
        <div className="summary"><div><span className="eyebrow">RESULT</span><h2>{ready.result.execution.executedActions ? "限定補正を適用" : ready.result.execution.peakProtection.applied ? "ピークを抑制" : "補正なし"}</h2><p>{ready.result.verification.reason}</p></div><strong className="badge">{ready.result.verification.success ? "出力検証済み" : "出力検証失敗"}</strong></div>
        <dl><div><dt>ファイル</dt><dd>{ready.file.filename}</dd></div><div><dt>長さ</dt><dd>{ready.file.duration.toFixed(1)} 秒</dd></div><div><dt>入力 Sample Peak</dt><dd>{ready.result.analysis.basic.samplePeak.toFixed(4)}</dd></div><div><dt>入力 True Peak</dt><dd>{ready.result.analysis.truePeak.status === "valid" ? `${ready.result.analysis.truePeak.truePeakDbTp.toFixed(2)} dBTP` : "Unknown"}</dd></div><div><dt>DSP後 True Peak</dt><dd>{ready.result.execution.peakProtection.preSafetyTruePeakDbTp === null ? "Unknown" : `${ready.result.execution.peakProtection.preSafetyTruePeakDbTp.toFixed(2)} dBTP`}</dd></div><div><dt>出力 Sample Peak</dt><dd>{ready.result.verification.peak.toFixed(4)}</dd></div><div><dt>安全減衰</dt><dd>{ready.result.execution.peakProtection.appliedGainDb.toFixed(2)} dB</dd></div><div><dt>暫定Ceiling</dt><dd>−1.0 dBTP</dd></div><div><dt>Integrated Loudness</dt><dd>{ready.result.postAnalysis.loudness.status === "valid" ? `${ready.result.postAnalysis.loudness.integratedLufs.toFixed(1)} LUFS` : "Unknown"}</dd></div><div><dt>Sample Peak</dt><dd>{ready.result.postAnalysis.truePeak.samplePeakDbFs == null ? "Unknown" : `${ready.result.postAnalysis.truePeak.samplePeakDbFs.toFixed(2)} dBFS`}</dd></div><div><dt>True Peak</dt><dd>{ready.result.postAnalysis.truePeak.status === "valid" ? `${ready.result.postAnalysis.truePeak.truePeakDbTp.toFixed(2)} dBTP` : "Unknown"}</dd></div><div><dt>Decoder Warning</dt><dd>{ready.result.execution.peakProtection.decoderWarning === "unknown" ? "Unknown（ブラウザは警告件数を通知しません）" : ready.result.execution.peakProtection.decoderWarning}</dd></div><div><dt>Conformance</dt><dd>Unknown</dd></div></dl>
        <div className="controls">{!blindMode && <><button onClick={() => void play("original")} aria-pressed={playing && source === "original"}>Original 再生</button><button onClick={() => void play("master")} aria-pressed={playing && source === "master"}>Master 再生</button><button onClick={stop} disabled={!playing}>停止</button></>}<button className="primary" onClick={exportMaster} disabled={!ready.result.verification.success}>24-bit WAV保存</button></div>
        <CalibrationListening original={ready.original} master={ready.result.master} pre={ready.result.analysis} post={ready.result.postAnalysis} file={ready.file} execution={ready.result.execution}
          onBegin={() => { stop(); setBlindMode(true); }} onFinish={() => setBlindMode(false)} />
        <div className="debug-heading"><label><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> 開発用 Debug Mode</label>{debug && <button onClick={exportDebug}>Debug JSON保存</button>}</div>
        {debug && <section className="artifact-debug"><h3>DECISION ENGINE</h3><dl>
          <div><dt>Decision State</dt><dd>{ready.result.formalPlan.state}</dd></div>
          <div><dt>Plan Status</dt><dd>{ready.result.formalPlan.status}</dd></div>
          <div><dt>Risk</dt><dd>{ready.result.formalPlan.risk}</dd></div>
          <div><dt>Correction Candidates</dt><dd>{ready.result.formalPlan.actions.map((action) => action.kind).join(", ") || "No Action"}</dd></div>
          <div><dt>Correction Limits</dt><dd>{ready.result.formalPlan.actions.map((action) =>
            `${action.kind}: ${action.kind === "low-band-side-reduction" ? action.maxSideReductionDb : action.maxGainReductionDb} dB`).join(", ") || "なし"}</dd></div>
          <div><dt>Triggered Rules</dt><dd>{ready.result.formalPlan.triggeredRules.join(", ") || "なし"}</dd></div>
          <div><dt>Rejected Rules</dt><dd>{ready.result.formalPlan.rejectedRules.join(", ") || "なし"}</dd></div>
          <div><dt>Reason</dt><dd>{ready.result.formalPlan.trace.filter((entry) => entry.actionId).map((entry) => `${entry.ruleId}: ${entry.reason}`).join(", ") || "自動補正候補なし"}</dd></div>
        </dl><h3>ARTIFACT ANALYSIS</h3><dl>{artifactLabels.map(([key, label]) => {
          const result = ready.result.analysis.artifacts[key];
          return <div key={key}><dt>{label}</dt><dd>{result.status === "valid"
            ? `${result.detected ? "Detected" : "Not detected"} · severity ${result.severity.toFixed(2)} · confidence ${result.confidence.toFixed(2)}`
            : `Unknown · ${result.reason}`}</dd></div>;
        })}</dl><pre>{JSON.stringify(report, null, 2)}</pre></section>}
      </div>}
    </section>
    <footer>暫定True Peak上限: −1.0 dBTP。測定器の規格適合性と音質改善は未検証です。</footer>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

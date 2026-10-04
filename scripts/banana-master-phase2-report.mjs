#!/usr/bin/env node
// Generates a factual screening summary from the saved, PCM-free JSON outputs.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const folder = join(resolve(process.cwd()), "reports", "banana-master", "calibration-phase2");
const read = (name) => JSON.parse(readFileSync(join(folder, name), "utf8"));
const inventory = read("inventory.json"), results = read("screening-results.json"), dist = read("distribution.json");
const selection = read("candidate-selection.json"), queue = read("review-queue.json"), dense = read("short-event-screening.json");
const integrity = (() => { try { return read("input-integrity.json"); } catch { return null; } })();
const processed = results.tracks.filter((row) => row.status === "analyzed");
const unknown = results.tracks.filter((row) => row.status !== "analyzed");
const decodeWarnings = processed.filter((row) => row.decodeWarnings?.length || row.browserFallback?.originalDecoderWarningCount);
const browserFallback = processed.filter((row) => row.browserFallback);
const pending = inventory.tracks.length - results.tracks.length;
const duplicateGroups = [...Map.groupBy(inventory.tracks, (row) => row.sha256).values()].filter((group) => group.length > 1);
const fmt = (value, digits = 2) => value == null ? "Unknown" : Number(value).toFixed(digits);
const range = (metric) => `${fmt(metric.p10)} / ${fmt(metric.median)} / ${fmt(metric.p90)} (${metric.count}件)`;
const counts = (key) => Object.groupBy(results.tracks, key);
const detectorNames = ["highBandExcess", "hfSmear", "metallicRinging", "hfHiss", "mud", "boom", "harshness", "lowBandPhase", "sectionDegradation"];
const detectorCounts = Object.fromEntries(detectorNames.map((name) => [name, processed.filter((row) => row.analysis.detectors[name].detected === true).length]));
const maxRss = Math.max(0, ...processed.map((row) => row.analysis.processMemory?.rss ?? 0));
const meanMs = processed.reduce((sum, row) => sum + (row.analysis.elapsedMs ?? 0), 0) / Math.max(1, processed.length);
const formats = Object.fromEntries(Object.entries(Object.groupBy(inventory.tracks, (row) => row.format)).map(([format, rows]) => [format, rows.length]));
const rates = Object.fromEntries(Object.entries(counts((row) => row.sampleRate ?? "Unknown")).map(([rate, rows]) => [rate, rows.length]));
const lines = [
  "# Banana Master — Real-track Calibration Phase 2",
  "",
  "## RESULT",
  "",
  `${results.tracks.length === inventory.tracks.length && unknown.length === 0 && queue.entries.length > 0 && integrity?.status === "unchanged" ? "PASS（大量音源の選別基盤）" : "CONTINUE（未解析・候補・原本照合のいずれか未完了）"}。音質改善やDetector校正完了を意味しません。原音の人間判定は未完了です。`,
  "",
  "## True Peak Safety Status",
  "",
  "Pending / Unknown。True Peak Ceilingの保証実装、Ceiling値、専用テスト、20曲の再検証結果は確認できていません。前工程の20曲では11曲の処理後True Peakが0 dBTPを超えていました。今回の処理は原音解析のみであり、Master公開可能とは判断しません。",
  "",
  "## Inventory",
  "",
  `- 対象: ${inventory.tracks.length}音源（${Object.entries(formats).map(([key, value]) => `${key} ${value}`).join("、")}）。画像など音声以外は対象外。`,
  `- 解析済み: ${processed.length}件、Unknown: ${unknown.length}件、未処理: ${pending}件。`,
  `- Node MP3デコード警告あり: ${decodeWarnings.length}件。そのうちChrome再解析: ${browserFallback.length}件。詳細はscreening-results.jsonに記録。`,
  ...browserFallback.map((row) => `- ${row.trackId}: Nodeデコーダ警告 ${row.browserFallback.originalDecoderWarningCount}件。True PeakはNode ${fmt(row.browserFallback.originalTruePeakDbTp)} dBTP、Chrome ${fmt(row.analysis.truePeak.truePeakDbTp)} dBTP。Chrome再解析値を採用。`),
  `- 同一SHA-256: ${duplicateGroups.length}グループ（追加ファイル ${duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0)}件）。`,
  `- 原本ハッシュ再照合: ${integrity ? `${integrity.matchingSha256}/${integrity.afterCount}件一致、${integrity.status}` : "未実施"}。`,
  `- 解析処理済みの入力サンプルレート: ${Object.entries(rates).map(([key, value]) => `${key} Hz: ${value}件`).join("、")}。M4AはMP4サンプルエントリから取得。`,
  "- MP3のbit depthは圧縮形式のためPCM bit depthとして記載しません。M4Aも同様です。",
  "",
  "## Processing Freeze",
  "",
  `Analyzer / Detector / Decision / DSPのハッシュをprovisional-v1で固定しました。統合ハッシュ: ${results.sourceSha256}。通常MP3の入力44.1 kHzは評価用に48 kHzへ24タップ窓付きsinc変換し、M4AとNodeデコード警告があるMP3はChrome AudioContextで48 kHzへ変換しました。変換後PCMでの測定であり、原サンプルレートでの独立適合性はUnknownです。`,
  `候補選定スクリプトのハッシュ: ${selection.methodSha256 ?? "Unknown"}。高密度レビュー経路のハッシュ: ${dense.methodSha256 ?? "Unknown"}。`,
  "",
  "## Distribution",
  "",
  "数値は p10 / 中央値 / p90 です。Low-band balanceは60–120 Hz対450–2000 Hz、High-band balanceは6000–12000 Hz対450–2000 HzのdB差です。",
  "",
  `- Integrated LUFS: ${range(dist.integratedLufs)}`,
  `- True Peak dBTP: ${range(dist.truePeakDbTp)}`,
  `- Crest Factor dB: ${range(dist.crestFactorDb)}`,
  `- Duration秒: ${range(dist.durationSeconds)}`,
  `- Low-band balance dB: ${range(dist.lowBalanceDb)}`,
  `- High-band balance dB: ${range(dist.highBalanceDb)}`,
  `- Stereo correlation: ${range(dist.stereoCorrelation)}`,
  "",
  "### Detector陽性件数",
  "",
  ...Object.entries(detectorCounts).map(([name, count]) => `- ${name}: ${count} / ${processed.length}`),
  "",
  "## Candidate Selection",
  "",
  `- A 強い陽性: ${selection.strongPositive.length}件（severity≥0.4、confidence≥0.7）。`,
  `- B 閾値境界: ${selection.thresholdBoundary.length}件。`,
  `- C 見落としの可能性: ${selection.possibleMissedArtifacts.length}件。`,
  `- D 正常対照候補: ${selection.cleanControl.length}件。正常と確定したわけではありません。`,
  `- E 音響的な極端例: ${selection.intentionalExtremes.length}件。意図的な音楽表現かは未確認です。`,
  `- F 静かな曲・高ダイナミクス: ${selection.dynamicQuiet.length}件。`,
  "",
  "## Short-event Screening",
  "",
  `A / B / C候補の各曲について冒頭・中間・末尾・一次候補付近の最大20秒を高密度解析しました。フレーム間隔 ${fmt(dense.frameIntervalSeconds, 4)}秒、FFT窓 ${fmt(dense.windowDurationSeconds, 4)}秒。${dense.candidates.length}件の曲で局所候補を記録し、${dense.skipped?.length ?? 0}件は高密度解析をスキップしました。全時間を走査したわけではなく、False Negative確定ではありません。`,
  "",
  "## Review Queue / Listening UI",
  "",
  `試聴キュー ${queue.entries.length}件、キューID ${queue.queueId}。判定ステータスは全件Unreviewedです。原音の約16秒区間をローカルサーバーで再生し、前後3秒への移動、症状種別、4択判定、メモ、JSON/CSV書き出しが可能です。校正用とholdout用を分離しました。`,
  "",
  "## Performance / Memory",
  "",
  `1曲ずつ処理し、各曲の結果を保存しました。平均処理時間 ${fmt(meanMs / 1000)}秒、記録された最大Node RSS ${fmt(maxRss / 1024 / 1024)} MiB。RSSは処理後の測定値であり瞬間最大とは限りません。ブラウザ解析のNode RSSは未測定です。`,
  "",
  "## Known Limitations / Unknown",
  "",
  ...unknown.map((row) => `- ${row.trackId}: ${row.reason ?? "Unknown"}`),
  "- 正式測定の外部適合性、True Peak Ceiling保証、原音の人間判定、実際のFalse Positive / False NegativeはUnknownです。",
  "- 短時間異常の高密度解析は候補曲の最大4区間のみです。対象外の時間帯にある短い事象を見落とし得ます。",
  "- 音声PCM、全曲Masterは保存していません。原音は変更していません。",
  "",
  "## Next Recommended Step",
  "",
  "Review Queueを原音で試聴し、異常・音楽的に正常・判断不能を記録してください。確定ラベルに基づきMeasurement / Detection / Decision / DSP Method / DSP Amount / Unknownへ分類し、閾値変更前後を同じ音源で比較します。",
  "",
];
writeFileSync(join(folder, "findings.md"), lines.join("\n"));
process.stdout.write(`Findings written: ${processed.length}/${inventory.tracks.length} analyzed\n`);

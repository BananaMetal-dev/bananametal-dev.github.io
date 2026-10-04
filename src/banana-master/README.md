# Banana Master 暫定版

`/apps/banana-master/` が独立した入口です。GitHubリポジトリを正本として、ブラウザ内でステレオのWAV/MP3を48 kHz PCMへ変換し、Workerで測定、判断、描画、検証を行います。MP3は`mpg123-decoder`の浮動小数点PCMを受け取り、デコード警告件数を保持します。OriginalはWorkerへコピーして渡し、Masterは常にOriginalから生成します。試聴と24-bit WAV出力は同一Master Bufferを使用します。

## 現在の処理

- 測定: Sample Peak、RMS、Crest Factor、全帯域ステレオ相関、Integrated Loudness、True Peak、Spectrum、Band Energy、9種の音響症状Detector
- 判断: 正式Decision EngineはArtifact測定から実行前の不変Master Planを作ります。
- DSP: Planで許可された限定補正の後、True Peakを測定し、暫定上限−1.0 dBTPを超える場合だけ一律減衰します。再測定と出力検証に失敗した場合、WAV Exportを止めます。正式Limiterではありません。
- 未実装: Loudness Maximizer、正式Limiter、5方向モード

## Formal Analyzerの境界

Integrated Loudnessは[ITU-R BS.1770-5 Annex 1](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf)の48 kHz K-weighting係数を使い、400 msブロック、75% overlap、-70 LKFS absolute gate、absolute gateを通過したブロックの**線形エネルギー平均**から-10 dB relative gateを計算します。L/Rのエネルギーは加算し、2チャンネルで割りません。400 ms未満、無音、48 kHz以外は`unknown`を返します。

True Peakは同規格Annex 2の48次・4相FIR係数で4倍補間し、Sample Peak dBFSとTrue Peak dBTPを別々に返します。48 kHz以外は、異なるフィルター条件を推測しないため`unknown`です。実装目標はBS.1770-5ですが、全規格への適合認証はまだありません。Debugの`conformance`は`unknown`のままです。Integrated LUFSは解析に使い、True Peakは最終安全減衰に使います。暫定上限−1.0 dBTPは配信サービス共通の規格値ではありません。

Loudnessの公式照合には、[ITU-R BS.2217-1](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2217-1-2012-PDF-E.pdf)の配布音源を使用します。音源は`tests/fixtures/itu-official/wav`へローカル保存し、Gitには含めません。`BANANA_MASTER_ITU_FIXTURES`で別の保存先も指定できます。今回の照合対象は25 Hz、100 Hz、1 kHz、10 kHz、absolute gate、relative gate、monoの音楽と音声、stereoの音楽と音声の8件で、許容差は±0.1 LKFSです。この試験セットは旧版を対象に作成されているため、8件の通過のみでBS.1770-5全体の適合を宣言しません。True Peakは[EBU Tech 3341](https://tech.ebu.ch/docs/tech/tech3341.pdf)の試験信号15–19の仕様から生成した信号と公表許容差で確認します。EBU配布音源の実ファイルでの照合は未実施です。

## Spectrum / Band Energyの定義

4096点FFT、2048サンプルhop、Hann窓です。候補フレームから音源全体に均等な最大24フレームを選び、4096サンプル未満はゼロ埋めします。各チャンネルの窓掛けFFTについて、直流とNyquist以外を4倍した二乗振幅をHann窓の係数和の二乗で割り、片側bin powerとします。左右のbin powerを等重みで平均し、選んだフレーム間も線形powerの算術平均を取ります。Band Energyは帯域内のbin powerの**bin数あたり平均値**です。dB値は `10 log10(meanPower)` です。帯域は20–60、60–120、120–200、200–450、450–2000、2000–6000、6000–12000、12000–20000 Hzの半開区間です。帯域幅だけで広い帯域が大きくなるbin合計は使いません。この値はPSDや正式ラウドネスではなく、最大24フレームの標本化では短い異常を見落とす可能性があります。

## AI Artifact Analyzer V1の測定定義

生成元は推定しません。9個のDetectorは音響症状を測定し、`status`、`detected`、0–1の`severity`、0–1の`confidence`、数値`evidence`を返します。`confidence`は生成AIらしさの確率ではなく、解析できたフレーム数と時間間隔から見た測定の信頼度です。閾値は**provisional-v1（仮設定）**であり、実楽曲群で校正済みとは扱いません。48 kHzステレオの十分な有音データがない場合は`unknown`を返します。

音色の時間分析には、正式Spectrumとは別に8192点Hann FFT、1024サンプル基準hopを使います。最大2400フレームを曲全体から均等に選び、Debugの`candidateFrames`、`sampledFrames`、`maxFrameGapSeconds`に間引き幅を記録します。長尺で短い異常を見落とす可能性があり、フレーム間隔が0.1秒を超えるとconfidenceを下げます。正式SpectrumのFFTサイズと全帯域相関も測定メタデータに保持します。各フレームの左右平均波形から帯域ごとのbin平均パワー、6–18 kHzのスペクトル平坦度・占有率・正方向Flux、8–18 kHzの局所ピークを抽出します。小さい数値の線形平均ではなく、各フレームのdB差と時間的持続率を併用します。

| Detector | 主な特徴量・仮閾値 |
| --- | --- |
| High-band Excess | 6–18 kHz対450–2000 Hzの差が-12 dB超、6–12 kHz対2–6 kHzの傾きが-4 dB超となるフレームが30%超。Presence／Brilliance／Airを別に記録。 |
| HF Smear | 高域相対差>-12 dB、flatness>0.35、occupancy>0.65、Flux<0.4。該当率25%超かつ連続0.5秒以上。 |
| Metallic Ringing | 8–18 kHz、局所中央値との差15 dB以上、3 dB幅100 Hz以下、ピークが中域bin平均を超える。25 Hz幅の周波数群で持続率8%超、連続0.5秒以上。 |
| HF Hiss | 高域相対差>-12 dB、flatness>0.42、occupancy>0.75の広帯域フレームが25%超。 |
| Mud | 200–450 Hzのbin平均パワーを120–200 Hzと450–2000 Hzの隣接帯域のdB平均と比較。差18 dB超かつ該当率30%超。 |
| Boom | 60–120 Hzを20–60 Hzと120–200 Hzに対して比較。差22 dB超かつ該当率30%超。 |
| Harshness | 2–6 kHz対450–2000 Hzの差>-4 dBのフレームが30%超。短いFlux burstの割合もEvidenceへ記録。 |
| Low-band Phase | 120 Hz二次ローパス後、0.5秒ごとに左右相関・Side/Midを測定。相関<-0.2かつSideがMidの2倍超の窓が20%超。 |
| Section Degradation | 0–25%、25–75%、75–100%を比較。高域相対差、狭帯域ピーク、広帯域ノイズから各区間のスコアを計算し、Endが先行2区間より0.2超かつ0.25超。 |

Ringing、HF Smear、Sectionには`time`と`score`の間引いたDebug timelineを持たせます。通常UIには判定を表示せず、Debug Modeの`ARTIFACT ANALYSIS`とDebug JSONでのみ確認できます。

## Decision Engine Phase

正式Decision Engineは、Formal Analyzerと9種のArtifact Detectorを型付き入力に変換して`FormalMasterPlan`を作ります。Decisionの状態は`OK`、`WATCH`、`CORRECT`、`UNKNOWN`です。Detectorの`detected=true`だけでは候補を作らず、severity、confidence、持続などのEvidence、処理リスクを順番に確認します。Planには候補Action、補正上限、Risk、理由、Trigger/Rejected Rule、各RuleのTraceを含め、生成後は深く`Object.freeze`します。同じ解析入力に対するJSON出力は決定的です。

閾値と補正上限は**provisional-v1**です。主な候補化条件はSmear/Hiss/Ringingのseverity≥0.5・confidence≥0.7、Mud≥0.3、Boom≥0.4、Harshness≥0.5、Section≥0.5です。高リスクの低域位相補正はseverity≥0.7・confidence≥0.85を要求します。各RuleにはDetectorごとのEvidence条件もあります。High-band Excess単独では補正候補にしません。SmearとHissは重複した高域処理として1つに統合し、Sectionの末尾悪化がある場合は全曲処理より末尾限定処理を優先します。RingingとHarshness、Boomと低域位相の同時発火では、重なる処理を保留します。

補正上限はStatic EQ ±1.5 dB、Dynamic EQ最大2 dB、Dynamic Notch最大3 dB、De-ess最大2 dB、低域Side削減最大1.5 dBです。Actionの上限はseverityに応じてこの範囲内で減らします。Stereo候補の方向は`narrow-only`です。優先順位はArtifact/Safety、将来の音色選好、将来の音圧選好の順です。Loudness Planは型のみで、nominal LUFS・PLR・Limiter GRの数値は未確定です。重要な測定が`unknown`なら依存Actionを作りません。

正式PlanはWorker内で計算してDebugの`decisionEngine`へ記録します。`decision`と`legacyPreviewPlan`は旧プレビュー互換の情報であり、Masterの描画には使いません。正式PlanのActionを実行した後、単一のTrue Peak安全段を通します。0.95 Sample Peakの旧ゲインはこの経路で適用しません。Debug Modeの`DECISION ENGINE`でState、Risk、候補、上限、Trigger/Rejected Ruleを確認できます。

## テスト音源

回帰テストは既定でリポジトリの隣の `Banana Master/Banana_Master_Test_Tracks_V1` を読みます。他の場所にある場合は `BANANA_MASTER_FIXTURES` 環境変数でディレクトリを指定します。音源はリポジトリに複製しません。01–08の全音源を実行し、01は全Detectorの陰性対照、02、03、04、06、07は各症状の陽性回帰とします。ブラウザテストはWorker処理と10分WAV保存を対象とします。MP3テストは既定で01のテスト音源を既存MP3エンコーダーで変換し、デコードからDebug JSON保存まで確認します。MP3はテスト結果フォルダにだけ生成します。実際の楽曲MP3を検証する場合は `BANANA_MASTER_REAL_MP3` 環境変数へ絶対パスを指定します。

## 開発状態と次の工程

GitHub版を正本とし、Sites PoCとのソース一致は要求しません。PlaywrightはViteの開始・終了フックを使用します。20曲の既存実曲と監査上位5曲で暫定True Peak上限を検証しました。デコーダ警告のある`track-0316`は出力検証失敗としてWAV Exportを止めます。測定器の完全な規格適合と聴感上の音質改善は未確認です。

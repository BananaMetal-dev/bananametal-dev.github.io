import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "./audioEngine";
import {
  Icon,
  MobileTrackWindow,
  SortControls,
  TransportButton,
  VirtualTrackList,
  formatTime,
} from "./components";
import { sortTracks, tracksFromFileList } from "./fileAccess";
import type { LoadedTrack, PlayerStatus, SortMode, TrackSource } from "./types";
import {
  TrackVariantCache,
  getAudioBufferBytes,
  type CacheMode,
  type VariantCacheSnapshot,
} from "./variantCache";
import { createWavFileName, downloadBlob, encodePcm16Wav } from "./wav";
import "./key-player.css";

const VOLUME_STORAGE = "bnana-key-player:v1:volume";
const SORT_STORAGE = "bnana-key-player:v1:sort";
const CACHE_MODE_STORAGE = "bnana-key-player:v1:cache-mode";
const MIN_KEY = -6;
const MAX_KEY = 6;
const KEY_CHANGE_DELAY_MS = 500;

type LoadedPair = {
  current: LoadedTrack | null;
  next: LoadedTrack | null;
};

type NextCacheSummary = {
  key: number;
  bytes: number;
} | null;

export function KeyPlayerPage() {
  const [tracks, setTracks] = useState<TrackSource[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode());
  const [status, setStatus] = useState<PlayerStatus>("empty");
  const [statusMessage, setStatusMessage] = useState("フォルダ選択後に再生できます");
  const [libraryMessage, setLibraryMessage] = useState("フォルダを選択してください");
  const [scanCount, setScanCount] = useState(0);
  const [keyValue, setKeyValue] = useState(0);
  const [volume, setVolume] = useState(() => readStoredNumber(VOLUME_STORAGE, 0.8, 0, 1));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [cacheMode, setCacheMode] = useState<CacheMode>(() => readCacheMode());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef(new AudioEngine());
  const variantCacheRef = useRef(new TrackVariantCache());
  const tracksRef = useRef<TrackSource[]>([]);
  const currentIndexRef = useRef(0);
  const keyValueRef = useRef(keyValue);
  const cacheModeRef = useRef(cacheMode);
  const statusRef = useRef<PlayerStatus>("empty");
  const loadedRef = useRef<LoadedPair>({ current: null, next: null });
  const loadGenerationRef = useRef(0);
  const pendingKeyTimerRef = useRef<number | null>(null);
  const moveTrackRef = useRef<(delta: number, autoplay: boolean) => Promise<void>>(async () => undefined);
  const [cacheSnapshot, setCacheSnapshot] = useState<VariantCacheSnapshot>(() =>
    variantCacheRef.current.snapshot(cacheModeRef.current),
  );
  const [nextCacheSummary, setNextCacheSummary] = useState<NextCacheSummary>(null);

  const updateStatus = useCallback((nextStatus: PlayerStatus, message?: string) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    if (message !== undefined) setStatusMessage(message);
  }, []);

  const publishCacheSnapshot = useCallback(() => {
    setCacheSnapshot(variantCacheRef.current.snapshot(cacheModeRef.current));
  }, []);

  const clearPendingKeyChange = useCallback(() => {
    if (pendingKeyTimerRef.current === null) return;
    window.clearTimeout(pendingKeyTimerRef.current);
    pendingKeyTimerRef.current = null;
  }, []);

  const selectCacheTrack = useCallback(
    (trackId: string | null) => {
      variantCacheRef.current.selectTrack(trackId);
      publishCacheSnapshot();
      setNextCacheSummary(null);
    },
    [publishCacheSnapshot],
  );

  const resetCacheTrack = useCallback(
    (trackId: string | null) => {
      variantCacheRef.current.clear(trackId);
      publishCacheSnapshot();
      setNextCacheSummary(null);
    },
    [publishCacheSnapshot],
  );

  const decodeForKey = useCallback(async (track: TrackSource, key: number) => {
    const sourceBuffer = await engineRef.current.decode(await track.getFile());
    return engineRef.current.processPitch(sourceBuffer, key);
  }, []);

  const loadCurrentVariant = useCallback(
    async (track: TrackSource, key: number) => {
      if (variantCacheRef.current.selectTrack(track.id)) publishCacheSnapshot();

      const cached = variantCacheRef.current.get(track.id, key);
      if (cached) return cached;

      let sourceEntry = variantCacheRef.current.get(track.id, 0);
      if (!sourceEntry) {
        const sourceBuffer = await engineRef.current.decode(await track.getFile());
        sourceEntry = variantCacheRef.current.put(
          track.id,
          0,
          sourceBuffer,
          cacheModeRef.current,
          key,
        ) ?? { trackId: track.id, key: 0, buffer: sourceBuffer };
        publishCacheSnapshot();
      }

      if (key === 0) return sourceEntry;

      const buffer = await engineRef.current.processPitch(sourceEntry.buffer, key);
      const processed = variantCacheRef.current.put(
        track.id,
        key,
        buffer,
        cacheModeRef.current,
        key,
      ) ?? { trackId: track.id, key, buffer };
      publishCacheSnapshot();
      return processed;
    },
    [publishCacheSnapshot],
  );

  const preloadNext = useCallback(
    async (
      generation: number,
      index: number,
      sourceTracks: TrackSource[],
      currentLoaded: LoadedTrack,
    ) => {
      if (sourceTracks.length === 0) return;
      const nextIndex = (index + 1) % sourceTracks.length;
      const nextTrack = sourceTracks[nextIndex];

      const mobileSnapshot = variantCacheRef.current.snapshot("mobile");
      if (
        cacheModeRef.current === "mobile"
        && (currentLoaded.key !== 0 || mobileSnapshot.keys.length > 1)
      ) {
        loadedRef.current = { current: currentLoaded, next: null };
        setNextCacheSummary(null);
        return;
      }

      if (nextTrack.id === currentLoaded.trackId) {
        loadedRef.current = { current: currentLoaded, next: currentLoaded };
        setNextCacheSummary(null);
        return;
      }

      try {
        const buffer = await decodeForKey(nextTrack, currentLoaded.key);
        if (generation !== loadGenerationRef.current) return;
        loadedRef.current = {
          current: currentLoaded,
          next: { trackId: nextTrack.id, buffer, key: currentLoaded.key },
        };
        setNextCacheSummary({ key: currentLoaded.key, bytes: getAudioBufferBytes(buffer) });
      } catch {
        if (generation !== loadGenerationRef.current) return;
        loadedRef.current = { current: currentLoaded, next: null };
        setNextCacheSummary(null);
        setStatusMessage("次の曲を先読みできませんでした。再生時に再試行します");
      }
    },
    [decodeForKey],
  );

  const prepareIndex = useCallback(
    async (
      index: number,
      sourceTracks: TrackSource[],
      preparedTrack?: LoadedTrack,
      offset = 0,
    ) => {
      const track = sourceTracks[index];
      if (!track) return null;

      const generation = ++loadGenerationRef.current;
      const processingKey = keyValueRef.current;
      updateStatus(
        "loading",
        processingKey === 0
          ? `${track.name} を読み込んでいます`
          : `${track.name} をキー${formatKey(processingKey)}で処理しています`,
      );

      try {
        if (variantCacheRef.current.selectTrack(track.id)) publishCacheSnapshot();
        const matchingPrepared = preparedTrack?.trackId === track.id
          && preparedTrack.key === processingKey
          ? preparedTrack
          : null;
        const loadedVariant = matchingPrepared
          ? variantCacheRef.current.put(
            track.id,
            processingKey,
            matchingPrepared.buffer,
            cacheModeRef.current,
            processingKey,
          ) ?? matchingPrepared
          : await loadCurrentVariant(track, processingKey);
        if (generation !== loadGenerationRef.current) return null;

        publishCacheSnapshot();
        const buffer = loadedVariant.buffer;
        const currentLoaded = { trackId: track.id, buffer, key: processingKey };
        loadedRef.current = { current: currentLoaded, next: null };
        setNextCacheSummary(null);
        const restoredOffset = Math.min(Math.max(offset, 0), buffer.duration);
        engineRef.current.setPosition(restoredOffset, buffer.duration);
        setCurrentTime(restoredOffset);
        setDuration(buffer.duration);
        updateStatus(
          "stopped",
          processingKey === 0
            ? `${track.name} を再生できます`
            : `${track.name} をキー${formatKey(processingKey)}で再生できます`,
        );
        void preloadNext(generation, index, sourceTracks, currentLoaded);
        return buffer;
      } catch {
        if (generation !== loadGenerationRef.current) return null;
        loadedRef.current = { current: null, next: null };
        updateStatus("error", `${track.name} を読み込めませんでした`);
        return null;
      }
    },
    [loadCurrentVariant, preloadNext, publishCacheSnapshot, updateStatus],
  );

  const playPrepared = useCallback(
    async (buffer: AudioBuffer, offset: number) => {
      try {
        updateStatus("loading", "再生を準備しています");
        await engineRef.current.play(buffer, offset, volume, () => {
          void moveTrackRef.current(1, true);
        });
        updateStatus("playing", "再生中");
      } catch {
        updateStatus("error", "再生を開始できませんでした");
      }
    },
    [updateStatus, volume],
  );

  const activateIndex = useCallback(
    async (nextIndex: number, autoplay: boolean) => {
      const sourceTracks = tracksRef.current;
      if (sourceTracks.length === 0) return;
      const wrappedIndex = ((nextIndex % sourceTracks.length) + sourceTracks.length) % sourceTracks.length;
      const nextTrack = sourceTracks[wrappedIndex];
      const preparedTrack = loadedRef.current.next?.trackId === nextTrack.id
        ? loadedRef.current.next
        : undefined;

      clearPendingKeyChange();
      engineRef.current.stop();
      setCurrentTime(0);
      currentIndexRef.current = wrappedIndex;
      setCurrentIndex(wrappedIndex);
      selectCacheTrack(nextTrack.id);

      if (!autoplay) {
        loadGenerationRef.current += 1;
        loadedRef.current = { current: null, next: null };
        setDuration(0);
        updateStatus(
          "stopped",
          `${nextTrack.name} を選択しました。再生ボタンで準備します`,
        );
        return;
      }

      const buffer = await prepareIndex(wrappedIndex, sourceTracks, preparedTrack);
      if (buffer) await playPrepared(buffer, 0);
    },
    [clearPendingKeyChange, playPrepared, prepareIndex, selectCacheTrack, updateStatus],
  );

  useEffect(() => {
    moveTrackRef.current = async (delta, autoplay) => {
      await activateIndex(currentIndexRef.current + delta, autoplay);
    };
  }, [activateIndex]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Banana Key Changer | Banana Metal";
    document.body.classList.add("key-player-active");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("key-player-active");
    };
  }, []);

  useEffect(() => {
    return () => {
      clearPendingKeyChange();
      engineRef.current.dispose();
    };
  }, [clearPendingKeyChange]);

  useEffect(() => {
    keyValueRef.current = keyValue;
  }, [keyValue]);

  useEffect(() => {
    cacheModeRef.current = cacheMode;
    writeStoredValue(CACHE_MODE_STORAGE, cacheMode);
  }, [cacheMode]);

  useEffect(() => {
    writeStoredValue(VOLUME_STORAGE, volume);
    engineRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    writeStoredValue(SORT_STORAGE, sortMode);
  }, [sortMode]);

  useEffect(() => {
    if (status !== "playing") return;
    let frame = 0;
    const update = () => {
      setCurrentTime(engineRef.current.getPosition());
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [status]);

  const installTracks = useCallback(
    (foundTracks: TrackSource[]) => {
      const ordered = sortTracks(foundTracks, sortMode);
      clearPendingKeyChange();
      engineRef.current.stop();
      loadGenerationRef.current += 1;
      tracksRef.current = ordered;
      setTracks(ordered);
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      loadedRef.current = { current: null, next: null };
      keyValueRef.current = 0;
      setKeyValue(0);
      resetCacheTrack(ordered[0]?.id ?? null);
      setCurrentTime(0);
      setDuration(0);

      if (ordered.length === 0) {
        setLibraryMessage("対象の音楽ファイルは見つかりませんでした");
        updateStatus("empty", "対象の .mp3 / .m4a / .wav は見つかりませんでした");
        return;
      }

      setLibraryMessage(`${ordered.length.toLocaleString("ja-JP")}曲を登録しました`);
      updateStatus(
        "stopped",
        `${ordered.length.toLocaleString("ja-JP")}曲を登録しました。再生ボタンで準備します`,
      );
    },
    [clearPendingKeyChange, resetCacheTrack, sortMode, updateStatus],
  );

  const chooseFolder = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.currentTarget.files;
      if (!fileList || fileList.length === 0) return;
      setLibraryMessage("フォルダを確認しています");
      updateStatus("scanning", "フォルダを確認しています");
      setScanCount(fileList.length);
      const foundTracks = tracksFromFileList(fileList);
      event.currentTarget.value = "";
      installTracks(foundTracks);
    },
    [installTracks, updateStatus],
  );

  const changeSortMode = useCallback(
    (mode: SortMode) => {
      setSortMode(mode);
      if (tracksRef.current.length === 0) return;

      const previousFirstId = tracksRef.current[0]?.id;
      const ordered = sortTracks(tracksRef.current, mode);
      if (mode === "random" && ordered.length > 1 && ordered[0].id === previousFirstId) {
        [ordered[0], ordered[1]] = [ordered[1], ordered[0]];
      }

      clearPendingKeyChange();
      engineRef.current.stop();
      tracksRef.current = ordered;
      setTracks(ordered);
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      loadedRef.current = { current: null, next: null };
      selectCacheTrack(ordered[0]?.id ?? null);
      setCurrentTime(0);
      setDuration(0);
      setLibraryMessage("曲順を変更しました");
      updateStatus("stopped", "曲順を変更しました。再生ボタンで準備します");
    },
    [clearPendingKeyChange, selectCacheTrack, updateStatus],
  );

  const selectTrack = useCallback(
    async (index: number) => {
      await activateIndex(index, false);
    },
    [activateIndex],
  );

  const play = useCallback(async () => {
    if (tracksRef.current.length === 0 || statusRef.current === "playing") return;
    const track = tracksRef.current[currentIndexRef.current];
    const loaded = loadedRef.current.current;
    let buffer = loaded?.trackId === track.id && loaded.key === keyValueRef.current
      ? loaded.buffer
      : null;
    if (!buffer) buffer = await prepareIndex(currentIndexRef.current, tracksRef.current);
    if (!buffer) return;
    await playPrepared(buffer, engineRef.current.getPosition());
  }, [playPrepared, prepareIndex]);

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") return;
    const pausedAt = engineRef.current.pause();
    setCurrentTime(pausedAt);
    updateStatus("paused", "一時停止中");
  }, [updateStatus]);

  const stop = useCallback(() => {
    if (tracksRef.current.length === 0) return;
    clearPendingKeyChange();
    engineRef.current.stop();
    setCurrentTime(0);
    updateStatus("stopped", "停止しました");
  }, [clearPendingKeyChange, updateStatus]);

  const applyKeyToCurrent = useCallback(
    async (requestedKey: number) => {
      if (keyValueRef.current !== requestedKey) return;
      const currentStatus = statusRef.current;
      if (currentStatus !== "playing" && currentStatus !== "paused") return;

      const sourceTracks = tracksRef.current;
      const track = sourceTracks[currentIndexRef.current];
      if (!track) return;

      const shouldResume = currentStatus === "playing";
      const resumeOffset = engineRef.current.getPosition();
      const cached = variantCacheRef.current.get(track.id, requestedKey) ?? undefined;
      engineRef.current.stop();
      setCurrentTime(resumeOffset);
      const buffer = await prepareIndex(
        currentIndexRef.current,
        sourceTracks,
        cached,
        resumeOffset,
      );
      if (!buffer || keyValueRef.current !== requestedKey) return;

      if (shouldResume) {
        await playPrepared(buffer, resumeOffset);
      } else {
        updateStatus("paused", `キー${formatKey(requestedKey)}で一時停止中`);
      }
    },
    [playPrepared, prepareIndex, updateStatus],
  );

  const changeKey = useCallback(
    (delta: number) => {
      const nextKey = Math.max(MIN_KEY, Math.min(MAX_KEY, keyValueRef.current + delta));
      if (nextKey === keyValueRef.current) return;

      const previousStatus = statusRef.current;
      keyValueRef.current = nextKey;
      setKeyValue(nextKey);
      clearPendingKeyChange();

      const sourceTracks = tracksRef.current;
      if (sourceTracks.length === 0) return;

      if (previousStatus !== "playing" && previousStatus !== "paused") {
        setCurrentTime(0);
        updateStatus(
          "stopped",
          `キー${formatKey(nextKey)}を選択しました。再生時に処理します`,
        );
        return;
      }

      const track = sourceTracks[currentIndexRef.current];
      const cached = track ? variantCacheRef.current.get(track.id, nextKey) : null;
      if (cached) {
        void applyKeyToCurrent(nextKey);
        return;
      }

      updateStatus(
        previousStatus,
        `キー${formatKey(nextKey)}を選択しました。変換を待機しています`,
      );
      pendingKeyTimerRef.current = window.setTimeout(() => {
        pendingKeyTimerRef.current = null;
        void applyKeyToCurrent(nextKey);
      }, KEY_CHANGE_DELAY_MS);
    },
    [applyKeyToCurrent, clearPendingKeyChange, updateStatus],
  );

  const changeCacheMode = useCallback(
    (pcEnabled: boolean) => {
      const nextMode: CacheMode = pcEnabled ? "pc" : "mobile";
      cacheModeRef.current = nextMode;
      setCacheMode(nextMode);
      variantCacheRef.current.setMode(nextMode, keyValueRef.current);
      publishCacheSnapshot();
      const generation = ++loadGenerationRef.current;

      const currentLoaded = loadedRef.current.current;
      const mobileSnapshot = variantCacheRef.current.snapshot("mobile");
      const shouldClearMobileNext = nextMode === "mobile"
        && (
          loadedRef.current.next?.key !== 0
          || mobileSnapshot.keys.length > 1
        );
      if (shouldClearMobileNext) {
        loadedRef.current = { current: currentLoaded, next: null };
        setNextCacheSummary(null);
      } else if (nextMode === "pc" && currentLoaded && !loadedRef.current.next) {
        void preloadNext(
          generation,
          currentIndexRef.current,
          tracksRef.current,
          currentLoaded,
        );
      }

      setStatusMessage(nextMode === "pc"
        ? "PCキャッシュを有効にしました"
        : "モバイル保持へ切り替えました");
    },
    [preloadNext, publishCacheSnapshot],
  );

  const changeVolume = useCallback((delta: number) => {
    setVolume((current) => Math.round(Math.max(0, Math.min(1, current + delta)) * 10) / 10);
  }, []);

  const exportCurrentTrack = useCallback(async () => {
    const track = tracksRef.current[currentIndexRef.current];
    const loaded = loadedRef.current.current;
    if (!track || !loaded || loaded.trackId !== track.id || isExporting) return;

    setIsExporting(true);
    setStatusMessage("WAVを作成しています");
    try {
      if (loaded.key !== keyValue) throw new Error("KEY_BUFFER_MISMATCH");
      const blob = encodePcm16Wav(loaded.buffer);
      downloadBlob(blob, createWavFileName(track.name, keyValue));
      setStatusMessage("WAVのダウンロードを開始しました");
    } catch (error) {
      setStatusMessage(error instanceof Error && error.message === "WAV_TOO_LARGE"
        ? "WAVが4GBを超えるため保存できません"
        : "WAV変換に失敗しました");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, keyValue]);

  const currentTrack = tracks[currentIndex] ?? null;
  const controlsDisabled = tracks.length === 0 || status === "scanning" || status === "loading";
  const keyControlsDisabled = status === "scanning" || status === "loading" || isExporting;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const keyLabel = formatKey(keyValue);
  const volumePercent = Math.round(volume * 100);
  const totalCacheBytes = cacheSnapshot.bytes + (nextCacheSummary?.bytes ?? 0);
  const cacheOverLimit = totalCacheBytes > cacheSnapshot.limitBytes;
  const cachedKeyLabel = cacheSnapshot.keys.length > 0
    ? cacheSnapshot.keys.map(formatKey).join(" ")
    : "なし";

  return (
    <div className="key-player-app">
      <header className="kp-header">
        <div className="kp-title-block">
          <div className="kp-title-row">
            <h1>Banana Key Changer</h1>
            <span className="kp-count">{tracks.length.toLocaleString("ja-JP")}曲</span>
          </div>
          <div className="kp-header-notes">
            <span className="kp-feature-summary">テンポを保ってキー変更・WAV保存</span>
            <span className="kp-local-processing">音楽ファイルは外部に送信されません。音声処理はブラウザ内で完結します。</span>
          </div>
        </div>
        <a className="kp-apps-link" href="/apps/" aria-label="アプリ一覧へ戻る">
          <Icon name="apps" size={18} />
          <span>Apps</span>
        </a>
      </header>

      <main className="kp-workspace">
        <section className="kp-library" aria-labelledby="kp-library-title">
          <div className="kp-library-toolbar">
            <h2 id="kp-library-title">曲リスト</h2>
            <button className="kp-folder-button" type="button" onClick={() => void chooseFolder()}>
              <Icon name="folder" size={20} />
              <span>フォルダを選択</span>
            </button>
          </div>
          <SortControls
            mode={sortMode}
            disabled={status === "scanning"}
            onChange={(mode) => void changeSortMode(mode)}
          />
          <div className="kp-scan-line" role="status" aria-live="polite">
            {status === "scanning" ? `${scanCount.toLocaleString("ja-JP")}件を確認中` : libraryMessage}
          </div>
          <MobileTrackWindow tracks={tracks} currentIndex={currentIndex} onSelect={(index) => void selectTrack(index)} />
          <VirtualTrackList tracks={tracks} currentIndex={currentIndex} onSelect={(index) => void selectTrack(index)} />
        </section>

        <aside className="kp-controls" aria-label="再生操作">
          <section className="kp-now-playing" aria-labelledby="kp-now-title">
            <div className="kp-section-label" id="kp-now-title">現在の曲</div>
            <strong title={currentTrack?.relativePath}>{currentTrack?.name ?? "未選択"}</strong>
            <div className="kp-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="kp-time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </section>

          <section className="kp-key-control" aria-labelledby="kp-key-title">
            <div className="kp-section-label" id="kp-key-title">キー（半音）</div>
            <div className="kp-key-status" role="status" aria-live="polite">{statusMessage}</div>
            <div className="kp-key-stepper">
              <button type="button" disabled={keyControlsDisabled || keyValue <= MIN_KEY} onClick={() => void changeKey(-1)} aria-label="キーを1下げる">−</button>
              <output aria-live="polite">{keyLabel}</output>
              <button type="button" disabled={keyControlsDisabled || keyValue >= MAX_KEY} onClick={() => void changeKey(1)} aria-label="キーを1上げる">＋</button>
            </div>
            <div className="kp-key-scale" aria-hidden="true">
              {Array.from({ length: MAX_KEY - MIN_KEY + 1 }, (_, index) => {
                const value = MIN_KEY + index;
                const classes = [
                  value === keyValue ? "is-active" : "",
                  cacheSnapshot.keys.includes(value) ? "is-cached" : "",
                ].filter(Boolean).join(" ");
                return <span key={value} className={classes} />;
              })}
            </div>
            <div className="kp-cache-row">
              <div
                className={`kp-cache-status${cacheOverLimit ? " is-warning" : ""}`}
                role="status"
                aria-live="polite"
              >
                <span>保持 {cachedKeyLabel}</span>
                {nextCacheSummary && <span>次 {formatKey(nextCacheSummary.key)}</span>}
                <strong>推定 {formatCacheSize(totalCacheBytes)}</strong>
              </div>
              <label className="kp-cache-switch" title="現在曲の変換済みキーを多く保持します">
                <span className={`kp-cache-mode-label${cacheMode === "mobile" ? " is-active" : ""}`}>スマホ</span>
                <span className="kp-switch-control">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={cacheMode === "pc"}
                    disabled={keyControlsDisabled}
                    onChange={(event) => changeCacheMode(event.currentTarget.checked)}
                    aria-label="スマホ保持とPCキャッシュを切り替える"
                  />
                  <span className="kp-switch-track" aria-hidden="true"><span /></span>
                </span>
                <span className={`kp-cache-mode-label${cacheMode === "pc" ? " is-active" : ""}`}>PCキャッシュ</span>
              </label>
            </div>
            <p className="kp-cache-help">
              スマホは最大2キー、PCは最大13キーを一時保持します。曲変更で消去され、PCはメモリ使用量が増えます。
            </p>
          </section>

          <button
            className="kp-export-button"
            type="button"
            disabled={
              controlsDisabled
              || isExporting
              || !loadedRef.current.current
              || loadedRef.current.current.key !== keyValue
            }
            onClick={() => void exportCurrentTrack()}
          >
            <Icon name="download" size={24} />
            <span>{isExporting ? "WAV変換中…" : "現在曲をWAV保存"}</span>
          </button>

          <section className="kp-transport" aria-label="トランスポート">
            <TransportButton icon="previous" label="前" className="is-edge" disabled={controlsDisabled} onClick={() => void moveTrackRef.current(-1, statusRef.current === "playing")} />
            <TransportButton icon="play" label="再生" disabled={controlsDisabled} active={status === "playing"} onClick={() => void play()} />
            <TransportButton icon="pause" label="一時停止" disabled={controlsDisabled || status !== "playing"} active={status === "paused"} onClick={pause} />
            <TransportButton icon="stop" label="停止" disabled={controlsDisabled} active={status === "stopped"} onClick={stop} />
            <TransportButton icon="next" label="次" className="is-edge" disabled={controlsDisabled} onClick={() => void moveTrackRef.current(1, statusRef.current === "playing")} />
          </section>

          <section className="kp-volume" aria-label={`音量 ${volumePercent}%`}>
            <button type="button" disabled={volume <= 0} onClick={() => changeVolume(-0.1)}>
              <Icon name="volumeDown" size={24} />
              <span>音量 −</span>
            </button>
            <div className="kp-volume-meter" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} className={index < Math.ceil(volume * 10) ? "is-active" : ""} />
              ))}
              <output>{volumePercent}%</output>
            </div>
            <button type="button" disabled={volume >= 1} onClick={() => changeVolume(0.1)}>
              <span>音量 ＋</span>
              <Icon name="volumeUp" size={24} />
            </button>
          </section>

          <footer className="kp-footer">
            <span>端末内処理</span>
            <a href="/apps/key-player/SOUNDTOUCHJS_LICENSE.txt">SoundTouchJS MPL-2.0</a>
          </footer>
        </aside>
      </main>

      <input
        ref={(node) => {
          fileInputRef.current = node;
          node?.setAttribute("webkitdirectory", "");
          node?.setAttribute("directory", "");
        }}
        className="kp-hidden-input"
        type="file"
        accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
        multiple
        onChange={(event) => void onFileInputChange(event)}
      />
    </div>
  );
}

function readStoredNumber(key: string, fallback: number, min: number, max: number) {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    const value = Number(stored);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  } catch {
    return fallback;
  }
}

function readSortMode(): SortMode {
  try {
    const value = window.localStorage.getItem(SORT_STORAGE);
    return value === "newest" || value === "random" ? value : "name";
  } catch {
    return "name";
  }
}

function readCacheMode(): CacheMode {
  try {
    return window.localStorage.getItem(CACHE_MODE_STORAGE) === "pc" ? "pc" : "mobile";
  } catch {
    return "mobile";
  }
}

function writeStoredValue(key: string, value: string | number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Playback remains available when browser storage is disabled.
  }
}

function formatKey(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatCacheSize(bytes: number) {
  if (bytes <= 0) return "0 MB";
  const gibibytes = bytes / (1024 ** 3);
  if (gibibytes >= 1) return `${gibibytes.toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 ** 2))} MB`;
}

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { FolderOpen, Library, Music2, Pause, Play, RotateCcw, Settings, SlidersHorizontal, UploadCloud, Volume2 } from 'lucide-react'
import { AudioEngine, DURATION_WARNING_THRESHOLD_MS } from './audio/AudioEngine'
import { MicrophoneRecorder } from './audio/MicrophoneRecorder'
import { AddSongModal } from './components/AddSongModal'
import { LibraryModal } from './components/LibraryModal'
import { LyricsPanel } from './components/LyricsPanel'
import { MicrophonePanel } from './components/MicrophonePanel'
import { MixerSlider, Stepper } from './components/Controls'
import { SettingsModal } from './components/SettingsModal'
import { parseLrc } from './lyrics/LrcParser'
import { AppSettingsRepository } from './repositories/AppSettingsRepository'
import { SongRepository } from './repositories/SongRepository'
import { SongSettingsRepository } from './repositories/SongSettingsRepository'
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_SONG_SETTINGS,
  type AppSettings,
  type LyricLine,
  type Song,
  type SongSettings,
  type SongSummary,
} from './types'

type ModalName = 'library' | 'add' | 'settings' | 'lyrics' | null

const songRepository = new SongRepository()
const songSettingsRepository = new SongSettingsRepository()
const appSettingsRepository = new AppSettingsRepository()

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00'
  const minutes = Math.floor(Math.max(0, seconds) / 60)
  const remainder = Math.floor(Math.max(0, seconds) % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function App() {
  const audioEngine = useMemo(() => new AudioEngine(), [])
  const microphoneRecorder = useMemo(() => new MicrophoneRecorder(), [])
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [currentSong, setCurrentSong] = useState<Song>()
  const [songSettings, setSongSettings] = useState<SongSettings>(DEFAULT_SONG_SETTINGS)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [appSettingsReady, setAppSettingsReady] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [message, setMessage] = useState('曲ライブラリからON/OFF Vocalを登録してください')
  const [modal, setModal] = useState<ModalName>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [draggingFiles, setDraggingFiles] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const saveTimer = useRef<number | undefined>(undefined)
  const dragDepth = useRef(0)
  const recordingTimer = useRef<number | undefined>(undefined)
  const recordingStartedAt = useRef(0)

  const refreshSongs = useCallback(async () => setSongs(await songRepository.list()), [])

  useEffect(() => {
    void refreshSongs()
    void appSettingsRepository.load().then((saved) => {
      setAppSettings(saved)
      setAppSettingsReady(true)
    })
    audioEngine.onPosition((nextPosition, nextDuration) => {
      setPosition(nextPosition)
      setDuration(nextDuration)
    })
    audioEngine.onEnded(() => {
      setPlaying(false)
      setMessage('再生が終了しました')
    })
    return () => audioEngine.dispose()
  }, [audioEngine, refreshSongs])

  useEffect(() => () => {
    window.clearInterval(recordingTimer.current)
    void microphoneRecorder.dispose()
  }, [microphoneRecorder])

  useEffect(() => {
    audioEngine.applySongSettings(songSettings)
    if (!currentSong) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      void songSettingsRepository.save(currentSong.id, songSettings)
    }, 180)
    return () => window.clearTimeout(saveTimer.current)
  }, [audioEngine, currentSong, songSettings])

  useEffect(() => {
    if (!appSettingsReady) return
    audioEngine.applyAppSettings(appSettings)
    void appSettingsRepository.save(appSettings)
  }, [appSettings, appSettingsReady, audioEngine])

  useEffect(() => {
    microphoneRecorder.setGain(appSettings.micInputVolume)
  }, [appSettings.micInputVolume, microphoneRecorder])

  useEffect(() => {
    const handleDeviceChange = async () => {
      const available = await navigator.mediaDevices.enumerateDevices()
      setDevices(available)
      const outputIds = new Set(available.filter((device) => device.kind === 'audiooutput').map((device) => device.deviceId))
      const missingMonitor = appSettings.monitorOutputDeviceId && !outputIds.has(appSettings.monitorOutputDeviceId)
      const missingStream = appSettings.streamOutputDeviceId && !outputIds.has(appSettings.streamOutputDeviceId)
      const inputIds = new Set(available.filter((device) => device.kind === 'audioinput').map((device) => device.deviceId))
      const missingMicrophone = appSettings.micInputDeviceId && !inputIds.has(appSettings.micInputDeviceId)
      if (missingMonitor || missingStream || missingMicrophone) setMessage('設定されていた音声デバイスが見つかりません。')
    }
    void handleDeviceChange()
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
  }, [appSettings.micInputDeviceId, appSettings.monitorOutputDeviceId, appSettings.streamOutputDeviceId])

  const loadSong = async (songId: string) => {
    setLoading(true)
    setPlaying(false)
    setMessage('音源を読み込んでいます…')
    try {
      const song = await songRepository.load(songId)
      if (!song) throw new Error('曲情報を読み込めませんでした。')
      const savedSettings = await songSettingsRepository.load(songId)
      let nextLyrics: LyricLine[] = []
      let lyricsWarning = ''
      if (song.lyricsFile) {
        try {
          const source = await song.lyricsFile.text()
          nextLyrics = parseLrc(source)
          if (source.trim() && !nextLyrics.length) lyricsWarning = '歌詞ファイルを読み込めませんでした。音声のみで再生できます。'
        } catch {
          lyricsWarning = '歌詞ファイルを読み込めませんでした。音声のみで再生できます。'
        }
      }
      const result = await audioEngine.load(song, savedSettings, appSettings)
      setCurrentSong(song)
      setSongSettings(savedSettings)
      setLyrics(nextLyrics)
      setPosition(0)
      setDuration(audioEngine.duration)
      setModal(null)
      setMessage(lyricsWarning || (result.durationDifferenceMs > DURATION_WARNING_THRESHOLD_MS
        ? `ON/OFF Vocalの長さが${Math.round(result.durationDifferenceMs)}ms異なります。同期がずれる可能性があります。`
        : audioEngine.outputSeparationSupported
          ? '再生準備ができました'
          : 'このブラウザでは出力分離機能を利用できません。基本再生は利用できます。'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '曲を読み込めませんでした。')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayback = async () => {
    try {
      if (playing) {
        audioEngine.pause()
        setPlaying(false)
        setMessage('一時停止中')
      } else {
        await audioEngine.play()
        setPlaying(true)
        setMessage('再生中')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '再生を開始できませんでした。')
    }
  }

  const saveSong = async (song: Song) => {
    await songRepository.save(song)
    await songSettingsRepository.save(song.id, DEFAULT_SONG_SETTINGS)
    await refreshSongs()
    await loadSong(song.id)
  }

  const deleteSong = async (songId: string) => {
    if (!window.confirm('この曲をライブラリから削除しますか？元の音声ファイルは削除されません。')) return
    await Promise.all([songRepository.delete(songId), songSettingsRepository.delete(songId)])
    if (currentSong?.id === songId) {
      audioEngine.pause()
      setCurrentSong(undefined)
      setLyrics([])
      setPlaying(false)
      setPosition(0)
      setDuration(0)
    }
    await refreshSongs()
  }

  const openSettings = async () => {
    try {
      setDevices(await navigator.mediaDevices.enumerateDevices())
    } catch {
      setDevices([])
    }
    setModal('settings')
  }

  const loadLyricsFile = async () => {
    if (!currentSong) return setMessage('先に曲を選択してください。')
    const picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = '.lrc,text/plain'
    picker.onchange = async () => {
      const file = picker.files?.[0]
      if (!file) return
      try {
        const parsed = parseLrc(await file.text())
        const updatedSong = { ...currentSong, lyricsFile: file }
        await songRepository.save(updatedSong)
        setCurrentSong(updatedSong)
        setLyrics(parsed)
        setMessage(`${parsed.length}行の歌詞を読み込みました`)
      } catch {
        setMessage('歌詞ファイルを読み込めませんでした。音声のみで再生できます。')
      }
    }
    picker.click()
  }

  const stepSetting = (key: 'audioOffsetMs' | 'lyricsOffsetMs', direction: -1 | 1) => {
    const increment = key === 'audioOffsetMs' ? 1 : 10
    const limit = key === 'audioOffsetMs' ? 500 : 5000
    setSongSettings((settings) => ({
      ...settings,
      [key]: clamp(settings[key] + direction * increment, -limit, limit),
    }))
  }

  const downloadRecording = (blob: Blob, durationSeconds: number) => {
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const baseName = (currentSong?.title || 'vocal').replace(/[\\/:*?"<>|]/g, '_')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    link.href = objectUrl
    link.download = `${baseName}_vocal_${timestamp}.wav`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    setMessage(`マイク音声のみのWAVを保存しました（${formatDuration(durationSeconds)}）`)
  }

  const toggleRecording = async () => {
    try {
      if (recording) {
        window.clearInterval(recordingTimer.current)
        const result = await microphoneRecorder.stop()
        setRecording(false)
        setRecordingSeconds(result.durationSeconds)
        downloadRecording(result.blob, result.durationSeconds)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) throw new Error('このブラウザはマイク録音に対応していません。')
      await microphoneRecorder.start(appSettings.micInputDeviceId, appSettings.micInputVolume)
      recordingStartedAt.current = performance.now()
      setRecordingSeconds(0)
      setRecording(true)
      setMessage('マイク入力だけを録音しています')
      recordingTimer.current = window.setInterval(() => {
        setRecordingSeconds((performance.now() - recordingStartedAt.current) / 1000)
      }, 250)
      setDevices(await navigator.mediaDevices.enumerateDevices())
    } catch (error) {
      window.clearInterval(recordingTimer.current)
      setRecording(false)
      const name = error instanceof DOMException ? error.name : ''
      setMessage(name === 'NotAllowedError'
        ? 'マイクの使用が許可されていません。ブラウザの権限を確認してください。'
        : name === 'NotFoundError'
          ? '利用できるマイクが見つかりません。'
          : error instanceof Error ? error.message : 'マイク録音を開始できませんでした。')
    }
  }

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragDepth.current += 1
    setDraggingFiles(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (!dragDepth.current) setDraggingFiles(false)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDraggingFiles(false)
    const files = Array.from(event.dataTransfer.files)
    if (!files.length) return
    setPendingFiles(files)
    setModal('add')
  }

  return (
    <main className="page-shell" onDragEnter={handleDragEnter} onDragOver={(event) => event.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {draggingFiles ? (
        <div className="global-drop-overlay" aria-hidden="true">
          <UploadCloud size={48} />
          <strong>曲ファイルをドロップ</strong>
          <span>ON/OFF VocalとLRCをまとめて読み込めます</span>
        </div>
      ) : null}
      <section className="player-shell" aria-label="Guide Vocal Player">
        <header className="app-header">
          <div className="track-identity">
            <div className="album-placeholder"><Music2 size={31} strokeWidth={2.4} /></div>
            <div><h1>{currentSong?.title ?? 'Guide Vocal Player'}</h1><p>{currentSong?.artist ?? '曲を選択してください'}</p></div>
          </div>
          <div className="header-actions">
            <button type="button" className="header-button" onClick={() => setModal('library')}><FolderOpen size={23} />曲を開く</button>
            <button type="button" className="icon-button" aria-label="出力設定" onClick={openSettings}><Settings size={26} /></button>
          </div>
        </header>

        <div className="main-grid">
          <div className="left-column">
            <section className="transport-panel" aria-labelledby="transport-title">
              <h2 id="transport-title">再生コントロール</h2>
              <div className="transport-buttons">
                <button type="button" className="transport-secondary" aria-label="曲頭へ戻る" disabled={!currentSong} onClick={() => void audioEngine.seek(0)}><RotateCcw size={25} /></button>
                <button type="button" className="transport-primary" aria-label={playing ? '一時停止' : '再生'} disabled={!currentSong || loading} onClick={() => void togglePlayback()}>{playing ? <Pause size={30} fill="currentColor" /> : <Play size={31} fill="currentColor" />}</button>
                <button type="button" className="transport-secondary" aria-label="ライブラリを開く" onClick={() => setModal('library')}><Library size={25} /></button>
              </div>
              <div className="seek-row">
                <output>{formatDuration(position)} / {formatDuration(duration)}</output>
                <input
                  className="range-control seek-control"
                  aria-label="再生位置"
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.01"
                  value={Math.min(position, duration || 0)}
                  disabled={!currentSong}
                  style={{ '--range-progress': `${duration ? (position / duration) * 100 : 0}%` } as React.CSSProperties}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  onPointerUp={(event) => void audioEngine.seek(Number(event.currentTarget.value))}
                  onKeyUp={(event) => event.key.startsWith('Arrow') && void audioEngine.seek(Number(event.currentTarget.value))}
                />
              </div>
              <MixerSlider label="ガイドボーカル（モニター用）" value={songSettings.monitorGuideLevel} disabled={!currentSong} onChange={(monitorGuideLevel) => setSongSettings((settings) => ({ ...settings, monitorGuideLevel }))} />
              <MixerSlider label="ガイドボーカル（配信用）" value={songSettings.streamGuideLevel} disabled={!currentSong} onChange={(streamGuideLevel) => setSongSettings((settings) => ({ ...settings, streamGuideLevel }))} />
              <div className="volume-row">
                <span><Volume2 size={19} />音量</span>
                <input
                  className="range-control"
                  aria-label="曲の音量"
                  type="range"
                  min="0"
                  max="125"
                  value={songSettings.songGain * 100}
                  disabled={!currentSong}
                  style={{ '--range-progress': `${Math.min(songSettings.songGain * 80, 100)}%` } as React.CSSProperties}
                  onChange={(event) => setSongSettings((settings) => ({ ...settings, songGain: Number(event.target.value) / 100 }))}
                />
                <strong>{Math.round(songSettings.songGain * 100)}%</strong>
              </div>
            </section>
            <MicrophonePanel
              devices={devices}
              deviceId={appSettings.micInputDeviceId}
              volume={appSettings.micInputVolume}
              recording={recording}
              elapsedSeconds={recordingSeconds}
              onDeviceChange={(micInputDeviceId) => setAppSettings((settings) => ({ ...settings, micInputDeviceId }))}
              onVolumeChange={(micInputVolume) => setAppSettings((settings) => ({ ...settings, micInputVolume }))}
              onToggleRecording={() => void toggleRecording()}
            />
            <div className="output-tabs" aria-label="出力設定">
              <button type="button" className="active" onClick={openSettings}>⌃<span>モニター出力</span></button>
              <button type="button" onClick={openSettings}>⌄<span>配信出力</span></button>
            </div>
          </div>

          <div className="right-column">
            <LyricsPanel lines={lyrics} position={position} lyricsOffsetMs={songSettings.lyricsOffsetMs} onLoadLyrics={() => void loadLyricsFile()} onOpenAdjustments={() => setModal('lyrics')} />
            <div className="offset-row">
              <Stepper label="Offset（音声同期）" value={songSettings.audioOffsetMs} unit="ms" onStep={(direction) => stepSetting('audioOffsetMs', direction)} />
              <Stepper label="歌詞Offset" value={songSettings.lyricsOffsetMs} unit="ms" onStep={(direction) => stepSetting('lyricsOffsetMs', direction)} />
            </div>
          </div>
        </div>

        <footer className={`status-bar ${message.includes('異なり') ? 'warning-status' : ''}`}><span className="status-dot" />{message}</footer>
      </section>

      {modal === 'library' && <LibraryModal songs={songs} selectedId={currentSong?.id} onClose={() => setModal(null)} onSelect={(id) => void loadSong(id)} onDelete={(id) => void deleteSong(id)} onAdd={() => { setPendingFiles([]); setModal('add') }} />}
      {modal === 'add' && <AddSongModal initialFiles={pendingFiles} onClose={() => { setPendingFiles([]); setModal(null) }} onSave={saveSong} />}
      {modal === 'settings' && <SettingsModal settings={appSettings} devices={devices} outputSupported={audioEngine.outputSeparationSupported} onChange={setAppSettings} onClose={() => setModal(null)} />}
      {modal === 'lyrics' && (
        <div className="quick-adjust" role="dialog" aria-modal="true" aria-label="歌詞調整">
          <button className="quick-adjust-close" aria-label="閉じる" onClick={() => setModal(null)}>×</button>
          <SlidersHorizontal size={22} /><h2>歌詞調整</h2>
          <Stepper label="歌詞Offset" value={songSettings.lyricsOffsetMs} unit="ms" onStep={(direction) => stepSetting('lyricsOffsetMs', direction)} />
          <button className="primary-button" onClick={() => setModal(null)}>完了</button>
        </div>
      )}
    </main>
  )
}

import { Circle, Mic2, Square } from 'lucide-react'

type MicrophonePanelProps = {
  devices: MediaDeviceInfo[]
  deviceId?: string
  volume: number
  recording: boolean
  elapsedSeconds: number
  onDeviceChange: (deviceId?: string) => void
  onVolumeChange: (volume: number) => void
  onToggleRecording: () => void
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function MicrophonePanel({ devices, deviceId, volume, recording, elapsedSeconds, onDeviceChange, onVolumeChange, onToggleRecording }: MicrophonePanelProps) {
  const audioInputs = devices.filter((device) => device.kind === 'audioinput')
  const percentage = Math.round(volume * 100)

  return (
    <section className={`microphone-panel ${recording ? 'recording' : ''}`} aria-labelledby="microphone-title">
      <div className="microphone-heading">
        <span><Mic2 size={19} /><strong id="microphone-title">マイク出力・録音</strong></span>
        <small>歌声のみWAV</small>
      </div>
      <div className="microphone-device-row">
        <select aria-label="録音するマイク" value={deviceId ?? ''} disabled={recording} onChange={(event) => onDeviceChange(event.target.value || undefined)}>
          <option value="">システム既定のマイク</option>
          {audioInputs.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `マイク ${index + 1}`}</option>)}
        </select>
        <button type="button" className="record-button" aria-label={recording ? '録音を停止してWAVを保存' : 'マイク録音を開始'} onClick={onToggleRecording}>
          {recording ? <Square size={15} fill="currentColor" /> : <Circle size={16} fill="currentColor" />}
          <span>{recording ? '停止・保存' : '録音'}</span>
          {recording ? <output>{formatElapsed(elapsedSeconds)}</output> : null}
        </button>
      </div>
      <div className="microphone-volume-row">
        <span>録音音量</span>
        <input
          className="range-control"
          aria-label="マイク録音音量"
          type="range"
          min="0"
          max="150"
          value={percentage}
          style={{ '--range-progress': `${Math.min(percentage / 1.5, 100)}%` } as React.CSSProperties}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
        />
        <strong>{percentage}%</strong>
      </div>
      <p>スピーカーへ返さず、マイク入力だけを録音します。</p>
    </section>
  )
}

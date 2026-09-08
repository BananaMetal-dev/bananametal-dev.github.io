import type { AppSettings } from '../types'
import { Modal } from './Controls'

type SettingsModalProps = {
  settings: AppSettings
  devices: MediaDeviceInfo[]
  outputSupported: boolean
  onChange: (settings: AppSettings) => void
  onClose: () => void
}

export function SettingsModal({ settings, devices, outputSupported, onChange, onClose }: SettingsModalProps) {
  const audioOutputs = devices.filter((device) => device.kind === 'audiooutput')
  return (
    <Modal title="出力設定" onClose={onClose}>
      {!outputSupported && <p className="warning">このブラウザでは個別出力デバイスの選択に対応していません。基本再生は利用できますが、Monitor / Streamの出力分離は利用できません。</p>}
      <div className="settings-form">
        <label>モニター出力
          <select disabled={!outputSupported} value={settings.monitorOutputDeviceId ?? ''} onChange={(event) => onChange({ ...settings, monitorOutputDeviceId: event.target.value || undefined })}>
            <option value="">システム既定</option>
            {audioOutputs.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `出力デバイス ${index + 1}`}</option>)}
          </select>
        </label>
        <label>配信出力
          <select disabled={!outputSupported} value={settings.streamOutputDeviceId ?? ''} onChange={(event) => onChange({ ...settings, streamOutputDeviceId: event.target.value || undefined })}>
            <option value="">システム既定</option>
            {audioOutputs.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `出力デバイス ${index + 1}`}</option>)}
          </select>
        </label>
        <label>モニター音量 <output>{Math.round(settings.monitorMasterVolume * 100)}%</output>
          <input type="range" min="0" max="100" value={settings.monitorMasterVolume * 100} onChange={(event) => onChange({ ...settings, monitorMasterVolume: Number(event.target.value) / 100 })} />
        </label>
        <label>配信音量 <output>{Math.round(settings.streamMasterVolume * 100)}%</output>
          <input type="range" min="0" max="100" value={settings.streamMasterVolume * 100} onChange={(event) => onChange({ ...settings, streamMasterVolume: Number(event.target.value) / 100 })} />
        </label>
      </div>
    </Modal>
  )
}

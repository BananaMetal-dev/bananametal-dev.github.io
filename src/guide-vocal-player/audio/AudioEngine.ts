import type { AppSettings, Song, SongSettings } from '../types'
import { linearGuideGains } from './mix'
import { OutputRouter } from './OutputRouter'

const GAIN_RAMP_SECONDS = 0.02
export const DURATION_WARNING_THRESHOLD_MS = 50

type PositionListener = (position: number, duration: number) => void
type EndListener = () => void

export class AudioEngine {
  private context?: AudioContext
  private onBuffer?: AudioBuffer
  private offBuffer?: AudioBuffer
  private sources: AudioBufferSourceNode[] = []
  private monitorOn?: GainNode
  private monitorOff?: GainNode
  private streamOn?: GainNode
  private streamOff?: GainNode
  private monitorMaster?: GainNode
  private streamMaster?: GainNode
  private monitorDestination?: MediaStreamAudioDestinationNode
  private streamDestination?: MediaStreamAudioDestinationNode
  private router?: OutputRouter
  private settings?: SongSettings
  private appSettings?: AppSettings
  private startedAt = 0
  private pausedAt = 0
  private frame = 0
  private playing = false
  private positionListener?: PositionListener
  private endListener?: EndListener

  get duration(): number {
    if (!this.onBuffer || !this.offBuffer) return 0
    return Math.min(this.onBuffer.duration, this.offBuffer.duration)
  }

  get isPlaying(): boolean {
    return this.playing
  }

  get position(): number {
    if (!this.playing || !this.context) return this.pausedAt
    return Math.min(this.duration, Math.max(0, this.pausedAt + this.context.currentTime - this.startedAt))
  }

  get outputSeparationSupported(): boolean {
    return this.router?.supported ?? false
  }

  onPosition(listener: PositionListener): void {
    this.positionListener = listener
  }

  onEnded(listener: EndListener): void {
    this.endListener = listener
  }

  async load(song: Song, settings: SongSettings, appSettings: AppSettings): Promise<{ durationDifferenceMs: number }> {
    await this.ensureGraph()
    this.stopSources()
    this.pausedAt = 0
    this.settings = settings
    this.appSettings = appSettings

    const [onData, offData] = await Promise.all([
      song.onVocalFile.arrayBuffer(),
      song.offVocalFile.arrayBuffer(),
    ])

    try {
      ;[this.onBuffer, this.offBuffer] = await Promise.all([
        this.context!.decodeAudioData(onData),
        this.context!.decodeAudioData(offData),
      ])
    } catch {
      throw new Error('音声ファイルを読み込めませんでした。')
    }

    this.applySongSettings(settings)
    this.applyAppSettings(appSettings)
    this.emitPosition()
    return { durationDifferenceMs: Math.abs(this.onBuffer.duration - this.offBuffer.duration) * 1000 }
  }

  async play(): Promise<void> {
    if (!this.context || !this.onBuffer || !this.offBuffer || !this.settings) {
      throw new Error('ON VocalまたはOFF Vocalファイルが設定されていません。')
    }
    if (this.playing) return
    await this.context.resume()
    await this.resumeOutputs()

    const startAt = this.context.currentTime + 0.035
    const offset = this.settings.audioOffsetMs / 1000
    const onPosition = Math.max(0, this.pausedAt + offset)
    const offPosition = Math.max(0, this.pausedAt)
    const onDelay = offset < 0 ? -offset : 0

    const onSource = this.createSource(this.onBuffer, [this.monitorOn!, this.streamOn!])
    const offSource = this.createSource(this.offBuffer, [this.monitorOff!, this.streamOff!])
    onSource.start(startAt + onDelay, Math.min(onPosition, this.onBuffer.duration))
    offSource.start(startAt, Math.min(offPosition, this.offBuffer.duration))
    this.sources = [onSource, offSource]
    this.startedAt = startAt
    this.playing = true
    this.tick()
  }

  pause(): void {
    if (!this.playing) return
    this.pausedAt = this.position
    this.stopSources()
    this.emitPosition()
  }

  async seek(position: number): Promise<void> {
    const resume = this.playing
    if (this.playing) this.pause()
    this.pausedAt = Math.min(this.duration, Math.max(0, position))
    this.emitPosition()
    if (resume) await this.play()
  }

  applySongSettings(settings: SongSettings): void {
    this.settings = settings
    const monitor = linearGuideGains(settings.monitorGuideLevel)
    const stream = linearGuideGains(settings.streamGuideLevel)
    this.ramp(this.monitorOn, monitor.on * settings.songGain)
    this.ramp(this.monitorOff, monitor.off * settings.songGain)
    this.ramp(this.streamOn, stream.on * settings.songGain)
    this.ramp(this.streamOff, stream.off * settings.songGain)
  }

  applyAppSettings(settings: AppSettings): void {
    this.appSettings = settings
    this.ramp(this.monitorMaster, settings.monitorMasterVolume)
    this.ramp(this.streamMaster, settings.streamMasterVolume)
    void this.router?.setDevice('monitor', settings.monitorOutputDeviceId)
    void this.router?.setDevice('stream', settings.streamOutputDeviceId)
  }

  async setOutputDevice(kind: 'monitor' | 'stream', deviceId?: string): Promise<void> {
    await this.router?.setDevice(kind, deviceId)
  }

  dispose(): void {
    this.stopSources()
    this.router?.dispose()
    void this.context?.close()
  }

  private async ensureGraph(): Promise<void> {
    if (this.context) return
    this.context = new AudioContext({ latencyHint: 'interactive' })
    this.monitorOn = this.context.createGain()
    this.monitorOff = this.context.createGain()
    this.streamOn = this.context.createGain()
    this.streamOff = this.context.createGain()
    this.monitorMaster = this.context.createGain()
    this.streamMaster = this.context.createGain()
    this.monitorDestination = this.context.createMediaStreamDestination()
    this.streamDestination = this.context.createMediaStreamDestination()

    this.monitorOn.connect(this.monitorMaster)
    this.monitorOff.connect(this.monitorMaster)
    this.streamOn.connect(this.streamMaster)
    this.streamOff.connect(this.streamMaster)

    this.router = new OutputRouter()
    if (this.router.supported) {
      this.monitorMaster.connect(this.monitorDestination)
      this.streamMaster.connect(this.streamDestination)
      this.router.attach('monitor', this.monitorDestination.stream)
      this.router.attach('stream', this.streamDestination.stream)
    } else {
      this.monitorMaster.connect(this.context.destination)
    }
  }

  private createSource(buffer: AudioBuffer, destinations: AudioNode[]): AudioBufferSourceNode {
    const source = this.context!.createBufferSource()
    source.buffer = buffer
    destinations.forEach((destination) => source.connect(destination))
    return source
  }

  private ramp(node: GainNode | undefined, value: number): void {
    if (!node || !this.context) return
    node.gain.cancelScheduledValues(this.context.currentTime)
    node.gain.setTargetAtTime(value, this.context.currentTime, GAIN_RAMP_SECONDS / 3)
  }

  private stopSources(): void {
    this.sources.forEach((source) => {
      try {
        source.stop()
      } catch {
        // A stopped AudioBufferSourceNode cannot be restarted; the next play creates new nodes.
      }
      source.disconnect()
    })
    this.sources = []
    this.playing = false
    cancelAnimationFrame(this.frame)
  }

  private tick = (): void => {
    if (!this.playing) return
    if (this.position >= this.duration) {
      this.pausedAt = 0
      this.stopSources()
      this.emitPosition()
      this.endListener?.()
      return
    }
    this.emitPosition()
    this.frame = requestAnimationFrame(this.tick)
  }

  private emitPosition(): void {
    this.positionListener?.(this.position, this.duration)
  }

  private async resumeOutputs(): Promise<void> {
    const elements = document.querySelectorAll<HTMLAudioElement>('audio[aria-hidden="true"]')
    await Promise.all([...elements].map((element) => element.play().catch(() => undefined)))
  }
}

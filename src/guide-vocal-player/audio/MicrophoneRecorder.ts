import { encodePcm16Wav } from './wav'

const RECORDER_PROCESSOR_NAME = 'guide-vocal-pcm-capture'
const RECORDER_WORKLET_SOURCE = `
class GuideVocalPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0]
    if (!channels || !channels.length) return true
    const mono = new Float32Array(channels[0].length)
    for (const samples of channels) {
      for (let index = 0; index < mono.length; index++) mono[index] += samples[index] / channels.length
    }
    this.port.postMessage(mono, [mono.buffer])
    return true
  }
}
registerProcessor('${RECORDER_PROCESSOR_NAME}', GuideVocalPcmCapture)
`

export type MicrophoneRecording = {
  blob: Blob
  durationSeconds: number
}

export class MicrophoneRecorder {
  private context?: AudioContext
  private stream?: MediaStream
  private source?: MediaStreamAudioSourceNode
  private inputGain?: GainNode
  private processor?: AudioWorkletNode
  private silentOutput?: GainNode
  private chunks: Float32Array[] = []
  private startedAt = 0

  get active(): boolean {
    return Boolean(this.context && this.stream)
  }

  async start(deviceId: string | undefined, gain: number): Promise<void> {
    if (this.active) return

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    })

    try {
      this.context = new AudioContext({ latencyHint: 'interactive' })
      await this.context.resume()
      const workletUrl = URL.createObjectURL(new Blob([RECORDER_WORKLET_SOURCE], { type: 'text/javascript' }))
      try {
        await this.context.audioWorklet.addModule(workletUrl)
      } finally {
        URL.revokeObjectURL(workletUrl)
      }
      this.source = this.context.createMediaStreamSource(this.stream)
      this.inputGain = this.context.createGain()
      this.inputGain.gain.value = gain
      this.processor = new AudioWorkletNode(this.context, RECORDER_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      })
      this.silentOutput = this.context.createGain()
      this.silentOutput.gain.value = 0
      this.chunks = []

      this.processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
        this.chunks.push(event.data)
      }

      this.source.connect(this.inputGain)
      this.inputGain.connect(this.processor)
      this.processor.connect(this.silentOutput)
      this.silentOutput.connect(this.context.destination)
      this.startedAt = performance.now()
    } catch (error) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = undefined
      await this.context?.close()
      this.context = undefined
      throw error
    }
  }

  setGain(value: number): void {
    if (!this.inputGain || !this.context) return
    this.inputGain.gain.setTargetAtTime(value, this.context.currentTime, 0.01)
  }

  async stop(): Promise<MicrophoneRecording> {
    if (!this.context || !this.stream || !this.startedAt) throw new Error('録音は開始されていません。')
    const durationSeconds = (performance.now() - this.startedAt) / 1000
    const sampleRate = this.context.sampleRate
    const chunks = this.chunks
    await this.release()
    if (!chunks.length) throw new Error('マイクの音声を取得できませんでした。')
    return { blob: encodePcm16Wav(chunks, sampleRate), durationSeconds }
  }

  async dispose(): Promise<void> {
    await this.release()
  }

  private async release(): Promise<void> {
    if (this.processor) this.processor.port.onmessage = null
    this.source?.disconnect()
    this.inputGain?.disconnect()
    this.processor?.disconnect()
    this.silentOutput?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    await this.context?.close().catch(() => undefined)
    this.context = undefined
    this.stream = undefined
    this.source = undefined
    this.inputGain = undefined
    this.processor = undefined
    this.silentOutput = undefined
    this.chunks = []
    this.startedAt = 0
  }
}

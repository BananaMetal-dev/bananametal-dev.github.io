import { processOffline } from "@soundtouchjs/audio-worklet";
import processorUrl from "@soundtouchjs/audio-worklet/processor?url";

export class AudioEngine {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private sourceToken = 0;
  private startedAt = 0;
  private offset = 0;
  private duration = 0;
  private playing = false;

  async decode(file: File) {
    const context = await this.ensureContext();
    const data = await file.arrayBuffer();
    return context.decodeAudioData(data);
  }

  async play(
    buffer: AudioBuffer,
    offset: number,
    volume: number,
    onEnded: () => void,
  ) {
    const context = await this.ensureContext();
    await context.resume();
    this.releaseSource();

    const token = ++this.sourceToken;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode as GainNode);
    source.playbackRate.setValueAtTime(1, context.currentTime);
    (this.gainNode as GainNode).gain.setValueAtTime(volume, context.currentTime);

    this.sourceNode = source;
    this.offset = Math.min(Math.max(offset, 0), buffer.duration);
    this.duration = buffer.duration;
    this.startedAt = context.currentTime - this.offset;
    this.playing = true;

    source.onended = () => {
      if (token !== this.sourceToken || !this.playing) return;
      this.playing = false;
      this.offset = 0;
      onEnded();
    };
    source.start(0, this.offset);
  }

  pause() {
    if (!this.playing) return this.offset;
    this.offset = this.getPosition();
    this.releaseSource();
    return this.offset;
  }

  stop() {
    this.offset = 0;
    this.releaseSource();
  }

  setVolume(volume: number) {
    if (!this.context || !this.gainNode) return;
    this.gainNode.gain.setTargetAtTime(volume, this.context.currentTime, 0.015);
  }

  getPosition() {
    if (!this.playing || !this.context) return this.offset;
    return Math.min(Math.max(this.context.currentTime - this.startedAt, 0), this.duration);
  }

  setPosition(offset: number, duration: number) {
    this.duration = Math.max(duration, 0);
    this.offset = Math.min(Math.max(offset, 0), this.duration);
  }

  async processPitch(buffer: AudioBuffer, semitones: number) {
    if (semitones === 0) return buffer;
    return processOffline({
      input: buffer,
      processorUrl,
      pitchSemitones: semitones,
      playbackRate: 1,
    });
  }

  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
    this.gainNode = null;
  }

  private async ensureContext() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: "playback" });
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
    }
    return this.context;
  }

  private releaseSource() {
    this.playing = false;
    this.sourceToken += 1;
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try {
        this.sourceNode.stop();
      } catch {
        // The node may already have ended naturally.
      }
      this.sourceNode.disconnect();
    }
    this.sourceNode = null;
  }
}

import type { LoadedTrack } from "./types";

export type CacheMode = "mobile" | "pc";

export type VariantCacheSnapshot = {
  keys: number[];
  bytes: number;
  limitBytes: number;
};

const MOBILE_ENTRY_LIMIT = 2;
const MOBILE_BYTE_LIMIT = 256 * 1024 * 1024;
const PC_ENTRY_LIMIT = 13;
const PC_BYTE_LIMIT = 1536 * 1024 * 1024;

export class TrackVariantCache {
  private trackId: string | null = null;
  private entries = new Map<number, LoadedTrack>();

  selectTrack(trackId: string | null) {
    if (trackId === this.trackId) return false;
    this.trackId = trackId;
    this.entries.clear();
    return true;
  }

  clear(trackId: string | null = null) {
    this.trackId = trackId;
    this.entries.clear();
  }

  get(trackId: string, key: number) {
    if (trackId !== this.trackId) return null;
    const entry = this.entries.get(key);
    if (!entry) return null;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  put(
    trackId: string,
    key: number,
    buffer: AudioBuffer,
    mode: CacheMode,
    activeKey: number,
  ) {
    if (trackId !== this.trackId) return null;
    const entry = { trackId, key, buffer };
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.trim(mode, activeKey);
    return entry;
  }

  setMode(mode: CacheMode, activeKey: number) {
    this.trim(mode, activeKey);
  }

  snapshot(mode: CacheMode): VariantCacheSnapshot {
    return {
      keys: [...this.entries.keys()].sort((a, b) => a - b),
      bytes: this.totalBytes(),
      limitBytes: mode === "pc" ? PC_BYTE_LIMIT : MOBILE_BYTE_LIMIT,
    };
  }

  private trim(mode: CacheMode, activeKey: number) {
    const entryLimit = mode === "pc" ? PC_ENTRY_LIMIT : MOBILE_ENTRY_LIMIT;
    const byteLimit = mode === "pc" ? PC_BYTE_LIMIT : MOBILE_BYTE_LIMIT;

    while (this.entries.size > entryLimit || this.totalBytes() > byteLimit) {
      const removableKey = this.findOldestRemovableKey(activeKey);
      if (removableKey === null) break;
      this.entries.delete(removableKey);
    }
  }

  private findOldestRemovableKey(activeKey: number) {
    for (const key of this.entries.keys()) {
      if (key !== 0 && key !== activeKey) return key;
    }
    return null;
  }

  private totalBytes() {
    let bytes = 0;
    for (const entry of this.entries.values()) {
      bytes += getAudioBufferBytes(entry.buffer);
    }
    return bytes;
  }
}

export function getAudioBufferBytes(buffer: AudioBuffer) {
  return buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
}

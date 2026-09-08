export type SongSettings = {
  monitorGuideLevel: number
  streamGuideLevel: number
  audioOffsetMs: number
  lyricsOffsetMs: number
  songGain: number
}

export type Song = {
  id: string
  title: string
  artist: string
  onVocalFile: File
  offVocalFile: File
  lyricsFile?: File
  createdAt: number
}

export type SongSummary = Pick<Song, 'id' | 'title' | 'artist' | 'createdAt'>

export type AppSettings = {
  monitorOutputDeviceId?: string
  streamOutputDeviceId?: string
  micInputDeviceId?: string
  monitorMasterVolume: number
  streamMasterVolume: number
  micInputVolume: number
}

export type LyricLine = {
  time: number
  text: string
}

export const DEFAULT_SONG_SETTINGS: SongSettings = {
  monitorGuideLevel: 0.2,
  streamGuideLevel: 0,
  audioOffsetMs: 0,
  lyricsOffsetMs: 0,
  songGain: 1,
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  monitorMasterVolume: 1,
  streamMasterVolume: 1,
  micInputVolume: 1,
}

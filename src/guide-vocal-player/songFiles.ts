const AUDIO_EXTENSION = /\.(?:wav|mp3|flac|m4a|aac|ogg)$/i
const LRC_EXTENSION = /\.lrc$/i
const ON_VOCAL_MARKER = /(?:^|[\s._\-[\]()])(?:on[\s_-]*vocal|guide(?:[\s_-]*vocal)?|with[\s_-]*vocal)(?:$|[\s._\-[\]()])/i
const OFF_VOCAL_MARKER = /(?:^|[\s._\-[\]()])(?:off[\s_-]*vocal|instrumental|inst|karaoke)(?:$|[\s._\-[\]()])/i
const ROLE_SUFFIX = /(?:[\s._-]*(?:\[(?:on[\s_-]*vocal|off[\s_-]*vocal|guide(?:[\s_-]*vocal)?|instrumental|inst|karaoke)\]|\((?:on[\s_-]*vocal|off[\s_-]*vocal|guide(?:[\s_-]*vocal)?|instrumental|inst|karaoke)\)|(?:on[\s_-]*vocal|off[\s_-]*vocal|guide(?:[\s_-]*vocal)?|instrumental|inst|karaoke)))+$/i

export type SongMetadata = {
  title: string
  artist: string
}

export type DroppedSongFiles = {
  onVocalFile?: File
  offVocalFile?: File
  lyricsFile?: File
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXTENSION.test(file.name)
}

export function isLyricsFile(file: File): boolean {
  return file.type === 'text/plain' && LRC_EXTENSION.test(file.name) || LRC_EXTENSION.test(file.name)
}

export function metadataFromFilename(filename: string): SongMetadata {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  const withoutTrackNumber = withoutExtension.replace(/^\s*\d{1,3}[\s._-]+/, '')
  const cleaned = withoutTrackNumber.replace(ROLE_SUFFIX, '').trim()
  const parts = cleaned.split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean)

  if (parts.length >= 2) {
    return {
      artist: parts[0],
      title: parts.slice(1).join(' - '),
    }
  }

  return { title: cleaned || withoutExtension, artist: '' }
}

export function arrangeDroppedFiles(files: File[]): DroppedSongFiles {
  const result: DroppedSongFiles = {}
  const unassignedAudio: File[] = []

  for (const file of files) {
    if (!result.lyricsFile && isLyricsFile(file)) {
      result.lyricsFile = file
    } else if (isAudioFile(file)) {
      if (!result.offVocalFile && OFF_VOCAL_MARKER.test(file.name)) result.offVocalFile = file
      else if (!result.onVocalFile && ON_VOCAL_MARKER.test(file.name)) result.onVocalFile = file
      else unassignedAudio.push(file)
    }
  }

  for (const file of unassignedAudio) {
    if (!result.onVocalFile) result.onVocalFile = file
    else if (!result.offVocalFile) result.offVocalFile = file
  }

  return result
}

import { describe, expect, it } from 'vitest'
import { arrangeDroppedFiles, metadataFromFilename } from './songFiles'

describe('metadataFromFilename', () => {
  it('reads conventional artist and title parts and removes the vocal suffix', () => {
    expect(metadataFromFilename('01 Artist Name - Example Song [ON Vocal].wav')).toEqual({
      artist: 'Artist Name',
      title: 'Example Song',
    })
  })

  it('keeps a filename without an artist as the title', () => {
    expect(metadataFromFilename('Example Song_inst.mp3')).toEqual({
      artist: '',
      title: 'Example Song',
    })
  })
})

describe('arrangeDroppedFiles', () => {
  it('assigns ON/OFF Vocal and LRC files by their names', () => {
    const files = [
      new File(['off'], 'Artist - Song_OFF Vocal.wav', { type: 'audio/wav' }),
      new File(['lyrics'], 'Artist - Song.lrc', { type: 'text/plain' }),
      new File(['on'], 'Artist - Song_ON Vocal.wav', { type: 'audio/wav' }),
    ]

    const arranged = arrangeDroppedFiles(files)
    expect(arranged.onVocalFile?.name).toBe('Artist - Song_ON Vocal.wav')
    expect(arranged.offVocalFile?.name).toBe('Artist - Song_OFF Vocal.wav')
    expect(arranged.lyricsFile?.name).toBe('Artist - Song.lrc')
  })
})

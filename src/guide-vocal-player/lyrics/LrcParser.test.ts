import { describe, expect, it } from 'vitest'
import { findActiveLyricIndex, parseLrc } from './LrcParser'

describe('parseLrc', () => {
  it('parses, sorts and expands timestamps', () => {
    const result = parseLrc('[00:12.30][00:14.300]同じ歌詞\n[00:09]先の歌詞')
    expect(result).toEqual([
      { time: 9, text: '先の歌詞' },
      { time: 12.3, text: '同じ歌詞' },
      { time: 14.3, text: '同じ歌詞' },
    ])
  })

  it('finds the latest elapsed lyric', () => {
    const lines = parseLrc('[00:01]A\n[00:02]B\n[00:03]C')
    expect(findActiveLyricIndex(lines, 0.5)).toBe(-1)
    expect(findActiveLyricIndex(lines, 2.4)).toBe(1)
  })
})

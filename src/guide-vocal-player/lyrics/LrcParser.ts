import type { LyricLine } from '../types'

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

export function parseLrc(source: string): LyricLine[] {
  const lines: LyricLine[] = []

  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const stamps = [...rawLine.matchAll(TIMESTAMP)]
    if (!stamps.length) continue

    const text = rawLine.replace(TIMESTAMP, '').trim()
    for (const stamp of stamps) {
      const minutes = Number(stamp[1])
      const seconds = Number(stamp[2])
      const fraction = stamp[3] ? Number(`0.${stamp[3].padEnd(3, '0')}`) : 0
      lines.push({ time: minutes * 60 + seconds + fraction, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

export function findActiveLyricIndex(lines: LyricLine[], position: number): number {
  let low = 0
  let high = lines.length - 1
  let result = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (lines[middle].time <= position) {
      result = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return result
}

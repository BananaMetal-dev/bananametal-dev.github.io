import { FileText, SlidersHorizontal } from 'lucide-react'
import { findActiveLyricIndex } from '../lyrics/LrcParser'
import type { LyricLine } from '../types'

type LyricsPanelProps = {
  lines: LyricLine[]
  position: number
  lyricsOffsetMs: number
  onLoadLyrics: () => void
  onOpenAdjustments: () => void
}

function formatLrcTime(seconds: number): string {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(2).padStart(5, '0')}`
}

export function LyricsPanel({ lines, position, lyricsOffsetMs, onLoadLyrics, onOpenAdjustments }: LyricsPanelProps) {
  const lyricPosition = position + lyricsOffsetMs / 1000
  const activeIndex = findActiveLyricIndex(lines, lyricPosition)
  const visibleLines = lines.length
    ? [activeIndex - 1, activeIndex, activeIndex + 1, activeIndex + 2]
        .filter((index) => index >= 0 && index < lines.length)
        .map((index) => ({ ...lines[index], state: index === activeIndex ? 'active' : index < activeIndex ? 'previous' : 'next' }))
    : []

  return (
    <section className="lyrics-panel" aria-labelledby="lyrics-title">
      <div className="panel-title-row">
        <h2 id="lyrics-title">歌詞</h2>
        <div className="utility-actions">
          <button type="button" onClick={onLoadLyrics}><FileText size={18} />LRC読み込み</button>
          <button type="button" onClick={onOpenAdjustments}><SlidersHorizontal size={18} />歌詞調整</button>
        </div>
      </div>
      <div className="lyrics-viewport" aria-live="polite">
        {visibleLines.length ? visibleLines.map((line) => (
          <div className={`lyric-line ${line.state}`} key={`${line.time}-${line.text}`}>
            <time>[{formatLrcTime(line.time)}]</time>
            <p>{line.text || '♪'}</p>
          </div>
        )) : (
          <div className="lyrics-empty">
            <FileText size={34} />
            <p>歌詞はまだ読み込まれていません</p>
            <span>LRCファイルを追加すると、再生位置に合わせて表示します</span>
          </div>
        )}
      </div>
      <Waveform position={position} />
    </section>
  )
}

function Waveform({ position }: { position: number }) {
  const bars = Array.from({ length: 92 }, (_, index) => {
    const wave = Math.abs(Math.sin(index * 0.72) * Math.cos(index * 0.19))
    return 3 + Math.round(wave * 30)
  })
  return (
    <div className="waveform" aria-hidden="true">
      <div className="wave-bars">
        {bars.map((height, index) => <i key={index} style={{ height, opacity: index / bars.length < 0.47 ? 1 : 0.5 }} />)}
        <span className="wave-playhead" />
      </div>
      <div className="wave-times"><span>0:00</span><span>{formatLrcTime(position).slice(0, 5)}</span><span>—:—</span></div>
    </div>
  )
}

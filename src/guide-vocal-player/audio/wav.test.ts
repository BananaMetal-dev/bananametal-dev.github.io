import { describe, expect, it } from 'vitest'
import { encodePcm16Wav } from './wav'

describe('encodePcm16Wav', () => {
  it('creates a mono 16-bit PCM WAV with the expected samples', async () => {
    const blob = encodePcm16Wav([new Float32Array([-1, 0, 1])], 48_000)
    const view = new DataView(await blob.arrayBuffer())
    const text = (offset: number, length: number) => String.fromCharCode(...Array.from({ length }, (_, index) => view.getUint8(offset + index)))

    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(50)
    expect(text(0, 4)).toBe('RIFF')
    expect(text(8, 4)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(48_000)
    expect(view.getInt16(44, true)).toBe(-32_768)
    expect(view.getInt16(46, true)).toBe(0)
    expect(view.getInt16(48, true)).toBe(32_767)
  })
})

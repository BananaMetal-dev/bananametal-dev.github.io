import { describe, expect, it } from 'vitest'
import { linearGuideGains } from './mix'

describe('linearGuideGains', () => {
  it('uses constant-sum linear gains', () => {
    expect(linearGuideGains(0.22)).toEqual({ on: 0.22, off: 0.78 })
    expect(linearGuideGains(0).on + linearGuideGains(0).off).toBe(1)
    expect(linearGuideGains(1).on + linearGuideGains(1).off).toBe(1)
  })

  it('clamps values to the supported range', () => {
    expect(linearGuideGains(-1)).toEqual({ on: 0, off: 1 })
    expect(linearGuideGains(2)).toEqual({ on: 1, off: 0 })
  })
})

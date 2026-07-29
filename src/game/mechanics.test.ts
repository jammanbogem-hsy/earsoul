import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  canCollect,
  canCompletePack,
  getCollectibleLimit,
  getReachableSizeTier,
  getSizeTier,
} from './mechanics'

describe('rolling collection progression', () => {
  it('only welcomes objects at or below the current size limit', () => {
    expect(canCollect(0.5, 0.47)).toBe(true)
    expect(canCollect(0.5, 0.48)).toBe(false)
    expect(getCollectibleLimit(1)).toBe(0.95)
  })

  it('keeps every learning object reachable without power-ups', () => {
    expect(canCompletePack(fallbackLearningPack.objects)).toBe(true)
  })

  it('uses four readable size tiers without announcing the next tier early', () => {
    expect(getSizeTier(0.22).level).toBe(1)
    expect(getSizeTier(0.62).level).toBe(2)
    expect(getSizeTier(0.96).level).toBe(3)
    expect(getSizeTier(1.42).level).toBe(4)
    expect(getReachableSizeTier(0.5).level).toBe(1)
  })
})

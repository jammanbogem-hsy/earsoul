import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  canCollect,
  canCompletePack,
  getCollectibleLimit,
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
})

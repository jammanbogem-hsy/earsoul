import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  canCollect,
  canCompletePack,
  getCollectibleLimit,
  getObjectVisualScale,
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

  it('keeps the same visual size before and after an object joins the orb', () => {
    expect(getObjectVisualScale(0.22)).toBe(0.34)
    expect(getObjectVisualScale(0.62)).toBe(0.68)
    expect(getObjectVisualScale(0.96)).toBe(1.1)
    expect(getObjectVisualScale(1.42)).toBe(1.65)
  })

  it('spreads the running items across the expanded park with a friendly start', () => {
    const distances = fallbackLearningPack.objects.map((item) =>
      Math.hypot(item.position[0], item.position[2]),
    )
    const starterItems = fallbackLearningPack.objects.filter(
      (item) => Math.hypot(item.position[0], item.position[2]) <= 3,
    )

    expect(Math.max(...distances)).toBeGreaterThan(26)
    expect(distances.every((distance) => distance < 27)).toBe(true)
    expect(starterItems).toHaveLength(3)
    expect(starterItems.every((item) => canCollect(0.5, item.size))).toBe(true)
  })
})

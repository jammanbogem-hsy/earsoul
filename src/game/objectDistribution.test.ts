import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import { getSizeTier } from './mechanics'
import {
  ACTIVE_OBJECT_TIER_COUNTS,
  createInterleavedTierSequence,
  selectActiveStageObjects,
  STAGE_OBJECT_TIER_TOTALS,
} from './objectDistribution'

describe('growth-based object distribution', () => {
  it('creates an exact, interleaved final tier mix', () => {
    const sequence = createInterleavedTierSequence([142, 105, 70, 35])
    const counts = [0, 0, 0, 0]
    sequence.forEach((tier) => {
      counts[tier] += 1
    })

    expect(counts).toEqual([142, 105, 70, 35])
    expect(new Set(sequence.slice(0, 12)).size).toBeGreaterThan(2)
  })

  it('keeps every final stage pool strictly weighted toward smaller objects', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const counts = [1, 2, 3, 4].map(
        (tier) =>
          stage.objects.filter(
            (item) => getSizeTier(item.size).level === tier,
          ).length,
      )
      expect(counts).toEqual(STAGE_OBJECT_TIER_TOTALS)
    })
  })

  it('reveals stable nested sets while preserving descending tier counts', () => {
    const objects = fallbackLearningPack.stages[0].objects
    let previousIds = new Set<string>()

    for (const tier of [1, 2, 3, 4] as const) {
      const active = selectActiveStageObjects(objects, tier)
      const counts = [1, 2, 3, 4].map(
        (itemTier) =>
          active.filter(
            (item) => getSizeTier(item.size).level === itemTier,
          ).length,
      )
      expect(counts).toEqual(ACTIVE_OBJECT_TIER_COUNTS[tier])
      expect(counts[0]).toBeGreaterThan(counts[1])
      expect(counts[1]).toBeGreaterThan(counts[2])
      expect(counts[2]).toBeGreaterThan(counts[3])
      previousIds.forEach((id) => {
        expect(active.some((item) => item.id === id)).toBe(true)
      })
      previousIds = new Set(active.map((item) => item.id))
    }
  })
})

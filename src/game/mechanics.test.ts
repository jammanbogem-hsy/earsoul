import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import { calculateBallRadius } from './session'
import {
  canCollect,
  canCompletePack,
  getCollectibleLimit,
  getObjectVisualScale,
  getReachableSizeTier,
  getSizeTier,
  getStageProgress,
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

  it('paces size levels across the three map goals', () => {
    expect(getReachableSizeTier(calculateBallRadius(5)).level).toBe(1)
    expect(getReachableSizeTier(calculateBallRadius(6)).level).toBe(2)
    expect(getReachableSizeTier(calculateBallRadius(17)).level).toBe(2)
    expect(getReachableSizeTier(calculateBallRadius(18)).level).toBe(3)
    expect(getReachableSizeTier(calculateBallRadius(35)).level).toBe(3)
    expect(getReachableSizeTier(calculateBallRadius(36)).level).toBe(4)

    const thirdStageEntryCount = fallbackLearningPack.stages
      .slice(0, 2)
      .reduce((total, stage) => total + stage.objectiveCount, 0)
    expect(thirdStageEntryCount).toBe(30)
    expect(
      getReachableSizeTier(calculateBallRadius(thirdStageEntryCount)).level,
    ).toBe(3)
  })

  it('keeps the same visual size before and after an object joins the orb', () => {
    expect(getObjectVisualScale(0.22)).toBe(0.34)
    expect(getObjectVisualScale(0.62)).toBe(0.68)
    expect(getObjectVisualScale(0.96)).toBe(1.1)
    expect(getObjectVisualScale(1.42)).toBe(1.65)
  })

  it('offers three increasingly wide maps with many optional routes', () => {
    expect(fallbackLearningPack.stages).toHaveLength(3)
    expect(fallbackLearningPack.objects).toHaveLength(192)

    fallbackLearningPack.stages.forEach((stage) => {
      expect(stage.objects).toHaveLength(64)
      expect(stage.objects.length).toBeGreaterThanOrEqual(
        stage.objectiveCount * 3,
      )
      expect(
        stage.objects.every(
          (item) =>
            Math.hypot(item.position[0], item.position[2]) <
            stage.mapSize / 2,
        ),
      ).toBe(true)
    })

    expect(fallbackLearningPack.stages.map((stage) => stage.mapSize)).toEqual([
      88, 100, 112,
    ])
  })

  it('starts each map with reachable choices near the spawn point', () => {
    let collectedCount = 0

    fallbackLearningPack.stages.forEach((stage) => {
      const radius = calculateBallRadius(collectedCount)
      const nearby = stage.objects.filter(
        (item) => Math.hypot(item.position[0], item.position[2]) < 7,
      )

      expect(nearby.length).toBeGreaterThanOrEqual(8)
      expect(nearby.some((item) => canCollect(radius, item.size))).toBe(true)
      collectedCount += stage.objectiveCount
    })
  })

  it('opens the next map at the goal while keeping extras as bonuses', () => {
    const stage = fallbackLearningPack.stages[0]
    const goalIds = stage.objects
      .slice(0, stage.objectiveCount)
      .map((item) => item.id)
    const ready = getStageProgress(
      stage.objects,
      goalIds,
      stage.objectiveCount,
    )
    const bonus = getStageProgress(
      stage.objects,
      [...goalIds, stage.objects[stage.objectiveCount].id],
      stage.objectiveCount,
    )

    expect(ready.ready).toBe(true)
    expect(ready.progress).toBe(1)
    expect(bonus.bonusCount).toBe(1)
  })
})

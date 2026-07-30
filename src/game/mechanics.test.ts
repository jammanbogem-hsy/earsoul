import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import { calculateBallRadius } from './session'
import { createWorldPhysicsLayout } from './worldPhysics'
import {
  canCollect,
  canCompletePack,
  getCollectibleLimit,
  getObjectVisualScale,
  getReachableSizeTier,
  getSizeTier,
  getStageScore,
  getStageProgress,
  isCollectionPositionClear,
  isObjectTouchingBall,
  isStageUnlocked,
} from './mechanics'

describe('rolling collection progression', () => {
  it('uses one tier rule for both the HUD and collection', () => {
    expect(canCollect(0.5, 0.45)).toBe(true)
    expect(canCollect(0.5, 0.48)).toBe(false)
    expect(getCollectibleLimit(0.5)).toBe(0.45)

    const tierTwoRadius = calculateBallRadius(6)
    expect(getReachableSizeTier(tierTwoRadius).level).toBe(2)
    expect(getCollectibleLimit(tierTwoRadius)).toBe(0.8)
    expect(canCollect(tierTwoRadius, 0.8)).toBe(true)
    expect(canCollect(tierTwoRadius, 0.82)).toBe(false)

    const tierThreeRadius = calculateBallRadius(18)
    expect(canCollect(tierThreeRadius, 1.15)).toBe(true)
    expect(canCollect(tierThreeRadius, 1.18)).toBe(false)

    expect(canCollect(calculateBallRadius(36), 1.5)).toBe(true)
  })

  it('keeps every map completable from a fresh size-one ball', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      expect(canCompletePack(stage.objects)).toBe(true)
    })
  })

  it('uses four readable size tiers without announcing the next tier early', () => {
    expect(getSizeTier(0.22).level).toBe(1)
    expect(getSizeTier(0.62).level).toBe(2)
    expect(getSizeTier(0.96).level).toBe(3)
    expect(getSizeTier(1.42).level).toBe(4)
    expect(getReachableSizeTier(0.5).level).toBe(1)
  })

  it('paces all four size levels inside each map', () => {
    expect(getReachableSizeTier(calculateBallRadius(5)).level).toBe(1)
    expect(getReachableSizeTier(calculateBallRadius(6)).level).toBe(2)
    expect(getReachableSizeTier(calculateBallRadius(17)).level).toBe(2)
    expect(getReachableSizeTier(calculateBallRadius(18)).level).toBe(3)
    expect(getReachableSizeTier(calculateBallRadius(35)).level).toBe(3)
    expect(getReachableSizeTier(calculateBallRadius(36)).level).toBe(4)

    fallbackLearningPack.stages.forEach((stage) => {
      expect(stage.tierGoals.map((goal) => goal.level)).toEqual([1, 2, 3, 4])
      expect(stage.tierGoals.map((goal) => goal.requiredCount)).toEqual([
        6, 18, 36, 44,
      ])
      expect(stage.tierGoals[3].requiredScore).toBe(stage.scoreGoal)
    })
  })

  it('keeps the same visual size before and after an object joins the orb', () => {
    expect(getObjectVisualScale(0.22)).toBe(0.34)
    expect(getObjectVisualScale(0.62)).toBe(0.68)
    expect(getObjectVisualScale(0.96)).toBe(1.1)
    expect(getObjectVisualScale(1.42)).toBe(1.65)
  })

  it('requires the ball to reach the same floor as elevated rewards', () => {
    const elevatedItem = fallbackLearningPack.stages[0].objects.find(
      (item) => item.position[1] > 3,
    )

    expect(elevatedItem).toBeDefined()
    expect(
      isObjectTouchingBall(
        {
          x: elevatedItem?.position[0] ?? 0,
          y: 0.5,
          z: elevatedItem?.position[2] ?? 0,
        },
        0.5,
        elevatedItem ?? fallbackLearningPack.stages[0].objects[0],
      ),
    ).toBe(false)
    expect(
      isObjectTouchingBall(
        {
          x: elevatedItem?.position[0] ?? 0,
          y: (elevatedItem?.position[1] ?? 0) + 0.5,
          z: elevatedItem?.position[2] ?? 0,
        },
        0.5,
        elevatedItem ?? fallbackLearningPack.stages[0].objects[0],
      ),
    ).toBe(true)
  })

  it('offers three increasingly wide maps with many optional routes', () => {
    expect(fallbackLearningPack.stages).toHaveLength(3)
    expect(fallbackLearningPack.objects).toHaveLength(768)

    fallbackLearningPack.stages.forEach((stage) => {
      expect(stage.objects).toHaveLength(256)
      expect(stage.objects.length - stage.objectiveCount).toBeGreaterThanOrEqual(
        20,
      )
      expect(
        stage.objects.every(
          (item) =>
            Math.hypot(item.position[0], item.position[2]) <
            stage.mapSize / 2,
        ),
      ).toBe(true)

      const tierCounts = [1, 2, 3, 4].map(
        (level) =>
          stage.objects.filter((item) => getSizeTier(item.size).level === level)
            .length,
      )
      expect(Math.min(...tierCounts)).toBeGreaterThanOrEqual(52)
      const templateVarietyByTier = [1, 2, 3, 4].map(
        (level) =>
          new Set(
            stage.objects
              .filter((item) => getSizeTier(item.size).level === level)
              .map((item) => item.modelId),
          ).size,
      )
      expect(Math.min(...templateVarietyByTier)).toBeGreaterThanOrEqual(5)
      expect(getStageScore(stage.objects, stage.objects.map((item) => item.id)))
        .toBeGreaterThan(stage.scoreGoal)

      const layout = createWorldPhysicsLayout(stage)
      const accessibleObjects = stage.objects.filter((item) =>
        isCollectionPositionClear(item, layout.obstacles),
      )
      expect(accessibleObjects).toHaveLength(stage.objects.length)
      expect(
        getStageScore(
          accessibleObjects,
          accessibleObjects.map((item) => item.id),
        ),
      ).toBeGreaterThan(stage.scoreGoal)
    })

    expect(fallbackLearningPack.stages.map((stage) => stage.mapSize)).toEqual([
      144, 168, 192,
    ])
  })

  it('places mixed-size rewards across every climbable hill', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const layout = createWorldPhysicsLayout(stage)
      const elevatedObjects = stage.objects.filter(
        (item) => item.position[1] > 0.2,
      )

      expect(elevatedObjects).toHaveLength(
        layout.terrainRamps.length * 4 +
          layout.elevatedPlatforms.length * 8,
      )
      expect(
        new Set(elevatedObjects.map((item) => getSizeTier(item.size).level)),
      ).toEqual(new Set([1, 2, 3, 4]))

      layout.terrainRamps.forEach((ramp) => {
        const cosine = Math.cos(ramp.rotationY)
        const sine = Math.sin(ramp.rotationY)
        const objectsOnRamp = elevatedObjects.filter((item) => {
          const offsetX = item.position[0] - ramp.x
          const offsetZ = item.position[2] - ramp.z
          const localX = offsetX * cosine - offsetZ * sine
          const localZ = offsetX * sine + offsetZ * cosine

          return (
            Math.abs(localX) <= ramp.halfWidth * 0.8 &&
            Math.abs(localZ) <= ramp.halfDepth * 0.8
          )
        })

        expect(objectsOnRamp.length).toBeGreaterThanOrEqual(4)
      })

      layout.elevatedPlatforms.forEach((platform) => {
        const objectsOnPlatform = elevatedObjects.filter(
          (item) =>
            Math.abs(item.position[0] - platform.x) <= platform.halfWidth &&
            Math.abs(item.position[2] - platform.z) <= platform.halfDepth &&
            item.position[1] > platform.y,
        )

        expect(objectsOnPlatform).toHaveLength(8)
      })

      layout.pushRewardSlots.forEach((slot) => {
        expect(
          stage.objects.some(
            (item) =>
              Math.hypot(
                item.position[0] - slot[0],
                item.position[2] - slot[2],
              ) < 0.1,
          ),
        ).toBe(true)
      })
    })
  })

  it('starts each map with reachable choices near the spawn point', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const radius = calculateBallRadius(0)
      const nearby = stage.objects.filter(
        (item) => Math.hypot(item.position[0], item.position[2]) < 7,
      )

      expect(nearby.length).toBeGreaterThanOrEqual(8)
      expect(nearby.some((item) => canCollect(radius, item.size))).toBe(true)
    })
  })

  it('uses the map score goal instead of count alone', () => {
    const stage = fallbackLearningPack.stages[0]
    const countOnlyIds = [...stage.objects]
      .sort((a, b) => a.points - b.points)
      .slice(0, stage.objectiveCount)
      .map((item) => item.id)
    const countOnly = getStageProgress(stage.objects, countOnlyIds, stage)
    const complete = getStageProgress(
      stage.objects,
      stage.objects.map((item) => item.id),
      stage,
    )

    expect(countOnly.collectedCount).toBe(stage.objectiveCount)
    expect(countOnly.stageScore).toBeLessThan(stage.scoreGoal)
    expect(countOnly.ready).toBe(false)
    expect(complete.ready).toBe(true)
    expect(complete.progress).toBe(1)
    expect(complete.completedTierLevel).toBe(4)
    expect(complete.bonusCount).toBe(212)
  })

  it('accepts the combo-awarded map score while retaining tier requirements', () => {
    const stage = fallbackLearningPack.stages[0]
    const goalCountIds = stage.objects
      .slice(0, stage.objectiveCount)
      .map((item) => item.id)
    const complete = getStageProgress(
      stage.objects,
      goalCountIds,
      stage,
      stage.scoreGoal,
    )

    expect(complete.stageScore).toBe(stage.scoreGoal)
    expect(complete.ready).toBe(true)

    const earlyCombo = getStageProgress(
      stage.objects,
      stage.objects.slice(0, 6).map((item) => item.id),
      stage,
      stage.scoreGoal,
    )
    expect(earlyCombo.ready).toBe(false)
    expect(earlyCombo.progress).toBeLessThan(1)
  })

  it('keeps the legacy count progress call compatible', () => {
    const stage = fallbackLearningPack.stages[0]
    const ids = stage.objects.slice(0, 2).map((item) => item.id)

    expect(getStageProgress(stage.objects, ids, 2).ready).toBe(true)
  })

  it('unlocks the last map only after the previous score and tier goal', () => {
    const previous = fallbackLearningPack.stages[1]
    const last = fallbackLearningPack.stages[2]
    const countOnlyIds = [...previous.objects]
      .sort((a, b) => a.points - b.points)
      .slice(0, previous.objectiveCount)
      .map((item) => item.id)
    const completeIds = previous.objects.map((item) => item.id)

    expect(
      isStageUnlocked(last, fallbackLearningPack.stages, countOnlyIds),
    ).toBe(false)
    expect(
      isStageUnlocked(
        last,
        fallbackLearningPack.stages,
        countOnlyIds,
        { [previous.id]: previous.scoreGoal },
      ),
    ).toBe(true)
    expect(
      isStageUnlocked(last, fallbackLearningPack.stages, completeIds),
    ).toBe(true)
  })
})

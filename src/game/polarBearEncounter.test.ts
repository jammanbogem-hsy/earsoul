import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  createDroppedObjectMotion,
  createPolarBearDroppedObjects,
  createRunnerDroppedObjects,
  POLAR_BEAR_DROP_COUNT,
  POLAR_BEAR_HIT_COOLDOWN_MS,
  RUNNER_DROP_COUNT,
  RUNNER_HIT_COOLDOWN_MS,
} from './polarBearEncounter'

describe('polar bear encounter', () => {
  const stage = fallbackLearningPack.stages[0]
  const attached = stage.objects.slice(0, 12)

  it('drops five unique attached objects without changing their identities', () => {
    const dropped = createPolarBearDroppedObjects(
      stage,
      attached,
      [],
      { x: 3, z: -4 },
      1,
    )

    expect(POLAR_BEAR_HIT_COOLDOWN_MS).toBe(10_000)
    expect(dropped).toHaveLength(POLAR_BEAR_DROP_COUNT)
    expect(new Set(dropped.map((item) => item.id)).size).toBe(
      POLAR_BEAR_DROP_COUNT,
    )
    expect(
      dropped.every((item) => attached.some((source) => source.id === item.id)),
    ).toBe(true)
    expect(
      dropped.every(
        (item) =>
          Math.abs(item.position[0]) < stage.mapSize / 2 - 3 &&
          Math.abs(item.position[2]) < stage.mapSize / 2 - 3,
      ),
    ).toBe(true)
  })

  it('is deterministic per hit and drops only what the player owns', () => {
    const first = createPolarBearDroppedObjects(
      stage,
      attached,
      [],
      { x: 0, z: 0 },
      4,
    )
    const repeated = createPolarBearDroppedObjects(
      stage,
      attached,
      [],
      { x: 0, z: 0 },
      4,
    )
    const scarce = createPolarBearDroppedObjects(
      stage,
      attached.slice(0, 3),
      [],
      { x: 0, z: 0 },
      5,
    )

    expect(repeated).toEqual(first)
    expect(scarce).toHaveLength(3)
  })

  it('drops exactly five objects when a running crew member hits the player', () => {
    const dropped = createRunnerDroppedObjects(
      stage,
      attached,
      [],
      { x: -2, z: 5 },
      1,
      'female-running-crew-3',
    )

    expect(RUNNER_DROP_COUNT).toBe(5)
    expect(RUNNER_HIT_COOLDOWN_MS).toBe(4_000)
    expect(dropped).toHaveLength(RUNNER_DROP_COUNT)
    expect(new Set(dropped.map((item) => item.id)).size).toBe(
      RUNNER_DROP_COUNT,
    )
  })

  it('spreads approved collision drops to both sides of the player', () => {
    const dropped = createPolarBearDroppedObjects(
      stage,
      attached,
      [],
      { x: 0, z: 0 },
      2,
      POLAR_BEAR_DROP_COUNT,
      { x: -1, z: 0 },
    )

    expect(dropped.some((item) => item.position[2] > 0.5)).toBe(true)
    expect(dropped.some((item) => item.position[2] < -0.5)).toBe(true)
  })

  it('launches every dropped object from outside the ball with gravity and spin', () => {
    const center = { x: 2, y: 0.9, z: -3, ballRadius: 0.9 }
    const dropped = createPolarBearDroppedObjects(
      stage,
      attached,
      [],
      center,
      3,
    )

    for (const item of dropped) {
      const [originX, originY, originZ] = item.dropMotion.origin
      expect(Math.hypot(originX - center.x, originZ - center.z)).toBeGreaterThan(
        center.ballRadius,
      )
      expect(originY).toBeGreaterThan(center.y)
      expect(item.dropMotion.linearVelocity[1]).toBeGreaterThan(0)
      expect(Math.hypot(...item.dropMotion.angularVelocity)).toBeGreaterThan(5)
    }
  })

  it('creates deterministic ballistic motion for the same collision', () => {
    const item = attached[0]
    const center = { x: -1, y: 1.1, z: 4, ballRadius: 1.1 }

    expect(createDroppedObjectMotion(item, center, 42)).toEqual(
      createDroppedObjectMotion(item, center, 42),
    )
  })
})

import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  createWorldPhysicsLayout,
  getActiveSpeedZone,
  getActiveSurfaceZone,
  resolveWorldPhysics,
  type WorldPhysicsLayout,
} from './worldPhysics'

const stopLayout: WorldPhysicsLayout = {
  obstacles: [
    {
      id: 'tree',
      label: '나무',
      x: 0,
      z: 0,
      radius: 0.5,
      response: 'stop',
    },
  ],
  rideableObstacles: [],
  speedZones: [],
  surfaceZones: [],
  terrainRamps: [],
}

describe('world physics', () => {
  it('builds solid scenery and speed routes for every map', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const layout = createWorldPhysicsLayout(stage)
      expect(layout.obstacles.length).toBeGreaterThan(30)
      expect(layout.speedZones.length).toBeGreaterThan(0)
      expect(layout.surfaceZones).toHaveLength(2)
      expect(layout.terrainRamps).toHaveLength(4)
      expect(
        layout.surfaceZones.every((zone) => zone.multiplier < 1),
      ).toBe(true)
      expect(layout.rideableObstacles.length).toBeGreaterThan(20)
      expect(
        layout.rideableObstacles.every(
          (obstacle) => obstacle.halfHeight <= 0.12,
        ),
      ).toBe(true)
      expect(layout.obstacles.some((obstacle) => obstacle.label.includes('나무'))).toBe(
        true,
      )
      expect(layout.obstacles.some((obstacle) => obstacle.label === '공원 의자')).toBe(
        true,
      )
    })
  })

  it('stops the ball at a solid tree instead of passing through it', () => {
    const step = resolveWorldPhysics(
      {
        startX: -2,
        startZ: 0,
        nextX: -0.8,
        nextZ: 0,
        velocityX: 5,
        velocityZ: 0,
        ballRadius: 0.5,
      },
      stopLayout,
    )

    expect(step.x).toBe(-1)
    expect(step.velocityX).toBe(0)
    expect(step.impact?.response).toBe('stop')
  })

  it('reflects forward motion when the ball hits a springy bench', () => {
    const step = resolveWorldPhysics(
      {
        startX: -2,
        startZ: 0,
        nextX: -0.8,
        nextZ: 0,
        velocityX: 5,
        velocityZ: 0,
        ballRadius: 0.5,
      },
      {
        ...stopLayout,
        obstacles: [{ ...stopLayout.obstacles[0], response: 'bounce' }],
      },
    )

    expect(step.velocityX).toBeLessThan(0)
    expect(step.impact?.response).toBe('bounce')
  })

  it('applies a speed multiplier only while crossing a marked route', () => {
    const layout: WorldPhysicsLayout = {
      obstacles: [],
      rideableObstacles: [],
      speedZones: [
        {
          id: 'route',
          label: '스피드 길',
          x: 0,
          z: 0,
          halfWidth: 3,
          halfDepth: 1,
          rotationY: 0,
          multiplier: 1.3,
        },
      ],
      surfaceZones: [],
      terrainRamps: [],
    }

    expect(getActiveSpeedZone(layout, 2, 0)?.multiplier).toBe(1.3)
    expect(getActiveSpeedZone(layout, 4, 0)).toBeUndefined()
    expect(
      resolveWorldPhysics(
        {
          startX: 2,
          startZ: 0,
          nextX: 2.1,
          nextZ: 0,
          velocityX: 4,
          velocityZ: 0,
          ballRadius: 0.5,
        },
        layout,
      ).speedMultiplier,
    ).toBe(1.3)
  })

  it('slows the ball inside grass and shallow-water surfaces', () => {
    const layout = createWorldPhysicsLayout(
      fallbackLearningPack.stages[0],
    )
    const grass = layout.surfaceZones.find(
      (zone) => zone.kind === 'grass',
    )
    const water = layout.surfaceZones.find(
      (zone) => zone.kind === 'water',
    )

    expect(grass).toBeDefined()
    expect(water).toBeDefined()
    expect(
      getActiveSurfaceZone(layout, grass?.x ?? 0, grass?.z ?? 0)?.kind,
    ).toBe('grass')
    expect(
      getActiveSurfaceZone(layout, water?.x ?? 0, water?.z ?? 0)
        ?.multiplier,
    ).toBeLessThan(grass?.multiplier ?? 1)
  })

  it('pushes a growing ball out when it starts inside scenery', () => {
    const step = resolveWorldPhysics(
      {
        startX: 0,
        startZ: 0,
        nextX: 0,
        nextZ: 0,
        velocityX: 0,
        velocityZ: 0,
        ballRadius: 1.2,
      },
      stopLayout,
    )

    expect(Number.isFinite(step.x)).toBe(true)
    expect(Math.hypot(step.x, step.z)).toBe(1.7)
  })
})

import { describe, expect, it } from 'vitest'
import {
  createRoamingPolarBearSpec,
  createRoamingPolarBearSpecs,
  createRoamingRunnerSpecs,
  getRoamingHazardCounts,
  ROAMING_POLAR_BEAR_RADIUS,
  ROAMING_POLAR_BEAR_SPEED,
  ROAMING_RUNNER_RADIUS,
  ROAMING_RUNNER_SPEEDS,
  shouldRoamingRunnerTurnOnCollision,
  stepRoamingRunner,
} from './roamingRunners'

describe('roaming running crew', () => {
  it('keeps every runner deliberately slower than the player', () => {
    expect(ROAMING_RUNNER_SPEEDS).toHaveLength(12)
    ROAMING_RUNNER_SPEEDS.forEach((speed) => {
      expect(speed).toBeGreaterThanOrEqual(0.5)
      expect(speed).toBeLessThanOrEqual(0.8)
    })
  })

  it('turns before crossing a map edge', () => {
    const result = stepRoamingRunner(
      { x: 0, z: 27.9, heading: 0 },
      0.72,
      1,
      1,
      60,
      [],
    )

    expect(result.heading).not.toBe(0)
    expect(result.z).toBeLessThanOrEqual(27.9)
    expect(Math.abs(result.x)).toBeLessThan(30 - ROAMING_RUNNER_RADIUS)
  })

  it('chooses another heading before a fixed obstacle', () => {
    const obstacle = { x: 0, z: 2, radius: 0.6 }
    const result = stepRoamingRunner(
      { x: 0, z: 0, heading: 0 },
      0.72,
      1,
      1,
      60,
      [obstacle],
    )

    expect(result.heading).not.toBe(0)
    expect(Math.hypot(result.x - obstacle.x, result.z - obstacle.z)).toBeGreaterThan(
      ROAMING_RUNNER_RADIUS + obstacle.radius,
    )
  })

  it('spawns four male and four female runners away from scenery and each other', () => {
    const obstacles = [
      { x: 14, z: 14, radius: 4 },
      { x: -14, z: -14, radius: 4 },
    ]
    const specs = createRoamingRunnerSpecs(144, obstacles)

    expect(specs.map((runner) => runner.variant)).toEqual([
      'male',
      'male',
      'male',
      'male',
      'female',
      'female',
      'female',
      'female',
    ])
    specs.forEach((runner) => {
      expect(Math.abs(runner.x)).toBeLessThan(72)
      expect(Math.abs(runner.z)).toBeLessThan(72)
      obstacles.forEach((obstacle) => {
        expect(
          Math.hypot(runner.x - obstacle.x, runner.z - obstacle.z),
        ).toBeGreaterThan(ROAMING_RUNNER_RADIUS + obstacle.radius)
      })
    })
    specs.forEach((runner, index) => {
      specs.slice(index + 1).forEach((other) => {
        expect(Math.hypot(runner.x - other.x, runner.z - other.z)).toBeGreaterThan(
          ROAMING_RUNNER_RADIUS * 2,
        )
      })
    })
  })

  it('adds four runners and a second polar bear only to the dark second map', () => {
    expect(getRoamingHazardCounts('sunny-plaza')).toEqual({
      runnerCount: 8,
      polarBearCount: 1,
    })
    expect(getRoamingHazardCounts('forest-trail')).toEqual({
      runnerCount: 12,
      polarBearCount: 2,
    })
    expect(getRoamingHazardCounts('starlight-river')).toEqual({
      runnerCount: 8,
      polarBearCount: 1,
    })

    const runners = createRoamingRunnerSpecs(168, [], 12)
    const bears = createRoamingPolarBearSpecs(
      168,
      runners.map((runner) => ({
        x: runner.x,
        z: runner.z,
        radius: ROAMING_RUNNER_RADIUS * 1.8,
      })),
      2,
    )

    expect(runners).toHaveLength(12)
    expect(runners.filter((runner) => runner.variant === 'male')).toHaveLength(6)
    expect(runners.filter((runner) => runner.variant === 'female')).toHaveLength(6)
    expect(bears).toHaveLength(2)
    expect(bears[0].id).toBe('scary-polar-bear')
    expect(bears[1].id).toBe('scary-polar-bear-2')
    expect(
      Math.hypot(bears[0].x - bears[1].x, bears[0].z - bears[1].z),
    ).toBeGreaterThan(ROAMING_POLAR_BEAR_RADIUS * 2)
  })

  it('does not turn for the player but still turns for world obstacles', () => {
    expect(shouldRoamingRunnerTurnOnCollision('player')).toBe(false)
    expect(shouldRoamingRunnerTurnOnCollision('floor')).toBe(false)
    expect(shouldRoamingRunnerTurnOnCollision('obstacle')).toBe(true)
    expect(shouldRoamingRunnerTurnOnCollision('moving-obstacle')).toBe(true)
  })

  it('spawns one slow polar bear clear of scenery', () => {
    const obstacles = [
      { x: 14, z: 14, radius: 4 },
      { x: -14, z: -14, radius: 4 },
    ]
    const bear = createRoamingPolarBearSpec(144, obstacles)

    expect(bear.id).toBe('scary-polar-bear')
    expect(bear.speed).toBe(ROAMING_POLAR_BEAR_SPEED)
    expect(bear.speed).toBeLessThan(0.5)
    obstacles.forEach((obstacle) => {
      expect(
        Math.hypot(bear.x - obstacle.x, bear.z - obstacle.z),
      ).toBeGreaterThan(ROAMING_POLAR_BEAR_RADIUS + obstacle.radius)
    })
  })
})

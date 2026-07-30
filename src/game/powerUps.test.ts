import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  activatePowerUp,
  canMagnetAttract,
  createEmptyPowerUps,
  createPowerUpPickups,
  createRadarTreasures,
  decayPowerUps,
  getPowerUpSpeedMultiplier,
  POWER_UP_CONFIG,
  selectVisibleRadarTreasures,
  stepMagnetPosition,
} from './powerUps'

describe('power-up events', () => {
  const stage = fallbackLearningPack.stages[0]

  it('places two pickups for each event inside the map', () => {
    const pickups = createPowerUpPickups(stage)

    expect(pickups).toHaveLength(6)
    expect(pickups.map((pickup) => pickup.kind).sort()).toEqual([
      'magnet',
      'magnet',
      'radar',
      'radar',
      'speed',
      'speed',
    ])
    expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(6)
    pickups.forEach((pickup) => {
      expect(Math.abs(pickup.position[0])).toBeLessThan(stage.mapSize / 2)
      expect(Math.abs(pickup.position[2])).toBeLessThan(stage.mapSize / 2)
    })
  })

  it('activates for the configured time and caps repeated pickups', () => {
    const once = activatePowerUp(createEmptyPowerUps(), 'magnet')
    const twice = activatePowerUp(once, 'magnet')

    expect(once.magnet).toBe(POWER_UP_CONFIG.magnet.durationMs)
    expect(twice.magnet).toBe(POWER_UP_CONFIG.magnet.maximumMs)
    expect(decayPowerUps(twice, 16_000).magnet).toBe(0)
  })

  it('raises only the active rolling speed by fifty percent', () => {
    const inactive = createEmptyPowerUps()
    const active = activatePowerUp(inactive, 'speed')

    expect(getPowerUpSpeedMultiplier(inactive)).toBe(1)
    expect(getPowerUpSpeedMultiplier(active)).toBe(1.5)
  })

  it('reveals at most five uncollected treasures from the current tier', () => {
    const treasures = createRadarTreasures(stage)
    const tierTwoRadius = 0.8
    const visible = selectVisibleRadarTreasures(
      treasures,
      [],
      tierTwoRadius,
    )

    expect(treasures).toHaveLength(20)
    expect(visible).toHaveLength(5)
    expect(visible.every((treasure) => treasure.size === 0.66)).toBe(true)
    expect(
      selectVisibleRadarTreasures(
        treasures,
        visible.map((treasure) => treasure.id),
        tierTwoRadius,
      ).every((treasure) => treasure.size < 0.66),
    ).toBe(true)
  })

  it('only attracts collectible items on an unobstructed nearby path', () => {
    const ball = { x: 0, y: 0.42, z: 0 }
    const item = { x: 5, y: 0, z: 0 }

    expect(canMagnetAttract(ball, 0.42, item, 0.32, [])).toBe(true)
    expect(canMagnetAttract(ball, 0.42, item, 0.66, [])).toBe(false)
    expect(
      canMagnetAttract(ball, 0.42, item, 0.32, [
        {
          id: 'wall',
          label: '벽',
          x: 2.5,
          z: 0,
          radius: 0.5,
          response: 'stop',
        },
      ]),
    ).toBe(false)
  })

  it('moves attracted items toward the ball without overshooting', () => {
    const next = stepMagnetPosition(
      { x: 5, y: 0, z: 0 },
      { x: 0, y: 0.1, z: 0 },
      1 / 60,
    )

    expect(next.x).toBeLessThan(5)
    expect(next.x).toBeGreaterThanOrEqual(0)
    expect(next.y).toBeGreaterThan(0)
  })
})

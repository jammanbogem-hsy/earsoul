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
  getPowerUpVisualScale,
  POWER_UP_CONFIG,
  POWER_UP_RESPAWN_DELAY_MS,
  POWER_UPS_PER_KIND,
  respawnPowerUpPickup,
  selectVisibleRadarTreasures,
  stepMagnetPosition,
} from './powerUps'

describe('power-up events', () => {
  const stage = fallbackLearningPack.stages[0]

  it('renders every special item thirty percent larger', () => {
    expect(getPowerUpVisualScale('radar')).toBeCloseTo(1.3)
    expect(getPowerUpVisualScale('magnet')).toBeCloseTo(0.78 * 1.3)
    expect(getPowerUpVisualScale('speed')).toBeCloseTo(0.78 * 1.3)
  })

  it('keeps three pickups for each event inside the map', () => {
    const pickups = createPowerUpPickups(stage)

    expect(pickups).toHaveLength(9)
    expect(pickups.map((pickup) => pickup.kind).sort()).toEqual([
      'magnet',
      'magnet',
      'magnet',
      'radar',
      'radar',
      'radar',
      'speed',
      'speed',
      'speed',
    ])
    expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(9)
    pickups.forEach((pickup) => {
      expect(Math.abs(pickup.position[0])).toBeLessThan(stage.mapSize / 2)
      expect(Math.abs(pickup.position[2])).toBeLessThan(stage.mapSize / 2)
    })

    pickups.forEach((pickup, index) => {
      pickups.slice(index + 1).forEach((other) => {
        const minimumDistance =
          pickup.kind === other.kind ? 12 : 6
        expect(
          Math.hypot(
            pickup.position[0] - other.position[0],
            pickup.position[2] - other.position[2],
          ),
        ).toBeGreaterThanOrEqual(minimumDistance)
      })
    })
    expect(createPowerUpPickups(stage)).toEqual(pickups)
  })

  it('respawns a collected slot elsewhere and restores its kind to three', () => {
    const initial = createPowerUpPickups(stage)
    const collected = initial.find((pickup) => pickup.kind === 'radar')!
    const now = 12_345
    const playerPosition = {
      x: collected.position[0],
      z: collected.position[2],
    }
    const respawned = respawnPowerUpPickup(
      stage,
      initial,
      collected.id,
      playerPosition,
      now,
    )
    const replacement = respawned.find(
      (pickup) =>
        pickup.kind === collected.kind && pickup.slot === collected.slot,
    )!

    expect(respawned).toHaveLength(POWER_UPS_PER_KIND * 3)
    expect(respawned.filter((pickup) => pickup.kind === 'radar')).toHaveLength(
      POWER_UPS_PER_KIND,
    )
    expect(respawned.some((pickup) => pickup.id === collected.id)).toBe(false)
    expect(replacement.generation).toBe(collected.generation + 1)
    expect(replacement.collectibleAt).toBe(
      now + POWER_UP_RESPAWN_DELAY_MS,
    )
    expect(replacement.position).not.toEqual(collected.position)
    expect(
      Math.hypot(
        replacement.position[0] - playerPosition.x,
        replacement.position[2] - playerPosition.z,
      ),
    ).toBeGreaterThanOrEqual(Math.max(14, stage.mapSize * 0.1))
  })

  it('activates for the configured time and caps repeated pickups', () => {
    const once = activatePowerUp(createEmptyPowerUps(), 'magnet')
    const twice = activatePowerUp(once, 'magnet')

    expect(once.magnet).toBe(POWER_UP_CONFIG.magnet.durationMs)
    expect(twice.magnet).toBe(POWER_UP_CONFIG.magnet.maximumMs)
    expect(decayPowerUps(twice, 16_000).magnet).toBe(0)
  })

  it('keeps the treasure radar active for thirty seconds', () => {
    const once = activatePowerUp(createEmptyPowerUps(), 'radar')
    const twice = activatePowerUp(once, 'radar')

    expect(POWER_UP_CONFIG.radar.durationMs).toBe(30_000)
    expect(once.radar).toBe(30_000)
    expect(twice.radar).toBe(45_000)
    expect(decayPowerUps(once, 29_000).radar).toBe(1_000)
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

import { describe, expect, it } from 'vitest'
import { createHazardKnockback } from './hazardImpact'

describe('hazard knockback', () => {
  it('launches the player away from the hazard to a nearby safe target', () => {
    const impact = createHazardKnockback(
      { x: 1, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: -1 },
      100,
      0.9,
      [],
      'runner',
    )

    expect(impact.directionX).toBeGreaterThan(0.9)
    expect(impact.targetX).toBeCloseTo(4.8)
    expect(impact.horizontalSpeed).toBeLessThan(8)
    expect(impact.controlLockMs).toBeLessThan(700)
  })

  it('chooses another angle when an obstacle blocks the direct path', () => {
    const impact = createHazardKnockback(
      { x: 1, z: 0 },
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      100,
      0.8,
      [{ x: 3, z: 0, radius: 1.2 }],
      'polar-bear',
    )

    expect(impact.targetX).toBeLessThan(1)
    expect(impact.horizontalSpeed).toBeGreaterThan(6)
  })

  it('keeps the target within the map edge', () => {
    const impact = createHazardKnockback(
      { x: 45, z: 0 },
      { x: 44, z: 0 },
      { x: -1, z: 0 },
      100,
      2,
      [],
      'runner',
    )

    expect(Math.abs(impact.targetX)).toBeLessThanOrEqual(44)
    expect(Math.abs(impact.targetZ)).toBeLessThanOrEqual(44)
  })
})

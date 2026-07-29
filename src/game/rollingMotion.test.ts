import { describe, expect, it } from 'vitest'
import { getRollingTopSpeed, stepRollingMotion } from './rollingMotion'

describe('rolling motion', () => {
  it('accelerates smoothly instead of teleporting to top speed', () => {
    const first = stepRollingMotion(
      { velocityX: 0, velocityZ: 0 },
      1,
      0,
      0.5,
      1 / 60,
    )

    expect(first.velocityX).toBeGreaterThan(0)
    expect(first.velocityX).toBeLessThan(getRollingTopSpeed(0.5))
    expect(first.distance).toBeGreaterThan(0)
  })

  it('keeps momentum briefly and slows down without input', () => {
    const slowing = stepRollingMotion(
      { velocityX: 3, velocityZ: 0 },
      0,
      0,
      0.7,
      1 / 60,
    )

    expect(slowing.velocityX).toBeGreaterThan(0)
    expect(slowing.velocityX).toBeLessThan(3)
  })

  it('caps long frames so returning to the tab cannot jump the player', () => {
    const longFrame = stepRollingMotion(
      { velocityX: 0, velocityZ: 0 },
      1,
      0,
      0.5,
      2,
    )

    expect(longFrame.distance).toBeLessThan(0.2)
  })

  it('slows larger learning stars while keeping them controllable', () => {
    expect(getRollingTopSpeed(2)).toBeLessThan(getRollingTopSpeed(0.5))
    expect(getRollingTopSpeed(20)).toBe(3.2)
  })
})

import { describe, expect, it } from 'vitest'
import {
  getCappedRollingSpeedMultiplier,
  getRollingTopSpeed,
  MAX_COMPOSITE_ROLLING_SPEED,
  stepRollingMotion,
} from './rollingMotion'

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

  it('gently increases speed as the ball grows and caps both ends', () => {
    expect(getRollingTopSpeed(0.1)).toBe(4.85)
    expect(getRollingTopSpeed(0.42)).toBe(4.85)
    expect(getRollingTopSpeed(0.9)).toBeGreaterThan(
      getRollingTopSpeed(0.42),
    )
    expect(getRollingTopSpeed(2.08)).toBe(5.65)
    expect(getRollingTopSpeed(20)).toBe(5.65)
  })

  it('caps combined roads and power-up boosts at a controllable speed', () => {
    const radius = 2.08
    const multiplier = getCappedRollingSpeedMultiplier(radius, 2.2)

    expect(getRollingTopSpeed(radius) * multiplier).toBeCloseTo(
      MAX_COMPOSITE_ROLLING_SPEED,
    )
    expect(getCappedRollingSpeedMultiplier(radius, 1.1)).toBe(1.1)
  })

  it('keeps momentum longer and turns more slowly on a slick surface', () => {
    const current = { velocityX: 4.6, velocityZ: 0 }
    const normalCoast = stepRollingMotion(current, 0, 0, 0.9, 1 / 30)
    const slickCoast = stepRollingMotion(
      current,
      0,
      0,
      0.9,
      1 / 30,
      0.1,
    )
    const normalTurn = stepRollingMotion(current, 0, -1, 0.9, 1 / 30)
    const slickTurn = stepRollingMotion(
      current,
      0,
      -1,
      0.9,
      1 / 30,
      0.1,
    )

    expect(slickCoast.speed).toBeGreaterThan(normalCoast.speed)
    expect(Math.abs(slickTurn.velocityX)).toBeGreaterThan(
      Math.abs(normalTurn.velocityX),
    )
    expect(Math.abs(slickTurn.velocityZ)).toBeLessThan(
      Math.abs(normalTurn.velocityZ),
    )
  })

  it('holds a long high-speed drift and braking distance on deep ice', () => {
    let normal = { velocityX: 4.6, velocityZ: 0 }
    let ice = { velocityX: 4.6, velocityZ: 0 }

    for (let frame = 0; frame < 30; frame += 1) {
      normal = stepRollingMotion(normal, 0, -1, 0.9, 1 / 30)
      ice = stepRollingMotion(ice, 0, -1, 0.9, 1 / 30, 0.04)
    }

    expect(Math.abs(ice.velocityX)).toBeGreaterThan(2.5)
    expect(Math.abs(ice.velocityZ)).toBeLessThan(
      Math.abs(normal.velocityZ) * 0.8,
    )

    const speedBeforeCoast = Math.hypot(ice.velocityX, ice.velocityZ)
    for (let frame = 0; frame < 60; frame += 1) {
      ice = stepRollingMotion(ice, 0, 0, 0.9, 1 / 30, 0.04)
    }

    expect(Math.hypot(ice.velocityX, ice.velocityZ)).toBeGreaterThan(
      speedBeforeCoast * 0.7,
    )
  })
})

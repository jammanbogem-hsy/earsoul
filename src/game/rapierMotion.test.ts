import { describe, expect, it } from 'vitest'
import {
  capRapierHorizontalVelocity,
  getRapierDriveForce,
} from './rapierMotion'
import { getRollingTopSpeed } from './rollingMotion'

describe('Rapier rolling motion', () => {
  it('turns relative input into a mass-aware continuous force', () => {
    const light = getRapierDriveForce(1, 0, 1)
    const heavy = getRapierDriveForce(1, 0, 3)

    expect(light.x).toBeGreaterThan(0)
    expect(light.z).toBe(0)
    expect(heavy.x).toBeCloseTo(light.x * 3)
  })

  it('raises both drive force and top speed inside a boost zone', () => {
    const normalForce = getRapierDriveForce(0, -1, 2)
    const boostForce = getRapierDriveForce(0, -1, 2, 1.3)
    const capped = capRapierHorizontalVelocity(12, 0, 0.52, 1.3)

    expect(Math.abs(boostForce.z)).toBeGreaterThan(Math.abs(normalForce.z))
    expect(Math.hypot(capped.x, capped.z)).toBeCloseTo(
      getRollingTopSpeed(0.52) * 1.3,
    )
  })

  it('keeps a velocity unchanged while it is under the physical speed cap', () => {
    expect(capRapierHorizontalVelocity(2, -1, 0.52)).toEqual({
      x: 2,
      z: -1,
    })
  })
})

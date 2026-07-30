import { describe, expect, it } from 'vitest'
import {
  getPlayerColliderRadius,
  getPlayerSpawnTranslation,
  preservePlayerFootHeightWhileGrowing,
} from './playerPhysics'

describe('player growth physics', () => {
  it('keeps the configured spawn independent from later ball sizes', () => {
    expect(getPlayerSpawnTranslation()).toEqual([0, 0.44, 0])
    expect(getPlayerSpawnTranslation(18, -27)).toEqual([18, 0.44, -27])
  })

  it('resizes the existing collider without shrinking below the start size', () => {
    expect(getPlayerColliderRadius(0.2)).toBe(0.42)
    expect(getPlayerColliderRadius(0.88)).toBe(0.88)
  })

  it('keeps the ball foot height and horizontal position while growing', () => {
    expect(
      preservePlayerFootHeightWhileGrowing(
        { x: -12, y: 4.1, z: 17 },
        0.7,
        1.2,
      ),
    ).toEqual({ x: -12, y: 4.6, z: 17 })
  })
})

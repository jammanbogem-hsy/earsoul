import { describe, expect, it } from 'vitest'
import {
  getPlayerSpawnTranslation,
  preservePlayerTranslationWhileGrowing,
} from './playerPhysics'

describe('player growth physics', () => {
  it('keeps the configured spawn independent from later ball sizes', () => {
    expect(getPlayerSpawnTranslation()).toEqual([0, 0.44, 0])
    expect(getPlayerSpawnTranslation(18, -27)).toEqual([18, 0.44, -27])
  })

  it('preserves the current map position while raising a growing ball', () => {
    expect(
      preservePlayerTranslationWhileGrowing(
        { x: 24.5, y: 0.44, z: -31.25 },
        0.7,
      ),
    ).toEqual({ x: 24.5, y: 0.72, z: -31.25 })
  })

  it('does not pull a growing ball down from an upper floor', () => {
    expect(
      preservePlayerTranslationWhileGrowing(
        { x: -12, y: 4.1, z: 17 },
        1.2,
      ),
    ).toEqual({ x: -12, y: 4.1, z: 17 })
  })
})

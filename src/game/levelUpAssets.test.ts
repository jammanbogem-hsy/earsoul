import { describe, expect, it } from 'vitest'
import {
  getAssetBackedLevelUpModelId,
  getLegacyLevelUpAssetReplacement,
  getLevelUpBadgeHeightMultiplier,
  isAssetBackedLevelUpModelId,
} from './levelUpAssets'

describe('legacy level-up asset replacement', () => {
  it('replaces old procedural model ids with GLB-backed models by tier', () => {
    const examples = [
      ['wristwatch', 0.65, 'level2-digital-watch'],
      ['skateboard', 0.93, 'level3-inline-skates'],
      ['giant-headphones', 1.37, 'level4-noise-canceling-headset'],
    ] as const

    examples.forEach(([legacyModelId, size, expectedModelId], index) => {
      const item = {
        id: `legacy-${index}`,
        size,
        modelId: legacyModelId,
      }

      expect(getAssetBackedLevelUpModelId(item)).toBe(expectedModelId)
      expect(
        isAssetBackedLevelUpModelId(getAssetBackedLevelUpModelId(item)),
      ).toBe(true)
      expect(getLegacyLevelUpAssetReplacement(item)).toBeDefined()
    })
  })

  it('keeps current GLB-backed model ids unchanged', () => {
    const item = {
      id: 'current-watch',
      size: 0.77,
      modelId: 'level2-digital-watch',
    }

    expect(getAssetBackedLevelUpModelId(item)).toBe('level2-digital-watch')
    expect(getLegacyLevelUpAssetReplacement(item)).toBeUndefined()

    expect(
      getAssetBackedLevelUpModelId({
        id: 'current-shiba',
        size: 1.04,
        modelId: 'level3-shiba-inu',
      }),
    ).toBe('level3-shiba-inu')
  })

  it('places low, wide vehicle labels close to their roofs', () => {
    expect(
      getLevelUpBadgeHeightMultiplier({
        id: 'car',
        size: 1.61,
        modelId: 'level4-car',
      }),
    ).toBe(0.82)
    expect(
      getLevelUpBadgeHeightMultiplier({
        id: 'luxury-car',
        size: 2.15,
        modelId: 'level4-luxury-car',
      }),
    ).toBe(0.9)
    expect(
      getLevelUpBadgeHeightMultiplier({
        id: 'luxury-car-2',
        size: 2.2,
        modelId: 'level4-luxury-car-2',
      }),
    ).toBe(1.05)
    expect(
      getLevelUpBadgeHeightMultiplier({
        id: 'lotte-tower',
        size: 1.8,
        modelId: 'level4-lotte-tower',
      }),
    ).toBe(1.35)
  })
})

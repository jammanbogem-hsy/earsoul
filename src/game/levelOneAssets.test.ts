import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import { getSizeTier } from './mechanics'
import {
  getLevelOneAssetLabel,
  getLevelOneAssetVariant,
  LEVEL_ONE_ASSET_VARIANTS,
} from './levelOneAssets'
import { isStructuredCollectibleModelId } from './structuredCollectibleAssets'

describe('level-one asset variants', () => {
  it('keeps each item on a stable variant and matching label', () => {
    const itemIds = Array.from(
      { length: 100 },
      (_, index) => `sunny-start-item-${index + 1}`,
    )

    itemIds.forEach((itemId) => {
      const variant = getLevelOneAssetVariant(itemId)
      const label = getLevelOneAssetLabel(itemId)
      const expectedLabels = {
        'red-lego': '레고',
        'green-lego': '레고',
        'yellow-lego': '레고',
        water: '생수',
        candy: '막대사탕',
        'orange-juice': '오렌지 주스',
        'phantom-keyring': '팬텀 키링',
      } as const

      expect(getLevelOneAssetVariant(itemId)).toBe(variant)
      expect(label).toBe(expectedLabels[variant])
    })
  })

  it('distributes generated item ids across all seven variants', () => {
    const variants = new Set(
      Array.from({ length: 100 }, (_, index) =>
        getLevelOneAssetVariant(`sunny-start-item-${index + 1}`),
      ),
    )

    expect(variants).toEqual(new Set(LEVEL_ONE_ASSET_VARIANTS))
  })

  it('assigns matching display names to fallback level-one items', () => {
    const items = fallbackLearningPack.stages.flatMap((stage) =>
      stage.objects.filter(
        (item) =>
          getSizeTier(item.size).level === 1 &&
          !isStructuredCollectibleModelId(item.modelId),
      ),
    )

    items.forEach((item) => {
      expect(item.label).toBe(getLevelOneAssetLabel(item.id))
    })
    expect(new Set(items.map((item) => item.label))).toEqual(
      new Set(['레고', '생수', '막대사탕', '오렌지 주스', '팬텀 키링']),
    )
  })
})

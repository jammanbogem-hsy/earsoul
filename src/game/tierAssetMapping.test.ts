import { describe, expect, it } from 'vitest'
import {
  ASSET_BACKED_LEVEL_UP_MODEL_IDS,
  fallbackLearningPack,
  OBJECTS_PER_STAGE,
} from '../data/learningPack'
import { getSizeTier } from './mechanics'
import { isStructuredCollectibleModelId } from './structuredCollectibleAssets'

const EXPECTED_TIER_ASSETS = [
  ['level2-headset', '헤드셋', 2],
  ['level2-note', '노트', 2],
  ['level2-running-shoe', '러닝화', 2],
  ['level2-digital-watch', '전자시계', 2],
  ['hydration-pack', '찰랑 러닝 가방', 2],
  ['level2-cat-doll', '고양이 인형', 2],
  ['level2-bera-ice-cream', '베라 아이스크림', 2],
  ['level2-energy-drink', '에너지드링크', 2],
  ['level2-taekwondo-uniform', '태권도복', 2],
  ['crew-medal', '함께 달린 메달', 3],
  ['level3-athlete-running-shoe', '선수 러닝화', 3],
  ['level3-raccoon', '너구리', 3],
  ['level3-inline-skates', '인라인스케이트', 3],
  ['level3-running-vest', '러닝 조끼', 3],
  ['level3-soda-cooler', '탄산음료 아이스박스', 3],
  ['level3-cat', '고양이', 3],
  ['level3-shiba-inu', '시바견', 3],
  ['level4-car', '차', 4],
  ['level4-noise-canceling-headset', '노이즈 캔슬링 헤드셋', 4],
  ['level4-luxury-car', '대형 고급차', 4],
  ['level4-luxury-car-2', '대형 고급차 2', 4],
  ['level4-drink-vending-machine', '음료 자판기', 4],
  ['level4-lotte-tower', '롯데타워', 4],
] as const

describe('tier asset mapping', () => {
  it('fills every map only with GLB-backed level-up collectibles', () => {
    const assetModelIds = new Set<string>(ASSET_BACKED_LEVEL_UP_MODEL_IDS)

    fallbackLearningPack.stages.forEach((stage) => {
      expect(stage.objects).toHaveLength(OBJECTS_PER_STAGE)
      expect(OBJECTS_PER_STAGE).toBeGreaterThanOrEqual(360)
      expect(
        stage.objects.every(
          (item) =>
            getSizeTier(item.size).level === 1 ||
            assetModelIds.has(item.modelId ?? item.id) ||
            isStructuredCollectibleModelId(item.modelId),
        ),
      ).toBe(true)
    })
  })

  it('keeps every imported model in its requested tier with its mapped name', () => {
    EXPECTED_TIER_ASSETS.forEach(([modelId, label, level]) => {
      const matches = fallbackLearningPack.objects.filter(
        (item) => item.modelId === modelId,
      )

      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every((item) => item.label === label)).toBe(true)
      expect(matches.every((item) => getSizeTier(item.size).level === level)).toBe(
        true,
      )
    })
  })

  it('distributes every new imported model into each stage', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const modelIds = new Set(stage.objects.map((item) => item.modelId))
      EXPECTED_TIER_ASSETS.forEach(([modelId]) => {
        expect(modelIds.has(modelId)).toBe(true)
      })
    })
  })
})

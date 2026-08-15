import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import { getSizeTier } from './mechanics'
import {
  getStructuredCollectibleAsset,
  STRUCTURED_COLLECTIBLE_ASSETS,
} from './structuredCollectibleAssets'

describe('structured collectible assets', () => {
  it('derives the requested level and Korean label from every filename', () => {
    expect(STRUCTURED_COLLECTIBLE_ASSETS).toHaveLength(32)
    expect(
      STRUCTURED_COLLECTIBLE_ASSETS.filter((asset) => asset.sourceLevel === 1),
    ).toHaveLength(7)
    expect(
      STRUCTURED_COLLECTIBLE_ASSETS.filter((asset) => asset.sourceLevel === 2),
    ).toHaveLength(6)
    expect(
      STRUCTURED_COLLECTIBLE_ASSETS.filter((asset) => asset.sourceLevel === 3),
    ).toHaveLength(9)
    expect(
      STRUCTURED_COLLECTIBLE_ASSETS.filter((asset) => asset.sourceLevel === 4),
    ).toHaveLength(8)
    expect(
      STRUCTURED_COLLECTIBLE_ASSETS.filter((asset) => asset.sourceLevel === 5),
    ).toHaveLength(2)
    expect(
      STRUCTURED_COLLECTIBLE_ASSETS.every(
        (asset) =>
          asset.label.length > 0 &&
          !asset.label.startsWith('레벨') &&
          asset.url.length > 0,
      ),
    ).toBe(true)
  })

  it('keeps levels one to four and places level five planets in the final tier', () => {
    const earth = STRUCTURED_COLLECTIBLE_ASSETS.find(
      (asset) => asset.label === '지구',
    )!
    const saturn = STRUCTURED_COLLECTIBLE_ASSETS.find(
      (asset) => asset.label === '토성',
    )!

    expect(earth.sourceLevel).toBe(5)
    expect(earth.level).toBe(4)
    expect(saturn.sourceLevel).toBe(5)
    expect(saturn.level).toBe(4)
    expect(getStructuredCollectibleAsset(earth.modelId)).toEqual(earth)
  })

  it('distributes every structured asset into every map with its mapped name', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      STRUCTURED_COLLECTIBLE_ASSETS.forEach((asset) => {
        const matches = stage.objects.filter(
          (item) => item.modelId === asset.modelId,
        )

        expect(matches.length).toBeGreaterThan(0)
        expect(matches.every((item) => item.label === asset.label)).toBe(true)
        expect(
          matches.every(
            (item) => getSizeTier(item.size).level === asset.level,
          ),
        ).toBe(true)
      })
    })
  })
})

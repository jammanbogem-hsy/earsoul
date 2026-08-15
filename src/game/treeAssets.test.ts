import { describe, expect, it } from 'vitest'
import {
  getTreeAssetVariation,
  TREE_ASSET_VARIANTS,
} from './treeAssets'

describe('tree asset variations', () => {
  it('keeps each tree on a stable model, rotation, and scale', () => {
    const first = getTreeAssetVariation('edge-tree-12')

    expect(getTreeAssetVariation('edge-tree-12')).toEqual(first)
    expect(first.rotationY).toBeGreaterThanOrEqual(0)
    expect(first.rotationY).toBeLessThanOrEqual(Math.PI * 2)
    expect(first.scaleMultiplier).toBeGreaterThanOrEqual(0.9)
    expect(first.scaleMultiplier).toBeLessThanOrEqual(1.1)
  })

  it('distributes ordinary map trees across all three models', () => {
    const variants = new Set(
      Array.from({ length: 70 }, (_, index) =>
        getTreeAssetVariation(`edge-tree-${index}`).variant,
      ),
    )

    expect(variants).toEqual(new Set(TREE_ASSET_VARIANTS))
  })
})

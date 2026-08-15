import { describe, expect, it } from 'vitest'
import {
  getRecommendedRenderQuality,
  selectNearbyObjects,
} from './renderQuality'

describe('render quality', () => {
  it('uses the lightweight profile on ChromeOS', () => {
    const quality = getRecommendedRenderQuality({
      userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 15917.71.0)',
      hardwareConcurrency: 8,
      deviceMemory: 8,
    })

    expect(quality.lowPower).toBe(true)
    expect(quality.shadows).toBe(false)
    expect(quality.dpr[1]).toBe(1)
    expect(quality.attachedObjectLimit).toBe(48)
  })

  it('keeps full quality on a capable desktop', () => {
    const quality = getRecommendedRenderQuality({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      hardwareConcurrency: 10,
      deviceMemory: 8,
    })

    expect(quality.lowPower).toBe(false)
    expect(quality.shadows).toBe(true)
    expect(quality.objectRenderDistance).toBe(Number.POSITIVE_INFINITY)
  })

  it('keeps only nearby scene objects in the lightweight profile', () => {
    const objects = [
      { position: [3, 0, 4] as [number, number, number] },
      { position: [30, 0, 40] as [number, number, number] },
      { position: [60, 0, 0] as [number, number, number] },
    ]

    expect(selectNearbyObjects(objects, [0, 0], 54)).toEqual(
      objects.slice(0, 2),
    )
    expect(
      selectNearbyObjects(objects, [0, 0], Number.POSITIVE_INFINITY),
    ).toBe(objects)
  })
})

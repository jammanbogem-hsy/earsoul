import { describe, expect, it } from 'vitest'
import { createWorldPhysicsLayout } from './worldPhysics'
import {
  createTerrainDensityContext,
  createTerrainTrails,
  distanceToTrail,
  getOutsideDistance,
  getOuterTerrainHeight,
  getZoneDistance,
  scatterGrassTufts,
  scatterOuterBand,
  valueNoise2D,
} from './terrainArt'
import type { StageTheme } from '../types'

const STAGES: { theme: StageTheme; mapSize: number }[] = [
  { theme: 'sunny-plaza', mapSize: 144 },
  { theme: 'forest-trail', mapSize: 168 },
  { theme: 'starlight-river', mapSize: 192 },
]

describe('terrain art', () => {
  it('produces smooth, bounded noise', () => {
    for (let index = 0; index < 200; index += 1) {
      const value = valueNoise2D(index * 0.37, index * 0.91, 5)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
    expect(Math.abs(valueNoise2D(3.5, 2.5) - valueNoise2D(3.501, 2.5))).toBeLessThan(0.01)
  })

  it.each(STAGES)('keeps $theme trails inside the play area and organic', ({ theme, mapSize }) => {
    const trails = createTerrainTrails(mapSize, theme)
    expect(trails.length).toBeGreaterThan(1)
    for (const trail of trails) {
      for (const [x, z] of trail.points) {
        expect(Math.abs(x)).toBeLessThan(mapSize / 2)
        expect(Math.abs(z)).toBeLessThan(mapSize / 2)
      }
      expect(distanceToTrail(trail.points[3][0], trail.points[3][1], trail)).toBeCloseTo(0)
    }
  })

  it.each(STAGES)('scatters $theme grass deterministically away from water, ice and trails', ({ theme, mapSize }) => {
    const layout = createWorldPhysicsLayout({ theme, mapSize })
    const context = createTerrainDensityContext(mapSize, theme, layout)
    const tufts = scatterGrassTufts(context, 1500, 42)

    expect(scatterGrassTufts(context, 1500, 42)).toEqual(tufts)
    expect(tufts.length).toBeGreaterThan(600)
    for (const tuft of tufts) {
      for (const zone of layout.surfaceZones) {
        if (zone.kind === 'grass') continue
        expect(getZoneDistance(tuft.x, tuft.z, zone)).toBeGreaterThanOrEqual(1.08)
      }
      for (const trail of context.trails) {
        expect(distanceToTrail(tuft.x, tuft.z, trail)).toBeGreaterThanOrEqual(trail.width * 0.62)
      }
    }
  })

  it('keeps the outer landscape flat beside the boundary and hilly further out', () => {
    expect(getOuterTerrainHeight(0, 0, 144)).toBeLessThan(0)
    expect(Math.abs(getOuterTerrainHeight(73, 0, 144))).toBeLessThan(0.1)
    expect(getOuterTerrainHeight(72 + 45, 10, 144)).toBeGreaterThan(2.5)
  })

  it('places outer props only beyond the walls', () => {
    const specs = scatterOuterBand(144, 9, 40, 4, () => 1, 7)
    expect(specs.length).toBeGreaterThan(100)
    for (const spec of specs) {
      expect(getOutsideDistance(spec.x, spec.z, 144)).toBeGreaterThanOrEqual(9)
    }
  })
})

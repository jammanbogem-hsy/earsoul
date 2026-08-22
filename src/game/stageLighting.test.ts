import { describe, expect, it } from 'vitest'
import { getStageLightingProfile } from './stageLighting'

describe('stage lighting', () => {
  it('expands the dark forest visibility as collection progress grows', () => {
    const dark = getStageLightingProfile('forest-trail', 0)
    const middle = getStageLightingProfile('forest-trail', 0.5)
    const bright = getStageLightingProfile('forest-trail', 1)

    expect(dark.lightPercent).toBe(0)
    expect(middle.lightPercent).toBe(50)
    expect(bright.lightPercent).toBe(100)
    expect(dark.ballLightIntensity).toBeLessThan(middle.ballLightIntensity)
    expect(middle.ballLightIntensity).toBeLessThan(bright.ballLightIntensity)
    expect(dark.ballLightDistance).toBeLessThan(middle.ballLightDistance)
    expect(middle.fogFarRatio).toBeLessThan(bright.fogFarRatio)
    expect(dark.ambientIntensity).toBeLessThan(bright.ambientIntensity)
  })

  it('clamps invalid or excessive progress safely', () => {
    expect(getStageLightingProfile('forest-trail', -2).lightPercent).toBe(0)
    expect(getStageLightingProfile('forest-trail', Number.NaN).lightPercent).toBe(0)
    expect(getStageLightingProfile('forest-trail', 3).lightPercent).toBe(100)
  })

  it('does not add a ball lantern to the bright maps', () => {
    expect(getStageLightingProfile('sunny-plaza', 0.2).ballLightIntensity).toBe(0)
    expect(getStageLightingProfile('starlight-river', 0.8).ballLightIntensity).toBe(0)
  })
})

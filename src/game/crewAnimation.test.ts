import { AnimationClip, VectorKeyframeTrack } from 'three'
import { describe, expect, it } from 'vitest'
import {
  makeInPlaceRunClip,
  makeRootTranslationInPlaceClip,
} from './crewAnimation'

describe('crew animation', () => {
  it('removes baked forward travel without changing lateral motion or bobbing', () => {
    const standClip = new AnimationClip('stand', 1, [
      new VectorKeyframeTrack(
        'Hip.position',
        [0, 1],
        [0, -0.05, 0.42, 0, -0.05, 0.43],
      ),
    ])
    const sourceRunClip = new AnimationClip('run', 1, [
      new VectorKeyframeTrack(
        'Hip.position',
        [0, 0.5, 1],
        [
          -0.02, -0.62, 0.34,
          -0.04, -2.1, 0.38,
          -0.02, -3.77, 0.35,
        ],
      ),
    ])

    const inPlaceClip = makeInPlaceRunClip(sourceRunClip, standClip)
    const values = Array.from(inPlaceClip.tracks[0].values)
    const expectedInPlaceValues = [
      -0.02, -0.05, 0.34,
      -0.04, -0.05, 0.38,
      -0.02, -0.05, 0.35,
    ]
    const expectedSourceValues = [
      -0.02, -0.62, 0.34,
      -0.04, -2.1, 0.38,
      -0.02, -3.77, 0.35,
    ]

    values.forEach((value, index) => {
      expect(value).toBeCloseTo(expectedInPlaceValues[index])
    })
    Array.from(sourceRunClip.tracks[0].values).forEach((value, index) => {
      expect(value).toBeCloseTo(expectedSourceValues[index])
    })
  })

  it('keeps a roaming runner at its collider across an animation loop', () => {
    const sourceRunClip = new AnimationClip('NlaTrack', 1.292, [
      new VectorKeyframeTrack(
        'Hip.position',
        [0, 0.646, 1.292],
        [
          -0.0198, -0.4976, 0.3913,
          -0.0341, -1.9482, 0.4251,
          -0.0184, -3.4194, 0.3983,
        ],
      ),
    ])

    const inPlaceClip = makeInPlaceRunClip(sourceRunClip)
    const values = Array.from(inPlaceClip.tracks[0].values)
    const forwardValues = values.filter((_, index) => index % 3 === 1)

    expect(forwardValues).toHaveLength(3)
    forwardValues.forEach((value) => expect(value).toBeCloseTo(-0.4976))
    expect(forwardValues.at(-1)).toBeCloseTo(forwardValues[0])
    expect(sourceRunClip.tracks[0].values[7]).toBeCloseTo(-3.4194)
  })

  it('keeps the polar bear root centered on its moving collider', () => {
    const sourceClip = new AnimationClip('NlaTrack', 1, [
      new VectorKeyframeTrack(
        'tripo::Root.position',
        [0, 0.5, 1],
        [0.1, 0.2, 0.3, 1.2, 0.4, -0.8, 2.4, 0.1, -1.6],
      ),
    ])

    const inPlaceClip = makeRootTranslationInPlaceClip(sourceClip)

    const inPlaceValues = Array.from(inPlaceClip.tracks[0].values)
    const expectedInPlaceValues = [
      0.1, 0.2, 0.3,
      0.1, 0.2, 0.3,
      0.1, 0.2, 0.3,
    ]
    const sourceValues = Array.from(sourceClip.tracks[0].values)
    const expectedSourceValues = [
      0.1, 0.2, 0.3,
      1.2, 0.4, -0.8,
      2.4, 0.1, -1.6,
    ]

    inPlaceValues.forEach((value, index) => {
      expect(value).toBeCloseTo(expectedInPlaceValues[index])
    })
    sourceValues.forEach((value, index) => {
      expect(value).toBeCloseTo(expectedSourceValues[index])
    })
  })
})

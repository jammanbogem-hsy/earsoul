import { describe, expect, it } from 'vitest'
import type { LearningObject } from '../types'
import {
  ARCHITECTURE_ATTACHED_SCALE_MULTIPLIERS,
  ARCHITECTURE_WORLD_SCALE_MULTIPLIERS,
  getArchitectureCameraDistanceOffset,
  getArchitectureCameraFramingLift,
  getArchitectureCameraMinimumDistance,
  getArchitectureScaleClass,
  getAttachedObjectVisualScale,
  getTierFourCameraDistanceOffset,
  getWorldObjectVisualScale,
  MAX_TIER_FOUR_CAMERA_DISTANCE_OFFSET,
} from './collectibleScale'

function createItem(
  label: string,
  size = 1.6,
  modelId?: string,
): LearningObject {
  return {
    id: label,
    label,
    modelId,
    fact: '',
    subject: '생활',
    size,
    points: 1,
    color: '#fff',
    shape: 'box',
    position: [0, 0, 0],
  }
}

describe('attached collectible scale', () => {
  it('classifies buildings without treating vehicles or vending machines as architecture', () => {
    expect(getArchitectureScaleClass(createItem('63빌딩'))).toBe(
      'tall-landmark',
    )
    expect(getArchitectureScaleClass(createItem('서울N타워'))).toBe(
      'tall-landmark',
    )
    expect(getArchitectureScaleClass(createItem('덕수궁'))).toBe(
      'wide-building',
    )
    expect(getArchitectureScaleClass(createItem('학교'))).toBe('school')
    expect(getArchitectureScaleClass(createItem('야구장'))).toBe('stadium')
    expect(getArchitectureScaleClass(createItem('테슬라'))).toBeNull()
    expect(getArchitectureScaleClass(createItem('음료 자판기'))).toBeNull()
    expect(
      getArchitectureScaleClass(
        createItem('이름이 바뀐 랜드마크', 1.6, 'structured-level4-63빌딩'),
      ),
    ).toBe('tall-landmark')
  })

  it('keeps the legacy Lotte Tower model in the tall landmark group', () => {
    expect(
      getArchitectureScaleClass(
        createItem('이전 이름', 1.8, 'level4-lotte-tower'),
      ),
    ).toBe('tall-landmark')
  })

  it('enlarges only the attached architecture and caps early-tier protrusion', () => {
    const tower = createItem('63빌딩')
    const school = createItem('학교', 1.02)
    const ordinaryItem = createItem('닌텐도', 1.02)

    expect(getAttachedObjectVisualScale(tower, 2.08)).toBeCloseTo(
      1.65 * ARCHITECTURE_ATTACHED_SCALE_MULTIPLIERS['tall-landmark'],
    )
    expect(getAttachedObjectVisualScale(tower, 1.28)).toBeCloseTo(4.184)
    expect(getAttachedObjectVisualScale(school, 1.28)).toBeCloseTo(
      1.1 * ARCHITECTURE_ATTACHED_SCALE_MULTIPLIERS.school,
    )
    expect(getAttachedObjectVisualScale(ordinaryItem, 1.28)).toBe(1.1)
  })

  it('makes landmarks larger in the world without enlarging ordinary tier-four items', () => {
    const tower = createItem('63빌딩')
    const ordinaryItem = createItem('대형 고급차')

    expect(getWorldObjectVisualScale(tower)).toBeCloseTo(
      1.65 * ARCHITECTURE_WORLD_SCALE_MULTIPLIERS['tall-landmark'],
    )
    expect(getWorldObjectVisualScale(ordinaryItem)).toBe(1.65)
  })

  it('adds a bounded camera offset only while architecture is attached', () => {
    const tower = createItem('63빌딩')
    const ordinaryItem = createItem('닌텐도', 1.02)

    expect(getArchitectureCameraDistanceOffset([ordinaryItem], 1.28)).toBe(0)
    expect(getArchitectureCameraDistanceOffset([tower], 1.28)).toBeGreaterThan(
      0.8,
    )
    expect(getArchitectureCameraDistanceOffset([tower], 0)).toBeLessThanOrEqual(
      2.2,
    )
    const minimumDistance = getArchitectureCameraMinimumDistance(
      [tower],
      1.28,
    )
    const maximumZoomInDistance = (4.8 + 1.28 * 1.6) * 0.55
    expect(minimumDistance).toBeGreaterThan(maximumZoomInDistance)
    expect(getArchitectureCameraFramingLift([tower], 1.28)).toBeGreaterThan(
      0.5,
    )
    expect(getArchitectureCameraFramingLift([tower], 1.28)).toBeLessThanOrEqual(
      0.7,
    )
  })

  it('adds a smooth late-game camera offset as the tier-four ball grows', () => {
    expect(getTierFourCameraDistanceOffset(1.24)).toBe(0)
    expect(getTierFourCameraDistanceOffset(1.64)).toBeGreaterThan(1.8)
    expect(getTierFourCameraDistanceOffset(2.08)).toBe(
      MAX_TIER_FOUR_CAMERA_DISTANCE_OFFSET,
    )
    expect(getTierFourCameraDistanceOffset(10)).toBe(
      MAX_TIER_FOUR_CAMERA_DISTANCE_OFFSET,
    )
  })
})

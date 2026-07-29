import { calculateBallRadius } from './session'
import type { LearningObject } from '../types'

export const COLLECTIBLE_RATIO = 0.95

export const SIZE_TIERS = [
  { level: 1, label: '작은 아이템', minSize: 0, maxSize: 0.45, color: '#2FA47C' },
  { level: 2, label: '보통 아이템', minSize: 0.48, maxSize: 0.8, color: '#4169D8' },
  { level: 3, label: '큰 아이템', minSize: 0.82, maxSize: 1.15, color: '#E6A800' },
  {
    level: 4,
    label: '아주 큰 아이템',
    minSize: 1.18,
    maxSize: Number.POSITIVE_INFINITY,
    color: '#E85D4A',
  },
] as const

export function getCollectibleLimit(ballRadius: number): number {
  return ballRadius * COLLECTIBLE_RATIO
}

export function canCollect(ballRadius: number, objectSize: number): boolean {
  return objectSize <= getCollectibleLimit(ballRadius)
}

export function getSizeTier(objectSize: number) {
  return (
    SIZE_TIERS.find((tier) => objectSize <= tier.maxSize) ??
    SIZE_TIERS[SIZE_TIERS.length - 1]
  )
}

export function getReachableSizeTier(ballRadius: number) {
  const limit = getCollectibleLimit(ballRadius)
  return (
    [...SIZE_TIERS].reverse().find((tier) => tier.minSize <= limit) ??
    SIZE_TIERS[0]
  )
}

export function canCompletePack(objects: LearningObject[]): boolean {
  const remaining = [...objects].sort((a, b) => a.size - b.size)
  let collectedCount = 0

  while (remaining.length) {
    const radius = calculateBallRadius(collectedCount)
    const nextIndex = remaining.findIndex((item) => canCollect(radius, item.size))
    if (nextIndex === -1) return false
    remaining.splice(nextIndex, 1)
    collectedCount += 1
  }

  return true
}

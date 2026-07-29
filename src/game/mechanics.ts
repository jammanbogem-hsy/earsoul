import { calculateBallRadius } from './session'
import type { LearningObject } from '../types'

export const COLLECTIBLE_RATIO = 0.95

export function getCollectibleLimit(ballRadius: number): number {
  return ballRadius * COLLECTIBLE_RATIO
}

export function canCollect(ballRadius: number, objectSize: number): boolean {
  return objectSize <= getCollectibleLimit(ballRadius)
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

import { calculateBallRadius } from './session'
import type {
  GameStage,
  LearningObject,
  StageTierGoal,
} from '../types'

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

const OBJECT_VISUAL_SCALES = [0.34, 0.68, 1.1, 1.65] as const

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

export function getObjectVisualScale(objectSize: number): number {
  return OBJECT_VISUAL_SCALES[getSizeTier(objectSize).level - 1]
}

type StageGoalConfig = Pick<
  GameStage,
  'objectiveCount' | 'scoreGoal' | 'tierGoals'
>

export interface StageTierProgress extends StageTierGoal {
  collectedCount: number
  score: number
  ready: boolean
  progress: number
}

export interface CircularWorldObstacle {
  x: number
  z: number
  radius: number
}

export function isCollectionPositionClear(
  item: Pick<LearningObject, 'position' | 'size'>,
  obstacles: CircularWorldObstacle[],
  extraClearance = 0.35,
): boolean {
  const itemRadius = Math.max(0.22, item.size * 0.64)

  return obstacles.every(
    (obstacle) =>
      Math.hypot(
        item.position[0] - obstacle.x,
        item.position[2] - obstacle.z,
      ) >=
      obstacle.radius + itemRadius + extraClearance,
  )
}

export function getStageScore(
  objects: Pick<LearningObject, 'id' | 'points'>[],
  collectedIds: string[],
): number {
  const collectedSet = new Set(collectedIds)
  return objects.reduce(
    (score, item) => score + (collectedSet.has(item.id) ? item.points : 0),
    0,
  )
}

export function getStageProgress(
  objects: Pick<LearningObject, 'id' | 'points'>[],
  collectedIds: string[],
  goalConfig: number | StageGoalConfig,
  awardedStageScore?: number,
) {
  const collectedSet = new Set(collectedIds)
  const collectedCount = objects.reduce(
    (count, item) => count + (collectedSet.has(item.id) ? 1 : 0),
    0,
  )
  const stageScore = Number.isFinite(awardedStageScore)
    ? Math.max(0, awardedStageScore ?? 0)
    : getStageScore(objects, collectedIds)
  const isLegacyGoal = typeof goalConfig === 'number'
  const objectiveCount = isLegacyGoal
    ? goalConfig
    : goalConfig.objectiveCount
  const goal = Math.max(1, Math.min(objects.length, objectiveCount))
  const scoreGoal = isLegacyGoal ? 0 : Math.max(1, goalConfig.scoreGoal)
  const tierGoals = isLegacyGoal
    ? []
    : [...goalConfig.tierGoals].sort((a, b) => a.level - b.level)
  const tierProgress: StageTierProgress[] = tierGoals.map((tierGoal) => {
    const countProgress = Math.min(
      1,
      collectedCount / Math.max(1, tierGoal.requiredCount),
    )
    const scoreProgress = Math.min(
      1,
      stageScore / Math.max(1, tierGoal.requiredScore),
    )

    return {
      ...tierGoal,
      collectedCount,
      score: stageScore,
      ready:
        collectedCount >= tierGoal.requiredCount &&
        stageScore >= tierGoal.requiredScore,
      progress: Math.min(countProgress, scoreProgress),
    }
  })
  const completedTierLevel =
    [...tierProgress].reverse().find((tier) => tier.ready)?.level ?? 0
  const nextTierGoal = tierProgress.find((tier) => !tier.ready) ?? null
  const finalTierGoal = tierGoals[tierGoals.length - 1]
  const completionCount = finalTierGoal?.requiredCount ?? goal
  const completionCountProgress = Math.min(
    1,
    collectedCount / Math.max(1, completionCount),
  )
  const ready = isLegacyGoal
    ? collectedCount >= goal
    : stageScore >= scoreGoal && tierProgress.every((tier) => tier.ready)

  return {
    collectedCount,
    goal: isLegacyGoal ? goal : scoreGoal,
    objectiveCount: goal,
    stageScore,
    scoreGoal,
    scoreRemaining: Math.max(0, scoreGoal - stageScore),
    tierProgress,
    completedTierLevel,
    nextTierGoal,
    bonusCount: Math.max(0, collectedCount - completionCount),
    ready,
    progress: isLegacyGoal
      ? Math.min(1, collectedCount / goal)
      : Math.min(
          completionCountProgress,
          Math.min(1, stageScore / scoreGoal),
        ),
  }
}

export function isStageUnlocked(
  stage: Pick<GameStage, 'unlockRequirement'>,
  stages: GameStage[],
  collectedIds: string[],
  stageScores: Record<string, number> = {},
): boolean {
  const requirement = stage.unlockRequirement
  if (!requirement) return true

  const previousStage = stages.find(
    (candidate) => candidate.id === requirement.previousStageId,
  )
  if (!previousStage) return false

  const progress = getStageProgress(
    previousStage.objects,
    collectedIds,
    previousStage,
    stageScores[previousStage.id],
  )

  return (
    progress.ready &&
    progress.stageScore >= requirement.requiredScore &&
    progress.completedTierLevel >= requirement.requiredTierLevel
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

import type { GameSession } from '../types'

export const SESSION_KEY = 'earsoul-learning-session-v3'

const emptySession = (): GameSession => {
  const now = Date.now()

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${now}`,
    startedAt: now,
    updatedAt: now,
    score: 0,
    bestCombo: 0,
    currentStageIndex: 0,
    stageScores: {},
    collectedPowerUpIds: [],
    collectedIds: [],
    collectedLabels: [],
    durationSeconds: 0,
    status: 'playing',
  }
}

export function readSession(): GameSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as GameSession
    return {
      ...session,
      bestCombo: session.bestCombo ?? 0,
      currentStageIndex: Math.max(0, session.currentStageIndex ?? 0),
      stageScores: session.stageScores ?? {},
      collectedPowerUpIds: session.collectedPowerUpIds ?? [],
    }
  } catch {
    return null
  }
}

export function saveSession(session: GameSession): GameSession {
  const next = { ...session, updatedAt: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function startSession(): GameSession {
  return saveSession(emptySession())
}

export function recordCollection(
  session: GameSession,
  item: { id: string; stageId?: string; label: string; points: number },
  options: { multiplier?: number; combo?: number } = {},
): GameSession {
  if (session.collectedIds.includes(item.id)) return session

  const multiplier = Math.max(1, Math.min(5, options.multiplier ?? 1))
  const combo = Math.max(1, options.combo ?? 1)
  const awardedPoints = Math.round(item.points * multiplier)
  const stageScores = session.stageScores ?? {}

  return saveSession({
    ...session,
    score: session.score + awardedPoints,
    bestCombo: Math.max(session.bestCombo ?? 0, combo),
    stageScores: item.stageId
      ? {
          ...stageScores,
          [item.stageId]: (stageScores[item.stageId] ?? 0) + awardedPoints,
        }
      : stageScores,
    collectedIds: [...session.collectedIds, item.id],
    collectedLabels: [...session.collectedLabels, item.label],
  })
}

export function recordPowerUpCollection(
  session: GameSession,
  pickupId: string,
): GameSession {
  if (session.collectedPowerUpIds.includes(pickupId)) return session

  return saveSession({
    ...session,
    collectedPowerUpIds: [...session.collectedPowerUpIds, pickupId],
  })
}

export function advanceSessionStage(
  session: GameSession,
  nextStageIndex: number,
): GameSession {
  return saveSession({
    ...session,
    currentStageIndex: Math.max(
      session.currentStageIndex,
      Math.floor(nextStageIndex),
    ),
  })
}

export function finishSession(session: GameSession): GameSession {
  const completedAt = Date.now()
  return saveSession({
    ...session,
    status: 'completed',
    completedAt,
    durationSeconds: Math.max(
      1,
      Math.round((completedAt - session.startedAt) / 1000),
    ),
  })
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

const BALL_GROWTH_MILESTONES = [
  { collectedCount: 0, radius: 0.42 },
  { collectedCount: 6, radius: 0.52 },
  { collectedCount: 18, radius: 0.88 },
  { collectedCount: 36, radius: 1.26 },
  { collectedCount: 48, radius: 1.62 },
  { collectedCount: 64, radius: 1.9 },
  { collectedCount: 80, radius: 2.05 },
] as const

function createStageGrowthMilestones(tierCounts: readonly number[]) {
  if (tierCounts.length < 4) return BALL_GROWTH_MILESTONES

  const [tierOne, tierTwo, tierThree, tierFour] = tierCounts.map((count) =>
    Math.max(1, Math.floor(count)),
  )
  const finalGrowthSpan = Math.max(2, tierFour - tierThree)

  return [
    { collectedCount: 0, radius: 0.42 },
    { collectedCount: tierOne - 1, radius: 0.504 },
    { collectedCount: tierOne, radius: 0.52 },
    { collectedCount: tierTwo - 1, radius: 0.862 },
    { collectedCount: tierTwo, radius: 0.88 },
    { collectedCount: tierThree - 1, radius: 1.24 },
    { collectedCount: tierThree, radius: 1.26 },
    {
      collectedCount: Math.round(tierThree + finalGrowthSpan * 0.43),
      radius: 1.62,
    },
    {
      collectedCount: Math.round(tierThree + finalGrowthSpan * 0.72),
      radius: 1.9,
    },
    { collectedCount: tierFour, radius: 2.05 },
  ]
}

export function calculateBallRadius(
  collectedCount: number,
  tierCounts: readonly number[] = [],
): number {
  const count = Math.max(0, collectedCount)
  const growthMilestones =
    tierCounts.length >= 4
      ? createStageGrowthMilestones(tierCounts)
      : BALL_GROWTH_MILESTONES

  for (let index = 1; index < growthMilestones.length; index += 1) {
    const start = growthMilestones[index - 1]
    const end = growthMilestones[index]
    if (count > end.collectedCount) continue

    const progress =
      (count - start.collectedCount) /
      (end.collectedCount - start.collectedCount)
    return start.radius + (end.radius - start.radius) * progress
  }

  return growthMilestones[growthMilestones.length - 1].radius
}

export function getStarRating(session: GameSession): number {
  return Math.max(1, Math.min(3, Math.ceil(session.collectedIds.length / 10)))
}

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
  item: { id: string; label: string; points: number },
  options: { multiplier?: number; combo?: number } = {},
): GameSession {
  if (session.collectedIds.includes(item.id)) return session

  const multiplier = Math.max(1, Math.min(5, options.multiplier ?? 1))
  const combo = Math.max(1, options.combo ?? 1)

  return saveSession({
    ...session,
    score: session.score + Math.round(item.points * multiplier),
    bestCombo: Math.max(session.bestCombo ?? 0, combo),
    collectedIds: [...session.collectedIds, item.id],
    collectedLabels: [...session.collectedLabels, item.label],
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

export function calculateBallRadius(collectedCount: number): number {
  const count = Math.max(0, collectedCount)

  for (let index = 1; index < BALL_GROWTH_MILESTONES.length; index += 1) {
    const start = BALL_GROWTH_MILESTONES[index - 1]
    const end = BALL_GROWTH_MILESTONES[index]
    if (count > end.collectedCount) continue

    const progress =
      (count - start.collectedCount) /
      (end.collectedCount - start.collectedCount)
    return start.radius + (end.radius - start.radius) * progress
  }

  return BALL_GROWTH_MILESTONES[BALL_GROWTH_MILESTONES.length - 1].radius
}

export function getStarRating(session: GameSession): number {
  return Math.max(1, Math.min(3, Math.ceil(session.collectedIds.length / 10)))
}

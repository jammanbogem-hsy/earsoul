import type { GameSession } from '../types'

export const SESSION_KEY = 'earsoul-learning-session'

const emptySession = (): GameSession => {
  const now = Date.now()

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${now}`,
    startedAt: now,
    updatedAt: now,
    score: 0,
    collectedIds: [],
    collectedLabels: [],
    durationSeconds: 0,
    status: 'playing',
  }
}

export function readSession(): GameSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as GameSession) : null
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
): GameSession {
  if (session.collectedIds.includes(item.id)) return session

  return saveSession({
    ...session,
    score: session.score + item.points,
    collectedIds: [...session.collectedIds, item.id],
    collectedLabels: [...session.collectedLabels, item.label],
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

export function calculateBallRadius(collectedCount: number): number {
  return Math.min(2.05, 0.5 + Math.sqrt(collectedCount) * 0.21)
}

export function getStarRating(session: GameSession): number {
  return Math.max(1, Math.min(3, Math.ceil(session.collectedIds.length / 10)))
}

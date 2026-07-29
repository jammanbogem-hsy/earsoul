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
    correctAnswers: 0,
    answeredQuestions: 0,
    completedQuizIds: [],
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

export function recordQuiz(
  session: GameSession,
  quizId: string,
  wasCorrectOnFirstTry: boolean,
): GameSession {
  if (session.completedQuizIds.includes(quizId)) return session

  return saveSession({
    ...session,
    score: session.score + (wasCorrectOnFirstTry ? 100 : 50),
    correctAnswers:
      session.correctAnswers + (wasCorrectOnFirstTry ? 1 : 0),
    answeredQuestions: session.answeredQuestions + 1,
    completedQuizIds: [...session.completedQuizIds, quizId],
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
  const collectionScore = Math.min(2, Math.floor(session.collectedIds.length / 10))
  const quizScore = session.correctAnswers >= 3 ? 1 : 0
  return Math.max(1, Math.min(3, collectionScore + quizScore))
}

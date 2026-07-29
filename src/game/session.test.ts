import { beforeEach, describe, expect, it } from 'vitest'
import {
  calculateBallRadius,
  finishSession,
  readSession,
  recordCollection,
  recordQuiz,
  startSession,
} from './session'

describe('single session score', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('records each learning object only once', () => {
    const session = startSession()
    const once = recordCollection(session, {
      id: 'vowel-a',
      label: '모음 ㅏ',
      points: 10,
    })
    const twice = recordCollection(once, {
      id: 'vowel-a',
      label: '모음 ㅏ',
      points: 10,
    })

    expect(twice.score).toBe(10)
    expect(twice.collectedIds).toEqual(['vowel-a'])
    expect(readSession()?.score).toBe(10)
  })

  it('awards learning bonus without penalizing retries', () => {
    const session = startSession()
    const result = recordQuiz(session, 'quiz-shape', false)

    expect(result.score).toBe(50)
    expect(result.correctAnswers).toBe(0)
    expect(result.answeredQuestions).toBe(1)
  })

  it('finishes the current browser session', () => {
    const result = finishSession(startSession())

    expect(result.status).toBe('completed')
    expect(result.durationSeconds).toBeGreaterThan(0)
  })

  it('grows steadily but caps the learning ball', () => {
    expect(calculateBallRadius(0)).toBe(0.5)
    expect(calculateBallRadius(10)).toBeGreaterThan(1)
    expect(calculateBallRadius(500)).toBe(2.05)
  })
})

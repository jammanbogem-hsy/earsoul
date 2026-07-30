import { beforeEach, describe, expect, it } from 'vitest'
import {
  SESSION_KEY,
  advanceSessionStage,
  calculateBallRadius,
  finishSession,
  readSession,
  recordCollection,
  recordPowerUpCollection,
  startSession,
} from './session'

describe('single session score', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('records each learning object only once', () => {
    const session = startSession()
    const once = recordCollection(session, {
      id: 'runner-lace',
      label: '번개 운동화 끈',
      points: 10,
    })
    const twice = recordCollection(once, {
      id: 'runner-lace',
      label: '번개 운동화 끈',
      points: 10,
    })

    expect(twice.score).toBe(10)
    expect(twice.collectedIds).toEqual(['runner-lace'])
    expect(readSession()?.score).toBe(10)
    expect(readSession()?.bestCombo).toBe(1)
    expect(readSession()?.stageScores).toEqual({})
  })

  it('applies a capped combo multiplier and remembers the best combo', () => {
    const session = startSession()
    const combo = recordCollection(
      session,
      { id: 'shoe', label: '운동화', points: 20 },
      { multiplier: 3, combo: 4 },
    )

    expect(combo.score).toBe(60)
    expect(combo.bestCombo).toBe(4)
    expect(readSession()?.bestCombo).toBe(4)
  })

  it('adds combo points to the current map goal without double counting', () => {
    const session = startSession()
    const once = recordCollection(
      session,
      {
        id: 'sunny-shoe',
        stageId: 'sunny-start',
        label: '운동화',
        points: 20,
      },
      { multiplier: 3 },
    )
    const twice = recordCollection(
      once,
      {
        id: 'sunny-shoe',
        stageId: 'sunny-start',
        label: '운동화',
        points: 20,
      },
      { multiplier: 5 },
    )

    expect(twice.score).toBe(60)
    expect(twice.stageScores).toEqual({ 'sunny-start': 60 })
    expect(readSession()?.stageScores).toEqual({ 'sunny-start': 60 })
  })

  it('migrates sessions saved before map scores and power-ups were introduced', () => {
    const legacy = startSession()
    const legacySession = {
      ...legacy,
      stageScores: undefined,
      collectedPowerUpIds: undefined,
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(legacySession))

    expect(readSession()?.stageScores).toEqual({})
    expect(readSession()?.collectedPowerUpIds).toEqual([])
  })

  it('records a power-up once without changing the score or object count', () => {
    const session = startSession()
    const once = recordPowerUpCollection(session, 'sunny-magnet-1')
    const twice = recordPowerUpCollection(once, 'sunny-magnet-1')

    expect(twice.collectedPowerUpIds).toEqual(['sunny-magnet-1'])
    expect(twice.collectedIds).toEqual([])
    expect(twice.score).toBe(0)
  })

  it('finishes the current browser session', () => {
    const result = finishSession(startSession())

    expect(result.status).toBe('completed')
    expect(result.durationSeconds).toBeGreaterThan(0)
  })

  it('keeps the unlocked map in the same browser session', () => {
    const first = startSession()
    const second = advanceSessionStage(first, 1)

    expect(second.currentStageIndex).toBe(1)
    expect(readSession()?.currentStageIndex).toBe(1)
  })

  it('grows at deliberate milestones and caps the learning ball', () => {
    expect(calculateBallRadius(0)).toBe(0.42)
    expect(calculateBallRadius(6)).toBe(0.52)
    expect(calculateBallRadius(18)).toBe(0.88)
    expect(calculateBallRadius(36)).toBe(1.26)
    expect(calculateBallRadius(48)).toBe(1.62)
    expect(calculateBallRadius(500)).toBe(2.05)
  })
})

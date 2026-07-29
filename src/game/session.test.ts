import { beforeEach, describe, expect, it } from 'vitest'
import {
  advanceSessionStage,
  calculateBallRadius,
  finishSession,
  readSession,
  recordCollection,
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

  it('grows steadily but caps the learning ball', () => {
    expect(calculateBallRadius(0)).toBe(0.5)
    expect(calculateBallRadius(10)).toBeGreaterThan(1)
    expect(calculateBallRadius(500)).toBe(2.05)
  })
})

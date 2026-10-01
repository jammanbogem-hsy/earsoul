import { describe, expect, it } from 'vitest'
import {
  getCrewCharacterPosition,
  HAZARD_CONTACT_MARGIN,
  isHazardTouchingPlayer,
  type PlayerContactProbe,
} from './hazardContact'
import { ROAMING_RUNNER_DANGER_RADIUS } from './roamingRunners'

const runner = (x: number, z: number) => ({ x, z, radius: ROAMING_RUNNER_DANGER_RADIUS, height: 1.36 })
const probe = (overrides: Partial<PlayerContactProbe> = {}): PlayerContactProbe => ({
  x: 0, y: 0.42, z: 0, ballRadius: 0.42, motionX: 0, motionZ: -1, ...overrides,
})

describe('roaming hazard contact', () => {
  it('counts a runner brushing the ball, including a small margin', () => {
    const edge = ROAMING_RUNNER_DANGER_RADIUS + 0.42 + HAZARD_CONTACT_MARGIN
    expect(isHazardTouchingPlayer(runner(edge - 0.01, 0), probe())).toBe(true)
    expect(isHazardTouchingPlayer(runner(edge + 0.2, 0), probe())).toBe(false)
  })

  it('counts a runner hitting the crew character behind the ball', () => {
    const [characterX, characterZ] = getCrewCharacterPosition(probe())
    // Rolling toward -z, so the character stands on the +z side of the ball.
    expect(characterZ).toBeGreaterThan(0.8)
    expect(isHazardTouchingPlayer(runner(characterX, characterZ + 0.6), probe())).toBe(true)
    expect(isHazardTouchingPlayer(runner(characterX, characterZ + 1.9), probe())).toBe(false)
  })

  it('grows the hit area with the ball', () => {
    const hazard = runner(2.6, 0)
    expect(isHazardTouchingPlayer(hazard, probe())).toBe(false)
    expect(isHazardTouchingPlayer(hazard, probe({ ballRadius: 2, y: 2 }))).toBe(true)
  })

  it('ignores ground hazards while the ball rolls on a deck above them', () => {
    expect(isHazardTouchingPlayer(runner(0.5, 0), probe({ y: 4.1 }))).toBe(false)
  })
})

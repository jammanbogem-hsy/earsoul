import { describe, expect, it } from 'vitest'
import { getDriveControl, stepRelativeDrive } from './input'

describe('relative drive input', () => {
  it('maps English, Korean-layout, and arrow keys to the same controls', () => {
    expect(getDriveControl({ key: 'w', code: '' })).toBe('forward')
    expect(getDriveControl({ key: 'ㅈ', code: '' })).toBe('forward')
    expect(getDriveControl({ key: 'ㅁ', code: '' })).toBe('left')
    expect(getDriveControl({ key: 'ㄴ', code: '' })).toBe('backward')
    expect(getDriveControl({ key: 'ㅇ', code: '' })).toBe('right')
    expect(getDriveControl({ key: 'ArrowRight', code: 'ArrowRight' })).toBe(
      'right',
    )
  })

  it('uses the physical key code even while an IME is composing', () => {
    expect(getDriveControl({ key: 'Process', code: 'KeyW' })).toBe('forward')
    expect(getDriveControl({ key: 'Process', code: 'KeyA' })).toBe('left')
  })

  it('moves right relative to the current heading instead of the world axis', () => {
    const north = stepRelativeDrive({ x: 0, z: -1 }, 1, 0)
    const east = stepRelativeDrive({ x: 1, z: 0 }, 1, 0)

    expect(north.moveX).toBeCloseTo(1)
    expect(north.moveZ).toBeCloseTo(0)
    expect(east.moveX).toBeCloseTo(0)
    expect(east.moveZ).toBeCloseTo(1)
  })

  it('keeps forward movement aligned with the current heading', () => {
    const step = stepRelativeDrive({ x: 1, z: 0 }, 0, 1)

    expect(step.moveX).toBeCloseTo(1)
    expect(step.moveZ).toBeCloseTo(0)
  })

  it('normalizes diagonal camera-relative movement', () => {
    const step = stepRelativeDrive({ x: 0, z: -1 }, 1, 1)

    expect(Math.hypot(step.moveX, step.moveZ)).toBeCloseTo(1)
  })
})

import { describe, expect, it } from 'vitest'
import {
  advanceCombo,
  COMBO_WINDOW_MS,
  MAX_COMBO_MULTIPLIER,
} from './combo'

describe('collection combo', () => {
  it('starts at one and increases inside the combo window', () => {
    const first = advanceCombo({ count: 0, lastCollectedAt: 0 }, 10_000)
    const second = advanceCombo(first, 10_000 + COMBO_WINDOW_MS - 1)

    expect(first.multiplier).toBe(1)
    expect(second.count).toBe(2)
    expect(second.multiplier).toBe(2)
  })

  it('resets after the combo window and caps the multiplier', () => {
    let state = { count: 0, lastCollectedAt: 0 }

    for (let index = 0; index < 8; index += 1) {
      state = advanceCombo(state, 1_000 + index * 100)
    }

    expect('multiplier' in state && state.multiplier).toBe(
      MAX_COMBO_MULTIPLIER,
    )

    const reset = advanceCombo(
      state,
      state.lastCollectedAt + COMBO_WINDOW_MS + 1,
    )
    expect(reset.count).toBe(1)
    expect(reset.multiplier).toBe(1)
  })
})

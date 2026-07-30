import { describe, expect, it } from 'vitest'
import { getCollectedObjectsInOrder } from './collectionOrder'

describe('attached object order', () => {
  it('keeps existing attachment slots in collection order', () => {
    const objects = [
      { id: 'stage-first' },
      { id: 'stage-second' },
      { id: 'stage-third' },
    ]

    expect(
      getCollectedObjectsInOrder(objects, [
        'stage-third',
        'stage-first',
      ]).map((item) => item.id),
    ).toEqual(['stage-third', 'stage-first'])
  })

  it('ignores collected ids from another stage', () => {
    expect(
      getCollectedObjectsInOrder(
        [{ id: 'current-stage' }],
        ['previous-stage', 'current-stage'],
      ),
    ).toEqual([{ id: 'current-stage' }])
  })
})

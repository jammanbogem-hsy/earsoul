import { describe, expect, it } from 'vitest'
import type { LearningObject } from '../types'
import {
  getCollectionAnnouncementBody,
  getCollectionAnnouncementTitle,
  getItemDisplayLabel,
} from './itemPresentation'

function createItem(
  id: string,
  overrides: Partial<LearningObject> = {},
): LearningObject {
  return {
    id,
    label: '예전 이름',
    fact: '예전 안내',
    subject: '생활',
    size: 0.3,
    points: 10,
    color: '#fff',
    shape: 'box',
    position: [0, 0, 0],
    ...overrides,
  }
}

describe('item presentation', () => {
  it('uses the imported level-one asset name instead of stale content labels', () => {
    const items = Array.from({ length: 100 }, (_, index) =>
      createItem(`sunny-start-item-${index + 1}`),
    )

    expect(new Set(items.map(getItemDisplayLabel))).toEqual(
      new Set(['레고', '생수', '막대사탕', '오렌지 주스', '팬텀 키링']),
    )
  })

  it('announces the assigned name when a level-one item is collected', () => {
    const idsByLabel = new Map<string, string>()
    for (let index = 1; idsByLabel.size < 5; index += 1) {
      const item = createItem(`announcement-item-${index}`)
      idsByLabel.set(getItemDisplayLabel(item), item.id)
    }

    const lego = createItem(idsByLabel.get('레고')!)
    const water = createItem(idsByLabel.get('생수')!)
    const candy = createItem(idsByLabel.get('막대사탕')!)
    const orangeJuice = createItem(idsByLabel.get('오렌지 주스')!)
    const phantomKeyring = createItem(idsByLabel.get('팬텀 키링')!)

    expect(getCollectionAnnouncementTitle(lego, 10, 1)).toBe(
      '레고 획득 · +10',
    )
    expect(getCollectionAnnouncementTitle(water, 20, 2)).toBe(
      'x2 콤보 · 생수 획득 · +20',
    )
    expect(getCollectionAnnouncementBody(lego)).toBe(
      '레고를 러닝볼에 붙였어요.',
    )
    expect(getCollectionAnnouncementBody(water)).toBe(
      '생수를 러닝볼에 붙였어요.',
    )
    expect(getCollectionAnnouncementBody(candy)).toBe(
      '막대사탕을 러닝볼에 붙였어요.',
    )
    expect(getCollectionAnnouncementTitle(orangeJuice, 14, 1)).toBe(
      '오렌지 주스 획득 · +14',
    )
    expect(getCollectionAnnouncementBody(orangeJuice)).toBe(
      '오렌지 주스를 러닝볼에 붙였어요.',
    )
    expect(getCollectionAnnouncementBody(phantomKeyring)).toBe(
      '팬텀 키링을 러닝볼에 붙였어요.',
    )
  })

  it('keeps current GLB-backed and radar treasure copy unchanged', () => {
    const large = createItem('large', {
      label: '러닝 조끼',
      fact: '커다란 아이템',
      size: 0.9,
      modelId: 'level3-running-vest',
    })
    const radar = createItem('radar', {
      label: '무지개 보물',
      fact: '한정 보물',
      modelId: 'radar-treasure',
    })

    expect(getItemDisplayLabel(large)).toBe('러닝 조끼')
    expect(getCollectionAnnouncementBody(large)).toBe('커다란 아이템')
    expect(getItemDisplayLabel(radar)).toBe('무지개 보물')
  })

  it('relabels legacy procedural collectibles with their GLB replacement', () => {
    const legacyWatch = createItem('legacy-watch', {
      label: '크루 손목시계',
      fact: '예전 도형 안내',
      size: 0.65,
      modelId: 'wristwatch',
    })

    expect(getItemDisplayLabel(legacyWatch)).toBe('전자시계')
    expect(getCollectionAnnouncementTitle(legacyWatch, 30, 1)).toBe(
      '전자시계 획득 · +30',
    )
    expect(getCollectionAnnouncementBody(legacyWatch)).toBe(
      '전자시계를 러닝볼에 붙였어요.',
    )
  })
})

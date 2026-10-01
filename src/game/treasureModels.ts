import coinPouchUrl from '../assets/game/treasure/coin-pouch.glb?url'
import gemClusterUrl from '../assets/game/treasure/gem-cluster.glb?url'
import goldCrownUrl from '../assets/game/treasure/gold-crown.glb?url'
import moonCrystalOrbUrl from '../assets/game/treasure/moon-crystal-orb.glb?url'
import woodenChestUrl from '../assets/game/treasure/wooden-chest.glb?url'
import goldenTrophyUrl from '../assets/game/treasure/golden-trophy.glb?url'
import openChestUrl from '../assets/game/treasure/open-chest.glb?url'
import goldenOwlIdolUrl from '../assets/game/treasure/golden-owl-idol.glb?url'

/** Two treasure models per radar tier, from small trinkets to big hoards. */
export const TREASURE_MODELS = [
  [
    { url: gemClusterUrl, label: '반짝 보석 원석' },
    { url: coinPouchUrl, label: '금화 주머니' },
  ],
  [
    { url: goldCrownUrl, label: '보석 왕관' },
    { url: moonCrystalOrbUrl, label: '달빛 수정구' },
  ],
  [
    { url: woodenChestUrl, label: '황금 보물상자' },
    { url: goldenTrophyUrl, label: '별 트로피' },
  ],
  [
    { url: openChestUrl, label: '넘치는 보물상자' },
    { url: goldenOwlIdolUrl, label: '황금 부엉이상' },
  ],
] as const

export const TREASURE_MODEL_URLS: readonly string[] = TREASURE_MODELS.flat().map(
  (model) => model.url,
)

/** Radar treasure ids end in `-<tier>-<slot>` (both 1-based). */
export function getTreasureModel(itemId: string) {
  const match = /-(\d+)-(\d+)$/.exec(itemId)
  const tier = Math.min(4, Math.max(1, Number(match?.[1] ?? 1))) - 1
  const slot = Number(match?.[2] ?? 1) - 1
  return TREASURE_MODELS[tier][slot % 2]
}

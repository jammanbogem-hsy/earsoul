export const INITIAL_PLAYER_RADIUS = 0.42
export const PLAYER_FLOOR_CLEARANCE = 0.02

export interface PlayerTranslation {
  x: number
  y: number
  z: number
}

export function getPlayerSpawnTranslation(
  x = 0,
  z = 0,
): [number, number, number] {
  return [
    x,
    INITIAL_PLAYER_RADIUS + PLAYER_FLOOR_CLEARANCE,
    z,
  ]
}

export function preservePlayerTranslationWhileGrowing(
  current: PlayerTranslation,
  nextRadius: number,
): PlayerTranslation {
  return {
    x: current.x,
    y: Math.max(
      current.y,
      nextRadius + PLAYER_FLOOR_CLEARANCE,
    ),
    z: current.z,
  }
}

import type { GameStage, StageTheme } from '../types'

export type ObstacleResponse = 'stop' | 'bounce'

export interface WorldObstacle {
  id: string
  label: string
  x: number
  z: number
  radius: number
  response: ObstacleResponse
}

export interface SpeedZone {
  id: string
  label: string
  x: number
  z: number
  halfWidth: number
  halfDepth: number
  rotationY: number
  multiplier: number
}

export interface RideableObstacle {
  id: string
  label: string
  x: number
  y: number
  z: number
  halfWidth: number
  halfHeight: number
  halfDepth: number
  rotationY: number
}

export type SurfaceKind = 'grass' | 'water'

export interface SurfaceZone {
  id: string
  label: string
  kind: SurfaceKind
  color: string
  x: number
  z: number
  halfWidth: number
  halfDepth: number
  rotationY: number
  multiplier: number
}

export interface TerrainRamp {
  id: string
  label: string
  color: string
  x: number
  y: number
  z: number
  halfWidth: number
  halfHeight: number
  halfDepth: number
  rotationX: number
  rotationY: number
}

export interface WorldPhysicsLayout {
  obstacles: WorldObstacle[]
  rideableObstacles: RideableObstacle[]
  speedZones: SpeedZone[]
  surfaceZones: SurfaceZone[]
  terrainRamps: TerrainRamp[]
}

export interface WorldPhysicsStep {
  x: number
  z: number
  velocityX: number
  velocityZ: number
  speedMultiplier: number
  speedZone?: SpeedZone
  surfaceZone?: SurfaceZone
  impact?: {
    obstacle: WorldObstacle
    response: ObstacleResponse
  }
}

interface WorldPhysicsInput {
  startX: number
  startZ: number
  nextX: number
  nextZ: number
  velocityX: number
  velocityZ: number
  ballRadius: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function createTreeRing(
  mapSize: number,
  theme: StageTheme,
): WorldObstacle[] {
  const mapScale = mapSize / 60
  const treeCount = Math.round(22 * mapScale)
  const edgeRadius = mapSize * 0.468

  return Array.from({ length: treeCount }, (_, index) => {
    const angle = (index / treeCount) * Math.PI * 2
    const radius = edgeRadius - (index % 3) * 0.65
    return {
      id: `edge-tree-${index}`,
      label: theme === 'starlight-river' ? '별빛 나무' : '공원 나무',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 0.48,
      response: 'stop' as const,
    }
  })
}

function createBenches(mapSize: number): WorldObstacle[] {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8
    return {
      id: `bench-${index}`,
      label: '공원 의자',
      x: Math.cos(angle) * mapSize * 0.25,
      z: Math.sin(angle) * mapSize * 0.25,
      radius: 1.08,
      response: 'bounce' as const,
    }
  })
}

function createGearRacks(mapSize: number): WorldObstacle[] {
  const mapScale = mapSize / 60
  return [
    [-mapSize * 0.36, -4.5 * mapScale],
    [mapSize * 0.36, 4.5 * mapScale],
    [-5 * mapScale, mapSize * 0.36],
    [5 * mapScale, -mapSize * 0.36],
  ].map(([x, z], index) => ({
    id: `gear-rack-${index}`,
    label: '러닝 장비대',
    x,
    z,
    radius: 1.15,
    response: 'bounce' as const,
  }))
}

function createKiosks(mapSize: number): WorldObstacle[] {
  return [
    [-mapSize * 0.35, mapSize * 0.24],
    [mapSize * 0.35, -mapSize * 0.24],
  ].map(([x, z], index) => ({
    id: `crew-kiosk-${index}`,
    label: '러닝크루 쉼터',
    x,
    z,
    radius: 1.2,
    response: 'stop' as const,
  }))
}

function createForestTrees(mapSize: number): WorldObstacle[] {
  return Array.from({ length: 18 }, (_, index) => {
    const angle = index * GOLDEN_ANGLE + 0.35
    const radius =
      mapSize * (0.1 + (index % 3) * 0.07) +
      Math.sin(index * 1.3) * 1.4
    return {
      id: `forest-tree-${index}`,
      label: '바람숲 나무',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 0.44,
      response: 'stop' as const,
    }
  })
}

function createSpeedZones(
  mapSize: number,
  theme: StageTheme,
): SpeedZone[] {
  if (theme === 'forest-trail') {
    return [
      {
        id: 'forest-sprint-east',
        label: '바람 오솔길',
        x: 0,
        z: 0,
        halfWidth: mapSize * 0.34,
        halfDepth: 1.05,
        rotationY: 0.18,
        multiplier: 1.28,
      },
      {
        id: 'forest-sprint-north',
        label: '솔잎 지름길',
        x: 0,
        z: 0,
        halfWidth: 0.92,
        halfDepth: mapSize * 0.34,
        rotationY: -0.34,
        multiplier: 1.24,
      },
    ]
  }

  if (theme === 'starlight-river') {
    return [
      {
        id: 'river-bridge-boost',
        label: '별빛 스피드 다리',
        x: 0,
        z: mapSize * 0.27,
        halfWidth: 1.85,
        halfDepth: 4.6,
        rotationY: 0,
        multiplier: 1.35,
      },
    ]
  }

  return [
    {
      id: 'plaza-sprint-east',
      label: '햇살 스프린트 길',
      x: 0,
      z: 0,
      halfWidth: mapSize * 0.31,
      halfDepth: 0.72,
      rotationY: 0,
      multiplier: 1.3,
    },
    {
      id: 'plaza-sprint-north',
      label: '햇살 스프린트 길',
      x: 0,
      z: 0,
      halfWidth: 0.72,
      halfDepth: mapSize * 0.31,
      rotationY: 0,
      multiplier: 1.3,
    },
  ]
}

function createRideableObstacles(mapSize: number): RideableObstacle[] {
  const mapScale = mapSize / 60

  return Array.from(
    { length: Math.round(18 * mapScale) },
    (_, index) => ({
      id: `stepping-block-${index}`,
      label: '컬러 발판',
      x: -8.5 * mapScale + index,
      y: 0.13 + (index % 3) * 0.04,
      z: -12.3 * mapScale + Math.sin(index * 0.8) * 0.8,
      halfWidth: 0.29,
      halfHeight: 0.12,
      halfDepth: 0.29,
      rotationY: index * 0.22,
    }),
  )
}

function createSurfaceZones(
  mapSize: number,
  theme: StageTheme,
): SurfaceZone[] {
  if (theme === 'forest-trail') {
    return [
      {
        id: 'forest-meadow',
        label: '폭신한 숲 잔디',
        kind: 'grass',
        color: '#78B86D',
        x: -mapSize * 0.19,
        z: mapSize * 0.17,
        halfWidth: mapSize * 0.14,
        halfDepth: mapSize * 0.09,
        rotationY: 0.32,
        multiplier: 0.68,
      },
      {
        id: 'forest-creek',
        label: '얕은 숲 물길',
        kind: 'water',
        color: '#67BFD0',
        x: mapSize * 0.2,
        z: -mapSize * 0.14,
        halfWidth: mapSize * 0.075,
        halfDepth: mapSize * 0.1,
        rotationY: -0.48,
        multiplier: 0.55,
      },
    ]
  }

  if (theme === 'starlight-river') {
    return [
      {
        id: 'river-grass-bank',
        label: '별빛 강둑 잔디',
        kind: 'grass',
        color: '#5F9A7B',
        x: -mapSize * 0.21,
        z: -mapSize * 0.15,
        halfWidth: mapSize * 0.11,
        halfDepth: mapSize * 0.075,
        rotationY: -0.24,
        multiplier: 0.7,
      },
      {
        id: 'river-shallows',
        label: '반짝이는 얕은 물',
        kind: 'water',
        color: '#4FA8C7',
        x: mapSize * 0.18,
        z: mapSize * 0.1,
        halfWidth: mapSize * 0.13,
        halfDepth: mapSize * 0.08,
        rotationY: 0.2,
        multiplier: 0.52,
      },
    ]
  }

  return [
    {
      id: 'plaza-grass',
      label: '폭신한 광장 잔디',
      kind: 'grass',
      color: '#83C878',
      x: -mapSize * 0.23,
      z: mapSize * 0.14,
      halfWidth: mapSize * 0.11,
      halfDepth: mapSize * 0.075,
      rotationY: 0.22,
      multiplier: 0.72,
    },
    {
      id: 'plaza-water',
      label: '찰랑이는 얕은 물',
      kind: 'water',
      color: '#6ECBE2',
      x: mapSize * 0.23,
      z: -mapSize * 0.17,
      halfWidth: mapSize * 0.085,
      halfDepth: mapSize * 0.06,
      rotationY: -0.35,
      multiplier: 0.58,
    },
  ]
}

function createHill(
  id: string,
  label: string,
  color: string,
  centerX: number,
  centerZ: number,
  rotationY: number,
  mapSize: number,
): TerrainRamp[] {
  const halfDepth = mapSize * 0.034
  const halfWidth = mapSize * 0.027
  const halfHeight = 0.13
  const rotationX = 0.1
  const centerY =
    halfHeight + Math.sin(rotationX) * halfDepth + 0.035
  const directionX = Math.sin(rotationY)
  const directionZ = Math.cos(rotationY)

  return [
    {
      id: `${id}-up`,
      label,
      color,
      x: centerX - directionX * halfDepth,
      y: centerY,
      z: centerZ - directionZ * halfDepth,
      halfWidth,
      halfHeight,
      halfDepth,
      rotationX: -rotationX,
      rotationY,
    },
    {
      id: `${id}-down`,
      label,
      color,
      x: centerX + directionX * halfDepth,
      y: centerY,
      z: centerZ + directionZ * halfDepth,
      halfWidth,
      halfHeight,
      halfDepth,
      rotationX,
      rotationY,
    },
  ]
}

function createTerrainRamps(
  mapSize: number,
  theme: StageTheme,
): TerrainRamp[] {
  const colors =
    theme === 'starlight-river'
      ? ['#718BA0', '#667C91']
      : theme === 'forest-trail'
        ? ['#779D61', '#8BAC68']
        : ['#9BCB78', '#D6B77C']

  return [
    ...createHill(
      'east-hill',
      '완만한 동쪽 언덕',
      colors[0],
      mapSize * 0.19,
      mapSize * 0.17,
      0.38,
      mapSize,
    ),
    ...createHill(
      'west-hill',
      '구불구불 서쪽 언덕',
      colors[1],
      -mapSize * 0.22,
      -mapSize * 0.16,
      -0.58,
      mapSize,
    ),
  ]
}

export function createWorldPhysicsLayout(
  stage: Pick<GameStage, 'mapSize' | 'theme'>,
): WorldPhysicsLayout {
  return {
    obstacles: [
      ...createTreeRing(stage.mapSize, stage.theme),
      ...createBenches(stage.mapSize),
      ...createGearRacks(stage.mapSize),
      ...createKiosks(stage.mapSize),
      ...(stage.theme === 'forest-trail'
        ? createForestTrees(stage.mapSize)
        : []),
    ],
    rideableObstacles: createRideableObstacles(stage.mapSize),
    speedZones: createSpeedZones(stage.mapSize, stage.theme),
    surfaceZones: createSurfaceZones(stage.mapSize, stage.theme),
    terrainRamps: createTerrainRamps(stage.mapSize, stage.theme),
  }
}

function isInsideSpeedZone(x: number, z: number, zone: SpeedZone): boolean {
  const offsetX = x - zone.x
  const offsetZ = z - zone.z
  const cosine = Math.cos(zone.rotationY)
  const sine = Math.sin(zone.rotationY)
  const localX = offsetX * cosine - offsetZ * sine
  const localZ = offsetX * sine + offsetZ * cosine

  return (
    Math.abs(localX) <= zone.halfWidth &&
    Math.abs(localZ) <= zone.halfDepth
  )
}

export function getActiveSpeedZone(
  layout: WorldPhysicsLayout,
  x: number,
  z: number,
): SpeedZone | undefined {
  return layout.speedZones.find((zone) => isInsideSpeedZone(x, z, zone))
}

function isInsideSurfaceZone(
  x: number,
  z: number,
  zone: SurfaceZone,
): boolean {
  const offsetX = x - zone.x
  const offsetZ = z - zone.z
  const cosine = Math.cos(zone.rotationY)
  const sine = Math.sin(zone.rotationY)
  const localX = offsetX * cosine - offsetZ * sine
  const localZ = offsetX * sine + offsetZ * cosine

  return (
    (localX * localX) / (zone.halfWidth * zone.halfWidth) +
      (localZ * localZ) / (zone.halfDepth * zone.halfDepth) <=
    1
  )
}

export function getActiveSurfaceZone(
  layout: WorldPhysicsLayout,
  x: number,
  z: number,
): SurfaceZone | undefined {
  return layout.surfaceZones.find((zone) =>
    isInsideSurfaceZone(x, z, zone),
  )
}

export function resolveWorldPhysics(
  input: WorldPhysicsInput,
  layout: WorldPhysicsLayout,
): WorldPhysicsStep {
  let x = input.nextX
  let z = input.nextZ
  let velocityX = input.velocityX
  let velocityZ = input.velocityZ
  let impact: WorldPhysicsStep['impact']

  for (const obstacle of layout.obstacles) {
    const minimumDistance = input.ballRadius + obstacle.radius
    let offsetX = x - obstacle.x
    let offsetZ = z - obstacle.z
    let distance = Math.hypot(offsetX, offsetZ)
    if (distance >= minimumDistance) continue

    if (distance < 0.0001) {
      offsetX = input.startX - obstacle.x
      offsetZ = input.startZ - obstacle.z
      distance = Math.hypot(offsetX, offsetZ)
      if (distance < 0.0001) {
        const speed = Math.hypot(input.velocityX, input.velocityZ)
        offsetX = speed > 0 ? -input.velocityX / speed : 1
        offsetZ = speed > 0 ? -input.velocityZ / speed : 0
        distance = 1
      }
    }

    const normalX = offsetX / distance
    const normalZ = offsetZ / distance
    x = obstacle.x + normalX * minimumDistance
    z = obstacle.z + normalZ * minimumDistance

    const inwardSpeed = velocityX * normalX + velocityZ * normalZ
    if (obstacle.response === 'bounce' && inwardSpeed < 0) {
      const restitution = 0.32
      velocityX -= (1 + restitution) * inwardSpeed * normalX
      velocityZ -= (1 + restitution) * inwardSpeed * normalZ
    } else {
      velocityX = 0
      velocityZ = 0
    }

    impact ??= {
      obstacle,
      response: obstacle.response,
    }
  }

  const speedZone =
    getActiveSpeedZone(layout, x, z) ??
    getActiveSpeedZone(layout, input.startX, input.startZ)
  const surfaceZone =
    getActiveSurfaceZone(layout, x, z) ??
    getActiveSurfaceZone(layout, input.startX, input.startZ)

  return {
    x,
    z,
    velocityX,
    velocityZ,
    speedMultiplier:
      (speedZone?.multiplier ?? 1) *
      (surfaceZone?.multiplier ?? 1),
    speedZone,
    surfaceZone,
    impact,
  }
}

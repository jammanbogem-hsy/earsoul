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

export interface WorldPhysicsLayout {
  obstacles: WorldObstacle[]
  speedZones: SpeedZone[]
}

export interface WorldPhysicsStep {
  x: number
  z: number
  velocityX: number
  velocityZ: number
  speedMultiplier: number
  speedZone?: SpeedZone
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
    speedZones: createSpeedZones(stage.mapSize, stage.theme),
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

  return {
    x,
    z,
    velocityX,
    velocityZ,
    speedMultiplier: speedZone?.multiplier ?? 1,
    speedZone,
    impact,
  }
}

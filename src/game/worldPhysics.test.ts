import { describe, expect, it } from 'vitest'
import { fallbackLearningPack } from '../data/learningPack'
import {
  CONE_COLLECTION_ASSIST,
  createWorldPhysicsLayout,
  getActiveSpeedZone,
  getActiveSurfaceZone,
  getElevatorDeckY,
  getPushableCollectionAssist,
  getTerrainRampSurfacePosition,
  resolveWorldPhysics,
  type WorldPhysicsLayout,
} from './worldPhysics'

const stopLayout: WorldPhysicsLayout = {
  obstacles: [
    {
      id: 'tree',
      label: '나무',
      x: 0,
      z: 0,
      radius: 0.5,
      response: 'stop',
    },
  ],
  rideableObstacles: [],
  tunnels: [],
  speedZones: [],
  surfaceZones: [],
  terrainRamps: [],
  elevatedPlatforms: [],
  elevators: [],
  pushableProps: [],
  pushRewardSlots: [],
}

describe('world physics', () => {
  it('builds solid scenery and speed routes for every map', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const layout = createWorldPhysicsLayout(stage)
      expect(layout.obstacles.length).toBeGreaterThan(30)
      expect(layout.speedZones.length).toBeGreaterThan(0)
      expect(layout.surfaceZones.length).toBeGreaterThanOrEqual(8)
      expect(
        layout.surfaceZones.filter((zone) => zone.kind === 'grass'),
      ).toHaveLength(2)
      expect(
        layout.surfaceZones.filter((zone) => zone.kind === 'water'),
      ).toHaveLength(stage.theme === 'forest-trail' ? 5 : 2)
      const mudZones = layout.surfaceZones.filter((zone) => zone.kind === 'mud')
      expect(mudZones.length).toBeGreaterThanOrEqual(4)
      expect(new Set(mudZones.map((zone) => zone.assetVariant))).toEqual(
        new Set(['mud-a', 'mud-b']),
      )
      const naturalBlockers = layout.obstacles.filter(
        (obstacle) => obstacle.assetVariant,
      )
      expect(naturalBlockers.length).toBeGreaterThanOrEqual(7)
      expect(
        new Set(naturalBlockers.map((obstacle) => obstacle.assetVariant)),
      ).toEqual(new Set(['tree-root', 'fallen-log-a', 'fallen-log-b']))
      expect(
        naturalBlockers.every(
          (obstacle) =>
            Math.hypot(obstacle.x, obstacle.z) >= 14 &&
            obstacle.colliderHalfWidth !== undefined &&
            obstacle.colliderHalfHeight !== undefined &&
            obstacle.colliderHalfDepth !== undefined,
        ),
      ).toBe(true)
      expect(
        layout.surfaceZones
          .filter((zone) => zone.kind === 'mud')
          .every(
            (zone) =>
              Math.hypot(zone.x, zone.z) >= 10 &&
              (zone.multiplier === 0.48 || zone.multiplier === 0.6),
          ),
      ).toBe(true)
      expect(layout.terrainRamps).toHaveLength(
        stage.theme === 'forest-trail' ? 7 : 5,
      )
      expect(layout.elevatedPlatforms).toHaveLength(2)
      expect(layout.elevators).toHaveLength(2)
      expect(layout.pushableProps.length).toBeGreaterThanOrEqual(18)
      expect(
        layout.pushableProps.filter((prop) => prop.kind === 'block'),
      ).toHaveLength(3)
      expect(
        layout.pushableProps.filter((prop) => prop.kind === 'cone'),
      ).toHaveLength(15)
      expect(
        layout.pushableProps.filter((prop) => prop.kind === 'trash-can'),
      ).toHaveLength(7)
      expect(new Set(layout.pushableProps.map((prop) => prop.label))).toEqual(
        new Set([
          '배송 상자',
          '빨간 장애물 콘',
          '파란 쓰레기통',
          '보물 지킴 콘',
        ]),
      )
      const scatteredProps = layout.pushableProps.filter(
        (prop) => !prop.id.startsWith('treasure-cone'),
      )
      expect(
        new Set(
          scatteredProps.map(
            (prop) => `${Math.sign(prop.x)},${Math.sign(prop.z)}`,
          ),
        ),
      ).toEqual(new Set(['-1,-1', '-1,1', '1,-1', '1,1']))
      expect(
        scatteredProps.some(
          (prop) => Math.hypot(prop.x, prop.z) > stage.mapSize * 0.3,
        ),
      ).toBe(true)
      expect(
        scatteredProps.every((prop) =>
          layout.obstacles.every(
            (obstacle) =>
              Math.hypot(prop.x - obstacle.x, prop.z - obstacle.z) >
              obstacle.radius + 0.55,
          ),
        ),
      ).toBe(true)
      expect(layout.pushRewardSlots).toHaveLength(3)
      expect(
        layout.elevatedPlatforms.every(
          (platform) => platform.y + platform.halfHeight > 3,
        ),
      ).toBe(true)
      expect(
        layout.elevators.every(
          (elevator) => elevator.topY > elevator.bottomY + 2,
        ),
      ).toBe(true)
      expect(
        layout.elevatedPlatforms.every((platform) =>
          layout.elevators.some(
            (elevator) =>
              Math.abs(
                elevator.topY +
                  elevator.halfHeight -
                  (platform.y + platform.halfHeight),
              ) < 0.1 &&
              Math.abs(elevator.z - platform.z) <
                platform.halfDepth &&
              Math.abs(
                elevator.x -
                  elevator.halfWidth -
                  (platform.x + platform.halfWidth),
              ) < 0.1,
          ),
        ),
      ).toBe(true)
      expect(
        layout.surfaceZones.every((zone) => zone.multiplier < 1),
      ).toBe(true)
      expect(layout.rideableObstacles.length).toBeGreaterThan(20)
      expect(
        layout.rideableObstacles.every(
          (obstacle) => obstacle.halfHeight <= 0.12,
        ),
      ).toBe(true)
      expect(layout.obstacles.some((obstacle) => obstacle.label.includes('나무'))).toBe(
        true,
      )
      const interiorTrees = layout.obstacles.filter((obstacle) =>
        obstacle.id.startsWith('interior-tree-'),
      )
      expect(interiorTrees.length).toBeGreaterThanOrEqual(4)
      expect(
        interiorTrees.every(
          (tree) => Math.hypot(tree.x, tree.z) < stage.mapSize * 0.32,
        ),
      ).toBe(true)
      expect(
        interiorTrees.some((tree, index) =>
          interiorTrees.slice(index + 1).some(
            (other) => Math.hypot(tree.x - other.x, tree.z - other.z) < 6,
          ),
        ),
      ).toBe(true)
      expect(createWorldPhysicsLayout(stage)).toEqual(layout)
      expect(layout.obstacles.some((obstacle) => obstacle.label === '공원 의자')).toBe(
        true,
      )
    })
  })

  it('uses the intended natural-obstacle mix for each map theme', () => {
    const expectedByTheme = {
      'sunny-plaza': [3, 2, 2, 2, 2],
      'forest-trail': [6, 4, 4, 5, 5],
      'starlight-river': [3, 2, 3, 2, 3],
    } as const

    fallbackLearningPack.stages.forEach((stage) => {
      const layout = createWorldPhysicsLayout(stage)
      const [roots, logsA, logsB, mudA, mudB] =
        expectedByTheme[stage.theme]

      expect(
        layout.obstacles.filter(
          (obstacle) => obstacle.assetVariant === 'tree-root',
        ),
      ).toHaveLength(roots)
      expect(
        layout.obstacles.filter(
          (obstacle) => obstacle.assetVariant === 'fallen-log-a',
        ),
      ).toHaveLength(logsA)
      expect(
        layout.obstacles.filter(
          (obstacle) => obstacle.assetVariant === 'fallen-log-b',
        ),
      ).toHaveLength(logsB)
      expect(
        layout.surfaceZones.filter(
          (zone) => zone.assetVariant === 'mud-a',
        ),
      ).toHaveLength(mudA)
      expect(
        layout.surfaceZones.filter(
          (zone) => zone.assetVariant === 'mud-b',
        ),
      ).toHaveLength(mudB)
    })
  })

  it('joins each gentle hill to the ground and across its crest', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const hills = createWorldPhysicsLayout(stage).terrainRamps.filter(
        (ramp) => ramp.id.includes('-hill-'),
      )
      expect(hills).toHaveLength(stage.theme === 'forest-trail' ? 6 : 4)

      for (let index = 0; index < hills.length; index += 2) {
        const up = hills[index]
        const down = hills[index + 1]
        const upGround = getTerrainRampSurfacePosition(up, 0, -1)
        const upCrest = getTerrainRampSurfacePosition(up, 0, 1)
        const downCrest = getTerrainRampSurfacePosition(down, 0, -1)
        const downGround = getTerrainRampSurfacePosition(down, 0, 1)

        expect(upGround[1]).toBeGreaterThanOrEqual(0)
        expect(upGround[1]).toBeLessThanOrEqual(0.05)
        expect(downGround[1]).toBeGreaterThanOrEqual(0)
        expect(downGround[1]).toBeLessThanOrEqual(0.05)
        expect(upCrest[1]).toBeGreaterThan(0.55)
        expect(upCrest[1]).toBeLessThan(0.8)
        expect(Math.hypot(upCrest[0] - downCrest[0], upCrest[2] - downCrest[2]))
          .toBeLessThan(0.05)
        expect(upCrest[1]).toBeCloseTo(downCrest[1], 4)
      }
    })
  })

  it('gives the second map extra hills, water, mud, low ridges, and a tunnel', () => {
    const stage = fallbackLearningPack.stages[1]
    const layout = createWorldPhysicsLayout(stage)

    expect(stage.title).toBe('달그늘 탐험숲')
    expect(layout.terrainRamps.filter((ramp) => ramp.id.includes('-hill-')))
      .toHaveLength(6)
    expect(layout.surfaceZones.filter((zone) => zone.kind === 'water'))
      .toHaveLength(5)
    expect(layout.surfaceZones.filter((zone) => zone.kind === 'mud'))
      .toHaveLength(10)
    const ridges = layout.rideableObstacles.filter((obstacle) =>
      obstacle.id.startsWith('forest-ridge-'),
    )
    expect(ridges).toHaveLength(14)
    expect(ridges.every((ridge) => ridge.halfHeight <= 0.12)).toBe(true)
    expect(layout.tunnels).toHaveLength(1)
    expect(layout.tunnels[0]).toMatchObject({
      id: 'moon-water-tunnel',
      label: '달빛 수로 터널',
      halfWidth: 4.4,
      clearanceHeight: 5.4,
    })
    expect(
      layout.surfaceZones.find((zone) => zone.id === 'forest-tunnel-runoff'),
    ).toMatchObject({
      kind: 'water',
      x: layout.tunnels[0].x,
      z: layout.tunnels[0].z,
      rotationY: layout.tunnels[0].rotationY,
    })
  })

  it('does not add the dark-forest tunnel to the other maps', () => {
    expect(createWorldPhysicsLayout(fallbackLearningPack.stages[0]).tunnels)
      .toHaveLength(0)
    expect(createWorldPhysicsLayout(fallbackLearningPack.stages[2]).tunnels)
      .toHaveLength(0)
  })

  it('moves the elevator smoothly from the ground to the second floor', () => {
    const elevator = createWorldPhysicsLayout(
      fallbackLearningPack.stages[0],
    ).elevators[0]

    expect(getElevatorDeckY(elevator, 0)).toBe(elevator.bottomY)
    expect(getElevatorDeckY(elevator, 1)).toBe(elevator.topY)
    expect(getElevatorDeckY(elevator, 0.5)).toBeCloseTo(
      (elevator.bottomY + elevator.topY) / 2,
    )
    expect(getElevatorDeckY(elevator, 0.75)).toBeGreaterThan(
      getElevatorDeckY(elevator, 0.25),
    )
  })

  it('adds a small pickup assist only beside pushable cones', () => {
    const layout = createWorldPhysicsLayout(
      fallbackLearningPack.stages[0],
    )
    const cone = layout.pushableProps.find(
      (prop) => prop.kind === 'cone',
    )

    expect(cone).toBeDefined()
    expect(
      getPushableCollectionAssist(
        {
          position: [
            (cone?.x ?? 0) + 1.6,
            0,
            cone?.z ?? 0,
          ],
        },
        layout.pushableProps,
      ),
    ).toBe(CONE_COLLECTION_ASSIST)
    expect(
      getPushableCollectionAssist(
        { position: [0, 0, 0] },
        [],
      ),
    ).toBe(0)
  })

  it('stops the ball at a solid tree instead of passing through it', () => {
    const step = resolveWorldPhysics(
      {
        startX: -2,
        startZ: 0,
        nextX: -0.8,
        nextZ: 0,
        velocityX: 5,
        velocityZ: 0,
        ballRadius: 0.5,
      },
      stopLayout,
    )

    expect(step.x).toBe(-1)
    expect(step.velocityX).toBe(0)
    expect(step.impact?.response).toBe('stop')
  })

  it('reflects forward motion when the ball hits a springy bench', () => {
    const step = resolveWorldPhysics(
      {
        startX: -2,
        startZ: 0,
        nextX: -0.8,
        nextZ: 0,
        velocityX: 5,
        velocityZ: 0,
        ballRadius: 0.5,
      },
      {
        ...stopLayout,
        obstacles: [{ ...stopLayout.obstacles[0], response: 'bounce' }],
      },
    )

    expect(step.velocityX).toBeLessThan(0)
    expect(step.impact?.response).toBe('bounce')
  })

  it('applies a speed multiplier only while crossing a marked route', () => {
    const layout: WorldPhysicsLayout = {
      obstacles: [],
      rideableObstacles: [],
      tunnels: [],
      speedZones: [
        {
          id: 'route',
          label: '스피드 길',
          x: 0,
          z: 0,
          halfWidth: 3,
          halfDepth: 1,
          rotationY: 0,
          multiplier: 1.3,
        },
      ],
      surfaceZones: [],
      terrainRamps: [],
      elevatedPlatforms: [],
      elevators: [],
      pushableProps: [],
      pushRewardSlots: [],
    }

    expect(getActiveSpeedZone(layout, 2, 0)?.multiplier).toBe(1.3)
    expect(getActiveSpeedZone(layout, 4, 0)).toBeUndefined()
    expect(
      resolveWorldPhysics(
        {
          startX: 2,
          startZ: 0,
          nextX: 2.1,
          nextZ: 0,
          velocityX: 4,
          velocityZ: 0,
          ballRadius: 0.5,
        },
        layout,
      ).speedMultiplier,
    ).toBe(1.3)
  })

  it('slows the ball inside grass and shallow-water surfaces', () => {
    const layout = createWorldPhysicsLayout(
      fallbackLearningPack.stages[0],
    )
    const grass = layout.surfaceZones.find(
      (zone) => zone.kind === 'grass',
    )
    const water = layout.surfaceZones.find(
      (zone) => zone.kind === 'water',
    )

    expect(grass).toBeDefined()
    expect(water).toBeDefined()
    expect(
      getActiveSurfaceZone(layout, grass?.x ?? 0, grass?.z ?? 0)?.kind,
    ).toBe('grass')
    expect(
      getActiveSurfaceZone(layout, water?.x ?? 0, water?.z ?? 0)
        ?.multiplier,
    ).toBeLessThan(grass?.multiplier ?? 1)
  })

  it('slows the ball more strongly inside an imported mud patch', () => {
    const layout = createWorldPhysicsLayout(
      fallbackLearningPack.stages[0],
    )
    const mud = layout.surfaceZones.find((zone) => zone.kind === 'mud')

    expect(mud).toBeDefined()
    expect(
      getActiveSurfaceZone(layout, mud?.x ?? 0, mud?.z ?? 0)?.kind,
    ).toBe('mud')
    expect(mud?.multiplier).toBeLessThan(0.7)
  })

  it('pushes a growing ball out when it starts inside scenery', () => {
    const step = resolveWorldPhysics(
      {
        startX: 0,
        startZ: 0,
        nextX: 0,
        nextZ: 0,
        velocityX: 0,
        velocityZ: 0,
        ballRadius: 1.2,
      },
      stopLayout,
    )

    expect(Number.isFinite(step.x)).toBe(true)
    expect(Math.hypot(step.x, step.z)).toBe(1.7)
  })
})

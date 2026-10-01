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
  landmarks: [],
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
  elevatedWalkways: [],
  elevators: [],
  pushableProps: [],
  pushRewardSlots: [],
}

describe('world physics', () => {
  it('connects both sides of every upper deck to ground without a gap or step', () => {
    for (const stage of fallbackLearningPack.stages) {
      const layout = createWorldPhysicsLayout(stage)
      const approaches = layout.terrainRamps.filter((ramp) => ramp.id.startsWith('upper-deck'))
      // Forest treehouse decks sit near the north edge: one ramp faces the lake.
      const forest = stage.theme === 'forest-trail'
      expect(approaches).toHaveLength(forest ? 2 : 4)
      for (const platform of layout.elevatedPlatforms) {
        const connections = approaches.filter((ramp) => Math.abs(ramp.x - platform.x) < 0.01)
        expect(connections).toHaveLength(forest ? 1 : 2)
        expect(new Set(connections.map((ramp) => Math.sign(ramp.z - platform.z)))).toEqual(new Set(forest ? [1] : [-1, 1]))
        for (const ramp of connections) {
          const ground = getTerrainRampSurfacePosition(ramp, 0, -1)
          const top = getTerrainRampSurfacePosition(ramp, 0, 1)
          expect(ground[1]).toBeCloseTo(0.045, 5)
          expect(top[1]).toBeCloseTo(platform.y + platform.halfHeight + 0.025, 5)
          expect(top[0]).toBeCloseTo(platform.x, 5)
          expect(Math.abs(top[2] - platform.z)).toBeCloseTo(platform.halfDepth, 5)
          expect(Math.abs(ground[2])).toBeLessThan(stage.mapSize / 2 - 6)
          expect(Math.abs(ramp.rotationX)).toBeLessThan(0.17)
          expect(ramp.halfWidth).toBeGreaterThan(3.5)
        }
      }
    }
  })

  it('builds solid scenery and speed routes for every map', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const layout = createWorldPhysicsLayout(stage)
      expect(layout.obstacles.length).toBeGreaterThan(30)
      expect(layout.speedZones.length).toBeGreaterThan(0)
      expect(layout.surfaceZones.length).toBeGreaterThanOrEqual(8)
      expect(
        layout.surfaceZones.filter((zone) => zone.kind === 'grass'),
      ).toHaveLength(3)
      expect(
        layout.surfaceZones.filter((zone) => zone.kind === 'water'),
      ).toHaveLength(stage.theme === 'forest-trail' ? 4 : 3)
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
      const forest = stage.theme === 'forest-trail'
      expect(layout.terrainRamps).toHaveLength(forest ? 6 : 10)
      expect(layout.elevatedPlatforms).toHaveLength(2)
      expect(layout.elevators).toHaveLength(forest ? 0 : 2)
      expect(layout.pushableProps.length).toBeGreaterThanOrEqual(18)
      expect(
        layout.pushableProps.filter((prop) => prop.kind === 'block'),
      ).toHaveLength(forest ? 24 : 3)
      expect(
        layout.pushableProps.filter((prop) => prop.kind === 'cone'),
      ).toHaveLength(forest ? 21 : 27)
      expect(
        layout.pushableProps.filter((prop) => prop.kind === 'trash-can'),
      ).toHaveLength(forest ? 0 : 15)
      expect(new Set(layout.pushableProps.map((prop) => prop.label))).toEqual(
        new Set(forest
          ? ['탐험 보급 상자', '반딧불 버섯', '보물 지킴 버섯']
          : ['배송 상자', '빨간 장애물 콘', '파란 쓰레기통', '보물 지킴 콘']),
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
        forest || layout.elevatedPlatforms.every((platform) =>
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
                Math.abs(elevator.x - platform.x) -
                  elevator.halfWidth - platform.halfWidth,
              ) < 0.1,
          ),
        ),
      ).toBe(true)
      expect(
        layout.surfaceZones
          .filter((zone) => zone.kind !== 'slick')
          .every((zone) => zone.multiplier < 1),
      ).toBe(true)
      expect(
        layout.surfaceZones
          .filter((zone) => zone.kind === 'slick')
          .every(
            (zone) =>
              zone.multiplier >= 1 && (zone.traction ?? 1) < 1,
          ),
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
        obstacle.id.startsWith('interior-tree-') || (obstacle.id.startsWith('park-tree-') && Number(obstacle.id.split('-').at(-1)) < 10),
      )
      expect(interiorTrees.length).toBeGreaterThanOrEqual(10)
      expect(layout.obstacles.filter((obstacle) => obstacle.id.startsWith('park-tree-'))).toHaveLength(26)
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
      // Park benches belong to the open maps; the forest uses landmarks.
      expect(layout.obstacles.some((obstacle) => obstacle.label === '공원 의자')).toBe(
        stage.theme !== 'forest-trail',
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
      expect(hills).toHaveLength(stage.theme === 'forest-trail' ? 4 : 6)

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

  it('rebuilds the second map as a moonshade forest with its own landmarks', () => {
    const stage = fallbackLearningPack.stages[1]
    const layout = createWorldPhysicsLayout(stage)

    expect(stage.title).toBe('달그늘 탐험숲')
    expect(new Set(layout.landmarks.map((landmark) => landmark.kind))).toEqual(
      new Set([
        'treehouse', 'glow-mushroom', 'mushroom-cluster', 'stone-arch',
        'moon-altar', 'explorer-camp', 'lantern',
      ]),
    )
    // No park furniture or steel terraces carried over from the first map.
    expect(layout.obstacles.some((obstacle) => /bench|kiosk|gear-rack/.test(obstacle.id))).toBe(false)
    expect(layout.elevators).toHaveLength(0)
    expect(layout.elevatedWalkways.map((walkway) => walkway.id)).toEqual(['forest-rope-bridge'])
    const lake = layout.surfaceZones.find((zone) => zone.id === 'central-park-pond')!
    expect(lake).toMatchObject({ kind: 'water', label: '달빛 연못' })
    const altar = layout.landmarks.find((landmark) => landmark.kind === 'moon-altar')!
    expect([altar.x, altar.z]).toEqual([lake.x, lake.z])
    expect(layout.rideableObstacles.filter((stone) => stone.id.startsWith('moon-stepping-stone'))).toHaveLength(12)
    // Each deck wraps a treehouse trunk and is joined by the rope bridge.
    layout.elevatedPlatforms.forEach((platform) => {
      expect(layout.obstacles.some((obstacle) =>
        obstacle.id.startsWith('landmark-moon-lodge') &&
        Math.hypot(obstacle.x - platform.x, obstacle.z - platform.z) < 0.01,
      )).toBe(true)
    })
    // Stone arches leave a gap wide enough for the fully grown ball.
    const pillars = layout.obstacles.filter((obstacle) => obstacle.id.includes('stone-arch'))
    expect(pillars).toHaveLength(6)
    for (let index = 0; index < pillars.length; index += 2) {
      const [a, b] = [pillars[index], pillars[index + 1]]
      expect(Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius).toBeGreaterThan(4.6)
    }
    const ridges = layout.rideableObstacles.filter((obstacle) =>
      obstacle.id.startsWith('forest-ridge-'),
    )
    expect(ridges.length).toBeGreaterThanOrEqual(8)
    expect(ridges.every((ridge) => ridge.halfHeight <= 0.12)).toBe(true)
    expect(layout.tunnels).toHaveLength(1)
    expect(layout.tunnels[0]).toMatchObject({
      id: 'moon-water-tunnel',
      label: '속 빈 통나무 터널',
    })
    expect(layout.tunnels[0].x).toBeLessThan(0)
  })

  it('does not add the dark-forest tunnel to the other maps', () => {
    expect(createWorldPhysicsLayout(fallbackLearningPack.stages[0]).tunnels)
      .toHaveLength(0)
    expect(createWorldPhysicsLayout(fallbackLearningPack.stages[2]).tunnels)
      .toHaveLength(0)
  })

  it('covers about 60% of the ice river map with connected low-traction ice', () => {
    fallbackLearningPack.stages.forEach((stage) => {
      const layout = createWorldPhysicsLayout(stage)
      const slickZones = layout.surfaceZones.filter(
        (zone) => zone.kind === 'slick',
      )

      if (stage.theme !== 'starlight-river') {
        expect(slickZones).toHaveLength(0)
        return
      }

      expect(slickZones).toHaveLength(5)
      expect(slickZones.every((zone) => (zone.traction ?? 1) <= 0.055)).toBe(true)
      expect(slickZones.every((zone) => zone.multiplier === 1)).toBe(true)
      expect(
        getActiveSurfaceZone(
          layout,
          slickZones[0].x,
          slickZones[0].z,
        )?.kind,
      ).toBe('slick')

      let sampledPoints = 0
      let sampledIcePoints = 0
      const halfMap = stage.mapSize / 2
      for (let xIndex = 0; xIndex < 81; xIndex += 1) {
        const x = -halfMap + ((xIndex + 0.5) / 81) * stage.mapSize
        for (let zIndex = 0; zIndex < 81; zIndex += 1) {
          const z = -halfMap + ((zIndex + 0.5) / 81) * stage.mapSize
          sampledPoints += 1
          if (getActiveSurfaceZone(layout, x, z)?.kind === 'slick') {
            sampledIcePoints += 1
          }
        }
      }
      const iceCoverage = sampledIcePoints / sampledPoints
      expect(iceCoverage).toBeGreaterThan(0.57)
      expect(iceCoverage).toBeLessThan(0.63)
      expect(
        getActiveSurfaceZone(layout, 0, 0, 0.8),
      ).toBeUndefined()
    })
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
      landmarks: [],
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
      elevatedWalkways: [],
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

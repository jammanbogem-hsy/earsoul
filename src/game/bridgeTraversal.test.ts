import { beforeAll, describe, expect, it } from 'vitest'
import RAPIER from '@dimforge/rapier3d-compat'
import { fallbackLearningPack } from '../data/learningPack'
import { createWorldPhysicsLayout, getActiveSurfaceZone } from './worldPhysics'
import { createTerraceParts, createTerraceWalkwayParts } from './terraceParts'
import { getSizeTier } from './mechanics'

beforeAll(async () => { await RAPIER.init() })

describe('connected park bridges', () => {
  it.each(fallbackLearningPack.stages)('rolls between both decks of $id without falling or meeting a closed railing', (stage) => {
    const layout = createWorldPhysicsLayout(stage)
    const world = new RAPIER.World({ x: 0, y: -16, z: 0 })
    try {
      for (const platform of [...layout.elevatedPlatforms, ...layout.elevatedWalkways]) {
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(platform.x, platform.y, platform.z))
        const assembly = 'railSides' in platform ? createTerraceWalkwayParts(platform) : createTerraceParts(platform)
        for (const collider of assembly.colliders) {
          world.createCollider(RAPIER.ColliderDesc.cuboid(...collider.halfSize).setTranslation(...collider.position).setFriction(0.96), body)
        }
      }
      const [first, last] = layout.elevatedPlatforms
      const spine = layout.elevatedWalkways.find((part) => part.id === 'bridge-park-spine')!
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(first.x, 4.1, first.z).lockRotations().setCcdEnabled(true))
      world.createCollider(RAPIER.ColliderDesc.ball(0.42).setFriction(0.88), body)
      const targets = [[spine.x, first.z], [spine.x, last.z], [last.x, last.z]]
      let waypoint = 0
      for (let step = 0; step < 2500 && waypoint < targets.length; step += 1) {
        const position = body.translation()
        expect(position.y).toBeGreaterThan(3.95)
        const [x, z] = targets[waypoint]
        const distance = Math.hypot(x - position.x, z - position.z)
        if (distance < 0.12) { waypoint += 1; continue }
        body.setLinvel({ x: (x - position.x) / distance * 3.6, y: body.linvel().y, z: (z - position.z) / distance * 3.6 }, true)
        world.step()
      }
      expect(waypoint).toBe(targets.length)
    } finally {
      world.free()
    }
  })

  it('adds a real pond and small collectible trails while keeping big buildings off the bridges', () => {
    for (const stage of fallbackLearningPack.stages) {
      const layout = createWorldPhysicsLayout(stage)
      const pond = layout.surfaceZones.find((zone) => zone.id === 'central-park-pond')!
      expect(getActiveSurfaceZone(layout, pond.x, pond.z)?.kind).toBe('water')
      expect(layout.elevatedWalkways).toHaveLength(5)
      const bridgeItems = stage.objects.filter((item) => item.position[1] > 3.6 && layout.elevatedWalkways.some((bridge) =>
        Math.abs(item.position[0] - bridge.x) < bridge.halfWidth && Math.abs(item.position[2] - bridge.z) < bridge.halfDepth))
      expect(bridgeItems.length).toBeGreaterThanOrEqual(20)
      expect(bridgeItems.every((item) => getSizeTier(item.size).level <= 2)).toBe(true)
    }
  })
})

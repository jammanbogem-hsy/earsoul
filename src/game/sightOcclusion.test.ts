import { describe, expect, it, vi } from 'vitest'
import { Box3, BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { blocksCharacterView, blocksStructureView, createOcclusionFade } from './sightOcclusion'
import { createTerraceRampParts, getTerraceRampQuaternion } from './terraceParts'
import { createWorldPhysicsLayout } from './worldPhysics'
import { fallbackLearningPack } from '../data/learningPack'

describe('character visibility', () => {
  const camera = new Vector3(0, 2, 6)
  const target = new Vector3(0, 1, 0)
  it('detects a blocking wall and a camera inside a structure, but not scenery behind the character', () => {
    expect(blocksCharacterView(new Box3(new Vector3(-2, 0, 2), new Vector3(2, 4, 3)), camera, [target])).toBe(true)
    expect(blocksCharacterView(new Box3(new Vector3(-2, 0, 5), new Vector3(2, 4, 7)), camera, [target])).toBe(true)
    expect(blocksCharacterView(new Box3(new Vector3(-2, 0, -4), new Vector3(2, 4, -2)), camera, [target])).toBe(false)
    expect(blocksCharacterView(new Box3(new Vector3(4, 0, 2), new Vector3(5, 4, 3)), camera, [target])).toBe(false)
  })
  it('fades only the blocked GLB instance and restores its shared original material', () => {
    const original = new MeshStandardMaterial({ opacity: 0.8 })
    const geometry = new BoxGeometry()
    const blocked = new Mesh(geometry, original)
    const otherInstance = new Mesh(geometry, original)
    const root = new Group().add(blocked)
    const fade = createOcclusionFade(root)
    const copy = blocked.material
    const dispose = vi.spyOn(copy, 'dispose')
    fade.setAmount(0.15)
    expect(copy.opacity).toBeCloseTo(0.12)
    expect(copy.depthWrite).toBe(false)
    expect(otherInstance.material.opacity).toBe(0.8)
    expect(original.transparent).toBe(false)
    fade.restore()
    expect(blocked.material).toBe(original)
    expect(dispose).toHaveBeenCalledOnce()
    geometry.dispose()
    original.dispose()
  })
  it('keeps a ramp opaque when standing above it, and fades it when looking through the slab', () => {
    const ramp = createWorldPhysicsLayout(fallbackLearningPack.stages[0]).terrainRamps.find((entry) => entry.id === 'upper-deck-ramp')!
    const matrix = new Matrix4().compose(new Vector3(ramp.x, ramp.y, ramp.z), getTerraceRampQuaternion(ramp), new Vector3(1, 1, 1))
    const boxes = createTerraceRampParts(ramp).colliders
    const from = new Vector3(0, 4, -4).applyMatrix4(matrix)
    const above = new Vector3(0, 1, 0).applyMatrix4(matrix)
    const below = new Vector3(0, -1, 0).applyMatrix4(matrix)
    expect(blocksStructureView(matrix, boxes, from, [above])).toBe(false)
    expect(blocksStructureView(matrix, boxes, from, [below])).toBe(true)
  })
})

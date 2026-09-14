import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { createTerraceParts, createTerraceRampParts, getTerraceRampQuaternion } from './terraceParts'
import { getTerrainRampSurfacePosition, type ElevatedPlatform, type TerrainRamp } from './worldPhysics'

const platform: ElevatedPlatform = {
  id: 'test-terrace', label: '전망대', color: '#DAD9C0', x: 0, y: 3.43, z: 0,
  halfWidth: 7.4, halfDepth: 6.6, halfHeight: 0.22, rotationY: 0,
}
const ramp: TerrainRamp = {
  id: 'upper-deck-test', label: '경사로', color: '#DAD9C0', x: 6, y: 1.8, z: -3,
  halfWidth: 3.7, halfHeight: 0.13, halfDepth: 12, rotationX: 0.14, rotationY: 0.73,
}

describe('terrace structure passages', () => {
  it('keeps both ramp entrances and the elevator landing open above the deck', () => {
    const colliders = createTerraceParts(platform).colliders.filter((part) => part.position[1] > platform.halfHeight)
    for (const part of colliders) {
      const minX = part.position[0] - part.halfSize[0]
      const maxX = part.position[0] + part.halfSize[0]
      const minZ = part.position[2] - part.halfSize[2]
      const maxZ = part.position[2] + part.halfSize[2]
      if (Math.abs(part.position[2]) > 6.2) {
        expect(minX >= 3.7 || maxX <= -3.7).toBe(true)
      }
      if (part.position[0] > 7) {
        expect(minZ >= 2.3 || maxZ <= -2.3).toBe(true)
      }
    }
  })

  it('gives every visible ground support a matching cuboid without blocking the central passage', () => {
    const assembly = createTerraceParts(platform)
    const columns = assembly.frame.filter((part) => part.id.endsWith('-column'))
    expect(columns).toHaveLength(4)
    for (const column of columns) {
      const collider = assembly.colliders.find((part) => part.id === column.id)
      expect(collider?.halfSize).toEqual(column.size.map((value) => value / 2))
      expect(Math.abs(column.position[0])).toBeGreaterThan(6)
      expect(column.position[1] - column.size[1] / 2 + platform.y).toBeCloseTo(0.22)
    }
  })

  it('keeps approach collision smooth and matches yaw-then-pitch physics surface coordinates', () => {
    const assembly = createTerraceRampParts(ramp)
    expect(assembly.colliders).toHaveLength(3)
    const quaternion = getTerraceRampQuaternion(ramp)
    for (const [xRatio, zRatio] of [[0, -1], [0, 1], [0.7, 0.3]]) {
      const actual = new Vector3(ramp.halfWidth * xRatio, ramp.halfHeight, ramp.halfDepth * zRatio)
        .applyQuaternion(quaternion).add(new Vector3(ramp.x, ramp.y, ramp.z))
      const expected = getTerrainRampSurfacePosition(ramp, xRatio, zRatio)
      // The layout helper lifts surface markers 2.5 cm clear of the collider.
      expected[1] -= 0.025
      actual.toArray().forEach((value, index) => expect(value).toBeCloseTo(expected[index], 9))
    }
  })
})

import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { createTerraceParts, createTerraceRampParts, createTerraceWalkwayParts, getTerraceRampQuaternion } from './terraceParts'
import { getTerrainRampSurfacePosition, type ElevatedPlatform, type ElevatedWalkway, type TerrainRamp } from './worldPhysics'

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

  it.each([
    { bridgeSide: 'west', elevatorSide: 'east' },
    { bridgeSide: 'east', elevatorSide: 'west' },
  ] as const)('opens the $bridgeSide bridge and $elevatorSide elevator approaches independently', (sides) => {
    const assembly = createTerraceParts({ ...platform, ...sides })
    for (const side of ['west', 'east'] as const) {
      const sign = side === 'west' ? -1 : 1
      const guards = assembly.colliders.filter((part) =>
        part.position[1] > platform.halfHeight && part.position[0] * sign > 7,
      )
      expect(guards).toHaveLength(2)
      const freeHalfWidth = side === sides.bridgeSide ? 3.7 : 2.3
      guards.forEach((part) => {
        expect(Math.abs(part.position[2]) - part.halfSize[2]).toBeGreaterThanOrEqual(freeHalfWidth)
      })
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

describe('connected upper walkways', () => {
  const walkway: ElevatedWalkway = {
    id: 'bridge-center', label: '연결 다리', color: '#DAD9C0', x: -5, y: 3.43, z: 0,
    halfWidth: 3.7, halfDepth: 24.5, halfHeight: 0.22, rotationY: 0, railSides: ['east', 'west'],
  }

  it('supports a long span with paired columns while keeping a broad ground-floor center passage', () => {
    const assembly = createTerraceWalkwayParts(walkway)
    const columns = assembly.colliders.filter((part) => part.id.endsWith('-column'))
    const rowPositions = [...new Set(columns.map((part) => part.position[2]))].sort((a, b) => a - b)
    expect(columns).toHaveLength(12)
    rowPositions.forEach((z, index) => {
      const pair = columns.filter((part) => part.position[2] === z)
      expect(pair).toHaveLength(2)
      expect(pair[0].position[0]).toBeCloseTo(-pair[1].position[0])
      expect(Math.abs(pair[0].position[0]) - pair[0].halfSize[0]).toBeGreaterThan(2.7)
      if (index > 0) {
        expect(z - rowPositions[index - 1]).toBeGreaterThanOrEqual(9)
        expect(z - rowPositions[index - 1]).toBeLessThanOrEqual(12)
      }
    })
    expect(assembly.colliders).toHaveLength(1 + columns.length * 2 + walkway.railSides.length)
  })

  it.each([
    { halfWidth: 3.7, halfDepth: 24.5, railSides: ['east', 'west'] as ElevatedWalkway['railSides'] },
    { halfWidth: 9.5, halfDepth: 3.7, railSides: ['north', 'south'] as ElevatedWalkway['railSides'] },
    { halfWidth: 3.7, halfDepth: 3.7, railSides: ['north', 'west'] as ElevatedWalkway['railSides'] },
    { halfWidth: 3.7, halfDepth: 3.7, railSides: ['south', 'east'] as ElevatedWalkway['railSides'] },
  ])('keeps bridge pieces within their footprint and rails only on designated sides', (section) => {
    const model = { ...walkway, ...section }
    const assembly = createTerraceWalkwayParts(model)
    const slab = assembly.colliders.find((part) => part.id === 'walkway-slab')
    expect(slab?.halfSize).toEqual([model.halfWidth, model.halfHeight, model.halfDepth])
    const guards = assembly.colliders.filter((part) => part.id.endsWith('-guard'))
    expect(guards.map((part) => part.id).sort()).toEqual(section.railSides.map((side) => `walkway-${side}-guard`).sort())
    for (const collider of assembly.colliders) {
      expect(Math.abs(collider.position[0]) + collider.halfSize[0]).toBeLessThanOrEqual(model.halfWidth + 1e-9)
      expect(Math.abs(collider.position[2]) + collider.halfSize[2]).toBeLessThanOrEqual(model.halfDepth + 1e-9)
      expect(collider.position[1] - collider.halfSize[1] + model.y).toBeGreaterThanOrEqual(-1e-9)
    }
    const columns = assembly.colliders.filter((part) => part.id.endsWith('-column'))
    columns.forEach((part) => expect(part.position[1] + part.halfSize[1]).toBeCloseTo(-model.halfHeight))
    expect(assembly.deck.filter((part) => part.id.startsWith('walkway-slat'))).not.toHaveLength(0)
  })
})

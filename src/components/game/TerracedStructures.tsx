import { useEffect, useMemo } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, Color, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ElevatedPlatform, TerrainRamp } from '../../game/worldPhysics'
import {
  createTerraceParts,
  createTerraceRampParts,
  getTerraceRampQuaternion,
  type TerraceAssembly,
  type TerracePart,
} from '../../game/terraceParts'

function mergeParts(parts: TerracePart[]) {
  if (parts.length === 0) return null
  const sources = parts.map((part) => {
    const source = part.bevel
      ? new RoundedBoxGeometry(...part.size, 1, part.bevel)
      : new BoxGeometry(...part.size).toNonIndexed()
    const rotation = new Quaternion().setFromEuler(new Euler(...(part.rotation ?? [0, 0, 0])))
    source.applyMatrix4(new Matrix4().compose(
      new Vector3(...part.position), rotation, new Vector3(1, 1, 1),
    ))
    const color = new Color(part.color)
    const colors = new Float32Array(source.getAttribute('position').count * 3)
    for (let index = 0; index < colors.length; index += 3) {
      colors[index] = color.r
      colors[index + 1] = color.g
      colors[index + 2] = color.b
    }
    source.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return source
  })
  const geometry = mergeGeometries(sources)
  sources.forEach((source) => source.dispose())
  geometry?.computeBoundingSphere()
  return geometry
}

function AssemblyMeshes({ assembly, castShadow }: { assembly: TerraceAssembly; castShadow: boolean }) {
  const geometries = useMemo(
    () => [mergeParts(assembly.deck), mergeParts(assembly.frame), mergeParts(assembly.railing)],
    [assembly],
  )
  useEffect(() => () => geometries.forEach((geometry) => geometry?.dispose()), [geometries])
  return (
    <>
      {geometries.map((geometry, index) => geometry && (
        <mesh key={index} name={`terrace-batch-${index}`} geometry={geometry} castShadow={castShadow} receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
        </mesh>
      ))}
      {assembly.colliders.map((collider) => (
        <CuboidCollider key={collider.id} name={collider.id} args={collider.halfSize} position={collider.position} friction={0.96} restitution={0} />
      ))}
    </>
  )
}

function Terrace({ platform, castShadow }: { platform: ElevatedPlatform; castShadow: boolean }) {
  const assembly = useMemo(() => createTerraceParts(platform), [platform])
  return (
    <RigidBody
      name={`terrace-${platform.id}`} type="fixed" colliders={false}
      position={[platform.x, platform.y, platform.z]} rotation={[0, platform.rotationY, 0]}
      userData={{ sightOccluder: true, sightBoxes: assembly.colliders, physics: { kind: 'rideable', label: platform.label, response: 'bounce', quiet: true } }}
    >
      <AssemblyMeshes assembly={assembly} castShadow={castShadow} />
    </RigidBody>
  )
}

function Approach({ ramp, castShadow }: { ramp: TerrainRamp; castShadow: boolean }) {
  const assembly = useMemo(() => createTerraceRampParts(ramp), [ramp])
  const quaternion = useMemo(() => getTerraceRampQuaternion(ramp), [ramp])
  return (
    <RigidBody
      name={`approach-${ramp.id}`} type="fixed" colliders={false}
      position={[ramp.x, ramp.y, ramp.z]} quaternion={quaternion}
      userData={{ sightOccluder: true, sightBoxes: assembly.colliders, physics: { kind: 'rideable', label: ramp.label, response: 'bounce', quiet: true } }}
    >
      <AssemblyMeshes assembly={assembly} castShadow={castShadow} />
    </RigidBody>
  )
}

export function TerracedStructures({ platforms, ramps, castShadow }: {
  platforms: readonly ElevatedPlatform[]
  ramps: readonly TerrainRamp[]
  castShadow: boolean
}) {
  return (
    <group name="terraced-structures">
      {platforms.map((platform) => <Terrace key={platform.id} platform={platform} castShadow={castShadow} />)}
      {ramps.map((ramp) => <Approach key={ramp.id} ramp={ramp} castShadow={castShadow} />)}
    </group>
  )
}

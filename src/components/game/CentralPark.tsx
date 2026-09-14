import { useEffect, useMemo } from 'react'
import { ConvexHullCollider, RigidBody } from '@react-three/rapier'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from 'three'
import { getTerrainRampSurfacePosition, type SurfaceZone, type TerrainRamp } from '../../game/worldPhysics'

function ParkHill({ ramps }: { ramps: readonly TerrainRamp[] }) {
  const geometry = useMemo(() => {
    const [up, down] = ramps
    const points = [
      getTerrainRampSurfacePosition(up, -1, -1), getTerrainRampSurfacePosition(up, 1, -1),
      getTerrainRampSurfacePosition(up, -1, 1), getTerrainRampSurfacePosition(up, 1, 1),
      getTerrainRampSurfacePosition(down, -1, 1), getTerrainRampSurfacePosition(down, 1, 1),
    ].map(([x, y, z]) => [x, y - 0.025, z])
    const faces = [[0, 2, 4], [1, 5, 3], [0, 1, 3], [0, 3, 2], [2, 3, 5], [2, 5, 4], [4, 5, 1], [4, 1, 0]]
    const positions: number[] = []
    const colors: number[] = []
    faces.forEach((face, index) => {
      const color = new Color(index < 2 ? '#7A9C5B' : index < 4 ? '#96C675' : '#84B86A')
      face.forEach((point) => {
        positions.push(...points[point])
        colors.push(color.r, color.g, color.b)
      })
    })
    const mesh = new BufferGeometry()
    mesh.setAttribute('position', new Float32BufferAttribute(positions, 3))
    mesh.setAttribute('color', new Float32BufferAttribute(colors, 3))
    mesh.computeVertexNormals()
    return { mesh, hull: new Float32Array(points.flat()) }
  }, [ramps])
  useEffect(() => () => geometry.mesh.dispose(), [geometry])
  return (
    <RigidBody type="fixed" colliders={false} name="central-park-hill"
      userData={{ physics: { kind: 'rideable', label: '공원 산책 언덕', response: 'bounce', quiet: true } }}>
      {/* Six vertices form one simple convex prism, not a terrain triangle mesh. */}
      <ConvexHullCollider args={[geometry.hull]} friction={0.94} restitution={0} />
      <mesh geometry={geometry.mesh} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} side={DoubleSide} />
      </mesh>
    </RigidBody>
  )
}

export function CentralPark({ zones, ramps }: { zones: readonly SurfaceZone[]; ramps: readonly TerrainRamp[] }) {
  const lawn = zones.find((zone) => zone.id === 'central-park-lawn')!
  const pond = zones.find((zone) => zone.id === 'central-park-pond')!
  const hills = useMemo(() => ramps.filter((ramp) => ramp.id.startsWith('central-park-hill')), [ramps])
  return (
    <group name="central-park">
      <group position={[lawn.x, 0.052, lawn.z]} rotation={[0, lawn.rotationY, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[lawn.halfWidth, lawn.halfDepth, 1]} receiveShadow>
          <circleGeometry args={[1, 64]} />
          <meshStandardMaterial color={lawn.color} roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} scale={[lawn.halfWidth, lawn.halfDepth, 1]}>
          <ringGeometry args={[0.86, 0.965, 64]} />
          <meshBasicMaterial color="#DFD1B3" />
        </mesh>
      </group>
      <group position={[pond.x, 0.061, pond.z]} rotation={[0, pond.rotationY, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[pond.halfWidth, pond.halfDepth, 1]}>
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial color="#449BAE" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[pond.halfWidth, pond.halfDepth, 1]}>
          <ringGeometry args={[0.98, 1.14, 64]} />
          <meshBasicMaterial color="#D5CBB0" />
        </mesh>
        {[[-0.42, 0.13], [0.32, -0.23], [0.45, -0.4]].map(([x, z], index) => (
          <mesh key={index} position={[pond.halfWidth * x, 0.035, pond.halfDepth * z]} rotation={[-Math.PI / 2, 0, index]}>
            <circleGeometry args={[0.32 + index * 0.08, 9, 0.25, Math.PI * 1.85]} />
            <meshBasicMaterial color={index === 1 ? '#7BB677' : '#539D70'} />
          </mesh>
        ))}
      </group>
      <ParkHill ramps={hills} />
    </group>
  )
}

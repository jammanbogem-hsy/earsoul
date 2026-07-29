import { Html } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MutableRefObject,
} from 'react'
import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { ControlVector } from './TouchJoystick'
import type { LearningObject } from '../types'
import { canCollect, getSizeTier } from '../game/mechanics'
import { MaterialIcon } from './MaterialIcon'

interface GameCanvasProps {
  objects: LearningObject[]
  collectedIds: string[]
  ballRadius: number
  paused: boolean
  reducedMotion: boolean
  controlVector: ControlVector
  onCollect: (item: LearningObject) => void
  onTooLarge: (item: LearningObject) => void
}

const SUBJECT_COLORS = {
  한글: '#FF7B66',
  수학: '#4169D8',
  과학: '#19815F',
  생활: '#E6A800',
}

interface MotionState {
  x: number
  z: number
  speed: number
}

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true
    }
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return keys
}

function LearningShape({ item }: { item: LearningObject }) {
  const material = (
    <meshStandardMaterial
      color={item.color}
      roughness={0.62}
      metalness={0.02}
    />
  )

  if (item.shape === 'sphere') {
    return (
      <mesh castShadow>
        <sphereGeometry args={[0.62, 20, 16]} />
        {material}
      </mesh>
    )
  }

  if (item.shape === 'cylinder') {
    return (
      <mesh castShadow rotation={[0, 0, Math.PI * 0.02]}>
        <cylinderGeometry args={[0.5, 0.58, 1, 20]} />
        {material}
      </mesh>
    )
  }

  if (item.shape === 'cone') {
    return (
      <mesh castShadow>
        <coneGeometry args={[0.64, 1, 3]} />
        {material}
      </mesh>
    )
  }

  if (item.shape === 'torus') {
    return (
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.2, 12, 28]} />
        {material}
      </mesh>
    )
  }

  if (item.shape === 'pencil') {
    return (
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1.05, 8]} />
          {material}
        </mesh>
        <mesh castShadow position={[0, 0.65, 0]}>
          <coneGeometry args={[0.2, 0.3, 8]} />
          <meshStandardMaterial color="#F1C89A" roughness={0.75} />
        </mesh>
      </group>
    )
  }

  if (item.shape === 'book') {
    return (
      <group rotation={[0, 0.2, -0.08]}>
        <mesh castShadow scale={[1, 0.24, 0.76]}>
          <boxGeometry />
          {material}
        </mesh>
        <mesh position={[0, 0.14, 0]} scale={[0.88, 0.05, 0.66]}>
          <boxGeometry />
          <meshStandardMaterial color="#FFFDF7" roughness={0.9} />
        </mesh>
      </group>
    )
  }

  return (
    <mesh castShadow scale={[1, item.shape === 'letter' ? 0.28 : 0.75, 0.82]}>
      <boxGeometry />
      {material}
    </mesh>
  )
}

function LearningItem({
  item,
  reducedMotion,
  available,
}: {
  item: LearningObject
  reducedMotion: boolean
  available: boolean
}) {
  const group = useRef<Group>(null)
  const tier = getSizeTier(item.size)
  const visualScale = [0.34, 0.65, 1.04, 1.45][tier.level - 1]
  const phase = useMemo(
    () => item.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0),
    [item.id],
  )

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.y =
      visualScale * 0.58 + Math.sin(clock.elapsedTime * 1.4 + phase) * 0.045
    group.current.rotation.y += 0.003
  })

  return (
    <group
      ref={group}
      position={[item.position[0], visualScale * 0.58, item.position[2]]}
      scale={visualScale}
    >
      {Array.from({ length: tier.level }, (_, index) => (
        <mesh
          key={`tier-ring-${index}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.49 + index * 0.002, 0]}
          receiveShadow
        >
          <ringGeometry
            args={[0.68 + index * 0.16, 0.75 + index * 0.16, 28]}
          />
          <meshBasicMaterial
            color={available ? tier.color : SUBJECT_COLORS[item.subject]}
            transparent
            opacity={available ? 0.52 : 0.2}
          />
        </mesh>
      ))}
      <LearningShape item={item} />
      <Html
        center
        position={[0, 1.02, 0]}
        distanceFactor={8}
        zIndexRange={[1, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span
          aria-hidden="true"
          className={`world-size-badge ${available ? 'is-available' : ''}`}
          style={{ '--tier-color': tier.color } as CSSProperties}
        >
          <b>{tier.level}</b>
          {tier.label}
          <i>
            <MaterialIcon name={available ? 'check' : 'arrow_upward'} />
          </i>
        </span>
      </Html>
      {item.symbol && (
        <Html
          center
          position={[0, 0, 0.44]}
          distanceFactor={7}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="world-symbol" aria-hidden="true">
            {item.symbol}
          </span>
        </Html>
      )}
    </group>
  )
}

function ChildPusher({
  ballRadius,
  motion,
  reducedMotion,
}: {
  ballRadius: number
  motion: MutableRefObject<MotionState>
  reducedMotion: boolean
}) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)

  useFrame(({ clock }, delta) => {
    if (!root.current) return

    const { x, z, speed } = motion.current
    const distance = ballRadius + 0.48
    const sideOffset = 0.32
    const targetX = -x * distance + z * sideOffset
    const targetZ = -z * distance - x * sideOffset
    root.current.position.x = MathUtils.damp(
      root.current.position.x,
      targetX,
      12,
      delta,
    )
    root.current.position.z = MathUtils.damp(
      root.current.position.z,
      targetZ,
      12,
      delta,
    )
    root.current.position.y = -ballRadius
    root.current.rotation.y =
      Math.atan2(-x, -z) - Math.atan2(sideOffset, distance)

    const stride = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 10) * speed
    const bob = reducedMotion ? 0 : Math.abs(stride) * 0.035
    if (body.current) body.current.position.y = bob
    if (leftLeg.current) leftLeg.current.rotation.x = stride * 0.55
    if (rightLeg.current) rightLeg.current.rotation.x = -stride * 0.55
    if (leftArm.current) leftArm.current.rotation.z = stride * 0.08
    if (rightArm.current) rightArm.current.rotation.z = -stride * 0.08
  })

  return (
    <group ref={root} position={[0, -ballRadius, ballRadius + 0.48]}>
      <group ref={body}>
        <mesh castShadow position={[0, 1.42, 0]}>
          <sphereGeometry args={[0.27, 16, 12]} />
          <meshStandardMaterial color="#F2B38A" roughness={0.72} />
        </mesh>
        <mesh castShadow position={[0, 1.53, 0.015]} scale={[1.04, 0.56, 1.03]}>
          <sphereGeometry args={[0.275, 14, 10]} />
          <meshStandardMaterial color="#3C2E39" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.94, 0]} scale={[0.52, 0.62, 0.34]}>
          <boxGeometry />
          <meshStandardMaterial color="#45A7A0" roughness={0.78} />
        </mesh>
        <mesh castShadow position={[0, 0.95, 0.2]} scale={[0.38, 0.42, 0.18]}>
          <boxGeometry />
          <meshStandardMaterial color="#F2C94C" roughness={0.82} />
        </mesh>
        <group ref={leftArm} position={[-0.36, 1.08, -0.03]} rotation={[1, 0, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.075, 0.08, 0.46, 10]} />
            <meshStandardMaterial color="#F2B38A" roughness={0.72} />
          </mesh>
          <mesh castShadow position={[0, -0.46, 0]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#F2B38A" roughness={0.72} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.36, 1.08, -0.03]} rotation={[1, 0, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.075, 0.08, 0.46, 10]} />
            <meshStandardMaterial color="#F2B38A" roughness={0.72} />
          </mesh>
          <mesh castShadow position={[0, -0.46, 0]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#F2B38A" roughness={0.72} />
          </mesh>
        </group>
        <group ref={leftLeg} position={[-0.15, 0.62, 0]}>
          <mesh castShadow position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.095, 0.09, 0.52, 10]} />
            <meshStandardMaterial color="#374151" roughness={0.86} />
          </mesh>
          <mesh castShadow position={[0, -0.54, -0.045]} scale={[0.22, 0.11, 0.34]}>
            <boxGeometry />
            <meshStandardMaterial color="#FFFDF7" roughness={0.88} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.15, 0.62, 0]}>
          <mesh castShadow position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.095, 0.09, 0.52, 10]} />
            <meshStandardMaterial color="#374151" roughness={0.86} />
          </mesh>
          <mesh castShadow position={[0, -0.54, -0.045]} scale={[0.22, 0.11, 0.34]}>
            <boxGeometry />
            <meshStandardMaterial color="#FFFDF7" roughness={0.88} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function MotionEffects({
  ballRadius,
  motion,
  reducedMotion,
}: {
  ballRadius: number
  motion: MutableRefObject<MotionState>
  reducedMotion: boolean
}) {
  const puffs = useRef<(Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const { x, z, speed } = motion.current
    puffs.current.forEach((puff, index) => {
      if (!puff) return
      const sideX = -z
      const sideZ = x
      const phase = (clock.elapsedTime * 3.4 + index * 0.7) % 1
      const spread = (index % 2 ? 1 : -1) * (0.2 + index * 0.06)
      const behind = ballRadius * 0.55 + phase * 0.85
      puff.position.set(
        -x * behind + sideX * spread,
        -ballRadius + 0.055,
        -z * behind + sideZ * spread,
      )
      const material = puff.material as MeshBasicMaterial
      material.opacity = reducedMotion ? 0 : speed * (1 - phase) * 0.32
      const scale = 0.7 + phase * 1.6
      puff.scale.set(scale, 0.18, scale * 0.72)
    })
  })

  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh
          key={`roll-puff-${index}`}
          ref={(mesh) => {
            puffs.current[index] = mesh
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.16, 12]} />
          <meshBasicMaterial
            color="#FFF3D4"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function Decoration({
  index,
  radius,
  color,
}: {
  index: number
  radius: number
  color: string
}) {
  const theta = index * 2.399963
  const y = 1 - ((index + 1) / 13) * 2
  const ring = Math.sqrt(Math.max(0, 1 - y * y))
  const position: [number, number, number] = [
    Math.cos(theta) * ring * radius * 0.94,
    y * radius * 0.94,
    Math.sin(theta) * ring * radius * 0.94,
  ]

  return (
    <mesh position={position} scale={Math.max(0.09, radius * 0.115)} castShadow>
      {index % 3 === 0 ? (
        <boxGeometry />
      ) : (
        <sphereGeometry args={[0.75, 10, 8]} />
      )}
      <meshStandardMaterial color={color} roughness={0.58} />
    </mesh>
  )
}

function GameWorld({
  objects,
  collectedIds,
  ballRadius,
  paused,
  reducedMotion,
  controlVector,
  onCollect,
  onTooLarge,
}: GameCanvasProps) {
  const player = useRef<Group>(null)
  const orb = useRef<Group>(null)
  const keys = useKeyboard()
  const { camera } = useThree()
  const collectedSet = useRef(new Set(collectedIds))
  const tooLargeCooldown = useRef(0)
  const cameraPosition = useRef(new Vector3(0, 7, 8))
  const lookTarget = useRef(new Vector3())
  const rollAxis = useRef(new Vector3())
  const rollQuaternion = useRef(new Quaternion())
  const motion = useRef<MotionState>({ x: 0, z: -1, speed: 0 })

  useEffect(() => {
    collectedSet.current = new Set(collectedIds)
  }, [collectedIds])

  useFrame((state, delta) => {
    if (!player.current) return

    const position = player.current.position
    if (!paused) {
      const keyboardX =
        (keys.current.d || keys.current.arrowright ? 1 : 0) -
        (keys.current.a || keys.current.arrowleft ? 1 : 0)
      const keyboardZ =
        (keys.current.s || keys.current.arrowdown ? 1 : 0) -
        (keys.current.w || keys.current.arrowup ? 1 : 0)
      let moveX = keyboardX + controlVector.x
      let moveZ = keyboardZ + controlVector.z
      const length = Math.hypot(moveX, moveZ)

      if (length > 0.05) {
        moveX /= Math.max(1, length)
        moveZ /= Math.max(1, length)
        const speed = Math.max(2.6, 4.1 - ballRadius * 0.45)
        const step = speed * delta
        position.x = MathUtils.clamp(position.x + moveX * step, -9.3, 9.3)
        position.z = MathUtils.clamp(position.z + moveZ * step, -9.3, 9.3)

        motion.current.x = moveX
        motion.current.z = moveZ
        motion.current.speed = MathUtils.damp(
          motion.current.speed,
          1,
          12,
          delta,
        )

        if (orb.current) {
          rollAxis.current.set(moveZ, 0, -moveX).normalize()
          rollQuaternion.current.setFromAxisAngle(
            rollAxis.current,
            step / Math.max(0.3, ballRadius),
          )
          orb.current.quaternion.premultiply(rollQuaternion.current)
        }
      } else {
        motion.current.speed = MathUtils.damp(
          motion.current.speed,
          0,
          9,
          delta,
        )
      }

      position.y = ballRadius

      for (const item of objects) {
        if (collectedSet.current.has(item.id)) continue

        const distance = Math.hypot(
          item.position[0] - position.x,
          item.position[2] - position.z,
        )
        const touchesItem = distance < ballRadius + item.size * 0.64

        if (touchesItem && canCollect(ballRadius, item.size)) {
          collectedSet.current.add(item.id)
          onCollect(item)
        } else if (
          touchesItem &&
          state.clock.elapsedTime > tooLargeCooldown.current
        ) {
          tooLargeCooldown.current = state.clock.elapsedTime + 1.7
          onTooLarge(item)
        }
      }
    }

    const cameraDistance = 7.1 + ballRadius * 1.7
    cameraPosition.current.set(
      position.x,
      5.8 + ballRadius * 1.4,
      position.z + cameraDistance,
    )
    camera.position.lerp(cameraPosition.current, reducedMotion ? 0.16 : 0.08)
    lookTarget.current.set(position.x, ballRadius * 0.5, position.z)
    camera.lookAt(lookTarget.current)
  })

  const visibleObjects = objects.filter(
    (item) => !collectedIds.includes(item.id),
  )
  const decorationColors = objects
    .filter((item) => collectedIds.includes(item.id))
    .slice(-12)
    .map((item) => item.color)

  return (
    <>
      <color attach="background" args={['#D9F2FF']} />
      <fog attach="fog" args={['#D9F2FF', 16, 30]} />
      <ambientLight intensity={1.45} />
      <directionalLight
        castShadow
        position={[6, 12, 8]}
        intensity={2.1}
        color={new Color('#FFF3D0')}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={['#E6F6FF', '#77A869', 1.1]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[23, 23]} />
        <meshStandardMaterial color="#DFF3D8" roughness={0.94} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        receiveShadow
      >
        <ringGeometry args={[3.5, 4.25, 48]} />
        <meshStandardMaterial color="#F6E5BD" roughness={0.96} />
      </mesh>

      {Array.from({ length: 20 }, (_, index) => {
        const angle = (index / 20) * Math.PI * 2
        const radius = 10.4
        return (
          <group
            key={`garden-edge-${index}`}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
          >
            <mesh position={[0, 0.32, 0]} castShadow>
              <sphereGeometry args={[0.42 + (index % 3) * 0.08, 10, 8]} />
              <meshStandardMaterial
                color={index % 2 ? '#76B947' : '#56A35A'}
                roughness={0.9}
              />
            </mesh>
            {index % 4 === 0 && (
              <mesh position={[0.24, 0.72, 0]} castShadow>
                <sphereGeometry args={[0.14, 8, 6]} />
                <meshStandardMaterial color="#FFF1A8" />
              </mesh>
            )}
          </group>
        )
      })}

      {visibleObjects.map((item) => (
        <LearningItem
          key={item.id}
          item={item}
          reducedMotion={reducedMotion}
          available={canCollect(ballRadius, item.size)}
        />
      ))}

      <group ref={player} position={[0, ballRadius, 0]}>
        <group ref={orb}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[ballRadius, 32, 24]} />
            <meshStandardMaterial
              color="#FFF1D3"
              roughness={0.62}
              metalness={0.02}
            />
          </mesh>
          {[0, Math.PI / 3, -Math.PI / 3].map((rotation, index) => (
            <mesh key={`rolling-band-${index}`} rotation={[rotation, 0, index * 0.9]}>
              <torusGeometry
                args={[ballRadius * 0.945, ballRadius * 0.063, 10, 56]}
              />
              <meshStandardMaterial
                color={['#45A7A0', '#F2C94C', '#FF7B66'][index]}
                roughness={0.58}
              />
            </mesh>
          ))}
          {[
            [0, 0, 0.98],
            [0.74, 0.48, 0.44],
            [-0.72, 0.55, 0.4],
            [0.68, -0.58, -0.4],
            [-0.65, -0.62, -0.42],
          ].map((direction, index) => (
            <mesh
              key={`rolling-dot-${index}`}
              position={[
                direction[0] * ballRadius,
                direction[1] * ballRadius,
                direction[2] * ballRadius,
              ]}
              scale={ballRadius * (index === 0 ? 0.13 : 0.1)}
            >
              <sphereGeometry args={[1, 12, 9]} />
              <meshStandardMaterial
                color={['#4169D8', '#45A7A0', '#FF7B66'][index % 3]}
                roughness={0.55}
              />
            </mesh>
          ))}
          {decorationColors.map((color, index) => (
            <Decoration
              key={`${collectedIds[collectedIds.length - decorationColors.length + index]}-${index}`}
              index={index}
              radius={ballRadius}
              color={color}
            />
          ))}
        </group>
        <MotionEffects
          ballRadius={ballRadius}
          motion={motion}
          reducedMotion={reducedMotion}
        />
        <ChildPusher
          ballRadius={ballRadius}
          motion={motion}
          reducedMotion={reducedMotion}
        />
      </group>
    </>
  )
}

export function GameCanvas(props: GameCanvasProps) {
  return (
    <Canvas
      className="game-canvas"
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [0, 7, 8], fov: 48, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <GameWorld {...props} />
    </Canvas>
  )
}

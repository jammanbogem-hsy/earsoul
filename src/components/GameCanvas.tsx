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
import {
  getDriveControl,
  stepRelativeDrive,
  type DriveControl,
} from '../game/input'
import { stepRollingMotion } from '../game/rollingMotion'
import { MaterialIcon } from './MaterialIcon'
import {
  AttachedObjectMesh,
  GardenSetDressing,
  LearningObjectMesh,
} from './game/GameSceneAssets'

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

const PARK_SIZE = 58
const PARK_HALF_EXTENT = PARK_SIZE / 2

interface MotionState {
  x: number
  z: number
  speed: number
  velocityX: number
  velocityZ: number
}

function useKeyboard(disabled: boolean) {
  const keys = useRef<Record<DriveControl, boolean>>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  useEffect(() => {
    const clear = () => {
      keys.current.forward = false
      keys.current.backward = false
      keys.current.left = false
      keys.current.right = false
    }
    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.matches('button, input, textarea, select, [contenteditable="true"]') ||
        Boolean(target.closest('[role="dialog"]')))
    const down = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) return
      const control = getDriveControl(event)
      if (!control) return
      keys.current[control] = true
      event.preventDefault()
    }
    const up = (event: KeyboardEvent) => {
      const control = getDriveControl(event)
      if (!control) return
      keys.current[control] = false
      event.preventDefault()
    }
    const visibility = () => {
      if (document.hidden) clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', visibility)

    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    if (!disabled) return
    keys.current.forward = false
    keys.current.backward = false
    keys.current.left = false
    keys.current.right = false
  }, [disabled])

  return keys
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
  const visualScale = [0.34, 0.68, 1.1, 1.65][tier.level - 1]
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
      <LearningObjectMesh item={item} />
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
  const helperScale = Math.min(0.9, 0.58 + ballRadius * 0.16)

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
    <group
      ref={root}
      position={[0, -ballRadius, ballRadius + 0.48]}
      scale={helperScale}
    >
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
  const keys = useKeyboard(paused)
  const { camera } = useThree()
  const collectedSet = useRef(new Set(collectedIds))
  const tooLargeCooldown = useRef(0)
  const cameraPosition = useRef(new Vector3(0, 7, 8))
  const cameraDirection = useRef(new Vector3(0, 0, -1))
  const heading = useRef(new Vector3(0, 0, -1))
  const lookTarget = useRef(new Vector3())
  const rollAxis = useRef(new Vector3())
  const rollQuaternion = useRef(new Quaternion())
  const motion = useRef<MotionState>({
    x: 0,
    z: -1,
    speed: 0,
    velocityX: 0,
    velocityZ: 0,
  })

  useEffect(() => {
    collectedSet.current = new Set(collectedIds)
  }, [collectedIds])

  useFrame((state, delta) => {
    if (!player.current) return

    const position = player.current.position
    if (!paused) {
      const lateralInput =
        (keys.current.right ? 1 : 0) -
        (keys.current.left ? 1 : 0) +
        controlVector.x
      const forwardInput =
        (keys.current.forward ? 1 : 0) -
        (keys.current.backward ? 1 : 0) -
        controlVector.z
      const driveStep = stepRelativeDrive(
        { x: heading.current.x, z: heading.current.z },
        lateralInput,
        forwardInput,
      )
      const rollingStep = stepRollingMotion(
        {
          velocityX: motion.current.velocityX,
          velocityZ: motion.current.velocityZ,
        },
        driveStep.moveX,
        driveStep.moveZ,
        ballRadius,
        delta,
      )
      if (
        forwardInput >= 0 &&
        Math.hypot(driveStep.moveX, driveStep.moveZ) > 0.05 &&
        rollingStep.speedRatio > 0.04
      ) {
        heading.current.x = MathUtils.damp(
          heading.current.x,
          rollingStep.directionX,
          4.6,
          delta,
        )
        heading.current.z = MathUtils.damp(
          heading.current.z,
          rollingStep.directionZ,
          4.6,
          delta,
        )
        heading.current.normalize()
      }
      const previousX = position.x
      const previousZ = position.z
      const movementLimit = PARK_HALF_EXTENT - ballRadius
      const nextX = MathUtils.clamp(
        position.x + rollingStep.velocityX * Math.min(delta, 1 / 30),
        -movementLimit,
        movementLimit,
      )
      const nextZ = MathUtils.clamp(
        position.z + rollingStep.velocityZ * Math.min(delta, 1 / 30),
        -movementLimit,
        movementLimit,
      )
      position.x = nextX
      position.z = nextZ

      motion.current.velocityX =
        nextX === previousX && Math.abs(rollingStep.velocityX) > 0
          ? 0
          : rollingStep.velocityX
      motion.current.velocityZ =
        nextZ === previousZ && Math.abs(rollingStep.velocityZ) > 0
          ? 0
          : rollingStep.velocityZ
      motion.current.x = heading.current.x
      motion.current.z = heading.current.z
      motion.current.speed = rollingStep.speedRatio

      const traveled = Math.hypot(nextX - previousX, nextZ - previousZ)
      if (orb.current && traveled > 0.0001) {
        rollAxis.current
          .set(
            (nextZ - previousZ) / traveled,
            0,
            -(nextX - previousX) / traveled,
          )
          .normalize()
        rollQuaternion.current.setFromAxisAngle(
          rollAxis.current,
          traveled / Math.max(0.3, ballRadius),
        )
        orb.current.quaternion.premultiply(rollQuaternion.current)
      }

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
        } else if (touchesItem) {
          const offsetX = position.x - item.position[0]
          const offsetZ = position.z - item.position[2]
          const safeDistance = Math.max(distance, 0.001)
          const overlap = Math.min(
            0.2,
            ballRadius + item.size * 0.64 - safeDistance,
          )
          position.x += (offsetX / safeDistance) * overlap
          position.z += (offsetZ / safeDistance) * overlap
          motion.current.velocityX *= -0.16
          motion.current.velocityZ *= -0.16

          if (state.clock.elapsedTime > tooLargeCooldown.current) {
            tooLargeCooldown.current = state.clock.elapsedTime + 1.7
            onTooLarge(item)
          }
        }
      }
    }

    position.y = ballRadius

    cameraDirection.current.x = MathUtils.damp(
      cameraDirection.current.x,
      heading.current.x,
      5.2,
      delta,
    )
    cameraDirection.current.z = MathUtils.damp(
      cameraDirection.current.z,
      heading.current.z,
      5.2,
      delta,
    )
    cameraDirection.current.normalize()

    const cameraDistance = 4.8 + ballRadius * 1.6
    cameraPosition.current.set(
      position.x - cameraDirection.current.x * cameraDistance,
      3.2 + ballRadius * 1.35,
      position.z - cameraDirection.current.z * cameraDistance,
    )
    camera.position.lerp(cameraPosition.current, reducedMotion ? 0.18 : 0.1)
    lookTarget.current.set(
      position.x + cameraDirection.current.x * ballRadius * 0.7,
      ballRadius * 0.72,
      position.z + cameraDirection.current.z * ballRadius * 0.7,
    )
    camera.lookAt(lookTarget.current)

  })

  const visibleObjects = objects.filter(
    (item) => !collectedIds.includes(item.id),
  )
  const collectedObjects = objects.filter((item) =>
    collectedIds.includes(item.id),
  )

  return (
    <>
      <color attach="background" args={['#D9F2FF']} />
      <fog attach="fog" args={['#D9F2FF', 32, 82]} />
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

      <GardenSetDressing floorSize={PARK_SIZE} />

      {visibleObjects.map((item) => (
        <LearningItem
          key={item.id}
          item={item}
          reducedMotion={reducedMotion}
          available={canCollect(ballRadius, item.size)}
        />
      ))}

      <group ref={player} name="rolling-player">
        <group ref={orb} name="rolling-orb">
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
          {collectedObjects.map((item) => (
            <AttachedObjectMesh
              key={item.id}
              item={item}
              index={objects.indexOf(item)}
              orbRadius={ballRadius}
              slotCount={objects.length}
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
      camera={{ position: [0, 7, 8], fov: 48, near: 0.1, far: 110 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <GameWorld {...props} />
    </Canvas>
  )
}

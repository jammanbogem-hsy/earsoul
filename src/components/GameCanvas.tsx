import { Html } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
  type CollisionEnterPayload,
  type RapierRigidBody,
} from '@react-three/rapier'
import {
  Suspense,
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
import type { GameStage, LearningObject } from '../types'
import {
  canCollect,
  getObjectVisualScale,
  getSizeTier,
} from '../game/mechanics'
import {
  getDriveControl,
  stepRelativeDrive,
  type DriveControl,
} from '../game/input'
import {
  capRapierHorizontalVelocity,
  getRapierDriveForce,
} from '../game/rapierMotion'
import { getRollingTopSpeed } from '../game/rollingMotion'
import {
  createWorldPhysicsLayout,
  getActiveSpeedZone,
  type ObstacleResponse,
  type WorldPhysicsLayout,
} from '../game/worldPhysics'
import { MaterialIcon } from './MaterialIcon'
import {
  AttachedObjectMesh,
  GardenSetDressing,
  LearningObjectMesh,
} from './game/GameSceneAssets'

interface GameCanvasProps {
  stage: GameStage
  attachedObjects: LearningObject[]
  collectedIds: string[]
  ballRadius: number
  paused: boolean
  reducedMotion: boolean
  controlVector: ControlVector
  onCollect: (item: LearningObject) => void
  onTooLarge: (item: LearningObject) => void
  onPhysicsFeedback: (feedback: {
    type: 'collision' | 'boost'
    label: string
    bounced?: boolean
  }) => void
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
  velocityX: number
  velocityZ: number
  boost: number
  impact: number
}

interface PhysicsBodyData {
  kind:
    | 'floor'
    | 'boundary'
    | 'obstacle'
    | 'dynamic-prop'
    | 'large-item'
  label: string
  response: ObstacleResponse
  quiet?: boolean
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
  const badge = useRef<HTMLSpanElement>(null)
  const badgeVisible = useRef<boolean | null>(null)
  const tier = getSizeTier(item.size)
  const visualScale = getObjectVisualScale(item.size)
  const phase = useMemo(
    () => item.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0),
    [item.id],
  )

  useFrame(({ camera, clock }) => {
    if (!group.current) return
    if (!reducedMotion) {
      group.current.position.y =
        visualScale * 0.58 + Math.sin(clock.elapsedTime * 1.4 + phase) * 0.045
      group.current.rotation.y += 0.003
    }
    if (badge.current) {
      const distance = Math.hypot(
        item.position[0] - camera.position.x,
        item.position[2] - camera.position.z,
      )
      const nearby = distance < 17
      if (badgeVisible.current !== nearby) {
        badge.current.style.opacity = nearby ? '1' : '0'
        badge.current.style.visibility = nearby ? 'visible' : 'hidden'
        badgeVisible.current = nearby
      }
    }
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
          ref={badge}
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
    const { x, z, speed, boost, impact } = motion.current
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
      material.color.set(boost > 1 ? '#B6F3FF' : impact > 0 ? '#FFD29B' : '#FFF3D4')
      material.opacity = reducedMotion
        ? 0
        : Math.min(0.58, speed * boost * (1 - phase) * 0.36 + impact * 0.12)
      const scale = 0.7 + phase * (boost > 1 ? 2.15 : 1.6)
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

function RapierWorldColliders({
  mapSize,
  layout,
}: {
  mapSize: number
  layout: WorldPhysicsLayout
}) {
  const halfMap = mapSize / 2
  const boundaryData: PhysicsBodyData = {
    kind: 'boundary',
    label: '공원 경계',
    response: 'stop',
    quiet: true,
  }

  return (
    <>
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{
          physics: {
            kind: 'floor',
            label: '공원 바닥',
            response: 'stop',
            quiet: true,
          } satisfies PhysicsBodyData,
        }}
      >
        <CuboidCollider
          args={[halfMap, 0.1, halfMap]}
          position={[0, -0.1, 0]}
          friction={1}
          restitution={0}
        />
      </RigidBody>

      {[
        {
          id: 'north',
          position: [0, 2.5, -halfMap - 0.3] as [number, number, number],
          args: [halfMap + 0.6, 2.5, 0.3] as [number, number, number],
        },
        {
          id: 'south',
          position: [0, 2.5, halfMap + 0.3] as [number, number, number],
          args: [halfMap + 0.6, 2.5, 0.3] as [number, number, number],
        },
        {
          id: 'west',
          position: [-halfMap - 0.3, 2.5, 0] as [number, number, number],
          args: [0.3, 2.5, halfMap + 0.6] as [number, number, number],
        },
        {
          id: 'east',
          position: [halfMap + 0.3, 2.5, 0] as [number, number, number],
          args: [0.3, 2.5, halfMap + 0.6] as [number, number, number],
        },
      ].map((wall) => (
        <RigidBody
          key={`boundary-${wall.id}`}
          type="fixed"
          colliders={false}
          position={wall.position}
          userData={{ physics: boundaryData }}
        >
          <CuboidCollider
            args={wall.args}
            friction={0.9}
            restitution={0.04}
          />
        </RigidBody>
      ))}

      {layout.obstacles.map((obstacle) => {
        const physics: PhysicsBodyData = {
          kind: 'obstacle',
          label: obstacle.label,
          response: obstacle.response,
        }

        return (
          <RigidBody
            key={obstacle.id}
            type="fixed"
            colliders={false}
            position={[obstacle.x, 0, obstacle.z]}
            userData={{ physics }}
          >
            <CylinderCollider
              args={[2.5, obstacle.radius]}
              position={[0, 2.5, 0]}
              friction={0.92}
              restitution={obstacle.response === 'bounce' ? 0.42 : 0.02}
            />
          </RigidBody>
        )
      })}
    </>
  )
}

const DYNAMIC_PRACTICE_PROPS = [
  { id: 'block-a', kind: 'block', position: [5.2, 0.36, -4.6], color: '#FF7B66' },
  { id: 'block-b', kind: 'block', position: [6.1, 0.36, -4.2], color: '#4169D8' },
  { id: 'block-c', kind: 'block', position: [7, 0.36, -4.8], color: '#F2C94C' },
  { id: 'cone-a', kind: 'cone', position: [-5.3, 0.38, -4.8], color: '#FF8A3D' },
  { id: 'cone-b', kind: 'cone', position: [-6.2, 0.38, -4.3], color: '#45A7A0' },
  { id: 'cone-c', kind: 'cone', position: [-7.1, 0.38, -4.9], color: '#A78BFA' },
  { id: 'pin-a', kind: 'pin', position: [3.9, 0.36, 5.8], color: '#38BDF8' },
  { id: 'pin-b', kind: 'pin', position: [4.7, 0.36, 6.2], color: '#FB7185' },
  { id: 'pin-c', kind: 'pin', position: [5.5, 0.36, 5.7], color: '#22C55E' },
] as const

function DynamicPracticeProps({ stageId }: { stageId: string }) {
  return (
    <>
      {DYNAMIC_PRACTICE_PROPS.map((prop, index) => {
        const physics: PhysicsBodyData = {
          kind: 'dynamic-prop',
          label:
            prop.kind === 'cone'
              ? '말랑 연습 콘'
              : prop.kind === 'pin'
                ? '컬러 트레이닝 핀'
                : '폼 연습 블록',
          response: 'bounce',
        }

        return (
          <RigidBody
            key={`${stageId}-${prop.id}`}
            colliders={false}
            position={prop.position}
            rotation={[0, index * 0.41, index % 2 ? 0.12 : -0.08]}
            mass={prop.kind === 'block' ? 0.62 : 0.4}
            linearDamping={0.38}
            angularDamping={0.54}
            ccd
            userData={{ physics }}
          >
            {prop.kind === 'block' ? (
              <>
                <CuboidCollider
                  args={[0.34, 0.34, 0.34]}
                  friction={0.78}
                  restitution={0.34}
                />
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.68, 0.68, 0.68]} />
                  <meshStandardMaterial color={prop.color} roughness={0.76} />
                </mesh>
              </>
            ) : (
              <>
                <CylinderCollider
                  args={[0.36, prop.kind === 'cone' ? 0.28 : 0.2]}
                  friction={0.72}
                  restitution={0.42}
                />
                {prop.kind === 'cone' ? (
                  <mesh castShadow receiveShadow>
                    <coneGeometry args={[0.3, 0.72, 16]} />
                    <meshStandardMaterial color={prop.color} roughness={0.72} />
                  </mesh>
                ) : (
                  <group>
                    <mesh castShadow receiveShadow>
                      <cylinderGeometry args={[0.17, 0.21, 0.72, 16]} />
                      <meshStandardMaterial color={prop.color} roughness={0.66} />
                    </mesh>
                    <mesh position={[0, 0.12, 0]} scale={[1.03, 0.13, 1.03]}>
                      <cylinderGeometry args={[0.18, 0.18, 0.72, 16]} />
                      <meshStandardMaterial color="#FFFDF7" roughness={0.7} />
                    </mesh>
                  </group>
                )}
              </>
            )}
          </RigidBody>
        )
      })}
    </>
  )
}

function TooLargeItemColliders({
  items,
  ballRadius,
}: {
  items: LearningObject[]
  ballRadius: number
}) {
  return (
    <>
      {items
        .filter((item) => !canCollect(ballRadius, item.size))
        .map((item) => {
          const radius = Math.max(0.22, item.size * 0.64)
          const physics: PhysicsBodyData = {
            kind: 'large-item',
            label: item.label,
            response: 'bounce',
            quiet: true,
          }

          return (
            <RigidBody
              key={`large-item-${item.id}`}
              type="fixed"
              colliders={false}
              position={[item.position[0], radius, item.position[2]]}
              userData={{ physics }}
            >
              <BallCollider
                args={[radius]}
                friction={0.76}
                restitution={0.28}
              />
            </RigidBody>
          )
        })}
    </>
  )
}

function GameWorld({
  stage,
  attachedObjects,
  collectedIds,
  ballRadius,
  paused,
  reducedMotion,
  controlVector,
  onCollect,
  onTooLarge,
  onPhysicsFeedback,
}: GameCanvasProps) {
  const objects = stage.objects
  const physicsLayout = useMemo(
    () => createWorldPhysicsLayout(stage),
    [stage],
  )
  const playerBody = useRef<RapierRigidBody>(null)
  const orb = useRef<Group>(null)
  const keys = useKeyboard(paused)
  const { camera } = useThree()
  const collectedSet = useRef(new Set(collectedIds))
  const tooLargeCooldown = useRef(0)
  const physicsFeedbackCooldown = useRef(0)
  const collisionFeedbackCooldown = useRef(0)
  const activeSpeedZoneId = useRef<string | null>(null)
  const cameraPosition = useRef(new Vector3(0, 7, 8))
  const cameraDirection = useRef(new Vector3(0, 0, -1))
  const heading = useRef(new Vector3(0, 0, -1))
  const lookTarget = useRef(new Vector3())
  const rollAxis = useRef(new Vector3())
  const rollQuaternion = useRef(new Quaternion())
  const previousPosition = useRef(new Vector3(0, ballRadius, 0))
  const motion = useRef<MotionState>({
    x: 0,
    z: -1,
    speed: 0,
    velocityX: 0,
    velocityZ: 0,
    boost: 1,
    impact: 0,
  })

  useEffect(() => {
    collectedSet.current = new Set(collectedIds)
  }, [collectedIds])

  useEffect(() => {
    const body = playerBody.current
    if (!body) return
    const position = body.translation()
    body.setTranslation(
      { x: position.x, y: ballRadius, z: position.z },
      true,
    )
    body.wakeUp()
  }, [ballRadius])

  useEffect(() => {
    if (!paused || !playerBody.current) return
    playerBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    playerBody.current.resetForces(true)
  }, [paused])

  const handleCollisionEnter = ({ other }: CollisionEnterPayload) => {
    const physics = (
      other.rigidBodyObject?.userData.physics ??
      other.colliderObject?.userData.physics
    ) as PhysicsBodyData | undefined
    const body = playerBody.current
    if (!body || !physics || physics.kind === 'floor') return

    const velocity = body.linvel()
    if (physics.response === 'stop') {
      body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true)
    } else if (physics.kind === 'obstacle') {
      const position = body.translation()
      const obstaclePosition = other.rigidBody?.translation()
      const offsetX = position.x - (obstaclePosition?.x ?? position.x)
      const offsetZ = position.z - (obstaclePosition?.z ?? position.z)
      const distance = Math.max(0.001, Math.hypot(offsetX, offsetZ))
      const impulse = body.mass() * 0.72
      body.applyImpulse(
        {
          x: (offsetX / distance) * impulse,
          y: 0,
          z: (offsetZ / distance) * impulse,
        },
        true,
      )
    }

    motion.current.impact = physics.quiet ? 0.42 : 1
    const now = performance.now()
    if (physics.quiet || now < collisionFeedbackCooldown.current) return
    collisionFeedbackCooldown.current = now + 900
    onPhysicsFeedback({
      type: 'collision',
      label: physics.label,
      bounced: physics.response === 'bounce',
    })
  }

  useFrame((state, delta) => {
    const body = playerBody.current
    if (!body) return

    const position = body.translation()
    let velocity = body.linvel()
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
      const inputStrength = Math.hypot(driveStep.moveX, driveStep.moveZ)
      if (
        forwardInput >= 0 &&
        inputStrength > 0.05
      ) {
        heading.current.x = MathUtils.damp(
          heading.current.x,
          driveStep.moveX,
          4.6,
          delta,
        )
        heading.current.z = MathUtils.damp(
          heading.current.z,
          driveStep.moveZ,
          4.6,
          delta,
        )
        heading.current.normalize()
      }
      const speedZone = getActiveSpeedZone(
        physicsLayout,
        position.x,
        position.z,
      )
      const speedMultiplier = speedZone?.multiplier ?? 1
      const driveForce = getRapierDriveForce(
        driveStep.moveX,
        driveStep.moveZ,
        body.mass(),
        speedMultiplier,
      )
      if (inputStrength > 0.05) {
        body.addForce(
          { x: driveForce.x, y: 0, z: driveForce.z },
          true,
        )
      } else if (Math.hypot(velocity.x, velocity.z) < 0.045) {
        body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true)
      }

      const cappedVelocity = capRapierHorizontalVelocity(
        velocity.x,
        velocity.z,
        ballRadius,
        speedMultiplier,
      )
      if (
        cappedVelocity.x !== velocity.x ||
        cappedVelocity.z !== velocity.z
      ) {
        body.setLinvel(
          {
            x: cappedVelocity.x,
            y: velocity.y,
            z: cappedVelocity.z,
          },
          true,
        )
        velocity = body.linvel()
      }

      const speed = Math.hypot(velocity.x, velocity.z)
      const speedRatio = Math.min(
        1.35,
        speed / getRollingTopSpeed(ballRadius),
      )
      motion.current.velocityX = velocity.x
      motion.current.velocityZ = velocity.z
      motion.current.x = heading.current.x
      motion.current.z = heading.current.z
      motion.current.speed = speedRatio
      motion.current.boost = speedMultiplier
      motion.current.impact = Math.max(
        0,
        motion.current.impact - delta * 4.5,
      )

      const nextSpeedZoneId = speedZone?.id ?? null
      if (
        nextSpeedZoneId &&
        nextSpeedZoneId !== activeSpeedZoneId.current &&
        speedRatio > 0.16 &&
        state.clock.elapsedTime >= physicsFeedbackCooldown.current
      ) {
        physicsFeedbackCooldown.current = state.clock.elapsedTime + 1.1
        onPhysicsFeedback({
          type: 'boost',
          label: speedZone?.label ?? '스피드 길',
        })
      }
      activeSpeedZoneId.current =
        nextSpeedZoneId && speedRatio > 0.16
          ? nextSpeedZoneId
          : null

      const traveled = Math.hypot(
        position.x - previousPosition.current.x,
        position.z - previousPosition.current.z,
      )
      if (orb.current && traveled > 0.0001 && traveled < 2) {
        rollAxis.current
          .set(
            (position.z - previousPosition.current.z) / traveled,
            0,
            -(position.x - previousPosition.current.x) / traveled,
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
          if (state.clock.elapsedTime > tooLargeCooldown.current) {
            tooLargeCooldown.current = state.clock.elapsedTime + 1.7
            onTooLarge(item)
          }
        }
      }
    }

    previousPosition.current.set(position.x, position.y, position.z)

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
    if (!reducedMotion && motion.current.impact > 0) {
      const shake =
        Math.sin(state.clock.elapsedTime * 58) * motion.current.impact * 0.075
      cameraPosition.current.x += shake
      cameraPosition.current.y += Math.abs(shake) * 0.5
    }
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
  const collectedObjects = attachedObjects

  return (
    <>
      <color attach="background" args={[stage.skyColor]} />
      <fog
        attach="fog"
        args={[stage.fogColor, stage.mapSize * 0.48, stage.mapSize * 1.08]}
      />
      <ambientLight intensity={stage.theme === 'starlight-river' ? 1.1 : 1.45} />
      <directionalLight
        castShadow
        position={[6, 12, 8]}
        intensity={stage.theme === 'starlight-river' ? 1.45 : 2.1}
        color={new Color(
          stage.theme === 'starlight-river' ? '#BFD4FF' : '#FFF3D0',
        )}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight
        args={[
          stage.theme === 'starlight-river' ? '#9BB8FF' : '#E6F6FF',
          stage.theme === 'starlight-river' ? '#263B45' : '#77A869',
          1.1,
        ]}
      />

      <GardenSetDressing floorSize={stage.mapSize} theme={stage.theme} />
      <RapierWorldColliders
        mapSize={stage.mapSize}
        layout={physicsLayout}
      />
      <DynamicPracticeProps stageId={stage.id} />

      {visibleObjects.map((item) => (
        <LearningItem
          key={item.id}
          item={item}
          reducedMotion={reducedMotion}
          available={canCollect(ballRadius, item.size)}
        />
      ))}
      <TooLargeItemColliders
        items={visibleObjects}
        ballRadius={ballRadius}
      />

      <RigidBody
        key={stage.id}
        ref={playerBody}
        name="rolling-player"
        colliders={false}
        position={[0, ballRadius, 0]}
        gravityScale={0}
        enabledTranslations={[true, false, true]}
        enabledRotations={[false, false, false]}
        linearDamping={2.7}
        angularDamping={1}
        mass={Math.max(1.8, ballRadius * 3.4)}
        canSleep={false}
        ccd
        onCollisionEnter={handleCollisionEnter}
      >
        <BallCollider
          key={`player-ball-${ballRadius.toFixed(3)}`}
          args={[ballRadius]}
          friction={0.92}
          restitution={0.12}
        />
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
              index={attachedObjects.indexOf(item)}
              orbRadius={ballRadius}
              slotCount={64}
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
      </RigidBody>
    </>
  )
}

export function GameCanvas(props: GameCanvasProps) {
  return (
    <Canvas
      className="game-canvas"
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [0, 7, 8], fov: 48, near: 0.1, far: 180 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <Physics
          gravity={[0, -16, 0]}
          paused={props.paused}
          timeStep={1 / 60}
          numSolverIterations={8}
          maxCcdSubsteps={4}
        >
          <GameWorld {...props} />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

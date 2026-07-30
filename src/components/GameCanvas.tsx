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
  isObjectTouchingBall,
} from '../game/mechanics'
import {
  getDriveControl,
  stepRelativeDrive,
  type DriveControl,
} from '../game/input'
import {
  getRollingTopSpeed,
  stepRollingMotion,
} from '../game/rollingMotion'
import {
  createWorldPhysicsLayout,
  getActiveSpeedZone,
  getActiveSurfaceZone,
  getElevatorDeckY,
  type ObstacleResponse,
  type PushableProp,
  type WorldElevator,
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
    type: 'collision' | 'boost' | 'slow' | 'elevator'
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
    | 'rideable'
    | 'elevator'
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
  const visual = useRef<Group>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const badgeVisible = useRef<boolean | null>(null)
  const tier = getSizeTier(item.size)
  const visualScale = getObjectVisualScale(item.size)
  const phase = useMemo(
    () => item.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0),
    [item.id],
  )

  useFrame(({ camera, clock }) => {
    if (visual.current && !reducedMotion) {
      visual.current.position.y =
        visualScale * 0.58 + Math.sin(clock.elapsedTime * 1.4 + phase) * 0.045
      visual.current.rotation.y += 0.003
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
    <group position={item.position}>
      <group scale={visualScale}>
        {Array.from({ length: tier.level }, (_, index) => (
          <mesh
            key={`tier-ring-${index}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.09 + index * 0.002, 0]}
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
      </group>
      <group
        ref={visual}
        position={[0, visualScale * 0.58, 0]}
        scale={visualScale}
      >
        <LearningObjectMesh item={item} />
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
      <Html
        center
        position={[0, visualScale * 1.6, 0]}
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
  const torso = useRef<Group>(null)
  const leftThigh = useRef<Group>(null)
  const rightThigh = useRef<Group>(null)
  const leftShin = useRef<Group>(null)
  const rightShin = useRef<Group>(null)
  const leftUpperArm = useRef<Group>(null)
  const rightUpperArm = useRef<Group>(null)
  const leftForearm = useRef<Group>(null)
  const rightForearm = useRef<Group>(null)
  const helperScale = Math.min(0.96, 0.66 + ballRadius * 0.14)

  useFrame(({ clock }, delta) => {
    if (!root.current) return

    const { x, z, speed } = motion.current
    const speedLevel = Math.min(1, speed)
    const distance = ballRadius + 0.5
    const sideOffset = 0.25
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

    const stride = reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 9.2) * speedLevel
    const bob = reducedMotion ? 0 : Math.abs(stride) * 0.035
    if (body.current) body.current.position.y = bob
    if (torso.current) {
      torso.current.rotation.x = MathUtils.damp(
        torso.current.rotation.x,
        -(0.035 + speedLevel * 0.1),
        8,
        delta,
      )
    }
    if (leftThigh.current) leftThigh.current.rotation.x = stride * 0.5
    if (rightThigh.current) rightThigh.current.rotation.x = -stride * 0.5
    if (leftShin.current) {
      leftShin.current.rotation.x = Math.max(0, -stride) * 0.62
    }
    if (rightShin.current) {
      rightShin.current.rotation.x = Math.max(0, stride) * 0.62
    }
    if (leftUpperArm.current) {
      leftUpperArm.current.rotation.x = 1.05 + stride * 0.06
      leftUpperArm.current.rotation.z = -0.08 + stride * 0.04
    }
    if (rightUpperArm.current) {
      rightUpperArm.current.rotation.x = 1.05 - stride * 0.06
      rightUpperArm.current.rotation.z = 0.08 - stride * 0.04
    }
    if (leftForearm.current) {
      leftForearm.current.rotation.x = 0.28 + Math.abs(stride) * 0.06
    }
    if (rightForearm.current) {
      rightForearm.current.rotation.x = 0.28 + Math.abs(stride) * 0.06
    }
  })

  return (
    <group
      ref={root}
      position={[0, -ballRadius, ballRadius + 0.48]}
      scale={helperScale}
    >
      <group ref={body}>
        <mesh
          position={[0, 0.012, 0.02]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[0.5, 0.32, 1]}
        >
          <circleGeometry args={[0.52, 20]} />
          <meshBasicMaterial
            color="#273548"
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>

        <group ref={torso} position={[0, 0.7, 0]}>
          <mesh castShadow position={[0, 0.34, 0]} scale={[1, 1, 0.78]}>
            <capsuleGeometry args={[0.27, 0.36, 6, 14]} />
            <meshStandardMaterial color="#45A7A0" roughness={0.76} />
          </mesh>
          <mesh castShadow position={[0, 0.22, 0.24]} scale={[0.82, 1, 0.72]}>
            <capsuleGeometry args={[0.22, 0.24, 5, 12]} />
            <meshStandardMaterial color="#F2C94C" roughness={0.82} />
          </mesh>
          <mesh castShadow position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.09, 0.1, 0.14, 12]} />
            <meshStandardMaterial color="#F2B38A" roughness={0.72} />
          </mesh>
          <mesh castShadow position={[0, 0.89, 0]}>
            <sphereGeometry args={[0.28, 20, 16]} />
            <meshStandardMaterial color="#F2B38A" roughness={0.7} />
          </mesh>
          <mesh
            castShadow
            position={[0, 1.02, 0.035]}
            scale={[1.04, 0.58, 1.02]}
          >
            <sphereGeometry args={[0.285, 18, 12]} />
            <meshStandardMaterial color="#3C2E39" roughness={0.9} />
          </mesh>
          {[-0.09, 0.09].map((eyeX) => (
            <mesh
              key={`pusher-eye-${eyeX}`}
              position={[eyeX, 0.92, -0.255]}
            >
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshStandardMaterial color="#273548" roughness={0.65} />
            </mesh>
          ))}
          <mesh position={[0, 0.84, -0.278]} scale={[0.07, 0.022, 0.018]}>
            <boxGeometry />
            <meshStandardMaterial color="#C96868" roughness={0.78} />
          </mesh>
          <mesh castShadow position={[0, 0.35, 0.28]} scale={[0.62, 1, 0.72]}>
            <capsuleGeometry args={[0.2, 0.26, 5, 12]} />
            <meshStandardMaterial color="#F2C94C" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.35, 0.43]}>
            <boxGeometry args={[0.18, 0.28, 0.04]} />
            <meshStandardMaterial color="#FFFDF7" roughness={0.84} />
          </mesh>

          <group
            ref={leftUpperArm}
            position={[-0.31, 0.48, -0.03]}
            rotation={[1.05, 0, -0.08]}
          >
            <mesh castShadow position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.07, 0.2, 5, 10]} />
              <meshStandardMaterial color="#45A7A0" roughness={0.76} />
            </mesh>
            <group ref={leftForearm} position={[0, -0.34, 0]} rotation={[0.28, 0, 0]}>
              <mesh castShadow position={[0, -0.16, 0]}>
                <capsuleGeometry args={[0.064, 0.2, 5, 10]} />
                <meshStandardMaterial color="#F2B38A" roughness={0.72} />
              </mesh>
              <mesh castShadow position={[0, -0.34, -0.01]}>
                <sphereGeometry args={[0.085, 10, 8]} />
                <meshStandardMaterial color="#F2B38A" roughness={0.7} />
              </mesh>
            </group>
          </group>
          <group
            ref={rightUpperArm}
            position={[0.31, 0.48, -0.03]}
            rotation={[1.05, 0, 0.08]}
          >
            <mesh castShadow position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.07, 0.2, 5, 10]} />
              <meshStandardMaterial color="#45A7A0" roughness={0.76} />
            </mesh>
            <group ref={rightForearm} position={[0, -0.34, 0]} rotation={[0.28, 0, 0]}>
              <mesh castShadow position={[0, -0.16, 0]}>
                <capsuleGeometry args={[0.064, 0.2, 5, 10]} />
                <meshStandardMaterial color="#F2B38A" roughness={0.72} />
              </mesh>
              <mesh castShadow position={[0, -0.34, -0.01]}>
                <sphereGeometry args={[0.085, 10, 8]} />
                <meshStandardMaterial color="#F2B38A" roughness={0.7} />
              </mesh>
            </group>
          </group>
        </group>

        <mesh castShadow position={[0, 0.67, 0]} scale={[0.5, 0.18, 0.34]}>
          <sphereGeometry args={[0.5, 14, 9]} />
          <meshStandardMaterial color="#273548" roughness={0.84} />
        </mesh>
        <group ref={leftThigh} position={[-0.14, 0.62, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.085, 0.18, 5, 10]} />
            <meshStandardMaterial color="#273548" roughness={0.84} />
          </mesh>
          <group ref={leftShin} position={[0, -0.34, 0]}>
            <mesh castShadow position={[0, -0.17, 0]}>
              <capsuleGeometry args={[0.075, 0.2, 5, 10]} />
              <meshStandardMaterial color="#3F5268" roughness={0.84} />
            </mesh>
            <mesh castShadow position={[0, -0.37, -0.08]} scale={[1, 0.58, 1.45]}>
              <capsuleGeometry args={[0.09, 0.16, 5, 10]} />
              <meshStandardMaterial color="#FFFDF7" roughness={0.86} />
            </mesh>
            <mesh position={[0, -0.395, -0.12]} scale={[0.12, 0.035, 0.24]}>
              <boxGeometry />
              <meshStandardMaterial color="#FF7B66" roughness={0.72} />
            </mesh>
          </group>
        </group>
        <group ref={rightThigh} position={[0.14, 0.62, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.085, 0.18, 5, 10]} />
            <meshStandardMaterial color="#374151" roughness={0.86} />
          </mesh>
          <group ref={rightShin} position={[0, -0.34, 0]}>
            <mesh castShadow position={[0, -0.17, 0]}>
              <capsuleGeometry args={[0.075, 0.2, 5, 10]} />
              <meshStandardMaterial color="#3F5268" roughness={0.84} />
            </mesh>
            <mesh castShadow position={[0, -0.37, -0.08]} scale={[1, 0.58, 1.45]}>
              <capsuleGeometry args={[0.09, 0.16, 5, 10]} />
              <meshStandardMaterial color="#FFFDF7" roughness={0.86} />
            </mesh>
            <mesh position={[0, -0.395, -0.12]} scale={[0.12, 0.035, 0.24]}>
              <boxGeometry />
              <meshStandardMaterial color="#4169D8" roughness={0.72} />
            </mesh>
          </group>
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

      {layout.rideableObstacles.map((obstacle) => {
        const physics: PhysicsBodyData = {
          kind: 'rideable',
          label: obstacle.label,
          response: 'bounce',
          quiet: true,
        }

        return (
          <RigidBody
            key={obstacle.id}
            type="fixed"
            colliders={false}
            position={[obstacle.x, obstacle.y, obstacle.z]}
            rotation={[0, obstacle.rotationY, 0]}
            userData={{ physics }}
          >
            <CuboidCollider
              args={[
                obstacle.halfWidth,
                obstacle.halfHeight,
                obstacle.halfDepth,
              ]}
              friction={0.96}
              restitution={0}
            />
          </RigidBody>
        )
      })}

      {layout.terrainRamps.map((ramp) => {
        const physics: PhysicsBodyData = {
          kind: 'rideable',
          label: ramp.label,
          response: 'bounce',
          quiet: true,
        }

        return (
          <RigidBody
            key={ramp.id}
            type="fixed"
            colliders={false}
            position={[ramp.x, ramp.y, ramp.z]}
            rotation={[ramp.rotationX, ramp.rotationY, 0]}
            userData={{ physics }}
          >
            <CuboidCollider
              args={[ramp.halfWidth, ramp.halfHeight, ramp.halfDepth]}
              friction={0.98}
              restitution={0}
            />
            <mesh castShadow receiveShadow>
              <boxGeometry
                args={[
                  ramp.halfWidth * 2,
                  ramp.halfHeight * 2,
                  ramp.halfDepth * 2,
                ]}
              />
              <meshStandardMaterial color={ramp.color} roughness={0.94} />
            </mesh>
          </RigidBody>
        )
      })}

      {layout.elevatedPlatforms.map((platform) => {
        const physics: PhysicsBodyData = {
          kind: 'rideable',
          label: platform.label,
          response: 'bounce',
          quiet: true,
        }
        const supportHeight = Math.max(0.2, platform.y - platform.halfHeight)

        return (
          <RigidBody
            key={platform.id}
            type="fixed"
            colliders={false}
            position={[platform.x, platform.y, platform.z]}
            rotation={[0, platform.rotationY, 0]}
            userData={{ physics }}
          >
            <CuboidCollider
              args={[
                platform.halfWidth,
                platform.halfHeight,
                platform.halfDepth,
              ]}
              friction={0.98}
              restitution={0}
            />
            <mesh castShadow receiveShadow>
              <boxGeometry
                args={[
                  platform.halfWidth * 2,
                  platform.halfHeight * 2,
                  platform.halfDepth * 2,
                ]}
              />
              <meshStandardMaterial color={platform.color} roughness={0.88} />
            </mesh>
            {[
              [-0.78, -0.78],
              [0.78, -0.78],
              [-0.78, 0.78],
              [0.78, 0.78],
            ].map(([xRatio, zRatio], index) => (
              <mesh
                key={`${platform.id}-support-${index}`}
                castShadow
                position={[
                  platform.halfWidth * xRatio,
                  -platform.y / 2,
                  platform.halfDepth * zRatio,
                ]}
              >
                <boxGeometry args={[0.34, supportHeight, 0.34]} />
                <meshStandardMaterial
                  color="#425066"
                  roughness={0.9}
                />
              </mesh>
            ))}
            <Html
              center
              position={[0, platform.halfHeight + 0.72, 0]}
              distanceFactor={11}
              zIndexRange={[1, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <span className="world-interaction-label">
                <MaterialIcon name="arrow_upward" />
                {platform.label}
              </span>
            </Html>
          </RigidBody>
        )
      })}

      {layout.surfaceZones.map((zone) => (
        <group
          key={zone.id}
          position={[zone.x, 0.026, zone.z]}
          rotation={[0, zone.rotationY, 0]}
        >
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[zone.halfWidth, zone.halfDepth, 1]}
            receiveShadow
          >
            <circleGeometry args={[1, 64]} />
            <meshStandardMaterial
              color={zone.color}
              roughness={zone.kind === 'water' ? 0.28 : 0.96}
              metalness={zone.kind === 'water' ? 0.08 : 0}
              transparent
              opacity={zone.kind === 'water' ? 0.68 : 0.9}
            />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.006, 0]}
            scale={[zone.halfWidth, zone.halfDepth, 1]}
          >
            <ringGeometry args={[0.88, 1, 64]} />
            <meshBasicMaterial
              color={zone.kind === 'water' ? '#D7F6FF' : '#DDF4C8'}
              transparent
              opacity={0.58}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

function DynamicPracticeProps({
  stageId,
  props,
}: {
  stageId: string
  props: PushableProp[]
}) {
  return (
    <>
      {props.map((prop, index) => {
        const physics: PhysicsBodyData = {
          kind: 'dynamic-prop',
          label: prop.label,
          response: 'bounce',
        }

        return (
          <RigidBody
            key={`${stageId}-${prop.id}`}
            colliders={false}
            position={[prop.x, prop.y, prop.z]}
            rotation={[
              0,
              prop.rotationY,
              index % 2 ? 0.08 : -0.06,
            ]}
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

function KinematicElevator({
  elevator,
  playerPosition,
  ballRadius,
  paused,
  onActivate,
}: {
  elevator: WorldElevator
  playerPosition: MutableRefObject<Vector3>
  ballRadius: number
  paused: boolean
  onActivate: (label: string) => void
}) {
  const body = useRef<RapierRigidBody>(null)
  const button = useRef<Mesh>(null)
  const label = useRef<HTMLSpanElement>(null)
  const holdDuration = useRef(0)
  const progress = useRef(0)
  const activated = useRef(false)

  useFrame((_, delta) => {
    const rigidBody = body.current
    if (!rigidBody) return

    const currentY = getElevatorDeckY(elevator, progress.current)
    const deckTop = currentY + elevator.halfHeight
    const playerFootY = playerPosition.current.y - ballRadius
    const onButton =
      Math.hypot(
        playerPosition.current.x - elevator.x,
        playerPosition.current.z - elevator.z,
      ) <=
        elevator.buttonRadius + ballRadius * 0.38 &&
      Math.abs(playerFootY - deckTop) < 0.58

    if (!paused && !activated.current) {
      holdDuration.current = onButton
        ? Math.min(0.45, holdDuration.current + delta)
        : Math.max(0, holdDuration.current - delta * 2.6)
      if (holdDuration.current >= 0.32) {
        activated.current = true
        onActivate(elevator.label)
      }
    }

    if (!paused && activated.current && progress.current < 1) {
      progress.current = Math.min(
        1,
        progress.current + delta / elevator.travelDuration,
      )
    }

    const nextY = getElevatorDeckY(elevator, progress.current)
    rigidBody.setNextKinematicTranslation({
      x: elevator.x,
      y: nextY,
      z: elevator.z,
    })

    if (button.current) {
      button.current.position.y =
        elevator.halfHeight + (onButton ? 0.045 : 0.085)
      button.current.scale.y = onButton ? 0.62 : 1
    }
    if (label.current) {
      label.current.textContent =
        progress.current >= 1
          ? '2층 도착'
          : activated.current
            ? '2층으로 올라가는 중'
            : onButton
              ? '발판 누르는 중'
              : '발판 위에 올라가세요'
    }
  })

  const physics: PhysicsBodyData = {
    kind: 'elevator',
    label: elevator.label,
    response: 'bounce',
    quiet: true,
  }
  const guideHeight = elevator.topY + elevator.halfHeight

  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh
          key={`${elevator.id}-guide-${side}`}
          castShadow
          position={[
            elevator.x + side * (elevator.halfWidth + 0.22),
            guideHeight / 2,
            elevator.z + elevator.halfDepth * 0.72,
          ]}
        >
          <boxGeometry args={[0.22, guideHeight, 0.22]} />
          <meshStandardMaterial color="#425066" roughness={0.72} />
        </mesh>
      ))}
      <mesh
        position={[elevator.x, 0.018, elevator.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry
          args={[elevator.buttonRadius * 1.15, elevator.buttonRadius * 1.42, 40]}
        />
        <meshBasicMaterial color="#D9ECFF" transparent opacity={0.72} />
      </mesh>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[elevator.x, elevator.bottomY, elevator.z]}
        userData={{ physics }}
      >
        <CuboidCollider
          args={[
            elevator.halfWidth,
            elevator.halfHeight,
            elevator.halfDepth,
          ]}
          friction={1}
          restitution={0}
        />
        <mesh castShadow receiveShadow>
          <boxGeometry
            args={[
              elevator.halfWidth * 2,
              elevator.halfHeight * 2,
              elevator.halfDepth * 2,
            ]}
          />
          <meshStandardMaterial color={elevator.color} roughness={0.7} />
        </mesh>
        <mesh
          ref={button}
          castShadow
          position={[0, elevator.halfHeight + 0.085, 0]}
        >
          <cylinderGeometry
            args={[
              elevator.buttonRadius * 0.58,
              elevator.buttonRadius * 0.65,
              0.12,
              32,
            ]}
          />
          <meshStandardMaterial
            color="#F8C84A"
            emissive="#F8C84A"
            emissiveIntensity={0.18}
            roughness={0.54}
          />
        </mesh>
        <Html
          center
          position={[0, elevator.halfHeight + 0.92, 0]}
          distanceFactor={9}
          zIndexRange={[2, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="world-interaction-label is-elevator">
            <MaterialIcon name="arrow_upward" />
            <span ref={label}>발판 위에 올라가세요</span>
          </span>
        </Html>
      </RigidBody>
    </group>
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
              position={[
                item.position[0],
                item.position[1] + radius,
                item.position[2],
              ]}
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
  const playerPosition = useRef(new Vector3(0, ballRadius, 0))
  const orb = useRef<Group>(null)
  const keys = useKeyboard(paused)
  const { camera } = useThree()
  const collectedSet = useRef(new Set(collectedIds))
  const tooLargeCooldown = useRef(0)
  const physicsFeedbackCooldown = useRef(0)
  const collisionFeedbackCooldown = useRef(0)
  const collisionRecoveryUntil = useRef(0)
  const activeSpeedZoneId = useRef<string | null>(null)
  const activeSurfaceZoneId = useRef<string | null>(null)
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
    playerPosition.current.set(position.x, position.y, position.z)
    body.setTranslation(
      {
        x: position.x,
        y: Math.max(position.y, ballRadius + 0.02),
        z: position.z,
      },
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
    const isRideable =
      physics.kind === 'rideable' || physics.kind === 'elevator'
    if (
      physics.response === 'stop' &&
      !isRideable
    ) {
      body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true)
    }

    motion.current.impact = physics.quiet ? 0.42 : 1
    const now = performance.now()
    if (!isRideable) {
      const recoveryDuration =
        physics.kind === 'dynamic-prop'
          ? 90
          : physics.response === 'bounce'
            ? 260
            : 190
      collisionRecoveryUntil.current = Math.max(
        collisionRecoveryUntil.current,
        now + recoveryDuration,
      )
    }
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
    playerPosition.current.set(position.x, position.y, position.z)
    const velocity = body.linvel()
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
      const inputStrength = Math.hypot(driveStep.moveX, driveStep.moveZ)
      if (
        forwardInput >= 0 &&
        inputStrength > 0.05 &&
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
      const speedZone = getActiveSpeedZone(
        physicsLayout,
        position.x,
        position.z,
      )
      const surfaceZone = getActiveSurfaceZone(
        physicsLayout,
        position.x,
        position.z,
      )
      const speedMultiplier =
        (speedZone?.multiplier ?? 1) *
        (surfaceZone?.multiplier ?? 1)
      const recovering =
        performance.now() < collisionRecoveryUntil.current

      if (recovering) {
        const physicalSpeed = Math.hypot(velocity.x, velocity.z)
        motion.current.velocityX = velocity.x / speedMultiplier
        motion.current.velocityZ = velocity.z / speedMultiplier
        motion.current.speed = Math.min(
          1.35,
          physicalSpeed / getRollingTopSpeed(ballRadius),
        )
      } else {
        body.setLinvel(
          {
            x: rollingStep.velocityX * speedMultiplier,
            y: velocity.y,
            z: rollingStep.velocityZ * speedMultiplier,
          },
          true,
        )
        motion.current.velocityX = rollingStep.velocityX
        motion.current.velocityZ = rollingStep.velocityZ
        motion.current.speed = Math.min(
          1.35,
          rollingStep.speedRatio * speedMultiplier,
        )
      }

      const speedRatio = motion.current.speed
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

      const nextSurfaceZoneId = surfaceZone?.id ?? null
      if (
        nextSurfaceZoneId &&
        nextSurfaceZoneId !== activeSurfaceZoneId.current &&
        rollingStep.speedRatio > 0.12 &&
        state.clock.elapsedTime >= physicsFeedbackCooldown.current
      ) {
        physicsFeedbackCooldown.current = state.clock.elapsedTime + 1.1
        onPhysicsFeedback({
          type: 'slow',
          label: surfaceZone?.label ?? '천천히 구간',
        })
      }
      activeSurfaceZoneId.current =
        nextSurfaceZoneId && rollingStep.speedRatio > 0.12
          ? nextSurfaceZoneId
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

        const touchesItem = isObjectTouchingBall(
          position,
          ballRadius,
          item,
        )

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
    const elevation = Math.max(0, position.y - ballRadius)
    cameraPosition.current.set(
      position.x - cameraDirection.current.x * cameraDistance,
      3.2 + ballRadius * 1.35 + elevation,
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
      ballRadius * 0.72 + elevation,
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
      <DynamicPracticeProps
        stageId={stage.id}
        props={physicsLayout.pushableProps}
      />
      {physicsLayout.elevators.map((elevator) => (
        <KinematicElevator
          key={`${stage.id}-${elevator.id}`}
          elevator={elevator}
          playerPosition={playerPosition}
          ballRadius={ballRadius}
          paused={paused}
          onActivate={(label) =>
            onPhysicsFeedback({
              type: 'elevator',
              label,
            })
          }
        />
      ))}

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
        position={[0, ballRadius + 0.02, 0]}
        gravityScale={1}
        enabledTranslations={[true, true, true]}
        enabledRotations={[false, false, false]}
        linearDamping={0.12}
        angularDamping={1}
        mass={Math.max(1.8, ballRadius * 3.4)}
        canSleep={false}
        ccd
        onCollisionEnter={handleCollisionEnter}
      >
        <BallCollider
          key={`player-ball-${ballRadius.toFixed(3)}`}
          args={[ballRadius]}
          friction={0.88}
          restitution={0.04}
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

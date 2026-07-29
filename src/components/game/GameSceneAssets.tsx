import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import type { LearningObject } from '../../types'

export interface LearningObjectMeshProps {
  item: LearningObject
  detail?: 'world' | 'attached'
}

export interface AttachedObjectMeshProps {
  item: LearningObject
  index: number
  orbRadius: number
  slotCount?: number
}

export interface GardenSetDressingProps {
  floorSize?: number
  receiveShadow?: boolean
}

const PAPER = '#FFFDF7'
const INK = '#334155'
const WOOD = '#B77949'
const LIGHT_WOOD = '#E6B978'
const LEAF = '#4D9B5F'
const DARK_LEAF = '#357A4A'
const GOLD = '#F2C94C'
const UP = new Vector3(0, 1, 0)
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function Paint({
  color,
  roughness = 0.72,
}: {
  color: string
  roughness?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={0.01}
    />
  )
}

function GlyphBars({
  symbol,
  color = PAPER,
}: {
  symbol?: string
  color?: string
}) {
  const bar = (
    key: string,
    position: [number, number, number],
    scale: [number, number, number],
  ) => (
    <mesh key={key} position={position} scale={scale}>
      <boxGeometry />
      <Paint color={color} roughness={0.6} />
    </mesh>
  )

  if (symbol === 'ㅏ') {
    return (
      <>
        {bar('stem', [-0.08, 0, 0.43], [0.1, 0.62, 0.06])}
        {bar('arm', [0.14, 0.02, 0.43], [0.42, 0.1, 0.06])}
      </>
    )
  }

  if (symbol === 'ㅗ') {
    return (
      <>
        {bar('base', [0, -0.12, 0.43], [0.62, 0.1, 0.06])}
        {bar('stem', [0, 0.12, 0.43], [0.1, 0.48, 0.06])}
      </>
    )
  }

  if (symbol === '10') {
    return (
      <>
        {bar('one', [-0.2, 0, 0.43], [0.09, 0.58, 0.06])}
        <mesh position={[0.2, 0, 0.43]}>
          <torusGeometry args={[0.2, 0.065, 6, 16]} />
          <Paint color={color} roughness={0.6} />
        </mesh>
      </>
    )
  }

  if (symbol === '♪') {
    return (
      <>
        {bar('note-stem', [0.13, 0.08, 0.43], [0.08, 0.56, 0.06])}
        {bar('note-arm', [-0.01, 0.32, 0.43], [0.34, 0.08, 0.06])}
        <mesh position={[-0.01, -0.25, 0.43]} scale={[0.22, 0.16, 0.08]}>
          <sphereGeometry args={[1, 8, 6]} />
          <Paint color={color} roughness={0.6} />
        </mesh>
      </>
    )
  }

  return bar('one', [0, 0, 0.43], [0.1, 0.58, 0.06])
}

function GlyphTile({ item }: { item: LearningObject }) {
  return (
    <group>
      <mesh castShadow scale={[0.82, 0.82, 0.34]}>
        <boxGeometry />
        <Paint color={item.color} />
      </mesh>
      <GlyphBars symbol={item.symbol} />
    </group>
  )
}

function PencilModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.16, 1.12, 6]} />
        <Paint color={color} />
      </mesh>
      <mesh castShadow position={[0, 0.69, 0]}>
        <coneGeometry args={[0.17, 0.26, 6]} />
        <Paint color="#EBC79B" roughness={0.84} />
      </mesh>
      {!compact && (
        <mesh castShadow position={[0, -0.63, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.14, 6]} />
          <Paint color="#F49ABB" />
        </mesh>
      )}
    </group>
  )
}

function BookModel({
  color,
  thick = false,
}: {
  color: string
  thick?: boolean
}) {
  return (
    <group rotation={[0, 0.18, -0.05]}>
      <mesh castShadow scale={[0.9, thick ? 0.4 : 0.24, 0.7]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      <mesh
        castShadow
        position={[0.04, thick ? 0.22 : 0.14, 0]}
        scale={[0.8, 0.06, 0.61]}
      >
        <boxGeometry />
        <Paint color={PAPER} roughness={0.9} />
      </mesh>
      <mesh
        position={[-0.43, 0, 0]}
        scale={[0.07, thick ? 0.45 : 0.28, 0.72]}
      >
        <boxGeometry />
        <Paint color={INK} />
      </mesh>
    </group>
  )
}

function SeedModel({ color }: { color: string }) {
  return (
    <group rotation={[0, 0, -0.35]}>
      <mesh castShadow scale={[0.55, 0.34, 0.38]}>
        <dodecahedronGeometry args={[1, 0]} />
        <Paint color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.32, 0]} scale={[0.05, 0.35, 0.05]}>
        <boxGeometry />
        <Paint color="#68452F" />
      </mesh>
    </group>
  )
}

function AppleModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group>
      <mesh castShadow scale={[0.56, 0.52, 0.54]}>
        <dodecahedronGeometry args={[1, 1]} />
        <Paint color={color} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, -0.18]}>
        <cylinderGeometry args={[0.045, 0.055, 0.34, 6]} />
        <Paint color="#6B4933" />
      </mesh>
      {!compact && (
        <mesh
          castShadow
          position={[0.18, 0.58, 0]}
          rotation={[0, 0, -0.5]}
          scale={[0.25, 0.08, 0.14]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <Paint color={LEAF} />
        </mesh>
      )}
    </group>
  )
}

function PlantModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group>
      <mesh castShadow position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.36, 0.48, 0.5, 8]} />
        <Paint color={color} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.68, 6]} />
        <Paint color={DARK_LEAF} />
      </mesh>
      <mesh
        castShadow
        position={[-0.18, 0.28, 0]}
        rotation={[0, 0, 0.55]}
        scale={[0.3, 0.11, 0.18]}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <Paint color={LEAF} />
      </mesh>
      {!compact && (
        <mesh
          castShadow
          position={[0.18, 0.45, 0]}
          rotation={[0, 0, -0.55]}
          scale={[0.3, 0.11, 0.18]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <Paint color="#62B86E" />
        </mesh>
      )}
    </group>
  )
}

function ClockModel({ color }: { color: string }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.54, 0.54, 0.2, 16]} />
        <Paint color={color} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <circleGeometry args={[0.43, 16]} />
        <Paint color={PAPER} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.14, 0.1]} scale={[0.05, 0.05, 0.36]}>
        <boxGeometry />
        <Paint color={INK} />
      </mesh>
      <mesh
        position={[0.13, -0.145, 0]}
        rotation={[0, 0.6, 0]}
        scale={[0.27, 0.05, 0.05]}
      >
        <boxGeometry />
        <Paint color={INK} />
      </mesh>
    </group>
  )
}

function WaterDropModel({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, -0.15, 0]} scale={[0.5, 0.58, 0.5]}>
        <dodecahedronGeometry args={[1, 1]} />
        <Paint color={color} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, 0.49, 0]}>
        <coneGeometry args={[0.34, 0.72, 10]} />
        <Paint color={color} roughness={0.42} />
      </mesh>
    </group>
  )
}

function PencilCupModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  const pencilColors = ['#FFD166', '#4D96FF', '#EF7189']

  return (
    <group>
      <mesh castShadow position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.4, 0.46, 0.65, 10]} />
        <Paint color={color} />
      </mesh>
      {pencilColors.slice(0, compact ? 1 : 3).map((pencilColor, index) => (
        <mesh
          key={pencilColor}
          castShadow
          position={[(index - 1) * 0.16, 0.37 + index * 0.04, 0]}
          rotation={[0, 0, (index - 1) * 0.13]}
        >
          <cylinderGeometry args={[0.055, 0.055, 0.82, 6]} />
          <Paint color={pencilColor} />
        </mesh>
      ))}
    </group>
  )
}

function GlobeModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group>
      <mesh castShadow position={[0, 0.12, 0]}>
        <icosahedronGeometry args={[0.52, 2]} />
        <Paint color={color} roughness={0.5} />
      </mesh>
      {!compact && (
        <>
          <mesh
            position={[0.22, 0.27, 0.46]}
            scale={[0.2, 0.13, 0.05]}
          >
            <sphereGeometry args={[1, 7, 5]} />
            <Paint color="#62B86E" />
          </mesh>
          <mesh
            position={[-0.3, 0.02, 0.39]}
            scale={[0.16, 0.24, 0.05]}
          >
            <sphereGeometry args={[1, 7, 5]} />
            <Paint color={LEAF} />
          </mesh>
        </>
      )}
      <mesh rotation={[0, 0, 0.25]}>
        <torusGeometry args={[0.62, 0.035, 6, 24]} />
        <Paint color={GOLD} />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 0.13, 10]} />
        <Paint color={INK} />
      </mesh>
    </group>
  )
}

function AbacusModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  const beads = compact ? 4 : 8

  return (
    <group>
      <mesh castShadow position={[0, 0.45, 0]} scale={[1.05, 0.13, 0.18]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      <mesh castShadow position={[0, -0.45, 0]} scale={[1.05, 0.13, 0.18]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      {[-0.48, 0.48].map((x) => (
        <mesh
          key={x}
          castShadow
          position={[x, 0, 0]}
          scale={[0.13, 0.82, 0.18]}
        >
          <boxGeometry />
          <Paint color={color} />
        </mesh>
      ))}
      {[-0.24, 0, 0.24].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.88, 6]} />
          <Paint color={INK} />
        </mesh>
      ))}
      {Array.from({ length: beads }, (_, index) => {
        const row = index % 3
        const column = Math.floor(index / 3)
        return (
          <mesh
            key={`bead-${index}`}
            position={[-0.24 + column * 0.2, -0.24 + row * 0.24, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.09, 0.09, 0.13, 8]} />
            <Paint color={['#FF7B66', '#4169D8', '#F2C94C'][row]} />
          </mesh>
        )
      })}
    </group>
  )
}

function RainbowModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  const colors = compact ? [color] : ['#FF7B66', '#F2C94C', '#45A7A0']

  return (
    <group position={[0, -0.15, 0]}>
      {colors.map((bandColor, index) => (
        <mesh key={bandColor}>
          <torusGeometry
            args={[0.48 + index * 0.16, 0.075, 6, 24, Math.PI]}
          />
          <Paint color={bandColor} />
        </mesh>
      ))}
      <mesh position={[-0.65, 0, 0]} scale={[0.22, 0.13, 0.23]}>
        <sphereGeometry args={[1, 8, 6]} />
        <Paint color={PAPER} />
      </mesh>
      <mesh position={[0.65, 0, 0]} scale={[0.22, 0.13, 0.23]}>
        <sphereGeometry args={[1, 8, 6]} />
        <Paint color={PAPER} />
      </mesh>
    </group>
  )
}

function FractionBoard({ color }: { color: string }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.18, 20]} />
        <Paint color={color} />
      </mesh>
      {[0, Math.PI / 2].map((rotation) => (
        <mesh
          key={rotation}
          position={[0, -0.11, 0]}
          rotation={[0, rotation, 0]}
          scale={[1.02, 0.05, 0.05]}
        >
          <boxGeometry />
          <Paint color={PAPER} />
        </mesh>
      ))}
    </group>
  )
}

function SolarSystemModel({ compact }: { compact: boolean }) {
  const planets = compact
    ? [[0.6, 0, 0] as const]
    : ([
        [0.48, 0, 0],
        [-0.68, 0, 0.16],
        [0.25, 0, -0.78],
      ] as const)

  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[0.28, 1]} />
        <Paint color="#F7A531" roughness={0.5} />
      </mesh>
      {[0.52, 0.72, 0.92].slice(0, compact ? 1 : 3).map((radius) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.018, 5, 28]} />
          <Paint color="#8EA3B7" />
        </mesh>
      ))}
      {planets.map((position, index) => (
        <mesh key={`planet-${index}`} castShadow position={position}>
          <icosahedronGeometry args={[0.1 + index * 0.025, 1]} />
          <Paint color={['#4D96FF', '#65A30D', '#E879A8'][index]} />
        </mesh>
      ))}
    </group>
  )
}

function BookStack({ color }: { color: string }) {
  return (
    <group>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          castShadow
          position={[(index - 1) * 0.06, -0.28 + index * 0.28, 0]}
          rotation={[0, (index - 1) * 0.1, 0]}
          scale={[1, 0.24, 0.68]}
        >
          <boxGeometry />
          <Paint color={[color, '#4169D8', '#FF7B66'][index]} />
        </mesh>
      ))}
    </group>
  )
}

function TelescopeModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group>
      <group rotation={[0, 0, -0.65]} position={[0, 0.32, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.17, 0.22, 1.08, 10]} />
          <Paint color={color} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.16, 10]} />
          <Paint color="#4D96FF" roughness={0.35} />
        </mesh>
      </group>
      {!compact &&
        [-0.28, 0.28].map((x) => (
          <mesh
            key={x}
            castShadow
            position={[x, -0.34, 0]}
            rotation={[0, 0, x * 0.9]}
          >
            <cylinderGeometry args={[0.035, 0.045, 0.78, 6]} />
            <Paint color={LIGHT_WOOD} />
          </mesh>
        ))}
    </group>
  )
}

function CalendarModel({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group>
      <mesh castShadow scale={[0.9, 0.72, 0.18]}>
        <boxGeometry />
        <Paint color={PAPER} />
      </mesh>
      <mesh position={[0, 0.26, 0.2]} scale={[0.82, 0.19, 0.05]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      {!compact &&
        [-0.24, 0, 0.24].flatMap((x) =>
          [-0.08, -0.3].map((y) => (
            <mesh
              key={`${x}-${y}`}
              position={[x, y, 0.2]}
              scale={[0.1, 0.08, 0.05]}
            >
              <boxGeometry />
              <Paint color="#B6C4D2" />
            </mesh>
          )),
        )}
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.49, 0.06]}>
          <torusGeometry args={[0.08, 0.025, 5, 12]} />
          <Paint color={INK} />
        </mesh>
      ))}
    </group>
  )
}

function GeometryKit({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position={[0, -0.25, 0]} scale={[1, 0.42, 0.78]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      <mesh castShadow position={[-0.28, 0.2, 0]}>
        <coneGeometry args={[0.22, 0.55, 4]} />
        <Paint color="#FF7B66" />
      </mesh>
      <mesh castShadow position={[0.05, 0.17, 0]} scale={0.32}>
        <boxGeometry />
        <Paint color="#4169D8" />
      </mesh>
      <mesh castShadow position={[0.35, 0.18, 0]} scale={0.23}>
        <icosahedronGeometry args={[1, 1]} />
        <Paint color="#45A7A0" />
      </mesh>
    </group>
  )
}

function VowelBoard({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow scale={[1.05, 0.72, 0.16]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      <group position={[-0.32, 0, 0.2]} scale={0.54}>
        <GlyphBars symbol="ㅏ" />
      </group>
      <group position={[0.34, 0, 0.2]} scale={0.54}>
        <GlyphBars symbol="ㅗ" />
      </group>
    </group>
  )
}

function SaturnModel({ color }: { color: string }) {
  return (
    <group rotation={[0.18, 0, -0.2]}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.5, 2]} />
        <Paint color={color} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.1, 6, 28]} />
        <Paint color="#EECF91" />
      </mesh>
    </group>
  )
}

function LibraryCart({
  color,
  compact,
}: {
  color: string
  compact: boolean
}) {
  return (
    <group>
      <mesh castShadow position={[0, -0.18, 0]} scale={[1.05, 0.48, 0.72]}>
        <boxGeometry />
        <Paint color={color} />
      </mesh>
      {!compact &&
        [-0.32, 0, 0.32].map((x, index) => (
          <mesh
            key={x}
            castShadow
            position={[x, 0.27 + (index % 2) * 0.05, 0]}
            scale={[0.22, 0.58, 0.5]}
          >
            <boxGeometry />
            <Paint color={['#4D96FF', '#F2C94C', '#FF7B66'][index]} />
          </mesh>
        ))}
      {[-0.36, 0.36].map((x) => (
        <mesh
          key={x}
          position={[x, -0.52, 0.25]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.13, 0.13, 0.12, 10]} />
          <Paint color={INK} />
        </mesh>
      ))}
    </group>
  )
}

function FallbackShape({ item }: { item: LearningObject }) {
  if (item.shape === 'sphere') {
    return (
      <mesh castShadow>
        <icosahedronGeometry args={[0.56, 1]} />
        <Paint color={item.color} />
      </mesh>
    )
  }

  if (item.shape === 'cylinder') {
    return (
      <mesh castShadow>
        <cylinderGeometry args={[0.48, 0.55, 0.92, 10]} />
        <Paint color={item.color} />
      </mesh>
    )
  }

  if (item.shape === 'cone') {
    return (
      <mesh castShadow>
        <coneGeometry args={[0.58, 0.96, 3]} />
        <Paint color={item.color} />
      </mesh>
    )
  }

  if (item.shape === 'torus') {
    return (
      <mesh castShadow>
        <torusGeometry args={[0.5, 0.17, 7, 20]} />
        <Paint color={item.color} />
      </mesh>
    )
  }

  return (
    <mesh castShadow scale={[0.82, 0.66, 0.72]}>
      <boxGeometry />
      <Paint color={item.color} />
    </mesh>
  )
}

/**
 * A deterministic, texture-free representation of a learning collectible.
 * Keep the local origin at the object's center so the same mesh can be used
 * both in the world and as a surface attachment.
 */
export function LearningObjectMesh({
  item,
  detail = 'world',
}: LearningObjectMeshProps) {
  const compact = detail === 'attached'

  switch (item.id) {
    case 'vowel-a':
    case 'vowel-o':
    case 'number-one':
    case 'number-ten':
    case 'music-block':
      return <GlyphTile item={item} />
    case 'triangle':
      return (
        <mesh castShadow>
          <coneGeometry args={[0.58, 0.98, 3]} />
          <Paint color={item.color} />
        </mesh>
      )
    case 'eraser':
      return (
        <group rotation={[0, 0.16, -0.12]}>
          <mesh castShadow scale={[0.86, 0.42, 0.55]}>
            <boxGeometry />
            <Paint color={item.color} />
          </mesh>
          <mesh position={[0.18, 0, 0]} scale={[0.32, 0.44, 0.57]}>
            <boxGeometry />
            <Paint color={PAPER} />
          </mesh>
        </group>
      )
    case 'cube':
      return (
        <mesh castShadow scale={0.68} rotation={[0.08, 0.22, 0.04]}>
          <boxGeometry />
          <Paint color={item.color} />
        </mesh>
      )
    case 'pencil-yellow':
      return <PencilModel color={item.color} compact={compact} />
    case 'circle':
      return (
        <mesh castShadow>
          <torusGeometry args={[0.5, 0.16, 8, 24]} />
          <Paint color={item.color} />
        </mesh>
      )
    case 'seed':
      return <SeedModel color={item.color} />
    case 'apple':
      return <AppleModel color={item.color} compact={compact} />
    case 'book-korean':
      return <BookModel color={item.color} />
    case 'plant-pot':
      return <PlantModel color={item.color} compact={compact} />
    case 'clock':
      return <ClockModel color={item.color} />
    case 'water-drop':
      return <WaterDropModel color={item.color} />
    case 'pencil-cup':
      return <PencilCupModel color={item.color} compact={compact} />
    case 'globe':
      return <GlobeModel color={item.color} compact={compact} />
    case 'dictionary':
      return <BookModel color={item.color} thick />
    case 'abacus':
      return <AbacusModel color={item.color} compact={compact} />
    case 'rainbow-arch':
      return <RainbowModel color={item.color} compact={compact} />
    case 'fraction-board':
      return <FractionBoard color={item.color} />
    case 'solar-model':
      return <SolarSystemModel compact={compact} />
    case 'books-stack':
      return <BookStack color={item.color} />
    case 'telescope':
      return <TelescopeModel color={item.color} compact={compact} />
    case 'calendar':
      return <CalendarModel color={item.color} compact={compact} />
    case 'geometry-kit':
      return <GeometryKit color={item.color} />
    case 'vowel-board':
      return <VowelBoard color={item.color} />
    case 'planet-saturn':
      return <SaturnModel color={item.color} />
    case 'library-box':
      return <LibraryCart color={item.color} compact={compact} />
    default:
      return <FallbackShape item={item} />
  }
}

/**
 * Place this component inside the rolling orb group. Its deterministic
 * Fibonacci-sphere slot keeps the collectible fixed to the orb as it rotates.
 */
export function AttachedObjectMesh({
  item,
  index,
  orbRadius,
  slotCount = 12,
}: AttachedObjectMeshProps) {
  const transform = useMemo(() => {
    const safeSlotCount = Math.max(1, slotCount)
    const slot = ((index % safeSlotCount) + 0.5) / safeSlotCount
    const y = 1 - slot * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = index * GOLDEN_ANGLE
    const normal = new Vector3(
      Math.cos(theta) * ring,
      y,
      Math.sin(theta) * ring,
    ).normalize()
    const position = normal.clone().multiplyScalar(orbRadius * 0.965)
    const orientation = new Quaternion().setFromUnitVectors(UP, normal)
    const idSeed = Array.from(item.id).reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    )
    const yaw = ((idSeed % 16) / 16) * Math.PI * 2
    orientation.multiply(new Quaternion().setFromAxisAngle(UP, yaw))
    const scale =
      Math.max(0.11, Math.min(0.34, orbRadius * 0.14)) *
      (0.92 + Math.min(item.size, 1.5) * 0.08)

    return { orientation, position, scale }
  }, [index, item.id, item.size, orbRadius, slotCount])

  return (
    <group
      name={`attached-${item.id}`}
      position={transform.position}
      quaternion={transform.orientation}
      scale={transform.scale}
    >
      <LearningObjectMesh item={item} detail="attached" />
    </group>
  )
}

interface InstanceSpec {
  color: string
  position: [number, number, number]
  scale: [number, number, number]
  rotationY?: number
}

function InstancedBoxBatch({
  specs,
  color,
  castShadow = true,
  receiveShadow = false,
}: {
  specs: InstanceSpec[]
  color: string
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()

    specs.forEach((spec, index) => {
      dummy.position.set(...spec.position)
      dummy.rotation.set(0, spec.rotationY ?? 0, 0)
      dummy.scale.set(...spec.scale)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [specs])

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, specs.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={0.84} metalness={0.01} />
    </instancedMesh>
  )
}

function InstancedBoxes({
  specs,
  castShadow = true,
  receiveShadow = false,
}: {
  specs: InstanceSpec[]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const colorGroups = useMemo(
    () =>
      Array.from(new Set(specs.map((spec) => spec.color))).map((color) => ({
        color,
        specs: specs.filter((spec) => spec.color === color),
      })),
    [specs],
  )

  return (
    <>
      {colorGroups.map((group) => (
        <InstancedBoxBatch
          key={group.color}
          specs={group.specs}
          color={group.color}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </>
  )
}

function InstancedCanopyBatch({
  specs,
  color,
}: {
  specs: InstanceSpec[]
  color: string
}) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new Object3D()

    specs.forEach((spec, index) => {
      dummy.position.set(...spec.position)
      dummy.rotation.set(0, spec.rotationY ?? 0, 0)
      dummy.scale.set(...spec.scale)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(index, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [specs])

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, specs.length]}
      castShadow
    >
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={color} roughness={0.92} metalness={0} />
    </instancedMesh>
  )
}

function InstancedCanopies({ specs }: { specs: InstanceSpec[] }) {
  const colorGroups = useMemo(
    () =>
      Array.from(new Set(specs.map((spec) => spec.color))).map((color) => ({
        color,
        specs: specs.filter((spec) => spec.color === color),
      })),
    [specs],
  )

  return (
    <>
      {colorGroups.map((group) => (
        <InstancedCanopyBatch
          key={group.color}
          specs={group.specs}
          color={group.color}
        />
      ))}
    </>
  )
}

const TREE_POSITIONS: ReadonlyArray<[number, number]> = [
  [-8.8, -7.6],
  [-8.9, 0],
  [-8.4, 7.4],
  [-3.3, 9],
  [3.5, 9],
  [8.5, 7.2],
  [8.9, 0],
  [8.4, -7.4],
  [3.2, -9],
  [-3.5, -9],
]

const SHELVES: ReadonlyArray<{
  position: [number, number]
  rotationY: number
}> = [
  { position: [-7.8, -4.2], rotationY: Math.PI / 2 },
  { position: [7.8, 4.2], rotationY: -Math.PI / 2 },
]

function rotateOffset(
  x: number,
  z: number,
  rotationY: number,
): [number, number] {
  const cosine = Math.cos(rotationY)
  const sine = Math.sin(rotationY)
  return [x * cosine + z * sine, -x * sine + z * cosine]
}

/**
 * A low-poly, nonviolent learning garden/playroom. Repeated scenery uses
 * instancing, all layouts are module constants, and no frame-loop work occurs.
 */
export function GardenSetDressing({
  floorSize = 23,
  receiveShadow = true,
}: GardenSetDressingProps) {
  const scenery = useMemo(() => {
    const trunks: InstanceSpec[] = TREE_POSITIONS.map(([x, z], index) => ({
      color: index % 2 ? WOOD : '#9A643D',
      position: [x, 0.65, z],
      scale: [0.36, 1.3, 0.36],
    }))
    const canopies: InstanceSpec[] = TREE_POSITIONS.flatMap(
      ([x, z], index) => [
        {
          color: index % 2 ? LEAF : DARK_LEAF,
          position: [x, 1.75, z] as [number, number, number],
          scale: [1.45, 1.2, 1.35] as [number, number, number],
        },
        {
          color: index % 2 ? '#66B76B' : '#56A35A',
          position: [x + 0.38, 2.18, z - 0.12] as [
            number,
            number,
            number,
          ],
          scale: [0.9, 0.82, 0.88] as [number, number, number],
        },
      ],
    )
    const floorTiles: InstanceSpec[] = Array.from(
      { length: 24 },
      (_, index) => {
        const angle = (index / 24) * Math.PI * 2
        const radius = index % 2 ? 5.1 : 7.05
        return {
          color: index % 3 === 0 ? '#C9E8BF' : '#D8EFCF',
          position: [
            Math.cos(angle) * radius,
            0.025,
            Math.sin(angle) * radius,
          ],
          scale: [0.62, 0.025, 0.62],
          rotationY: angle,
        }
      },
    )
    const shelfWood: InstanceSpec[] = []
    const shelfBooks: InstanceSpec[] = []

    SHELVES.forEach((shelf, shelfIndex) => {
      const [baseX, baseZ] = shelf.position
      const woodParts = [
        { x: -0.95, y: 0.95, z: 0, scale: [0.14, 1.9, 0.54] },
        { x: 0.95, y: 0.95, z: 0, scale: [0.14, 1.9, 0.54] },
        { x: 0, y: 0.12, z: 0, scale: [1.9, 0.14, 0.54] },
        { x: 0, y: 0.95, z: 0, scale: [1.9, 0.12, 0.54] },
        { x: 0, y: 1.8, z: 0, scale: [1.9, 0.14, 0.54] },
      ]

      woodParts.forEach((part) => {
        const [offsetX, offsetZ] = rotateOffset(
          part.x,
          part.z,
          shelf.rotationY,
        )
        shelfWood.push({
          color: shelfIndex ? LIGHT_WOOD : WOOD,
          position: [baseX + offsetX, part.y, baseZ + offsetZ],
          scale: part.scale as [number, number, number],
          rotationY: shelf.rotationY,
        })
      })

      Array.from({ length: 8 }, (_, index) => {
        const row = index < 4 ? 0 : 1
        const localX = -0.63 + (index % 4) * 0.42
        const localZ = -0.03
        const [offsetX, offsetZ] = rotateOffset(
          localX,
          localZ,
          shelf.rotationY,
        )
        shelfBooks.push({
          color: ['#4D96FF', '#FF7B66', '#F2C94C', '#45A7A0'][index % 4],
          position: [
            baseX + offsetX,
            0.52 + row * 0.85,
            baseZ + offsetZ,
          ],
          scale: [0.28, 0.65, 0.38],
          rotationY: shelf.rotationY,
        })
      })
    })

    const playBlocks: InstanceSpec[] = Array.from(
      { length: 14 },
      (_, index) => {
        const column = index % 7
        const row = Math.floor(index / 7)
        return {
          color: ['#FF7B66', '#4169D8', '#F2C94C', '#45A7A0'][index % 4],
          position: [-1.65 + column * 0.55, 0.24 + row * 0.42, 8.25],
          scale: [0.42, 0.42, 0.42],
          rotationY: (index % 3) * 0.12,
        }
      },
    )

    return {
      canopies,
      floorTiles,
      playBlocks,
      shelfBooks,
      shelfWood,
      trunks,
    }
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={receiveShadow}>
        <planeGeometry args={[floorSize, floorSize]} />
        <Paint color="#DFF3D8" roughness={0.96} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        receiveShadow={receiveShadow}
      >
        <ringGeometry args={[3.6, 4.35, 48]} />
        <Paint color="#F3DEB2" roughness={0.96} />
      </mesh>
      <mesh
        position={[0, 0.018, 0]}
        scale={[0.72, 0.035, 8.8]}
        receiveShadow={receiveShadow}
      >
        <boxGeometry />
        <Paint color="#EED6A5" roughness={0.96} />
      </mesh>
      <mesh
        position={[0, 0.02, 0]}
        scale={[8.8, 0.035, 0.72]}
        receiveShadow={receiveShadow}
      >
        <boxGeometry />
        <Paint color="#EED6A5" roughness={0.96} />
      </mesh>

      <InstancedBoxes
        specs={scenery.floorTiles}
        castShadow={false}
        receiveShadow={receiveShadow}
      />
      <InstancedBoxes specs={scenery.trunks} />
      <InstancedCanopies specs={scenery.canopies} />
      <InstancedBoxes specs={scenery.shelfWood} />
      <InstancedBoxes specs={scenery.shelfBooks} />
      <InstancedBoxes specs={scenery.playBlocks} />

      <group position={[-5.8, 0, 7.8]}>
        <mesh castShadow position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.52, 0.7, 0.8, 8]} />
          <Paint color="#E68A56" />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.72, 6]} />
          <Paint color={DARK_LEAF} />
        </mesh>
        {[-0.35, 0.35].map((x) => (
          <mesh
            key={x}
            castShadow
            position={[x, 1.35, 0]}
            rotation={[0, 0, x > 0 ? -0.55 : 0.55]}
            scale={[0.42, 0.14, 0.26]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <Paint color={LEAF} />
          </mesh>
        ))}
      </group>

      <group position={[5.8, 0, -7.8]}>
        <mesh castShadow position={[0, 0.48, 0]} scale={[1.4, 0.82, 0.24]}>
          <boxGeometry />
          <Paint color="#4D96FF" />
        </mesh>
        <mesh position={[-0.37, 0.51, 0.27]} scale={[0.16, 0.16, 0.04]}>
          <boxGeometry />
          <Paint color={PAPER} />
        </mesh>
        <mesh position={[0, 0.51, 0.27]} scale={[0.16, 0.16, 0.04]}>
          <sphereGeometry args={[1, 8, 6]} />
          <Paint color={PAPER} />
        </mesh>
        <mesh position={[0.37, 0.51, 0.27]} scale={[0.16, 0.16, 0.04]}>
          <coneGeometry args={[1, 1, 3]} />
          <Paint color={PAPER} />
        </mesh>
      </group>
    </group>
  )
}

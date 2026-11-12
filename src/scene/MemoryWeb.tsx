import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Drive } from './Scene'

/**
 * A living knowledge constellation around the Neural Core.
 * Nodes are typed knowledge-domain anchors until the account-scoped memory
 * API supplies real approved records. They are deliberately not presented as
 * personal memories before that connection exists.
 */
const DOMAINS = [
  'PROJECTS', 'PEOPLE', 'DECISIONS', 'RESEARCH',
  'SOURCES', 'PREFERENCES', 'DOCUMENTS', 'SYSTEMS',
  'PLANS', 'KNOWLEDGE', 'TASKS', 'HISTORY',
]

export function MemoryWeb({ drive }: { drive: Drive }) {
  const group = useRef<THREE.Group>(null)
  const nodes = useMemo(() => {
    const result: THREE.Vector3[] = []
    const count = DOMAINS.length
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const theta = golden * i
      const shell = 2.05 + (i % 3) * 0.22
      result.push(new THREE.Vector3(
        Math.cos(theta) * radius * shell,
        y * shell,
        Math.sin(theta) * radius * shell,
      ))
    }
    return result
  }, [])

  const lineGeometry = useMemo(() => {
    const vertices: number[] = []
    nodes.forEach((point, i) => {
      // Each domain connects to the core and to its two nearest neighbours.
      vertices.push(0, 0, 0, point.x, point.y, point.z)
      for (const j of [i + 1, (i + 3) % nodes.length]) {
        if (j <= i) continue
        const other = nodes[j]
        vertices.push(point.x, point.y, point.z, other.x, other.y, other.z)
      }
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }, [nodes])

  useFrame((state, dt) => {
    if (!group.current) return
    const phaseSpeed =
      drive.spin * (drive.level > 0.18 ? 0.32 + drive.level * 0.7 : 0.12)
    group.current.rotation.y += dt * phaseSpeed
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.16) * 0.12
    const scale = 0.88 + drive.open * 0.13 + Math.sin(state.clock.elapsedTime * 1.1) * 0.025
    group.current.scale.setScalar(scale)
  })

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#ff9b43" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>
      {nodes.map((point, index) => (
        <group key={DOMAINS[index]} position={point}>
          <mesh>
            <sphereGeometry args={[index % 4 === 0 ? 0.075 : 0.045, 12, 12]} />
            <meshBasicMaterial
              color={index % 4 === 0 ? '#ffe0a6' : '#ff9a38'}
              transparent
              opacity={0.82}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[index % 4 === 0 ? 0.14 : 0.095, 10, 10]} />
            <meshBasicMaterial color="#ff8b2c" transparent opacity={0.10} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

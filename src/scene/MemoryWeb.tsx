import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
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
  'FINANCE', 'DEVICES', 'AUTOMATIONS', 'CONVERSATIONS',
  'GOALS', 'LEARNING', 'MEDIA', 'LOCATIONS',
  'WORKFLOWS', 'INTEGRATIONS', 'NOTES', 'REFERENCES',
]


const MEMORY_NODES: THREE.Vector3[] = DOMAINS.map((_, index) => {
  const count = DOMAINS.length
  const y = 1 - (index / (count - 1)) * 2
  const radius = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = Math.PI * (3 - Math.sqrt(5)) * index
  const shell = 2.05 + (index % 3) * 0.22
  return new THREE.Vector3(
    Math.cos(theta) * radius * shell,
    y * shell,
    Math.sin(theta) * radius * shell,
  )
})

const MEMORY_LINES = (() => {
  const vertices: number[] = []
  for (let index = 0; index < MEMORY_NODES.length; index++) {
    const point = MEMORY_NODES[index]
    if (!point) continue
    vertices.push(0, 0, 0, point.x, point.y, point.z)
    const neighbours = [index + 1, (index + 3) % MEMORY_NODES.length]
    for (let offset = 0; offset < neighbours.length; offset++) {
      const neighbour = neighbours[offset]
      if (neighbour === undefined || neighbour <= index) continue
      const other = MEMORY_NODES[neighbour]
      if (!other) continue
      vertices.push(point.x, point.y, point.z, other.x, other.y, other.z)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
})()

export function MemoryWeb({ drive }: { drive: Drive }) {
  const [selected, setSelected] = useState<string | null>(null)
  const group = useRef<THREE.Group>(null)
  // Build immutable geometry once at module scope. Keeping array traversal out
  // of React render hooks avoids a fatal mobile recovery path if a renderer or
  // hot-reload leaves a memoized value in an unexpected shape.
  const nodes = MEMORY_NODES
  const lineGeometry = MEMORY_LINES

  useFrame((state, dt) => {
    if (!group.current) return
    const phaseSpeed =
      0.48 + drive.spin * (drive.level > 0.18 ? 0.85 + drive.level * 0.9 : 0.62)
    group.current.rotation.y += dt * phaseSpeed
    group.current.rotation.z += dt * phaseSpeed * 0.31
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.16) * 0.12
    const scale = 0.78 + drive.open * 0.20 + Math.sin(state.clock.elapsedTime * 1.1) * 0.025
    group.current.scale.setScalar(scale)
  })

  return (
    <group ref={group}>
      {/* True volumetric central intelligence body with counter-rotating gyro rings. */}
      <mesh rotation={[0.35, 0.1, 0]}>
        <sphereGeometry args={[0.94, 28, 22]} />
        <meshBasicMaterial color="#a94b12" transparent opacity={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.02, 28, 20]} />
        <meshBasicMaterial color="#ffad55" wireframe transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.4, 0.2, 0]}>
        <sphereGeometry args={[1.12, 24, 18]} />
        <meshBasicMaterial color="#ff7b22" wireframe transparent opacity={0.20} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.7, 0, 0]}>
        <torusGeometry args={[1.28, 0.012, 6, 96]} />
        <meshBasicMaterial color="#ffd08a" transparent opacity={0.62} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2.5, 0]}>
        <torusGeometry args={[1.36, 0.008, 6, 96]} />
        <meshBasicMaterial color="#ff8b30" transparent opacity={0.48} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.48, 28, 20]} />
        <meshBasicMaterial color="#ff9b43" wireframe transparent opacity={0.30} depthWrite={false} />
      </mesh>
      <mesh rotation={[0.35, 0.2, 0]}>
        <sphereGeometry args={[1.68, 24, 18]} />
        <meshBasicMaterial color="#ffc477" wireframe transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#ff9b43" transparent opacity={0.52} depthWrite={false} />
      </lineSegments>
      {nodes.map((point, index) => (
        <group
          key={DOMAINS[index]}
          position={point}
          onClick={(event) => { event.stopPropagation(); setSelected(selected === DOMAINS[index] ? null : DOMAINS[index]) }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <mesh>
            <sphereGeometry args={[index % 4 === 0 ? 0.075 : 0.045, 8, 8]} />
            <meshBasicMaterial
              color={index % 4 === 0 ? '#ffe0a6' : '#ff9a38'}
              transparent
              opacity={0.82}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[index % 4 === 0 ? 0.14 : 0.095, 8, 6]} />
            <meshBasicMaterial color="#ff8b2c" transparent opacity={0.10} />
          </mesh>
          {selected === DOMAINS[index] && (
            <Html distanceFactor={8} center>
              <div style={{ minWidth: 150, padding: '9px 11px', border: '1px solid rgba(255,174,83,.65)', borderRadius: 7, background: 'rgba(8,6,4,.88)', color: '#ffe0b8', font: '10px ui-monospace,monospace', letterSpacing: '.08em', boxShadow: '0 0 24px rgba(255,139,43,.24)', pointerEvents: 'none' }}>
                <b>{DOMAINS[index]}</b>
                <div style={{ marginTop: 5, color: 'rgba(255,211,167,.7)', fontSize: 9, letterSpacing: 0 }}>KNOWLEDGE DOMAIN · RECORDS NOT YET LINKED</div>
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  )
}

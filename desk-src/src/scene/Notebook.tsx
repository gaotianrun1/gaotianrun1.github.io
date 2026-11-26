import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { DoubleSide, PlaneGeometry } from 'three'
import { C, paintTexture, scribble } from './look'

// An open hardcover notebook with a fountain pen lying on it. Origin: on the desk surface, at the spine.

const PAGE_W = 0.16
const PAGE_H = 0.22

export function Notebook() {
  const pages = useMemo(() => {
    const make = (side: -1 | 1, seed: number) => {
      const g = new PlaneGeometry(PAGE_W, PAGE_H, 16, 1)
      const pos = g.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const u = (pos.getX(i) + PAGE_W / 2) / PAGE_W // 0..1 across the page
        const fromSpine = side === 1 ? u : 1 - u
        // pages rise from the spine and flatten towards the edge
        const lift = 0.014 * Math.sin(Math.min(fromSpine * 2.2, Math.PI / 2)) - 0.004 * fromSpine
        pos.setZ(i, lift)
      }
      g.computeVertexNormals()
      const tex = paintTexture(256, 352, (c) => {
        c.fillStyle = C.paper
        c.fillRect(0, 0, 256, 352)
        c.fillStyle = '#d9e2e6'
        for (let y = 40; y < 340; y += 14) c.fillRect(14, y, 228, 1)
        if (side === 1) {
          scribble(c, 26, 30, 200, 1, 14, '#3c3a36', seed)
          scribble(c, 26, 60, 200, 9, 14, '#55524c', seed + 1, false)
          scribble(c, 26, 200, 190, 6, 14, '#55524c', seed + 2, false)
        } else {
          scribble(c, 26, 60, 200, 14, 14, '#6a665e', seed, false)
        }
      })
      return { g, tex, x: (side * PAGE_W) / 2 }
    }
    return [make(-1, 21), make(1, 33)]
  }, [])

  return (
    <group>
      {/* the open hardcover: two boards and a cloth spine */}
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[PAGE_W + 0.008, 0.004, PAGE_H + 0.01]} radius={0.0018} smoothness={2} position={[side * (PAGE_W / 2 + 0.004), 0.002, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#2b2a28" roughness={0.75} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.0015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, PAGE_H + 0.01, 16, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#232220" roughness={0.8} side={DoubleSide} />
      </mesh>
      {/* the page block under the open spread, its fore-edges showing */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (PAGE_W / 2 + 0.002), 0.0055, 0]} castShadow receiveShadow>
          <boxGeometry args={[PAGE_W - 0.004, 0.004, PAGE_H - 0.002]} />
          <meshStandardMaterial color="#efe9dc" roughness={0.95} />
        </mesh>
      ))}
      {pages.map(({ g, tex, x }) => (
        <mesh key={x} geometry={g} position={[x, 0.0076, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
      ))}
      {/* the elastic band, slack along the right board's edge */}
      <mesh position={[PAGE_W + 0.0095, 0.004, 0]}>
        <boxGeometry args={[0.003, 0.003, PAGE_H + 0.012]} />
        <meshStandardMaterial color="#1b1a19" roughness={0.6} />
      </mesh>
      {/* ribbon bookmark out of the foot of the spine */}
      <mesh position={[0.006, 0.0082, 0.128]} rotation={[-Math.PI / 2, 0, 0.18]}>
        <planeGeometry args={[0.006, 0.05]} />
        <meshStandardMaterial color={C.orange} roughness={0.7} side={DoubleSide} />
      </mesh>
      {/* a fountain pen laid across the right-hand page: barrel, cap ring, clip and a steel nib.
          It rests on the crown of the page's curve, which peaks about 0.019 up. */}
      <group position={[0.085, 0.0245, 0.01]} rotation={[0, 0.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.0055, 0.12, 6, 20]} />
          <meshStandardMaterial color={C.graphite} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0058, 0.0058, 0.005, 20]} />
          <meshStandardMaterial color={C.chrome} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.0062, -0.02]}>
          <boxGeometry args={[0.0018, 0.0014, 0.05]} />
          <meshStandardMaterial color={C.chrome} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.074]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.0042, 0.014, 16]} />
          <meshStandardMaterial color={C.chrome} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

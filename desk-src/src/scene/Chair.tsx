import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import { C } from './look'

// A 1960s office swivel chair: cognac leather seat and curved back on a
// chrome spine, a gas column and a five-star aluminium base on casters.
// Origin: on the floor under the column; the seat faces -z.

const SEAT_Y = 0.46
const leather = { color: '#8a5634', roughness: 0.55 }
const alu = { color: '#c9c9c4', metalness: 0.9, roughness: 0.28 }

export function Chair() {
  // the back seen from above: a band on an arc, extruded up and bevelled
  const back = useMemo(() => {
    const r = 0.42
    const a = 0.58
    const t = 0.05
    const shape = new Shape()
    shape.absarc(0, 0, r, -Math.PI / 2 - a, -Math.PI / 2 + a, false)
    shape.absarc(0, 0, r + t, -Math.PI / 2 + a, -Math.PI / 2 - a, true)
    const g = new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 32 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, -r - t / 2)
    return g
  }, [])

  return (
    <group>
      {/* five-star base on casters */}
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <mesh position={[0, 0.075, 0.15]} rotation={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.036, 0.026, 0.3]} />
            <meshStandardMaterial {...alu} />
          </mesh>
          <group position={[0, 0.03, 0.29]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.022, 16]} />
              <meshStandardMaterial color={C.rubber} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.03, 10]} />
              <meshStandardMaterial {...alu} />
            </mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, 0.085, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.04, 20]} />
        <meshStandardMaterial {...alu} />
      </mesh>
      {/* gas column: a black sleeve and the chrome piston above it */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.026, 0.2, 16]} />
        <meshStandardMaterial color={C.rubber} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.017, 0.017, 0.12, 16]} />
        <meshStandardMaterial {...alu} />
      </mesh>
      {/* the mechanism under the seat, and the spine up the back */}
      <mesh position={[0, SEAT_Y - 0.045, 0]} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.22]} />
        <meshStandardMaterial color={C.graphite} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, SEAT_Y - 0.03, 0.17]} castShadow>
        <boxGeometry args={[0.05, 0.012, 0.16]} />
        <meshStandardMaterial {...alu} />
      </mesh>
      <mesh position={[0, SEAT_Y + 0.13, 0.26]} castShadow>
        <boxGeometry args={[0.05, 0.3, 0.012]} />
        <meshStandardMaterial {...alu} />
      </mesh>
      {/* the seat: a thin shell under a leather cushion */}
      <RoundedBox args={[0.46, 0.02, 0.44]} radius={0.008} smoothness={2} position={[0, SEAT_Y - 0.02, 0]} castShadow>
        <meshStandardMaterial color={C.graphite} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.47, 0.07, 0.45]} radius={0.032} smoothness={4} position={[0, SEAT_Y + 0.025, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...leather} />
      </RoundedBox>
      <mesh geometry={back} position={[0, SEAT_Y + 0.13, 0.2]} castShadow receiveShadow>
        <meshStandardMaterial {...leather} />
      </mesh>
    </group>
  )
}

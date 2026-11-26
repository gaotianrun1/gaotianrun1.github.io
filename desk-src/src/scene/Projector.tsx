import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import {
  Color,
  ExtrudeGeometry,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Object3D,
  RepeatWrapping,
  Shape,
  Vector2,
  type Group,
  type MeshStandardMaterial,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { C, paintTexture } from './look'

// How bright the lamp is, 0..1: set by the projection (Projection.tsx), shown in the lens.
export const lamp = { level: 0 }

// A carousel slide projector, faced away from the camera at the back wall.
// The tray turns one slot per slide; the lens and the pilot light glow while
// it is on. Origin: on the desk surface, under the body's centre. The lens is
// on the far face (-z); vents and controls are on the rear (+z),
// which faces the camera.

const SLOTS = 40
const STEP = (Math.PI * 2) / SLOTS
export const LENS_OFFSET = [0, 0.08, -0.243] as const

// Heights of the stacked parts, from the desk up.
const FOOT = 0.008
const PLINTH = 0.036
const SEAM = 0.104
const DECK = 0.14
const TRAY = DECK + 0.006

// A rectangle with rounded corners, centred, in the shape's xy plane.
function roundedRect(w: number, d: number, r: number, s = new Shape()) {
  const x = -w / 2
  const y = -d / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + d - r)
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  s.lineTo(x + r, y + d)
  s.quadraticCurveTo(x, y + d, x, y + d - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

// A shell half: the rounded plan extruded upward, with soft bevelled edges.
// Spans y from 0 to h in its own frame; w × d is the outer footprint.
function shell(w: number, d: number, h: number, corner: number, bevel: number) {
  const g = new ExtrudeGeometry(roundedRect(w - bevel * 2, d - bevel * 2, corner), {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 5,
    curveSegments: 10,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, bevel, 0)
  // weld the walls so the rounded corners shade smooth, not faceted
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  const smooth = mergeVertices(g, 1e-5)
  smooth.computeVertexNormals()
  return smooth
}

// A turned part from a list of (radius, height) points.
const lathe = (pts: [number, number][], seg = 64) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg)

export function Projector({ on, slot }: { on: boolean; slot: number }) {
  const tray = useRef<Group>(null)
  const lens = useRef<MeshStandardMaterial>(null)
  const pilot = useRef<MeshStandardMaterial>(null)
  const p = useParts()

  useFrame((_, dt) => {
    const k = Math.min(dt, 0.05)
    if (tray.current) tray.current.rotation.y = MathUtils.damp(tray.current.rotation.y, -slot * STEP, 7, k)
    if (lens.current) lens.current.emissiveIntensity = lamp.level * 3
    if (pilot.current) pilot.current.emissiveIntensity = MathUtils.damp(pilot.current.emissiveIntensity, on ? 2.5 : 0, 4, k)
  })

  const plastic = <meshStandardMaterial color={C.shell} roughness={0.4} />
  const graphite = <meshStandardMaterial color={C.graphite} roughness={0.55} />

  return (
    <group>
      {/* rubber feet */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.135, FOOT / 2, sz * 0.125]}>
            <cylinderGeometry args={[0.013, 0.015, FOOT, 20]} />
            <meshStandardMaterial color={C.rubber} roughness={0.9} />
          </mesh>
        )),
      )}
      {/* graphite plinth, set in under the shell */}
      <mesh geometry={p.plinth} position={[0, FOOT, 0]} castShadow receiveShadow>
        {graphite}
      </mesh>
      {/* lower and upper shell; their bevels meet in a shut line */}
      <mesh geometry={p.lower} position={[0, PLINTH, 0]} castShadow receiveShadow>
        {plastic}
      </mesh>
      <mesh geometry={p.seam} position={[0, SEAM - 0.002, 0]}>
        <meshStandardMaterial color={C.graphite} roughness={0.7} />
      </mesh>
      <mesh geometry={p.upper} position={[0, SEAM, 0]} castShadow receiveShadow>
        {plastic}
      </mesh>
      {/* turntable collar the tray sits on, with the index pointer at the rear */}
      <mesh geometry={p.collar} position={[0, DECK, 0]} receiveShadow>
        {graphite}
      </mesh>
      <mesh position={[0, DECK + 0.004, 0.156]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <circleGeometry args={[0.006, 3]} />
        <meshStandardMaterial color={C.paper} roughness={0.5} />
      </mesh>

      <Grille />
      <Controls pilot={pilot} legend={p.legend} />

      {/* focus knob on the right side, near the lens */}
      <group position={[0.18, 0.07, -0.1]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[0, 0.004, 0]} castShadow>
          <cylinderGeometry args={[0.017, 0.017, 0.012, 40]} />
          <meshStandardMaterial color={C.graphite} roughness={0.5} bumpMap={p.knurlKnob} bumpScale={2} />
        </mesh>
        <mesh position={[0, 0.0105, 0]}>
          <cylinderGeometry args={[0.012, 0.014, 0.002, 32]} />
          <meshStandardMaterial color={C.chrome} roughness={0.3} metalness={0.85} />
        </mesh>
      </group>

      {/* lens: mount, barrel, knurled focus ring, bright front ring, glass */}
      <group position={[0, LENS_OFFSET[1], -0.168]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={p.mount} castShadow>
          {graphite}
        </mesh>
        <mesh geometry={p.barrel} castShadow>
          <meshStandardMaterial color={C.key} roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.042, 0]} castShadow>
          <cylinderGeometry args={[0.0385, 0.0385, 0.026, 72, 1, true]} />
          <meshStandardMaterial color={C.chrome} roughness={0.38} metalness={0.9} bumpMap={p.knurl} bumpScale={3} roughnessMap={p.knurl} />
        </mesh>
        <mesh geometry={p.bezel}>
          <meshStandardMaterial color={C.chrome} roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.0145, 0]}>
          <sphereGeometry args={[0.06, 48, 6, 0, Math.PI * 2, 0, 0.504]} />
          <meshStandardMaterial ref={lens} color="#262d31" emissive="#fff3d6" emissiveIntensity={0} roughness={0.05} metalness={0.4} />
        </mesh>
      </group>

      {/* the round tray of slides on top */}
      <group ref={tray} position={[0, TRAY, 0]}>
        <mesh geometry={p.trayBody} castShadow receiveShadow>
          <meshStandardMaterial color={C.graphite} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.0402, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1375, 0.1455, 160, 1]} />
          <meshStandardMaterial map={p.index} roughness={0.45} />
        </mesh>
        <Dividers />
        <Slides />
        {/* centre hub and its locking ring */}
        <mesh geometry={p.hub} castShadow receiveShadow>
          {plastic}
        </mesh>
        <mesh position={[0, 0.051, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.034, 0.008, 64]} />
          <meshStandardMaterial color={C.graphite} roughness={0.45} bumpMap={p.knurlHub} bumpScale={2} />
        </mesh>
        <RoundedBox args={[0.054, 0.012, 0.009]} radius={0.004} smoothness={3} position={[0, 0.059, 0]} castShadow>
          <meshStandardMaterial color={C.graphite} roughness={0.45} />
        </RoundedBox>
      </group>

    </group>
  )
}

// Geometry and textures, built once per mount.
function useParts() {
  return useMemo(() => {
    const plinth = shell(0.33, 0.31, PLINTH - FOOT, 0.04, 0.006)
    const lower = shell(0.36, 0.34, SEAM - PLINTH, 0.05, 0.012)
    const upper = shell(0.356, 0.336, DECK - SEAM, 0.048, 0.01)
    const seam = new ExtrudeGeometry(roundedRect(0.344, 0.324, 0.045), { depth: 0.004, bevelEnabled: false, curveSegments: 10 })
    seam.rotateX(-Math.PI / 2)

    const collar = lathe([
      [0.118, 0],
      [0.15, 0],
      [0.152, 0.002],
      [0.152, 0.006],
      [0.118, 0.006],
    ])

    // Lens parts run along +y from the body face; the group turns +y to -z.
    const mount = lathe([
      [0.03, 0],
      [0.044, 0],
      [0.046, 0.003],
      [0.046, 0.008],
      [0.041, 0.012],
      [0.03, 0.012],
    ])
    const barrel = lathe([
      [0.02, 0.01],
      [0.035, 0.01],
      [0.035, 0.03],
      [0.0355, 0.03],
      [0.0355, 0.056],
      [0.034, 0.058],
      [0.034, 0.064],
      [0.02, 0.064],
    ])
    const bezel = lathe([
      [0.034, 0.063],
      [0.0365, 0.065],
      [0.0365, 0.075],
      [0.0345, 0.0785],
      [0.031, 0.0785],
      [0.0295, 0.074],
      [0.029, 0.07],
    ])

    // Tray: floor, outer wall with a lip, inner wall up to the hub.
    const trayBody = lathe(
      [
        [0.054, 0.028],
        [0.056, 0.03],
        [0.058, 0.03],
        [0.058, 0.006],
        [0.136, 0.006],
        [0.137, 0.04],
        [0.1385, 0.0405],
        [0.1455, 0.0405],
        [0.147, 0.038],
        [0.147, 0.006],
        [0.143, 0],
        [0.054, 0],
      ],
      96,
    )
    const hub = lathe([
      [0, 0.047],
      [0.03, 0.047],
      [0.042, 0.045],
      [0.051, 0.04],
      [0.054, 0.034],
      [0.054, 0.004],
    ])


    // Knurling: fine vertical ridges, wrapped round a cylinder.
    const ridges = (n: number) => {
      const t = paintTexture(512, 8, (g) => {
        g.fillStyle = '#ffffff'
        g.fillRect(0, 0, 512, 8)
        g.fillStyle = '#606060'
        for (let i = 0; i < n; i++) g.fillRect((i * 512) / n, 0, 256 / n, 8)
      })
      t.wrapS = RepeatWrapping
      return t
    }

    // Slot numbers printed round the tray's rim, read from outside.
    const index = paintTexture(1024, 1024, (g) => {
      g.fillStyle = C.graphite
      g.fillRect(0, 0, 1024, 1024)
      g.fillStyle = '#e9e4d9'
      g.font = '600 15px "Helvetica Neue", Arial, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      const r = (0.1415 / 0.1455) * 512
      for (let i = 0; i < SLOTS; i++) {
        const a = i * STEP
        g.save()
        g.translate(512 + Math.sin(a) * r, 512 + Math.cos(a) * r)
        g.rotate(-a)
        g.fillText(String(i === 0 ? 0 : i), 0, 0)
        g.restore()
        // a tick between numbers
        const b = a + STEP / 2
        g.fillRect(512 + Math.sin(b) * r - 0.8, 512 + Math.cos(b) * r - 0.8, 1.6, 1.6)
      }
    })

    // Legend under the buttons on the control panel.
    const legend = paintTexture(416, 152, (g) => {
      g.fillStyle = C.graphite
      g.fillRect(0, 0, 416, 152)
      g.fillStyle = '#d8d2c6'
      g.font = '600 17px "Helvetica Neue", Arial, sans-serif'
      g.textAlign = 'center'
      g.fillText('REV', 84, 140)
      g.fillText('FWD', 184, 140)
      g.fillText('LAMP', 340, 140)
    })

    return {
      plinth,
      lower,
      upper,
      seam,
      collar,
      mount,
      barrel,
      bezel,
      trayBody,
      hub,
      knurl: ridges(90),
      knurlKnob: ridges(40),
      knurlHub: ridges(70),
      index,
      legend,
    }
  }, [])
}

// Recessed vent grille on the rear: a raised bezel, a dark cavity and angled
// louvres inside it.
function Grille() {
  const w = 0.15
  const h = 0.036
  const frame = useMemo(() => {
    const s = roundedRect(w + 0.012, h + 0.012, 0.007)
    s.holes.push(roundedRect(w, h, 0.003))
    return new ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 3 })
  }, [])
  const ref = useRef<InstancedMesh>(null)
  const n = 9
  useLayoutEffect(() => {
    const o = new Object3D()
    for (let i = 0; i < n; i++) {
      o.position.set(0, -h / 2 + (i + 0.5) * (h / n), 0.004)
      o.rotation.set(0.45, 0, 0)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group position={[-0.055, 0.07, 0.169]}>
      <mesh position={[0, 0, 0.0008]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={C.rubber} roughness={0.9} />
      </mesh>
      <mesh geometry={frame} position={[0, 0, 0.0015]} castShadow>
        <meshStandardMaterial color={C.shellDark} roughness={0.45} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.0012, 0.0055]} />
        <meshStandardMaterial color={C.shell} roughness={0.45} />
      </instancedMesh>
    </group>
  )
}

// Control panel on the rear: reverse and forward push buttons and the pilot
// light in a bright bezel.
function Controls({ pilot, legend }: { pilot: RefObject<MeshStandardMaterial | null>; legend: ReturnType<typeof paintTexture> }) {
  return (
    <group position={[0.105, 0.07, 0.1705]}>
      <RoundedBox args={[0.11, 0.042, 0.004]} radius={0.0018} smoothness={3} castShadow>
        <meshStandardMaterial color={C.graphite} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0021]}>
        <planeGeometry args={[0.104, 0.038]} />
        <meshStandardMaterial map={legend} roughness={0.5} />
      </mesh>
      {[-0.032, -0.006].map((x) => (
        <RoundedBox key={x} args={[0.02, 0.018, 0.009]} radius={0.003} smoothness={4} position={[x, 0.004, 0.005]} castShadow>
          <meshStandardMaterial color={C.shell} roughness={0.38} />
        </RoundedBox>
      ))}
      <mesh position={[0.033, 0.004, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0085, 0.0095, 0.004, 32]} />
        <meshStandardMaterial color={C.chrome} roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={[0.033, 0.004, 0.0048]}>
        <sphereGeometry args={[0.0062, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={pilot} color={C.orange} emissive={C.orange} emissiveIntensity={0} roughness={0.15} />
      </mesh>
    </group>
  )
}

// Thin fins between the slots.
function Dividers() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new Object3D()
    for (let i = 0; i < SLOTS; i++) {
      const a = (i + 0.5) * STEP
      o.position.set(Math.sin(a) * 0.097, 0.021, Math.cos(a) * 0.097)
      o.rotation.set(0, a, 0)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, SLOTS]} castShadow receiveShadow>
      <boxGeometry args={[0.0015, 0.03, 0.078]} />
      <meshStandardMaterial color={C.graphite} roughness={0.55} />
    </instancedMesh>
  )
}

// Slide mounts standing in the slots; slot 0 stays empty, as on a real tray.
function Slides() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new Object3D()
    const tint = new Color()
    for (let i = 0; i < SLOTS; i++) {
      const a = i * STEP
      o.position.set(Math.sin(a) * 0.098, 0.031, Math.cos(a) * 0.098)
      o.rotation.set(0, a, 0)
      o.scale.setScalar(i === 0 ? 0 : 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, tint.set(i % 7 === 3 ? '#d9d2c4' : i % 5 === 1 ? '#c9c6bf' : '#f6f3ec'))
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, SLOTS]} castShadow receiveShadow>
      <boxGeometry args={[0.0028, 0.05, 0.05]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}

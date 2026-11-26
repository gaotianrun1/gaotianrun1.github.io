import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  type Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  Shape,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { agedPaper, C, paintTexture, scribble } from './look'

// A portable typewriter in the set's one orange (after the Lettera 32 and the
// Valentine), with a sheet rising out of the platen. On the Experience page
// the 3D sheet rolls back in and the CV, as real DOM, feeds out in its place:
// the platen turns as it feeds and as it scrolls.
// Origin: on the desk surface, under the body's centre. Front is +z.

// Written by the Experience page: `live` while it is open, `px` of paper fed
// out plus scrolled, which turns the platen.
export const paperScroll = { px: 0, live: false }

// Rows from the front: ZXCV…, ASDF…, QWER…, 1234…
const KEY_ROWS = [9, 10, 11, 11]
const LEGENDS = ['ZXCVBNM,.', 'ASDFGHJKL;', 'QWERTYUIOP-', '1234567890=']
const ROW_X = [0.004, -0.003, -0.008, -0.013] // the stagger
const PITCH = 0.0285
const KEY_R = 0.0098
const SINK = new Matrix4().makeTranslation(0, -0.005, 0)
// The keyboard deck: its slope and height, from the shell profile below.
const DECK_TILT = Math.atan(0.2124)
const deckY = (z: number) => 0.0518 + (0.15 - z) * 0.2124

const PLATEN: [number, number, number] = [0, 0.135, -0.135]
const PLATEN_R = 0.024

export function Typewriter() {
  const m = useMaterials()
  const platen = useRef<Group>(null)
  useFrame(() => {
    if (platen.current) platen.current.rotation.x = -paperScroll.px * 0.012 + (wound.value * SHEET_H) / PLATEN_R
  })
  const { body, knob, table, dome } = useMemo(makeGeometry, [])

  return (
    <group>
      {/* body shell: one side profile, extruded across with a round bevel */}
      <mesh geometry={body} material={m.enamel} castShadow receiveShadow />
      {/* rubber feet */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.16, 0.004, sz * 0.13]} material={m.rubber}>
            <cylinderGeometry args={[0.012, 0.013, 0.008, 20]} />
          </mesh>
        )),
      )}

      {/* key well: the dark plate the key stems drop through */}
      <RoundedBox
        args={[0.36, 0.003, 0.108]}
        radius={0.0014}
        smoothness={3}
        position={[0, deckY(0.088) + 0.0006, 0.088]}
        rotation={[DECK_TILT, 0, 0]}
        material={m.well}
        receiveShadow
      />
      {/* a slot per row */}
      {KEY_ROWS.map((_, row) => {
        const z = rowZ(row) - 0.003
        return (
          <mesh key={row} position={[ROW_X[row], deckY(z) + 0.0024, z]} rotation={[DECK_TILT, 0, 0]} material={m.rubber}>
            <boxGeometry args={[KEY_ROWS[row] * PITCH, 0.0006, 0.004]} />
          </mesh>
        )
      })}
      <Keys m={m} />
      <ShiftKeys m={m} />
      {/* space bar on two stems */}
      <RoundedBox args={[0.18, 0.0075, 0.015]} radius={0.0034} smoothness={4} position={[0, 0.066, 0.154]} rotation={[0.12, 0, 0]} material={m.key} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.057, 0.152]} material={m.key}>
          <boxGeometry args={[0.004, 0.014, 0.004]} />
        </mesh>
      ))}

      {/* ribbon spool covers, warm white like the Valentine's */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.112, 0.104, -0.028]}>
          <mesh geometry={dome} material={m.cap} scale={[0.88, 0.6, 0.88]} castShadow receiveShadow />
        </group>
      ))}

      {/* the opening over the type-bar basket, bars resting in a fan */}
      <RoundedBox args={[0.3, 0.004, 0.04]} radius={0.0018} smoothness={3} position={[0, 0.089, -0.095]} material={m.well} receiveShadow />
      <TypeBars m={m} />
      {/* type guide and ribbon at the printing point */}
      <mesh position={[0, 0.118, -0.108]} rotation={[-0.5, 0, 0]} material={m.rubber}>
        <boxGeometry args={[0.05, 0.007, 0.0012]} />
      </mesh>
      <mesh position={[0, 0.124, -0.1095]} rotation={[-0.5, 0, 0]} material={m.chrome}>
        <boxGeometry args={[0.018, 0.012, 0.0012]} />
      </mesh>

      {/* carriage: rail, back cover, end plates */}
      <mesh position={[0, 0.098, -0.165]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
        <cylinderGeometry args={[0.003, 0.003, 0.4, 12]} />
      </mesh>
      <RoundedBox args={[0.37, 0.03, 0.038]} radius={0.012} smoothness={5} position={[0, 0.112, -0.166]} material={m.enamel} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.012, 0.062, 0.078]} radius={0.005} smoothness={4} position={[s * 0.186, 0.124, -0.14]} material={m.graphite} castShadow receiveShadow />
      ))}
      {/* margin scale along the front of the carriage */}
      <MarginScale m={m} />

      {/* platen, axle and knurled knobs: all of it turns */}
      <group ref={platen} position={PLATEN}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={m.rubber} castShadow receiveShadow>
          <cylinderGeometry args={[PLATEN_R, PLATEN_R, 0.355, 48]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
          <cylinderGeometry args={[0.004, 0.004, 0.41, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.193, 0, 0]} rotation={[0, 0, -s * (Math.PI / 2)]}>
            <mesh geometry={knob} material={m.knob} castShadow />
            {/* a chrome boss, off-centre, so the turning reads */}
            <mesh position={[0, 0.0262, 0.012]} material={m.chrome}>
              <cylinderGeometry args={[0.003, 0.003, 0.0015, 14]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* paper bail with its two rollers, on arms from the platen ends */}
      <group position={[0, PLATEN[1] + 0.03 * Math.sin(0.9), PLATEN[2] + 0.03 * Math.cos(0.9)]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
          <cylinderGeometry args={[0.0021, 0.0021, 0.35, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.roller}>
            <cylinderGeometry args={[0.0058, 0.0058, 0.014, 20]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.176, -0.012, -0.009]} rotation={[0.9, 0, 0]} material={m.chrome}>
            <boxGeometry args={[0.003, 0.03, 0.005]} />
          </mesh>
        ))}
      </group>

      {/* paper table behind the sheet */}
      <mesh geometry={table} material={m.satin} castShadow receiveShadow />
      {/* carriage-return lever on the left, paper release on the right */}
      <group position={[-0.19, 0.152, -0.124]} rotation={[-0.38, -0.16, 0]}>
        <RoundedBox args={[0.004, 0.006, 0.078]} radius={0.0018} smoothness={3} position={[0, 0, 0.037]} material={m.chrome} castShadow />
        <RoundedBox args={[0.015, 0.004, 0.026]} radius={0.0018} smoothness={3} position={[-0.004, 0.001, 0.084]} rotation={[0.3, 0, 0]} material={m.chrome} castShadow />
      </group>
      <mesh position={[0.188, 0.162, -0.162]} rotation={[-0.5, 0, 0]} material={m.chrome}>
        <boxGeometry args={[0.004, 0.03, 0.006]} />
      </mesh>
      <Sheet />
      <PaperTracker />
    </group>
  )
}

const rowZ = (row: number) => 0.128 - row * 0.027
const rowTop = (row: number) => 0.0705 + row * 0.009

type Mats = ReturnType<typeof useMaterials>

function useMaterials() {
  return useMemo(() => {
    const chrome = new MeshStandardMaterial({ color: C.chrome, metalness: 0.9, roughness: 0.2 })
    return {
      // glossy enamel-like plastic: the set's one orange
      enamel: new MeshPhysicalMaterial({ color: C.orange, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.22 }),
      key: new MeshStandardMaterial({ color: C.key, roughness: 0.5 }),
      cap: new MeshStandardMaterial({ color: C.shell, roughness: 0.35 }),
      graphite: new MeshStandardMaterial({ color: C.graphite, roughness: 0.45, metalness: 0.2 }),
      knob: new MeshStandardMaterial({ color: C.key, roughness: 0.42 }),
      well: new MeshStandardMaterial({ color: '#191816', roughness: 0.8 }),
      rubber: new MeshStandardMaterial({ color: C.rubber, roughness: 0.85 }),
      roller: new MeshStandardMaterial({ color: C.rubber, roughness: 0.6 }),
      satin: new MeshStandardMaterial({ color: C.chrome, metalness: 0.85, roughness: 0.38 }),
      chrome,
    }
  }, [])
}

// Shapes that are not boxes: the body shell, the knobs, the paper table and
// the spool covers.
function makeGeometry() {
  // Side profile (x = depth toward the front, y = up), drawn 1 cm inside the
  // final surface: the bevel grows it back out and rounds every edge.
  const p = new Shape()
  p.moveTo(0.15, 0.016)
  p.lineTo(0.156, 0.03) // front face, leaning out a little
  p.quadraticCurveTo(0.158, 0.041, 0.148, 0.042)
  p.lineTo(0.035, 0.066) // keyboard deck
  p.quadraticCurveTo(0.018, 0.069, 0.01, 0.081)
  p.quadraticCurveTo(0.0, 0.095, -0.02, 0.095) // hood over the basket
  p.lineTo(-0.056, 0.095)
  p.quadraticCurveTo(-0.066, 0.095, -0.066, 0.086)
  p.lineTo(-0.066, 0.08)
  p.lineTo(-0.15, 0.078) // under the carriage
  p.quadraticCurveTo(-0.162, 0.078, -0.162, 0.06)
  p.lineTo(-0.16, 0.016)
  p.lineTo(0.15, 0.016)
  const body = sideExtrude(p, 0.364, { bevelSize: 0.01, bevelThickness: 0.016, bevelSegments: 6, curveSegments: 20 })

  // Knob: a turned profile around y, then knurled on its rim.
  const knob = new LatheGeometry(
    [
      [0, 0.0],
      [0.019, 0.0],
      [0.0245, 0.002],
      [0.0255, 0.004],
      [0.0255, 0.019],
      [0.024, 0.022],
      [0.018, 0.025],
      [0.008, 0.0262],
      [0, 0.0265],
    ].map(([r, y]) => new Vector2(r, y)),
    144,
  )
  const kp = knob.attributes.position
  for (let i = 0; i < kp.count; i++) {
    const x = kp.getX(i)
    const z = kp.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 0.0254 || kp.getY(i) < 0.0035 || kp.getY(i) > 0.0195) continue
    const a = Math.atan2(z, x)
    const k = 1 - (0.0011 / r) * (0.5 + 0.5 * Math.cos(a * 36))
    kp.setXYZ(i, x * k, kp.getY(i), z * k)
  }
  knob.computeVertexNormals()

  // Paper table: a thin strip following the sheet's lean, just behind it.
  const t = new Shape()
  const pts: [number, number][] = []
  for (let i = 0; i <= 12; i++) {
    const s = (i / 12) * 0.5
    pts.push([-0.149 - Math.pow(s, 1.6) * 0.07, 0.118 + s * 0.27])
  }
  t.moveTo(pts[0][0], pts[0][1])
  pts.forEach(([x, y]) => t.lineTo(x, y))
  pts.reverse().forEach(([x, y]) => t.lineTo(x - 0.0025, y))
  const table = sideExtrude(t, 0.29, { bevelSize: 0.0012, bevelThickness: 0.004, bevelSegments: 3, curveSegments: 4 })


  // Spool cover: a low dome.
  const dome = new LatheGeometry(
    [
      [0.0302, 0],
      [0.0302, 0.0015],
      [0.0285, 0.0055],
      [0.022, 0.0098],
      [0.012, 0.0118],
      [0, 0.0122],
    ].map(([r, y]) => new Vector2(r, y)),
    48,
  )
  return { body, knob, table, dome }
}

// Extrude a side profile across the machine, centred on x.
function sideExtrude(shape: Shape, width: number, o: { bevelSize: number; bevelThickness: number; bevelSegments: number; curveSegments: number }) {
  const g = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, ...o })
  g.translate(0, 0, -width / 2)
  g.rotateY(-Math.PI / 2)
  g.computeVertexNormals()
  return g
}

// Set by the typed heading on the Experience page: which key, and when.
export const keyStrike = { at: -1, key: 0 }

const KEY_COUNT = KEY_ROWS.reduce((a, b) => a + b, 0)

// One key: a cupped black cap with a printed top, a chrome rim and a stem.
// Top uvs pick a cell of the legend atlas per instance (aCell).
function keyGeometry() {
  const side = new CylinderGeometry(KEY_R, KEY_R * 1.03, 0.0062, 32, 1, true).translate(0, -0.0031, 0)
  const su = side.attributes.uv
  for (let i = 0; i < su.count; i++) su.setXY(i, 0.04, 0.04)
  const top = new RingGeometry(0.0003, KEY_R, 32, 3).rotateX(-Math.PI / 2)
  const tp = top.attributes.position
  for (let i = 0; i < tp.count; i++) {
    const r = Math.hypot(tp.getX(i), tp.getZ(i)) / KEY_R
    tp.setY(i, -0.0009 * (1 - r * r))
  }
  top.computeVertexNormals()
  const rim = new TorusGeometry(KEY_R, 0.0011, 8, 32).rotateX(Math.PI / 2)
  const stem = new CylinderGeometry(0.0014, 0.0014, 0.05, 6).translate(0, -0.031, 0)
  const g = mergeGeometries([side, top, rim, stem], true) as BufferGeometry
  const cells = new Float32Array(KEY_COUNT * 2)
  let n = 0
  LEGENDS.forEach((row, r) =>
    [...row].forEach((_, k) => {
      const i = r * 11 + k
      cells[n * 2] = i % 8
      cells[n * 2 + 1] = 7 - Math.floor(i / 8)
      n++
    }),
  )
  g.setAttribute('aCell', new InstancedBufferAttribute(cells, 2))
  return g
}

function legendAtlas() {
  const tex = paintTexture(512, 512, (c) => {
    c.fillStyle = C.key
    c.fillRect(0, 0, 512, 512)
    c.fillStyle = '#ece7dc'
    c.font = '600 22px "Helvetica Neue", Helvetica, Arial, sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    LEGENDS.forEach((row, r) =>
      [...row].forEach((ch, k) => {
        const i = r * 11 + k
        c.fillText(ch, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 33)
      }),
    )
  })
  tex.anisotropy = 8
  return tex
}

function Keys({ m }: { m: Mats }) {
  const ref = useRef<InstancedMesh>(null)
  const base = useMemo(() => [] as Matrix4[], [])
  const down = useRef(-1)
  const { geo, mats } = useMemo(() => {
    const cap = new MeshStandardMaterial({ map: legendAtlas(), roughness: 0.5 })
    cap.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = (aCell + vMapUv) / 8.0;')
    }
    return { geo: keyGeometry(), mats: [cap, cap, m.chrome, m.chrome] }
  }, [m])
  useLayoutEffect(() => {
    const o = new Object3D()
    base.length = 0
    KEY_ROWS.forEach((n, row) => {
      for (let k = 0; k < n; k++) {
        o.position.set((k - (n - 1) / 2) * PITCH + ROW_X[row], rowTop(row), rowZ(row))
        o.rotation.set(DECK_TILT * 0.7, 0, 0)
        o.updateMatrix()
        base.push(o.matrix.clone())
        ref.current!.setMatrixAt(base.length - 1, o.matrix)
      }
    })
    ref.current!.instanceMatrix.needsUpdate = true
  }, [base])

  // The struck key sinks for a moment, then comes back up.
  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const pressed = performance.now() - keyStrike.at < 90 ? keyStrike.key % KEY_COUNT : -1
    if (pressed === down.current) return
    if (down.current >= 0) mesh.setMatrixAt(down.current, base[down.current])
    if (pressed >= 0) mesh.setMatrixAt(pressed, base[pressed].clone().multiply(SINK))
    down.current = pressed
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mats, KEY_COUNT]} castShadow />
}

// Segment-shaped shift keys at both ends of the front row, flat side inward.
function ShiftKeys({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const s = new Shape()
    const r = 0.013
    s.moveTo(0, -r * 0.8)
    s.absarc(0, 0, r, -Math.asin(0.8), Math.asin(0.8), false)
    s.lineTo(0, -r * 0.8)
    const g = new ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0015, bevelSegments: 3, curveSegments: 24 })
    g.rotateX(-Math.PI / 2)
    g.translate(-0.003, 0, 0)
    return g
  }, [])
  const z = rowZ(0)
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.158, rowTop(0) - 0.0045, z]} rotation={[DECK_TILT * 0.7, 0, 0]}>
          <mesh geometry={geo} scale={[s, 1, 1]} material={m.key} castShadow />
          <mesh position={[s * 0.004, -0.015, 0]} material={m.chrome}>
            <cylinderGeometry args={[0.0014, 0.0014, 0.03, 6]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// The type bars at rest, fanned round the printing point; only their outer
// ends show in the opening.
function TypeBars({ m }: { m: Mats }) {
  const ref = useRef<InstancedMesh>(null)
  const N = 24
  useLayoutEffect(() => {
    const o = new Object3D()
    for (let i = 0; i < N; i++) {
      const a = -1.25 + (2.5 * i) / (N - 1)
      o.position.set(0, 0.093, -0.106)
      o.rotation.set(0, a, 0, 'YXZ')
      o.rotateX(0.2)
      o.translateZ(0.06)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, m.chrome, N]}>
      <boxGeometry args={[0.0014, 0.0014, 0.12]} />
    </instancedMesh>
  )
}

// A printed scale on a chrome strip, in front of the platen.
function MarginScale({ m }: { m: Mats }) {
  const tex = useMemo(() => {
    const t = paintTexture(1024, 40, (c) => {
      c.fillStyle = '#efe9dc'
      c.fillRect(0, 0, 1024, 40)
      c.fillStyle = '#2c2a27'
      c.font = '600 15px "Helvetica Neue", Helvetica, Arial, sans-serif'
      c.textAlign = 'center'
      for (let i = 0; i <= 90; i++) {
        const x = 17 + i * 10.98
        const h = i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6
        c.fillRect(x - 0.75, 0, 1.5, h)
        if (i % 10 === 0) c.fillText(String(i), x, 33)
      }
    })
    t.anisotropy = 8
    return t
  }, [])
  return (
    <group position={[0, 0.104, -0.106]} rotation={[-0.35, 0, 0]}>
      <RoundedBox args={[0.36, 0.011, 0.003]} radius={0.0012} smoothness={3} material={m.chrome} />
      <mesh position={[0, 0, 0.0016]}>
        <planeGeometry args={[0.33, 0.0075]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
    </group>
  )
}

// The sheet wraps over the back of the platen and rises, leaning back a little.
function Sheet() {
  const { geo, mat } = useMemo(() => {
    const W = 0.25
    const H = 0.27
    const g = new PlaneGeometry(W, H, 1, 24)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, (pos.getY(i) + H / 2) / H) // 0 at the platen, 1 at the top
      const y = t * H
      pos.setXYZ(i, pos.getX(i), y, -Math.pow(t, 1.6) * 0.07)
    }
    g.computeVertexNormals()
    const tex = paintTexture(256, 276, (c) => {
      agedPaper(c, 256, 276)
      // read from the top: the latest lines sit at the bottom by the platen
      scribble(c, 28, 40, 200, 4, 11, '#4a4741', 3)
      scribble(c, 28, 110, 200, 6, 11, '#6d6961', 9)
      scribble(c, 28, 200, 170, 3, 11, '#6d6961', 12)
    })
    tex.flipY = true
    // Winding in: the paper slides down its own path into the platen, so its
    // shape stays and its lines run down past the bail; what has gone in is cut.
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.9, side: DoubleSide })
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWound = wound
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uWound;')
        .replace(
          '#include <map_fragment>',
          `vec2 woundUv = vMapUv + vec2(0.0, uWound);
          if (woundUv.y > 1.0) discard;
          diffuseColor *= texture2D(map, woundUv);`,
        )
    }
    return { geo: g, mat }
  }, [])
  // Winds in at a steady crank while the DOM sheet is out, back out after.
  const ref = useRef<Mesh>(null)
  const crank = useRef(0)
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const k = Math.min(dt, 0.05) / WIND_S
    crank.current = MathUtils.clamp(crank.current + (paperScroll.live ? k : -k), 0, 1)
    wound.value = MathUtils.smoothstep(crank.current, 0, 1)
    mesh.visible = wound.value < 0.999
    // the depth pass knows nothing of the cut: no shadow while it moves
    mesh.castShadow = wound.value === 0
  })
  return <mesh ref={ref} geometry={geo} material={mat} position={[0, 0.158, -0.142]} castShadow />
}

// How far the 3D sheet has wound into the platen, 0 to 1; the platen turns with it.
const wound = { value: 0 }
const WIND_S = 0.8
const SHEET_H = 0.27

// Where the DOM sheet comes out of the machine: under the paper bail, as wide
// as the platen's rubber allows, so the lines read long. Projected to the screen every frame while the page is open
// and written as CSS variables, so the paper stays on the platen while the
// camera moves and at any window size.
const EXIT_Y = PLATEN[1] + 0.03 * Math.sin(0.9) + 0.006
const EXIT_Z = PLATEN[2] + 0.03 * Math.cos(0.9)
const PAPER_W = 0.31

function PaperTracker() {
  const { camera, size } = useThree()
  const ref = useRef<Group>(null)
  const v = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const g = ref.current
    if (!g || !paperScroll.live) return
    const [l, r] = g.children.map((c) => c.getWorldPosition(v).project(camera).clone())
    const css = document.documentElement.style
    css.setProperty('--platen', `${(((l.y + r.y) / 4 + 0.5) * size.height).toFixed(1)}px`)
    css.setProperty('--paper-x', `${(((l.x + r.x) / 4 + 0.5) * size.width).toFixed(1)}px`)
    css.setProperty('--paper-w', `${(((r.x - l.x) / 2) * size.width).toFixed(1)}px`)
  })
  return (
    <group ref={ref} position={[0, EXIT_Y, EXIT_Z]}>
      <object3D position={[-PAPER_W / 2, 0, 0]} />
      <object3D position={[PAPER_W / 2, 0, 0]} />
    </group>
  )
}

import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import { PlaneGeometry } from 'three'
import { C, paintTexture, rng, woodTexture } from './look'
import { photos, type Photo } from '../content/board'

// A small pinboard propped on the desk, leaning back on a strut, with photos
// pinned in two rows. Origin: on the desk, under the middle of the frame's
// bottom edge. The board is modelled at full size and scaled down.

const BOARD = { w: 1.0, h: 0.72 }
const SCALE = 0.4
const LEAN = 0.2 // radians back from upright
const T = 0.034 // frame width

const PHOTO = { w: 0.2, h: 0.235 }

// Where the photos are pinned, in the order of src/content/board.ts. The hue
// tints a placeholder print until the photo loads.
const SLOTS = [
  { x: -0.29, y: 0.15, rot: -0.05, hue: '#7d9aa8', pin: C.orange },
  { x: -0.02, y: 0.17, rot: 0.03, hue: '#c98b62', pin: C.graphite },
  { x: 0.25, y: 0.14, rot: -0.03, hue: '#a7a982', pin: '#f2efe8' },
  { x: -0.23, y: -0.15, rot: 0.03, hue: '#b39a7c', pin: '#f2efe8' },
  { x: 0.04, y: -0.13, rot: -0.04, hue: '#9a6a52', pin: C.orange },
  { x: 0.3, y: -0.16, rot: 0.04, hue: '#8fa3b0', pin: C.graphite },
]

export function Corkboard({ onPhoto }: { onPhoto?: (i: number) => void }) {
  const tex = useMemo(() => {
    const cork = paintTexture(512, 370, (g) => {
      g.fillStyle = C.cork
      g.fillRect(0, 0, 512, 370)
      const r = rng(7)
      for (let i = 0; i < 9000; i++) {
        const v = r()
        g.fillStyle = v < 0.5 ? 'rgba(90,60,30,0.18)' : 'rgba(255,235,200,0.14)'
        g.fillRect(r() * 512, r() * 370, 1 + r() * 2, 1 + r() * 2)
      }
    })
    // A print in a white border; a real photo is drawn over the placeholder once it loads.
    const photo = (hue: string, seed: number, real: Photo | undefined) => {
      const tex = paintTexture(256, 300, (g) => {
        g.fillStyle = '#f7f5f0'
        g.fillRect(0, 0, 256, 300)
        const grad = g.createLinearGradient(0, 16, 0, 240)
        grad.addColorStop(0, '#e9e4da')
        grad.addColorStop(1, hue)
        g.fillStyle = grad
        g.fillRect(16, 16, 224, 224)
        const r = rng(seed)
        g.fillStyle = 'rgba(40,35,30,0.25)'
        g.beginPath()
        g.ellipse(60 + r() * 120, 190, 44 + r() * 40, 28, 0, 0, Math.PI * 2)
        g.fill()
      })
      const g = (tex.image as HTMLCanvasElement).getContext('2d')!
      if (real?.caption) {
        g.fillStyle = '#4a4741'
        g.font = 'italic 22px Newsreader, Georgia, serif'
        g.textAlign = 'center'
        g.fillText(real.caption, 128, 276, 224)
      }
      if (real?.src) {
        const img = new Image()
        img.onload = () => {
          const side = Math.min(img.width, img.height)
          g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 16, 16, 224, 224)
          tex.needsUpdate = true
        }
        img.src = real.src
      }
      return tex
    }
    const items = SLOTS.map((it, i) => photo(it.hue, i, photos[i]))
    return { cork, items }
  }, [])

  return (
    <group rotation={[-LEAN, 0, 0]}>
      <group scale={SCALE} position={[0, (BOARD.h / 2 + T) * SCALE, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[BOARD.w, BOARD.h, 0.02]} />
          <meshStandardMaterial map={tex.cork} roughness={0.95} />
        </mesh>
        <Frame />
        {SLOTS.map((it, i) => (
          <group key={i} position={[it.x, it.y, 0.012 + i * 0.0006]} rotation={[0, 0, it.rot]}>
            <mesh
              geometry={curled()}
              castShadow
              receiveShadow
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (!onPhoto || !photos[i]) return
                e.stopPropagation()
                onPhoto(i)
              }}
            >
              <meshStandardMaterial roughness={0.45} map={tex.items[i]} />
            </mesh>
            <Pin color={it.pin} position={[0, PHOTO.h / 2 - 0.018, 0.001]} />
          </group>
        ))}
      </group>
      <Strut />
    </group>
  )
}

// An oak strut hinged on the back of the frame, its foot on the desk behind.
// Drawn in the board's leaning frame, so it is turned forward by the lean.
function Strut() {
  const oak = useMemo(() => woodTexture(64, 512, '#c99a68', 13), [])
  const hinge = 0.24 // up the back of the board
  const back = -0.02 * SCALE
  // the foot, in the board's frame: on the desk, behind the hinge
  const angle = 0.5 // between strut and board
  const len = hinge / Math.cos(angle - LEAN) * Math.cos(LEAN)
  return (
    <group position={[0, hinge, back]} rotation={[angle, 0, 0]}>
      <RoundedBox args={[0.03, len, 0.012]} radius={0.004} smoothness={2} position={[0, -len / 2, -0.006]} castShadow receiveShadow>
        <meshStandardMaterial map={oak} roughness={0.55} />
      </RoundedBox>
    </group>
  )
}

// A push pin: a domed plastic head on a collar, its steel point in the cork.
function Pin({ color, position }: { color: string; position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.004, 0]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.004, 16]} />
        <meshStandardMaterial color={C.chrome} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.011, 0]} castShadow>
        <cylinderGeometry args={[0.006, 0.0075, 0.01, 20]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.016, 0]} castShadow>
        <sphereGeometry args={[0.006, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Pinned at the top, paper lifts away from the cork towards its free corners.
let curl: PlaneGeometry | undefined
function curled() {
  if (!curl) {
    const { w, h } = PHOTO
    curl = new PlaneGeometry(w, h, 8, 8)
    const pos = curl.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (w / 2)
      const fromPin = 1 - (pos.getY(i) + h / 2) / h
      pos.setZ(i, 0.008 * fromPin * fromPin * (0.4 + 0.6 * x * x))
    }
    curl.computeVertexNormals()
  }
  return curl
}

// An oak frame, mitred at the corners, standing proud of the cork.
function Frame() {
  const t = T
  const oak = useMemo(() => woodTexture(512, 64, '#c99a68', 11), [])
  const bars: [number, number, number, number, number][] = [
    [0, BOARD.h / 2 + t / 2, BOARD.w + t * 2, t, 0],
    [0, -BOARD.h / 2 - t / 2, BOARD.w + t * 2, t, 0],
    [-BOARD.w / 2 - t / 2, 0, BOARD.h, t, Math.PI / 2],
    [BOARD.w / 2 + t / 2, 0, BOARD.h, t, Math.PI / 2],
  ]
  return (
    <>
      {bars.map(([x, y, l, h, rot], i) => (
        <RoundedBox key={i} args={[l, h, 0.036]} radius={0.006} smoothness={3} position={[x, y, 0.006]} rotation={[0, 0, rot]} castShadow receiveShadow>
          <meshStandardMaterial map={oak} roughness={0.55} />
        </RoundedBox>
      ))}
    </>
  )
}

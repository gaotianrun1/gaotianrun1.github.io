import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useMemo, useRef, type ReactNode } from 'react'
import { BackSide, MathUtils, type Group } from 'three'
import { projects, slidesOf } from '../content/projects'
import type { Route } from '../route'
import { Chair } from './Chair'
import { Corkboard } from './Corkboard'
import { C, woodTexture } from './look'
import { Notebook } from './Notebook'
import { Projection } from './Projection'
import { Props } from './Props'
import { Projector } from './Projector'
import { SET } from './shots'
import { hoverTag } from './Tags'
import { Typewriter } from './Typewriter'
import { asset } from '../base'

// The set: a white photo-studio cove, one desk, and the four objects that are
// the site's pages.

export type TrayAt = { project: number; slide: number }

type Props = {
  route: Route
  at: TrayAt
  go: (r: Route) => void
  begun: boolean
  // on the About page, a click on a photo opens it instead of going there
  onPhoto?: (i: number) => void
}

export function Studio({ route, at, go, begun, onPhoto }: Props) {
  // the projector stays dark on the opening and powers on after the click
  const on = begun && (route === 'landing' || route === 'projects')
  // the tray turns one slot per slide, slot 0 being the landing's title slide
  const tray = route === 'projects' ? projects[at.project] : undefined
  const slot = tray ? 1 + projects.slice(0, at.project).reduce((n, p) => n + slidesOf(p).length, 0) + at.slide : 0
  return (
    <>
      <color attach="background" args={[C.cove]} />
      <fog attach="fog" args={[C.cove, 9, 24]} />
      {/* Lit like a still life: one key from off the set at the left and a little
          behind, so tops and left faces take the light and the fronts of the
          drawers, the right faces and the knee space keep their shade (about
          3:1 against the fill). The key misses the back wall, which falls off
          slowly in the fill alone: the slide is the brightest thing in the
          picture, the desk the second, the notebook's warm pool the third. */}
      <hemisphereLight args={['#ffffff', '#cfc6b8', 0.2]} />
      <directionalLight
        position={[-4, 4.2, -0.6]}
        intensity={2.6}
        color="#fff1df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-radius={8}
        shadow-blurSamples={20}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={14}
      />
      {/* a studio seen only in reflections and soft fill: no light from the front */}
      <Environment files={asset('/env/studio_small_08.hdr')} resolution={256} environmentIntensity={0.3}>
        <Lightformer form="rect" intensity={1.6} position={[-4, 2.5, -0.5]} rotation-y={Math.PI / 2} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.25} color="#e8eef8" position={[4, 2, 1]} rotation-y={-Math.PI / 2} scale={[3, 4, 1]} />
      </Environment>

      <Cove />
      <Desk />
      {/* contact shadows seat the objects on the desk and the set on the floor */}
      <ContactShadows position={[0.15, SET.deskTop + 0.001, 0.1]} scale={[1.9, 0.85]} far={0.25} blur={1.6} opacity={0.5} resolution={1024} frames={1} color="#2b2016" />
      <ContactShadows position={[0.4, 0.002, -0.3]} scale={9} far={1.2} blur={2.4} opacity={0.35} resolution={512} frames={1} color="#3a3026" />

      <Prop route="projects" go={go} position={SET.projector}>
        <Projector on={on} slot={slot} />
      </Prop>
      <Projection on={on} blank={!!tray} slideKey={tray ? `${tray.id}:${at.slide}` : 'title'} />

      <Prop route="experience" go={go} position={SET.typewriter}>
        <Typewriter />
      </Prop>

      <Prop route="about" go={go} position={SET.notebook} rotationY={-0.1}>
        <Notebook />
      </Prop>
      <Prop route="about" go={go} position={SET.corkboard} rotationY={0.1}>
        <Corkboard onPhoto={onPhoto} />
      </Prop>
      <group position={SET.chair} rotation={[0, 0.9, 0]}>
        <Chair />
      </group>
      <Suspense fallback={null}>
        <Props />
      </Suspense>
    </>
  )
}

function Cove() {
  // the curve stays below the slide's bottom edge, so the slide falls on flat wall
  const R = 1.35
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, SET.wallZ + R + 10]} receiveShadow>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color={C.cove} roughness={1} envMapIntensity={0.25} />
      </mesh>
      <mesh position={[0, R + 7, SET.wallZ]} receiveShadow>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color={C.cove} roughness={1} envMapIntensity={0.25} />
      </mesh>
      {/* the curve between floor and wall that makes the background seamless */}
      <mesh position={[0, R, SET.wallZ + R]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[R, R, 40, 48, 1, true, Math.PI, Math.PI / 2]} />
        <meshStandardMaterial color={C.cove} roughness={1} envMapIntensity={0.25} side={BackSide} />
      </mesh>
    </group>
  )
}

// A Danish teak writing desk, 1960s: the top rests on a drawer pedestal that
// stands on the floor at the left, and on two tapered legs in brass shoes at
// the right, joined by a stretcher; a modesty panel closes the back.
const DESK = { w: 1.9, d: 0.85, t: 0.03 }
// how far the right legs' feet lean out, sideways and to front and back (rad)
const LEG_SPLAY = { x: 0.05, z: 0.06 }

function Desk() {
  const top = SET.deskTop
  const wood = useMemo(() => woodTexture(), [])
  const end = useMemo(() => woodTexture(256, 512, '#a86f45', 9), [])
  const teak = <meshStandardMaterial map={wood} roughness={0.45} envMapIntensity={0.8} />
  const brass = <meshStandardMaterial color="#b8925a" metalness={0.9} roughness={0.3} />
  const under = top - DESK.t
  // the pedestal: a case to the floor on four short legs, three drawers
  const ped = { w: 0.44, d: DESK.d - 0.06, x: -DESK.w / 2 + 0.22 + 0.02, foot: 0.09 }
  const pedH = under - ped.foot
  const drawers = [0.15, 0.2, 0.25] // heights, top to bottom
  const legX = DESK.w / 2 - 0.09
  return (
    <group position={[0.15, 0, 0.1]}>
      {/* the top, with a thicker lipped front edge */}
      <RoundedBox args={[DESK.w, DESK.t, DESK.d]} radius={0.008} smoothness={3} position={[0, top - DESK.t / 2, 0]} castShadow receiveShadow>
        {teak}
      </RoundedBox>
      <RoundedBox args={[DESK.w, 0.022, 0.03]} radius={0.008} smoothness={3} position={[0, top - DESK.t - 0.006, DESK.d / 2 - 0.015]} castShadow>
        {teak}
      </RoundedBox>
      {/* rails under the top, between pedestal and legs */}
      <mesh position={[0.2, under - 0.04, DESK.d / 2 - 0.05]} castShadow>
        <boxGeometry args={[DESK.w - 0.6, 0.07, 0.022]} />
        {teak}
      </mesh>
      {/* a shallow pencil drawer in the front rail, with a recessed pull */}
      <group position={[0.2, under - 0.04, DESK.d / 2 - 0.036]}>
        <RoundedBox args={[0.56, 0.058, 0.012]} radius={0.003} smoothness={2} castShadow>
          <meshStandardMaterial map={end} roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.012, 0.0065]}>
          <boxGeometry args={[0.16, 0.008, 0.002]} />
          <meshStandardMaterial color="#2b1a10" roughness={0.9} />
        </mesh>
      </group>
      {/* modesty panel at the back */}
      <mesh position={[0.2, under - 0.17, -DESK.d / 2 + 0.04]} castShadow receiveShadow>
        <boxGeometry args={[DESK.w - 0.62, 0.34, 0.018]} />
        {teak}
      </mesh>

      <group position={[ped.x, 0, -0.01]}>
        <RoundedBox args={[ped.w, pedH, ped.d]} radius={0.006} smoothness={2} position={[0, ped.foot + pedH / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={end} roughness={0.5} />
        </RoundedBox>
        {(() => {
          let y = under - 0.012
          return drawers.map((h, i) => {
            y -= h
            const cy = y + h / 2
            return (
              <group key={i} position={[0, cy, ped.d / 2 + 0.005]}>
                <RoundedBox args={[ped.w - 0.03, h - 0.012, 0.014]} radius={0.003} smoothness={2} castShadow receiveShadow>
                  {teak}
                </RoundedBox>
                {/* a sculpted pull routed into the top of the drawer front */}
                <mesh position={[0, h / 2 - 0.024, 0.007]}>
                  <boxGeometry args={[0.14, 0.012, 0.004]} />
                  <meshStandardMaterial color="#2b1a10" roughness={0.9} />
                </mesh>
                <mesh position={[0, h / 2 - 0.017, 0.009]} rotation={[0.6, 0, 0]}>
                  <boxGeometry args={[0.14, 0.006, 0.006]} />
                  <meshStandardMaterial map={end} roughness={0.5} />
                </mesh>
              </group>
            )
          })
        })()}
        {/* short splayed legs under the case, in brass shoes */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <group key={`${sx}${sz}`} position={[sx * (ped.w / 2 - 0.05), ped.foot, sz * (ped.d / 2 - 0.06)]} rotation={[-sz * 0.12, 0, sx * 0.12]}>
              <mesh position={[0, -ped.foot / 2, 0]} castShadow>
                <cylinderGeometry args={[0.024, 0.017, ped.foot, 16]} />
                {teak}
              </mesh>
              <mesh position={[0, -ped.foot + 0.012, 0]}>
                <cylinderGeometry args={[0.0172, 0.016, 0.024, 16]} />
                {brass}
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* the two legs at the right: round, tapering to brass shoes, the feet splayed outwards */}
      {[-1, 1].map((sz) => (
        <group key={sz} position={[legX, under, sz * (DESK.d / 2 - 0.08)]} rotation={[-sz * LEG_SPLAY.z, 0, LEG_SPLAY.x]}>
          <mesh position={[0, -under / 2, 0]} castShadow>
            <cylinderGeometry args={[0.034, 0.02, under, 24]} />
            {teak}
          </mesh>
          <mesh position={[0, -under + 0.022, 0]}>
            <cylinderGeometry args={[0.0205, 0.0195, 0.044, 20]} />
            {brass}
          </mesh>
        </group>
      ))}
      {/* stretcher between them, low */}
      <mesh position={[legX + Math.sin(LEG_SPLAY.x) * (under - 0.2), 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 2 * (DESK.d / 2 - 0.08 + Math.sin(LEG_SPLAY.z) * (under - 0.2)), 14]} />
        {teak}
      </mesh>
      {/* a cross rail under the top joining the legs */}
      <mesh position={[legX, under - 0.04, 0]} castShadow>
        <boxGeometry args={[0.05, 0.07, DESK.d - 0.14]} />
        {teak}
      </mesh>
    </group>
  )
}

// One object on the desk that is also a page: clicking it goes there, and
// hovering it nudges its tag (see Tags.tsx).
function Prop(props: {
  route: Route
  go: (r: Route) => void
  position: readonly [number, number, number]
  rotationY?: number
  children: ReactNode
}) {
  const lift = useRef<Group>(null)
  const hovered = useRef(false)
  useFrame((_, dt) => {
    if (lift.current) lift.current.position.y = MathUtils.damp(lift.current.position.y, hovered.current ? 0.012 : 0, 10, Math.min(dt, 0.05))
  })
  const hover = (on: boolean) => {
    hovered.current = on
    hoverTag(props.route, on)
    document.body.style.cursor = on ? 'pointer' : ''
  }
  return (
    <group
      position={props.position}
      rotation={[0, props.rotationY ?? 0, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        hover(false)
        props.go(props.route)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        hover(true)
      }}
      onPointerOut={() => hover(false)}
    >
      {/* lifts a hair off the desk on hover */}
      <group ref={lift}>{props.children}</group>
    </group>
  )
}

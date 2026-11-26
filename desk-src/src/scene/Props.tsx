import { Billboard, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BackSide, Color, LatheGeometry, Mesh, Object3D, Quaternion, Vector2, Vector3, type MeshStandardMaterial, type ShaderMaterial } from 'three'
import { SET } from './shots'
import { asset } from '../base'

// Set dressing that is not a page: a desk lamp, a desk plant and a mug. The
// plant is a Poly Haven scan (CC0, see public/models/CREDITS.md); the rest is
// modelled here.

export function Props() {
  return (
    <>
      <DeskLamp />
      <Model url={asset('/models/potted_plant.glb')} position={SET.plant} rotationY={0.6} />
      <Mug position={SET.mug} />
    </>
  )
}

function Model({ url, position, rotationY = 0 }: { url: string; position: readonly [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => scene.clone(), [scene])
  useShadows(obj)
  return <primitive object={obj} position={position} rotation-y={rotationY} />
}

// A Danish desk lamp of about 1960 at the back right corner: a low domed
// base, a slim brass stem, and a deep enamel shade on a brass knuckle, tilted
// down onto the notebook. The shade has a real wall (an enamel outside, a
// warm white inside lit by the bulb) and a rolled lip; the enamel has a clear
// coat, so it catches a highlight the way the typewriter's paint does. Its
// pivot sits about level with the top of the typewriter's paper.
const SHADE = { len: 0.14, rim: 0.072, neck: 0.017, wall: 0.0022 }

function DeskLamp() {
  const { base, outer, inner, q, yaw, shade } = useMemo(() => {
    const v = (pts: number[][]) => pts.map(([x, y]) => new Vector2(x, y))
    // a flat disc that rises in a shallow dome to the stem
    const base = new LatheGeometry(v([[0, 0], [0.068, 0], [0.071, 0.003], [0.072, 0.007], [0.069, 0.011], [0.055, 0.015], [0.03, 0.02], [0.012, 0.024], [0, 0.024]]), 64)
    // the shade, rim to neck: a bell that flares at the mouth
    const bell = [[1, 0], [0.93, 0.12], [0.8, 0.3], [0.62, 0.55], [0.42, 0.8], [0.26, 0.95], [0.22, 1]]
    const outer = new LatheGeometry(v(bell.map(([r, t]) => [r * SHADE.rim, -SHADE.len + t * SHADE.len])), 64)
    const inner = new LatheGeometry(v(bell.map(([r, t]) => [r * SHADE.rim - SHADE.wall, -SHADE.len + t * SHADE.len])), 64)
    const pivot = new Vector3(...SET.lampHead)
    const dir = new Vector3(...SET.notebook).sub(pivot).normalize()
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), dir)
    // the knuckle's axle lies across the shade's swing
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI / 2
    // the neck hangs a little off the axle, along the shade's axis
    const shade = pivot.clone().addScaledVector(dir, 0.012)
    return { base, outer, inner, q, yaw, shade }
  }, [])
  const target = useMemo(() => {
    const o = new Object3D()
    o.position.set(...SET.notebook)
    return o
  }, [])
  const [bx, by, bz] = SET.deskLamp
  const stemH = SET.lampHead[1] - by
  const enamel = <meshPhysicalMaterial color="#ece6da" roughness={0.42} clearcoat={0.7} clearcoatRoughness={0.22} />
  const brass = <meshStandardMaterial color="#c49d5f" metalness={1} roughness={0.28} />
  return (
    <>
      <group position={SET.deskLamp}>
        <mesh geometry={base} castShadow receiveShadow>
          {enamel}
        </mesh>
        {/* the rocker switch at the front of the base */}
        <mesh position={[-0.03, 0.019, 0.04]} rotation={[0.25, 0.6, 0]} castShadow>
          <boxGeometry args={[0.012, 0.005, 0.018]} />
          <meshStandardMaterial color="#2a2622" roughness={0.5} />
        </mesh>
        {/* collar, stem, collar */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.011, 0.014, 24]} />
          {brass}
        </mesh>
        <mesh position={[0, stemH / 2, 0]} castShadow>
          <cylinderGeometry args={[0.0042, 0.005, stemH, 16]} />
          {brass}
        </mesh>
        <group position={[0, stemH, 0]} rotation={[0, yaw, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.0075, 0.0075, 0.03, 20]} />
            {brass}
          </mesh>
          {/* the tension knob on the axle */}
          <mesh position={[0.019, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.007, 24]} />
            {brass}
          </mesh>
        </group>
      </group>
      <group position={shade} quaternion={q}>
        <mesh geometry={outer} castShadow>
          {enamel}
        </mesh>
        <mesh geometry={inner}>
          <meshStandardMaterial color="#fff4e2" emissive="#ffd9a6" emissiveIntensity={0.5} roughness={0.6} side={BackSide} />
        </mesh>
        {/* the rolled lip at the mouth */}
        <mesh position={[0, -SHADE.len, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[SHADE.rim - SHADE.wall / 2, 0.0024, 10, 64]} />
          {enamel}
        </mesh>
        {/* the brass neck cap where the shade meets the knuckle */}
        <mesh position={[0, -0.004, 0]}>
          <cylinderGeometry args={[0.01, SHADE.neck, 0.012, 24]} />
          {brass}
        </mesh>
        {/* the bulb, up inside the shade */}
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.02, 20, 12]} />
          <meshStandardMaterial color="#fff6e6" emissive="#ffe6c0" emissiveIntensity={3} />
        </mesh>
        <spotLight position={[0, -0.06, 0]} target={target} angle={0.6} penumbra={1} intensity={2.5} distance={1.4} decay={1.4} color="#ffd6a0" />
      </group>
      <primitive object={target} />
    </>
  )
}

function useShadows(obj: Object3D) {
  useLayoutEffect(() => {
    obj.traverse((m) => {
      if (m instanceof Mesh && !(m.material as MeshStandardMaterial).transparent) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [obj])
}

// A stoneware mug, turned on a lathe: a glazed outside, a darker inside with coffee.
function Mug({ position }: { position: readonly [number, number, number] }) {
  const body = useMemo(() => {
    const p = [
      [0, 0],
      [0.036, 0],
      [0.039, 0.004],
      [0.04, 0.09],
      [0.042, 0.095],
      [0.037, 0.095],
      [0.036, 0.008],
      [0, 0.008],
    ].map(([x, y]) => new Vector2(x, y))
    return new LatheGeometry(p, 48)
  }, [])
  return (
    <group position={position}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color="#e9e4da" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.072, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.036, 40]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.15} />
      </mesh>
      <mesh position={[0.04, 0.05, 0]} rotation-z={-Math.PI / 2} castShadow>
        <torusGeometry args={[0.02, 0.0055, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#e9e4da" roughness={0.25} />
      </mesh>
      <Steam />
    </group>
  )
}

// Steam off the coffee: a plane of drifting Perlin noise, faded at its sides
// and top. Henry Heffernan's coffee steam (henryjeff/portfolio-website, MIT).
function Steam() {
  const mat = useRef<ShaderMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime * 1000
  })
  return (
    <Billboard position={[0, 0.18, 0]} lockX lockZ>
      <mesh>
        <planeGeometry args={[0.07, 0.18, 8, 24]} />
        <shaderMaterial
          ref={mat}
          transparent
          depthWrite={false}
          uniforms={{ uTime: { value: 0 }, uTimeFrequency: { value: 0.0004 }, uUvFrequency: { value: new Vector2(3, 5) }, uColor: { value: new Color('#ffffff') } }}
          vertexShader={STEAM_VERT}
          fragmentShader={STEAM_FRAG}
        />
      </mesh>
    </Billboard>
  )
}

const PERLIN = /* glsl */ `
vec2 fade(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float perlin2d(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0);
  vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww; vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x); vec2 g10 = vec2(gx.y, gy.y); vec2 g01 = vec2(gx.z, gy.z); vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x)); float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z)); float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}`

const STEAM_VERT = /* glsl */ `
uniform float uTime; varying vec2 vUv;
${PERLIN}
void main() {
  vec3 p = position;
  vec2 d = uv * 5.0;
  d.y -= uTime * 0.0002;
  // sways more the higher it rises
  p.x += perlin2d(d) * pow(uv.y * 3.0, 2.0) * 0.004;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vUv = uv;
}`

const STEAM_FRAG = /* glsl */ `
uniform float uTime; uniform float uTimeFrequency; uniform vec2 uUvFrequency; uniform vec3 uColor; varying vec2 vUv;
${PERLIN}
void main() {
  vec2 uv = vUv * uUvFrequency;
  uv.y -= uTime * uTimeFrequency;
  float border = min(vUv.x * 4.0, (1.0 - vUv.x) * 4.0) * (1.0 - vUv.y);
  float a = clamp(perlin2d(uv) * border * 0.6, 0.0, 1.0);
  gl_FragColor = vec4(uColor, a * 0.7);
}`

useGLTF.preload(asset('/models/potted_plant.glb'))

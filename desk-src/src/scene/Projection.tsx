import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, CanvasTexture, Float32BufferAttribute, MathUtils, SRGBColorSpace, Vector2, Vector3, type ShaderMaterial } from 'three'
import { site } from '../content/site'
import { t, useLang, type Lang } from '../lang'
import { rng } from './look'
import { LENS_OFFSET, lamp } from './Projector'
import { SET } from './shots'

// What the projector throws on the back wall, drawn as light rather than as a
// page: the slide is a texture of how much light gets through, so the text is
// where the light is missing and shows the wall. The lens is a little out of
// focus, the edges fringe, the frame keystones because the lens points up,
// the centre is hotter than the corners, and the shutter dips between slides.
// Into the trays it powers on like an old CRT set; the title slide's lamp
// strikes on with a few flickers.
// The words are also in the DOM, visually hidden (App.tsx), for readers and
// search. On /projects the slide is blank light, and the project's slide is
// real DOM fitted onto it (SlideTracker), so it reads sharp.

const W = 2.0 // the lit frame on the wall, metres
const H = W / 1.6
const PAD = 1.3 // the plane is larger than the frame, for the halo
const KEYSTONE = 0.025 // the top edge is this much wider than the bottom
const LENS = new Vector3(...SET.projector).add(new Vector3(...LENS_OFFSET))

// How much light the gate lets through now (lamp × shutter), how far the
// power-on has opened the frame (x, y) and how over-bright it still is; and
// the DOM slide and its two rows of controls that ride on the frame; `chrome`
// is a phone's column, which only waits for the frame.
export const gate = { light: 0, x: 1, y: 1, boost: 1 }
export const stage: { slide?: HTMLElement | null; above?: HTMLElement | null; below?: HTMLElement | null; chrome?: HTMLElement | null } = {}

type Props = { on: boolean; blank: boolean; slideKey: string }

// Switching on for the title slide, the lamp strikes like an old set warming
// up: a few flashes with dark between, then it holds. Times in seconds after the switch.
const STRIKE: [number, number][] = [
  [0, 0], [0.04, 0.85], [0.1, 0.05], [0.24, 0.05], [0.27, 0.6], [0.33, 0.1], [0.5, 0.1], [0.53, 1], [0.6, 0.35], [0.66, 0.9], [0.9, 1],
]
function strike(since: number) {
  if (since <= 0) return 0
  for (let i = 1; i < STRIKE.length; i++) {
    const [t1, v1] = STRIKE[i]
    if (since <= t1) {
      const [t0, v0] = STRIKE[i - 1]
      return v0 + ((v1 - v0) * (since - t0)) / (t1 - t0)
    }
  }
  return 1
}

// Powering on into the trays like an old CRT set: a bright line across the middle draws out
// to the full width, opens to the full height, over-bright for a moment, and
// settles. Seconds since it began; before that the frame is dark.
const ease = (u: number) => 1 - Math.pow(1 - MathUtils.clamp(u, 0, 1), 3)
function powerOn(since: number) {
  if (since < 0) return { x: 0, y: 0, boost: 0 }
  const open = ease((since - 0.09) / 0.28)
  return {
    x: ease(since / 0.09),
    y: 0.012 + 0.988 * open,
    boost: since < 0.37 ? 2.2 - 0.85 * open : 1 + 0.35 * Math.exp(-(since - 0.37) * 6),
  }
}

export function Projection({ on, blank, slideKey: key }: Props) {
  const slide = useSlide(blank)
  const wall = useRef<ShaderMaterial>(null)
  const beam = useRef<ShaderMaterial>(null)
  const dust = useRef<ShaderMaterial>(null)
  // the shutter: dark for a moment while the tray drops the next slide; and
  // when the set last began to power on
  const swap = useRef({ key, at: -1, shown: key, crt: -Infinity })
  // when the lamp was last switched on (-1: off)
  const power = useRef(-1)

  useFrame(({ clock }, dt) => {
    const k = Math.min(dt, 0.05)
    const t = clock.elapsedTime
    const s = swap.current
    if (s.key !== key) {
      // into the trays the set goes dark and powers on again; otherwise the
      // shutter drops the next slide
      const cycle = s.key === 'title' && key !== 'title'
      Object.assign(s, { key, at: cycle ? -1 : t })
      if (cycle) {
        slide.draw(blank)
        Object.assign(s, { shown: key, crt: t + 0.12 })
      }
    }
    const since = t - s.at
    if (s.shown !== key && since > 0.14) {
      slide.draw(blank)
      s.shown = key
    }
    const shutter = since < 0.14 ? 1 - since / 0.14 : since < 0.5 ? (since - 0.14) / 0.36 : 1
    // a beat after the switch, so it is seen once the camera settles: the
    // title slide's lamp strikes, a tray powers on
    const title = key === 'title'
    if (on && power.current < 0) {
      power.current = t + 0.5
      if (!title) s.crt = power.current
    }
    if (!on) power.current = -1
    const since0 = t - power.current
    lamp.level = !on ? MathUtils.damp(lamp.level, 0, 4, k) : title ? strike(since0) : MathUtils.clamp(since0 / 0.3, 0, 1)
    const crt = powerOn(t - s.crt)
    for (const m of [wall.current, beam.current, dust.current]) {
      if (!m) continue
      m.uniforms.uOn.value = lamp.level
      m.uniforms.uTime.value = t
    }
    const open = s.at < 0 ? 1 : Math.max(0.04, shutter)
    if (wall.current) {
      wall.current.uniforms.uShutter.value = open
      wall.current.uniforms.uOpen.value.set(crt.x, crt.y)
      wall.current.uniforms.uBoost.value = crt.boost
    }
    Object.assign(gate, { light: lamp.level * open, x: crt.x, y: crt.y, boost: crt.boost })
  })

  const beamGeo = useMemo(() => pyramid(), [])
  const dustGeo = useMemo(() => motes(260), [])

  return (
    <>
      <mesh position={[SET.screen[0], SET.screen[1], SET.screen[2] - 0.01]}>
        <planeGeometry args={[W * PAD, H * PAD]} />
        <shaderMaterial
          ref={wall}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={{ uSlide: { value: slide.texture }, uOn: { value: 0 }, uShutter: { value: 1 }, uTime: { value: 0 }, uOpen: { value: new Vector2(1, 1) }, uBoost: { value: 1 } }}
          vertexShader={VERT}
          fragmentShader={WALL}
        />
      </mesh>
      <mesh geometry={beamGeo}>
        <shaderMaterial
          ref={beam}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={2}
          uniforms={{ uOn: { value: 0 }, uTime: { value: 0 } }}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM}
        />
      </mesh>
      <points geometry={dustGeo}>
        <shaderMaterial
          ref={dust}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={{ uOn: { value: 0 }, uTime: { value: 0 } }}
          vertexShader={DUST_VERT}
          fragmentShader={DUST}
        />
      </points>
    </>
  )
}

// The frame's four corners on the wall, keystoned.
function corners() {
  const [x, y, z] = SET.screen
  const top = (W / 2) * (1 + KEYSTONE / 2)
  const bottom = (W / 2) * (1 - KEYSTONE / 2)
  return [
    new Vector3(x - bottom, y - H / 2, z),
    new Vector3(x + bottom, y - H / 2, z),
    new Vector3(x + top, y + H / 2, z),
    new Vector3(x - top, y + H / 2, z),
  ]
}

// The beam: four open sides from the lens to the frame; uv.y runs lens → wall.
function pyramid() {
  const c = corners()
  const pos: number[] = []
  const uv: number[] = []
  for (let i = 0; i < 4; i++) {
    const a = c[i]
    const b = c[(i + 1) % 4]
    pos.push(LENS.x, LENS.y, LENS.z, a.x, a.y, a.z, b.x, b.y, b.z)
    uv.push(0.5, 0, 0, 1, 1, 1)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return g
}

// Dust in the beam: points scattered through the pyramid, each with how far
// along the beam it sits (for brightness) and a seed for its drift.
function motes(n: number) {
  const c = corners()
  const r = rng(17)
  const pos: number[] = []
  const along: number[] = []
  const seed: number[] = []
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 0.7) * 0.92 + 0.04
    const u = r()
    const v = r()
    const bottom = c[0].clone().lerp(c[1], u)
    const top = c[3].clone().lerp(c[2], u)
    const onWall = bottom.lerp(top, v)
    const p = LENS.clone().lerp(onWall, t)
    pos.push(p.x, p.y, p.z)
    along.push(t)
    seed.push(r() * 100)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('aAlong', new Float32BufferAttribute(along, 1))
  g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
  return g
}

// Fits the DOM slide onto the lit frame every frame: its four corners go
// where the frame's corners land on screen, so it keeps the wall's
// perspective while the camera moves and squares up when it stops. Its
// controls hang above and below the frame.
// The frame's lower edge is also kept in --frame-bottom, where a phone's sheet
// starts. The controls come in last: once the camera has come to rest on the
// frame and the lamp is lit, the trays drop in above and the controls rise below.
export function SlideTracker() {
  const { camera, size } = useThree()
  const pts = useMemo(() => corners(), [])
  const v = useMemo(() => new Vector3(), [])
  const bottom = useRef(-1)
  const rest = useRef({ slide: null as HTMLElement | null, x: 0, y: 0, at: -1 })
  useFrame(({ clock }) => {
    const { slide, above, below } = stage
    if (!slide) return
    // bottom-left, bottom-right, top-right, top-left on screen
    const q = pts.map((p) => {
      v.copy(p).project(camera)
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height] as const
    })
    slide.style.transform = quad(slide.offsetWidth, slide.offsetHeight, q[3], q[2], q[1], q[0])
    // the DOM slide powers on with the frame: clipped to the opening line,
    // shown once it has some height, over-bright as it settles
    slide.style.opacity = (gate.light * MathUtils.smoothstep(gate.y, 0.15, 0.6)).toFixed(3)
    slide.style.clipPath = gate.y < 1 ? `inset(${((1 - gate.y) * 50).toFixed(2)}% ${((1 - gate.x) * 50).toFixed(2)}%)` : ''
    slide.style.filter = gate.boost > 1.005 ? `brightness(${gate.boost.toFixed(3)})` : ''
    // while the camera flies in, the frame can be off screen: keep the sheet low
    const b = Math.round(MathUtils.clamp(Math.max(q[0][1], q[1][1]), size.height * 0.3, size.height))
    if (b !== bottom.current) document.documentElement.style.setProperty('--frame-bottom', `${(bottom.current = b)}px`)
    const r = rest.current
    if (r.slide !== slide) Object.assign(r, { slide, at: -1 })
    const still = Math.hypot(q[0][0] - r.x, q[0][1] - r.y) < 1
    ;[r.x, r.y] = q[0]
    if (r.at < 0 && still && gate.light > 0.9 && gate.y > 0.99) r.at = clock.elapsedTime
    const shown = r.at < 0 ? 0 : MathUtils.smoothstep(clock.elapsedTime - r.at, 0, 0.6)
    for (const [el, dy] of [[above, -10], [below, 10], [stage.chrome, 18]] as const) {
      if (!el) continue
      el.style.opacity = shown.toFixed(3)
      el.style.translate = `0 ${(dy * (1 - shown)).toFixed(1)}px`
    }
    if (above) above.style.transform = `translate(${((q[2][0] + q[3][0]) / 2).toFixed(1)}px, ${Math.min(q[2][1], q[3][1]).toFixed(1)}px) translate(-50%, -100%)`
    if (below) below.style.transform = `translate(${((q[0][0] + q[1][0]) / 2).toFixed(1)}px, ${Math.max(q[0][1], q[1][1]).toFixed(1)}px) translateX(-50%)`
  })
  return null
}

type P = readonly [number, number]

// The CSS matrix that maps a w × h box onto a quadrilateral (top-left,
// top-right, bottom-right, bottom-left): Heckbert's square-to-quad mapping.
function quad(w: number, h: number, [x0, y0]: P, [x1, y1]: P, [x2, y2]: P, [x3, y3]: P) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / den
  const k = (dx1 * sy - sx * dy1) / den
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1]
  return `matrix3d(${m.map((n) => +n.toFixed(6)).join(',')})`
}

// The title slide's lines, [font size, baseline] in canvas pixels. A portrait
// phone sees the slide small, so there the lines under the name grow.
const TYPE = {
  wide: { hello: [60, 355], name: [174, 540], caption: [58, 655], place: [40, 740] },
  tall: { hello: [80, 300], name: [188, 495], caption: [96, 645], place: [66, 755] },
}

// The slide on the canvas: white is the lamp shining through, dark is the
// letters. The landing's title slide, or blank light for a project's slide.
// A few specks of dust on the film.
function useSlide(blank: boolean) {
  const { size } = useThree()
  const tall = size.width < size.height
  const slide = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1000
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    let last = blank
    let type = TYPE.wide
    let lang: Lang = 'en'

    const draw = (blank: boolean) => {
      last = blank
      const { hello, name, caption, place } = type
      const g = canvas.getContext('2d')!
      const { width: w, height: h } = canvas
      g.fillStyle = '#fbf6ec'
      g.fillRect(0, 0, w, h)
      g.textAlign = 'center'
      g.textBaseline = 'alphabetic'
      const ink = (a: number) => `rgba(34,28,22,${a})`
      if (!blank) {
        g.fillStyle = ink(0.8)
        g.font = `italic ${hello[0]}px Newsreader, Georgia, serif`
        g.fillText("Hello, I'm", w / 2, hello[1])
        g.fillStyle = ink(0.95)
        g.font = `400 ${name[0]}px Jost, system-ui, sans-serif`
        g.letterSpacing = '-5px'
        g.fillText(site.name, w / 2, name[1])
        g.letterSpacing = '0px'
        g.fillStyle = ink(0.9)
        g.font = `400 ${caption[0]}px Jost, system-ui, sans-serif`
        g.fillText(t(site.caption, lang), w / 2, caption[1])
        g.fillStyle = ink(0.8)
        g.font = `${place[0]}px "Courier Prime", monospace`
        g.letterSpacing = '2px'
        g.fillText(t(site.place, lang), w / 2, place[1])
        g.letterSpacing = '0px'
      }
      // dust and a hair on the film
      const r = rng(31)
      g.fillStyle = ink(0.35)
      for (let d = 0; d < 26; d++) {
        g.beginPath()
        g.arc(r() * w, r() * h, 1 + r() * 2.5, 0, Math.PI * 2)
        g.fill()
      }
      g.strokeStyle = ink(0.25)
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(w * 0.82, h * 0.12)
      g.bezierCurveTo(w * 0.86, h * 0.2, w * 0.8, h * 0.26, w * 0.85, h * 0.33)
      g.stroke()
      texture.needsUpdate = true
    }
    const fit = (tall: boolean) => {
      type = tall ? TYPE.tall : TYPE.wide
      draw(last)
    }
    const speak = (l: Lang) => {
      lang = l
      draw(last)
    }
    return { texture, draw, redraw: () => draw(last), fit, speak }
  }, [])

  // first slide, then again once the web fonts arrive
  useEffect(() => {
    slide.draw(blank)
    document.fonts.ready.then(slide.redraw)
  }, [slide])
  useEffect(() => slide.fit(tall), [tall])
  const lang = useLang()
  useEffect(() => slide.speak(lang), [lang])

  return slide
}

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const WALL = /* glsl */ `
uniform sampler2D uSlide; uniform float uOn; uniform float uShutter; uniform float uTime;
uniform vec2 uOpen; uniform float uBoost;
varying vec2 vUv;
const float PAD = ${PAD.toFixed(3)};
const float KEY = ${KEYSTONE.toFixed(3)};
void main(){
  // plane uv -> frame uv, undoing the keystone so the slide fills the trapezoid
  vec2 p = (vUv - 0.5) * PAD;
  p.x /= 1.0 + KEY * p.y;
  vec2 f = p + 0.5;
  vec2 c = f - 0.5;
  float r = length(c * vec2(1.6, 1.0));
  // soft frame edge: the gate is out of focus
  vec2 e = smoothstep(vec2(0.0), vec2(0.006), f) * smoothstep(vec2(0.0), vec2(0.006), 1.0 - f);
  float inFrame = e.x * e.y;
  // defocus and colour fringing, both growing towards the edges
  float blur = 0.0009 + 0.0016 * r;
  vec2 ca = c * 0.0035;
  vec3 col = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472;
    vec2 o = vec2(cos(a), sin(a)) * blur;
    col.r += texture2D(uSlide, f + o + ca).r;
    col.g += texture2D(uSlide, f + o).g;
    col.b += texture2D(uSlide, f + o - ca).b;
  }
  col /= 6.0;
  // powering on, the frame is a white line first, the slide only as it opens
  col = mix(vec3(1.0), col, smoothstep(0.02, 0.4, uOpen.y));
  vec2 gap = abs(c) - uOpen * 0.5;
  float opened = (1.0 - smoothstep(-0.004, 0.004, gap.x)) * (1.0 - smoothstep(-0.004, 0.004, gap.y));
  // the lamp: hot in the middle, falling off to the corners, warm
  float hot = 1.0 - 0.45 * smoothstep(0.0, 0.85, r);
  float flicker = 1.0 + 0.012 * sin(uTime * 7.3) * sin(uTime * 2.1);
  vec3 lamp = vec3(1.0, 0.93, 0.8) * 0.75 * hot * flicker;
  vec3 light = lamp * col * inFrame * opened * uBoost;
  // a faint halo of stray light around the frame
  vec2 d = max(abs(c) - 0.5, 0.0);
  vec2 edge = smoothstep(vec2(0.0), vec2(0.12), vUv) * smoothstep(vec2(0.0), vec2(0.12), 1.0 - vUv);
  float halo = exp(-length(d) * 9.0) * (1.0 - inFrame) * 0.07 * edge.x * edge.y * uOpen.y;
  gl_FragColor = vec4((light + vec3(1.0, 0.92, 0.8) * halo) * uOn * uShutter, 1.0);
}`

const BEAM_VERT = /* glsl */ `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const BEAM = /* glsl */ `
uniform float uOn; uniform float uTime;
varying vec2 vUv; varying vec3 vPos;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
  // brightest near the lens, with slow drifting haze through it
  float t = vUv.y;
  float haze = 0.6 + 0.4 * noise(vPos.xy * 3.0 + vec2(uTime * 0.05, uTime * 0.03));
  float a = uOn * (0.006 + 0.05 * pow(1.0 - t, 3.0)) * haze;
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, 1.0);
}`

const DUST_VERT = /* glsl */ `
uniform float uTime; attribute float aAlong; attribute float aSeed; varying float vA;
void main(){
  vec3 p = position;
  p += vec3(sin(uTime * 0.11 + aSeed), sin(uTime * 0.07 + aSeed * 1.7) - 0.0, cos(uTime * 0.09 + aSeed * 2.3)) * 0.03 * (0.5 + aAlong);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min((1.2 + fract(aSeed) * 2.0) * (6.0 / -mv.z), 3.5);
  // motes catch the light, more near the lens and some twinkle as they turn
  vA = (0.25 + 0.75 * (1.0 - aAlong)) * (0.4 + 0.6 * abs(sin(uTime * 0.6 + aSeed)));
}`

const DUST = /* glsl */ `
uniform float uOn; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA * uOn * 0.35;
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, 1.0);
}`

// The set's sounds, synthesised except for the room tone: the studio's main
// switch, the projector's ka-chunk, typewriter keys, the line-feed ratchet, the
// carriage bell; and under them a bed of a café murmuring next door, the
// projector's fan, a cup now and then, someone typing across the room.
// The click that ends the black opening turns them on unless the visitor has
// turned them off before; the toggle's choice is remembered in this browser.

import { asset } from './base'

const KEY = 'desk.sound'

const stored = (() => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
})()
let on = stored === 'on'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let hiss: AudioBuffer | null = null
const listeners = new Set<() => void>()

export function soundOn() {
  return on
}

export function onSoundChange(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

export function setSound(next: boolean) {
  try {
    localStorage.setItem(KEY, next ? 'on' : 'off')
  } catch {
    // private mode: the choice lasts for this visit only
  }
  turn(next)
  if (next) sfx.key()
}

function turn(next: boolean) {
  on = next
  if (next) ambience.start()
  else ambience.stop()
  listeners.forEach((fn) => fn())
}

// The click that ends the black opening: the lights go on, with sound unless
// it was turned off.
export function lightsOn() {
  if (stored !== 'off') turn(true)
  sfx.lights()
}

addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) void ctx.suspend()
  else if (on) void ctx.resume()
})

function audio() {
  if (!on) return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.connect(ctx.destination)
    hiss = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate)
    const d = hiss.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// A burst of filtered noise: the body of every click and clunk.
function burst(a: AudioContext, at: number, dur: number, freq: number, gain: number, type: BiquadFilterType = 'bandpass', out: AudioNode = master!) {
  const src = a.createBufferSource()
  src.buffer = hiss
  const filter = a.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = 1.2
  const env = a.createGain()
  env.gain.setValueAtTime(gain, at)
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(filter).connect(env).connect(out)
  src.start(at, Math.random() * 0.2, dur)
}

function tone(a: AudioContext, at: number, freq: number, dur: number, gain: number, out: AudioNode = master!) {
  const osc = a.createOscillator()
  osc.frequency.value = freq
  const env = a.createGain()
  env.gain.setValueAtTime(gain, at)
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(env).connect(out)
  osc.start(at)
  osc.stop(at + dur)
}

export const sfx = {
  // The studio's main switch thrown: a sharp clack with a bit of ring, the
  // lever settling, then the tubes ticking on and a faint buzz.
  lights() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.015, 6000, 0.7, 'highpass')
    burst(a, t + 0.004, 0.05, 2400, 1.1)
    burst(a, t + 0.006, 0.06, 900, 0.35)
    tone(a, t, 3150, 0.18, 0.03)
    tone(a, t, 4730, 0.12, 0.02)
    burst(a, t + 0.17, 0.03, 3200, 0.3)
    for (const at of [0.32, 0.45, 0.52, 0.7]) {
      burst(a, t + at, 0.012, 7000, 0.12, 'highpass')
      tone(a, t + at, 5200 + Math.random() * 1500, 0.05, 0.012)
    }
    const hum = a.createGain()
    hum.gain.setValueAtTime(0, t + 0.3)
    hum.gain.linearRampToValueAtTime(0.018, t + 0.8)
    hum.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
    const band = a.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1200
    hum.connect(master!)
    const o = a.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = 120
    o.connect(band).connect(hum)
    o.start(t + 0.3)
    o.stop(t + 2.6)
  },
  // "Click anywhere to begin": the projector's fan spins up and, half a second
  // later, its lamp strikes: a tick on each flash of Projection.tsx's STRIKE,
  // and the lamp's buzz once it holds.
  projector() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.04, 2600, 0.5)
    const fan = a.createBufferSource()
    fan.buffer = hiss
    fan.loop = true
    const band = a.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 2
    band.frequency.setValueAtTime(300, t)
    band.frequency.exponentialRampToValueAtTime(1400, t + 0.8)
    band.frequency.exponentialRampToValueAtTime(900, t + 1.8)
    const spin = a.createGain()
    spin.gain.setValueAtTime(0, t)
    spin.gain.linearRampToValueAtTime(0.14, t + 0.6)
    spin.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
    fan.connect(band).connect(spin).connect(master!)
    fan.start(t)
    fan.stop(t + 2.2)
    const lamp = t + 0.5
    for (const [at, level] of [[0.04, 0.5], [0.27, 0.35], [0.53, 0.6], [0.66, 0.3]]) {
      burst(a, lamp + at, 0.025, 2200, level)
      burst(a, lamp + at, 0.01, 6500, level * 0.6, 'highpass')
    }
    const buzz = a.createOscillator()
    buzz.type = 'sawtooth'
    buzz.frequency.value = 100
    const thin = a.createBiquadFilter()
    thin.type = 'bandpass'
    thin.frequency.value = 1500
    const fade = a.createGain()
    fade.gain.setValueAtTime(0.0001, lamp + 0.53)
    fade.gain.exponentialRampToValueAtTime(0.08, lamp + 0.58)
    fade.gain.exponentialRampToValueAtTime(0.0001, lamp + 1.1)
    buzz.connect(thin).connect(fade).connect(master!)
    buzz.start(lamp + 0.53)
    buzz.stop(lamp + 1.1)
  },
  slide() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.05, 1400, 0.5)
    tone(a, t, 90, 0.08, 0.25)
    burst(a, t + 0.11, 0.07, 900, 0.6)
    tone(a, t + 0.11, 70, 0.1, 0.3)
  },
  key() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.025, 3200 + Math.random() * 800, 0.45)
    burst(a, t + 0.012, 0.04, 600, 0.25, 'lowpass')
  },
  // one tooth of the platen's line-feed ratchet
  ratchet() {
    const a = audio()
    if (!a) return
    burst(a, a.currentTime, 0.012, 2400 + Math.random() * 400, 0.12)
  },
  bell() {
    const a = audio()
    if (!a) return
    const t = a.currentTime + 0.05
    tone(a, t, 2093, 0.9, 0.08)
    tone(a, t, 4186, 0.5, 0.03)
  },
}

// The bed under the set, faded in once and out when sound goes off.
let room: Promise<AudioBuffer> | null = null
const ambience = {
  bed: null as null | { out: GainNode; sources: AudioScheduledSourceNode[]; timer: number },
  start() {
    const a = audio()
    if (!a || this.bed) return
    const t = a.currentTime
    const out = a.createGain()
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(1, t + 4)
    out.connect(master!)
    const bed = { out, sources: [] as AudioScheduledSourceNode[], timer: 0 }
    this.bed = bed

    // the café next door, through the wall
    room ??= fetch(asset('/audio/room.mp3'))
      .then((r) => r.arrayBuffer())
      .then((b) => a.decodeAudioData(b))
    room.then(
      (buffer) => {
        if (this.bed !== bed) return
        const src = a.createBufferSource()
        src.buffer = buffer
        src.loop = true
        const wall = a.createBiquadFilter()
        wall.type = 'lowpass'
        wall.frequency.value = 1400
        const level = a.createGain()
        level.gain.value = 0.55
        src.connect(wall).connect(level).connect(out)
        src.start()
        bed.sources.push(src)
      },
      () => (room = null),
    )

    // the projector's fan: brown noise, low and steady
    const brown = a.createBuffer(1, a.sampleRate * 4, a.sampleRate)
    const d = brown.getChannelData(0)
    let last = 0
    for (let i = 0; i < d.length; i++) d[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    const fan = a.createBufferSource()
    fan.buffer = brown
    fan.loop = true
    const low = a.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 420
    const level = a.createGain()
    level.gain.value = 0.35
    fan.connect(low).connect(level).connect(out)
    fan.start()
    bed.sources.push(fan)

    // now and then, somewhere across the room
    const next = () => {
      bed.timer = window.setTimeout(() => {
        if (this.bed !== bed || !ctx) return
        if (Math.random() < 0.6) cup(ctx, out)
        else typing(ctx, out)
        next()
      }, 5000 + Math.random() * 9000)
    }
    next()
  },
  stop() {
    const bed = this.bed
    if (!bed || !ctx) return
    this.bed = null
    clearTimeout(bed.timer)
    const t = ctx.currentTime
    bed.out.gain.cancelScheduledValues(t)
    bed.out.gain.setValueAtTime(bed.out.gain.value, t)
    bed.out.gain.linearRampToValueAtTime(0, t + 0.6)
    bed.sources.forEach((s) => s.stop(t + 0.7))
  },
}

// a cup set down on its saucer
function cup(a: AudioContext, out: AudioNode) {
  const t = a.currentTime
  const f = 2400 + Math.random() * 900
  tone(a, t, f, 0.25, 0.012, out)
  tone(a, t, f * 1.47, 0.18, 0.008, out)
  tone(a, t + 0.07, f * 1.04, 0.15, 0.006, out)
}

// a few keys on a typewriter at the far end of the room
function typing(a: AudioContext, out: AudioNode) {
  let t = a.currentTime
  for (let i = 0, n = 3 + Math.floor(Math.random() * 6); i < n; i++) {
    burst(a, t, 0.02, 1800 + Math.random() * 500, 0.06, 'bandpass', out)
    t += 0.09 + Math.random() * 0.08
  }
}

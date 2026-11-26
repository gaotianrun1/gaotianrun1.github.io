import { useProgress } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { site } from './content/site'
import { t } from './lang'

// The studio before the lights go on: a black terminal in the top-left corner
// prints the day's call sheet and loads the set, commands typed a key at a
// time, output printed whole, the load line following the real loading
// (drei's useProgress, then the first frame). Then a "Turn on the lights"
// button: the main switch goes, sound starts, and the black lifts onto
// the set. After Henry Heffernan's BIOS screen, as a shoot's terminal instead.

type Line = { text: string; cmd?: boolean; gate?: boolean }

const CALL = [
  ['SET', 'a white cove, one desk'],
  ['LIGHTS', 'rigged'],
  ['DESK', 'dressed'],
  ['PROJECTOR', 'lamp warm'],
  ['TYPEWRITER', 'ribbon inked'],
  ['NOTEBOOK', 'open'],
  ['PINBOARD', 'pinned'],
]
const TICK = 32
const still = matchMedia('(prefers-reduced-motion: reduce)').matches

function script(loaded: number, when: string): Line[] {
  const filled = Math.round(loaded / 5)
  return [
    { text: `studio 1 · ${t(site.place, 'en')}` },
    { text: `last login: ${when} on ttys001` },
    { text: '' },
    { text: '$ cat call-sheet.txt', cmd: true },
    ...CALL.map(([what, state]) => ({ text: `${what.padEnd(12)}${state}` })),
    { text: '' },
    { text: '$ load set', cmd: true },
    { text: `[${'#'.repeat(filled)}${'.'.repeat(20 - filled)}] ${String(Math.round(loaded)).padStart(3)}%` },
    { text: 'set loaded. quiet on set.', gate: true },
    { text: '' },
  ]
}

type Props = { ready: boolean; onLights: () => void }

export function Intro({ ready, onLights }: Props) {
  const { active, progress } = useProgress()
  const [when] = useState(() =>
    new Date().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  )
  // how far the terminal has got: whole lines, and characters into the next
  const [at, setAt] = useState({ line: 0, char: 0 })
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(false)

  const loaded = ready && !active ? 100 : Math.min(progress, 99)
  const lines = script(loaded, when)
  const live = useRef({ lines, loaded })
  live.current = { lines, loaded }

  useEffect(() => {
    let wait = 0
    const id = setInterval(() => {
      const { lines, loaded } = live.current
      setAt((p) => {
        if (still) return { line: loaded < 100 ? lines.findIndex((l) => l.gate) : lines.length, char: 0 }
        const line = lines[p.line]
        // the load line stays live until the set is in
        if (!line || (line.gate && loaded < 100)) return p
        if (line.cmd && p.char < line.text.length) return { ...p, char: p.char + 1 }
        if (++wait < (line.cmd ? 8 : 2)) return p
        wait = 0
        return { line: p.line + 1, char: 0 }
      })
    }, TICK)
    return () => clearInterval(id)
  }, [])

  const done = at.line >= lines.length
  const lift = () => {
    onLights()
    setOut(true)
    setTimeout(() => {
      setGone(true)
      document.querySelector<HTMLElement>('.begin')?.focus()
    }, still ? 300 : 1100)
  }

  if (gone) return null
  const cmd = lines[at.line]?.cmd
  return (
    <div className={out ? 'intro intro--out' : 'intro'}>
      <pre className="intro__term" aria-hidden="true">
        {lines.slice(0, at.line).map((l) => l.text + '\n')}
        {cmd && lines[at.line].text.slice(0, at.char)}
        {done && '$ '}
        <span className="intro__cursor" />
      </pre>
      {!done && <p className="sr-only" role="status">Loading the set</p>}
      {done && (
        <button className="intro__go" autoFocus disabled={out} onClick={lift}>
          Turn on the lights
        </button>
      )}
    </div>
  )
}

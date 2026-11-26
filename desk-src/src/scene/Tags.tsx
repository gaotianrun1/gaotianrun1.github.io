import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { t, useLang } from '../lang'
import { LABELS, pathOf, type Route } from '../route'
import { SET } from './shots'

// The hand-written tags hanging off the objects on the wide shot. They live
// in the page's own DOM (so they are real links in tab order) and a tracker
// inside the canvas moves them onto their objects every frame. drei's <Html>
// is not used here: it rebuilds its React root when the canvas connects its
// events, and a label that does not re-render after that comes up empty.

type TagRoute = Exclude<Route, 'landing'>

const ANCHORS: Record<TagRoute, readonly [number, number, number]> = {
  projects: [SET.projector[0], SET.projector[1] + 0.34, SET.projector[2]],
  // over the sheet in the machine, clear of the projector's tag and the slide
  experience: [SET.typewriter[0], SET.typewriter[1] + 0.45, SET.typewriter[2]],
  // hung on the pinboard's top edge, which leans back
  about: [SET.corkboard[0], SET.corkboard[1] + 0.32, SET.corkboard[2] - 0.07],
}

const els = new Map<TagRoute, HTMLAnchorElement>()

export function hoverTag(route: Route, on: boolean) {
  if (route !== 'landing') els.get(route)?.classList.toggle('tag--hover', on)
}

export function TagTracker() {
  const { camera, size } = useThree()
  const v = useMemo(() => new Vector3(), [])
  useFrame(() => {
    // On a narrow screen tags can land on each other: a tag that would
    // overlap one already placed moves up above it. The test uses the English
    // label's width, so the tags hang in the same places in either language.
    const placed: { l: number; r: number; t: number; b: number }[] = []
    for (const [route, el] of els) {
      v.set(...ANCHORS[route]).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      let y = ((1 - v.y) / 2) * size.height
      const w = (el.lastElementChild as HTMLElement).offsetWidth
      const h = el.offsetHeight
      for (const p of placed) {
        if (x - w / 2 < p.r && x + w / 2 > p.l && y - h < p.b && y > p.t) y = p.t - 4
      }
      placed.push({ l: x - w / 2, r: x + w / 2, t: y - h, b: y })
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
      el.style.visibility = 'visible'
    }
  })
  return null
}

export function Tags({ route, go }: { route: Route | 'intro'; go: (r: Route) => void }) {
  const lang = useLang()
  return (
    <div className={`tags${route === 'landing' ? '' : ' tags--hidden'}`}>
      {(Object.keys(ANCHORS) as TagRoute[]).map((r) => (
        <a
          key={r}
          ref={(el) => {
            if (el) els.set(r, el)
            else els.delete(r)
          }}
          className="tag"
          href={pathOf(r)}
          tabIndex={route === 'landing' ? 0 : -1}
          onClick={(e) => {
            e.preventDefault()
            go(r)
          }}
        >
          <span>{t(LABELS[r], lang)}</span>
          <span className="tag__ghost" aria-hidden>
            {t(LABELS[r], 'en')}
          </span>
        </a>
      ))}
    </div>
  )
}

import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { NeutralToneMapping } from 'three'
import { Grade } from './scene/Grade'
import { Grain } from './Grain'
import { Intro } from './Intro'
import { site } from './content/site'
import { photos } from './content/board'
import { projects } from './content/projects'
import { LangToggle, Notebook, PaperRoll, PhotoViewer, SoundToggle } from './pages/Pages'
import { t, useLang } from './lang'
import { Projects } from './pages/Projects'
import { lightsOn, sfx } from './sound'
import { LABELS, pathOf, useRoute, type Route } from './route'
import { CameraRig } from './scene/CameraRig'
import { INTRO, SHOTS } from './scene/shots'
import { SlideTracker } from './scene/Projection'
import { Studio, type TrayAt } from './scene/Studio'
import { TagTracker, Tags } from './scene/Tags'
import { withBase } from './base'

const PAGES = ['projects', 'experience', 'about'] as const

export default function App() {
  const [route, go, path] = useRoute()
  const lang = useLang()
  const [at, setAt] = useState<TrayAt>({ project: 0, slide: 0 })
  const [photo, setPhoto] = useState<number | null>(null)
  const [firstShot] = useState(() => SHOTS[route].position)
  const [ready, setReady] = useState(false)
  // A visit that opens on the landing starts on a wider shot until the first click.
  const [begun, setBegun] = useState(route !== 'landing')

  // /projects/<id> opens that tray, and the address follows the tray
  useEffect(() => {
    const i = projects.findIndex((p) => path === `/projects/${p.id}`)
    if (i >= 0) setAt({ project: i, slide: 0 })
  }, [path])
  useEffect(() => {
    if (route === 'projects') history.replaceState(null, '', withBase(`/projects/${projects[at.project].id}`))
  }, [route, at.project])

  // the projector advances a slide on the way in, and on every change
  useEffect(() => {
    if (route === 'projects') sfx.slide()
  }, [route, at])

  // Esc steps back from an object to the whole set (an open photo closes first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && go('landing')
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <>
      <Canvas
        shadows="variance"
        dpr={[1, 2]}
        gl={{ toneMapping: NeutralToneMapping }}
        camera={{ position: begun ? firstShot : INTRO.position, fov: 38, near: 0.05, far: 60 }}
        onCreated={() => requestAnimationFrame(() => setReady(true))}
        className={ready ? 'stage stage--ready' : 'stage'}
      >
        <Studio route={route} at={at} go={go} begun={begun} onPhoto={route === 'about' ? setPhoto : undefined} />
        <CameraRig route={route} intro={!begun} />
        <TagTracker />
        <SlideTracker />
        <Grade />
      </Canvas>
      <Tags route={begun ? route : 'intro'} go={go} />
      <Intro ready={ready} onLights={lightsOn} />
      {!begun && (
        <button
          className="begin"
          onClick={() => {
            sfx.projector()
            setBegun(true)
          }}
        >
          <span>Click anywhere to begin</span>
        </button>
      )}
      {/* the title slide on the wall is drawn as light; its words live here for readers and search */}
      {route === 'landing' && (
        <header className="sr-only">
          <h1>{site.name}</h1>
          <p>{t(site.caption, lang)}</p>
          <p>{t(site.place, lang)}</p>
        </header>
      )}
      {/* the settings in the corner, once the set is lit */}
      {begun && (
        <div className="settings">
          <LangToggle />
          <SoundToggle />
        </div>
      )}

      {route !== 'landing' && (
        <nav className="nav">
          <a href={withBase('/')} onClick={link(go, 'landing')} className="nav__mark">
            {site.name}
          </a>
          <span className="nav__links">
            {PAGES.map((p) => (
              <a key={p} href={pathOf(p)} onClick={link(go, p)} aria-current={p === route ? 'page' : undefined}>
                {t(LABELS[p], lang)}
              </a>
            ))}
          </span>
        </nav>
      )}

      {/* keyed by route so each page's sheet re-runs its entrance */}
      <main className="reading" key={route}>
        {route === 'projects' && <Projects at={at} setAt={setAt} />}
        {/* the sheet's paper is drawn to its length, so a new language feeds a new sheet */}
        {route === 'experience' && <PaperRoll key={lang} />}
        {route === 'about' && <Notebook onPhoto={setPhoto} />}
      </main>
      {route === 'about' && photo !== null && <PhotoViewer photos={photos} at={photo} setAt={setPhoto} />}
      <Grain />
    </>
  )
}

function link(go: (r: Route) => void, route: Route) {
  return (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    go(route)
  }
}

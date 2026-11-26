import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { contextOf, projects, slidesOf, type Project, type Slide } from '../content/projects'
import { stage } from '../scene/Projection'
import type { TrayAt } from '../scene/Studio'
import { t, useLang, type Lang } from '../lang'
import { PhotoViewer } from './Pages'

// The Projects page. On a wide screen the projected frame is the stage: the
// slide is real DOM fitted onto it (SlideTracker), the trays hang above it and
// the slide controls below. "Details" opens the long version as a page over a
// dimmed set. A phone gets the same slides as one page that scrolls.

const narrowQuery = matchMedia('(max-width: 720px)')

const UI = {
  details: { en: 'Project details', zh: '项目详情' },
  site: { en: 'Visit the site →', zh: '访问网站 →' },
  film: { en: 'The film', zh: '演示视频' },
  results: { en: 'Results', zh: '结果' },
  limits: { en: 'Results and limits', zh: '结果与局限' },
  story: { en: 'Read the full story', zh: '阅读完整介绍' },
  next: { en: 'Next', zh: '下一个' },
}

export function Projects({ at, setAt }: { at: TrayAt; setAt: (at: TrayAt) => void }) {
  const [narrow, setNarrow] = useState(narrowQuery.matches)
  useEffect(() => {
    const on = () => setNarrow(narrowQuery.matches)
    narrowQuery.addEventListener('change', on)
    return () => narrowQuery.removeEventListener('change', on)
  }, [])
  return narrow ? <ProjectScroll at={at} setAt={setAt} /> : <ProjectStage at={at} setAt={setAt} />
}

function ProjectStage({ at, setAt }: { at: TrayAt; setAt: (at: TrayAt) => void }) {
  const p = projects[at.project]
  const slides = slidesOf(p)
  const [details, setDetails] = useState(false)
  // the slide changes while the shutter is shut (Projection.tsx), not before
  const [shown, setShown] = useState(at)
  useEffect(() => {
    const t = setTimeout(() => setShown(at), 140)
    return () => clearTimeout(t)
  }, [at.project, at.slide])
  const go = (slide: number) => setAt({ ...at, slide: Math.max(0, Math.min(slides.length - 1, slide)) })

  useEffect(() => {
    // captured, so Esc closes the details before it leaves the page
    const onKey = (e: KeyboardEvent) => {
      if (details) {
        if (e.key === 'Escape') {
          setDetails(false)
          e.stopImmediatePropagation()
        }
        return
      }
      if (e.key === 'ArrowRight') go(at.slide + 1)
      if (e.key === 'ArrowLeft') go(at.slide - 1)
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  })

  const sp = projects[shown.project]
  const lang = useLang()
  return (
    <>
      <nav className="trays" ref={(el) => void (stage.above = el)} aria-label="Projects">
        {projects.map((q, i) => (
          <button key={q.id} aria-current={i === at.project || undefined} onClick={() => setAt({ project: i, slide: 0 })}>
            <span>{String(i + 1).padStart(2, '0')}</span> {q.title}
          </button>
        ))}
      </nav>
      <section className="slide" ref={(el) => void (stage.slide = el)} aria-live="polite">
        <SlideView p={sp} slide={slidesOf(sp)[shown.slide] ?? { kind: 'cover' }} openDetails={() => setDetails(true)} />
      </section>
      <div className="slide-nav" ref={(el) => void (stage.below = el)}>
        <button onClick={() => go(at.slide - 1)} disabled={at.slide === 0} aria-label="Previous slide">
          ←
        </button>
        {slides.map((s, i) => (
          <button key={i} className="dot" aria-current={i === at.slide || undefined} onClick={() => go(i)} aria-label={`Slide ${i + 1}: ${labelOf(p, s, lang)}`} />
        ))}
        <button onClick={() => go(at.slide + 1)} disabled={at.slide === slides.length - 1} aria-label="Next slide">
          →
        </button>
      </div>
      {details && createPortal(<Details p={p} close={() => setDetails(false)} />, document.body)}
    </>
  )
}

function labelOf(p: Project, s: Slide, lang: Lang) {
  return s.kind === 'cover' ? p.title : s.kind === 'film' ? t(UI.film, lang) : s.kind === 'results' ? t(UI.results, lang) : t(s.title, lang)
}

// Who the project was made with, between the pitch and the stack.
function With({ p, lang }: { p: Project; lang: Lang }) {
  if (!p.with) return null
  const a = (
    <a href={p.with.href} target="_blank" rel="noreferrer">
      {p.with.name}
    </a>
  )
  return <p className="meta with">{lang === 'zh' ? <>与 {a} 合作完成</> : <>Built with {a}</>}</p>
}

// One slide: a large picture at the left, a short text at the right.
function SlideView({ p, slide, openDetails }: { p: Project; slide: Slide; openDetails: () => void }) {
  const lang = useLang()
  const actions = (
    <p className="slide__actions">
      <button onClick={openDetails}>{t(UI.details, lang)}</button>
      {p.site && <a href={p.site} target="_blank" rel="noreferrer">{t(UI.site, lang)}</a>}
      {p.links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
          {t(l.label, lang)}
        </a>
      ))}
    </p>
  )
  if (slide.kind === 'cover')
    return (
      <div className="slide__body slide--cover">
        <img src={p.cover.src} alt={p.cover.alt} />
        <div className="slide__text">
          <p className="meta">{contextOf(p)}</p>
          <h2>{p.title}</h2>
          <p className="slide__lead">{t(p.pitch, lang)}</p>
          <With p={p} lang={lang} />
          <Stack p={p} />
          {actions}
        </div>
      </div>
    )
  if (slide.kind === 'film')
    return (
      <div className="slide__body">
        <video src={t(slide.src, lang)} poster={t(slide.poster, lang)} controls muted autoPlay loop playsInline />
        <div className="slide__text">
          <h3>{t(UI.film, lang)}</h3>
          <p>{t(slide.caption, lang)}</p>
          {actions}
        </div>
      </div>
    )
  if (slide.kind === 'picture')
    return (
      <div className="slide__body">
        <img src={slide.src} alt={slide.alt} />
        <div className="slide__text">
          <h3>{t(slide.title, lang)}</h3>
          <p>{t(slide.body, lang)}</p>
        </div>
      </div>
    )
  return (
    <div className={p.results ? 'slide__body' : 'slide__body slide--numbers'}>
      {p.results && <img src={p.results.src} alt={p.results.alt} />}
      <div className="slide__text">
        <h3>{t(UI.results, lang)}</h3>
        <Metrics p={p} />
        {actions}
      </div>
    </div>
  )
}

function Stack({ p }: { p: Project }) {
  return (
    <ul className="stack" aria-label="Built with">
      {p.stack.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}

function Metrics({ p }: { p: Project }) {
  return (
    <dl className="metrics">
      {p.metrics.map((m) => (
        <div key={m.label}>
          <dt>{m.value}</dt>
          <dd>
            {m.label}
            <small>{m.caveat}</small>
          </dd>
        </div>
      ))}
    </dl>
  )
}

// The long version: background, what I did, method, then results and links.
function Details({ p, close }: { p: Project; close: () => void }) {
  return (
    <div className="details" onClick={(e) => e.target === e.currentTarget && close()}>
      <article className="details__page" aria-label={`${p.title}, details`}>
        <button className="details__close" onClick={close} aria-label="Close details" autoFocus>
          ×
        </button>
        <ProjectText p={p} />
      </article>
    </div>
  )
}

function ProjectText({ p }: { p: Project }) {
  const lang = useLang()
  const pictures = [p.cover, ...p.slides, ...(p.results ? [p.results] : [])]
  return (
    <>
      <p className="meta">{contextOf(p)}</p>
      <h2>{p.title}</h2>
      <p className="lead">{t(p.pitch, lang)}</p>
      <With p={p} lang={lang} />
      <Stack p={p} />
      <div className="pictures">
        {pictures.map((x) => (
          <img key={x.src} src={x.src} alt={x.alt} loading="lazy" />
        ))}
      </div>
      {p.details.map((d) => (
        <section key={t(d.heading, 'en')}>
          <h3>{t(d.heading, lang)}</h3>
          {d.body.map((b) => (
            <p key={t(b, 'en')}>{t(b, lang)}</p>
          ))}
        </section>
      ))}
      <section>
        <h3>{t(UI.limits, lang)}</h3>
        <Metrics p={p} />
        {p.disclaimer && <p className="fine">{t(p.disclaimer, lang)}</p>}
      </section>
      <Links p={p} />
    </>
  )
}

function Links({ p }: { p: Project }) {
  const lang = useLang()
  if (!p.site && p.links.length === 0) return null
  return (
    <section className="links">
      {p.site && <a href={p.site} target="_blank" rel="noreferrer">{t(UI.site, lang)}</a>}
      {p.links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
          {t(l.label, lang)}
        </a>
      ))}
    </section>
  )
}

// A phone: the projector throws the project's cover on the wall at the top;
// below it the sheet, with the trays at its head, scrolls up over the wall and
// the trays stay pinned under the nav. On the sheet: the links first, then the
// tray's slides one under another, each picture with its note, the long
// version folded at the end. A picture, the one on the wall too, opens whole on tap.
function ProjectScroll({ at, setAt }: { at: TrayAt; setAt: (at: TrayAt) => void }) {
  const p = projects[at.project]
  const next = (at.project + 1) % projects.length
  const [photo, setPhoto] = useState<number | null>(null)
  const lang = useLang()
  // the cover changes while the shutter is shut, as on the wide stage
  const [shown, setShown] = useState(at.project)
  useEffect(() => {
    const t = setTimeout(() => setShown(at.project), 140)
    return () => clearTimeout(t)
  }, [at.project])
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    ref.current?.scrollTo(0, 0)
  }, [at.project])
  const pictures = [
    { src: p.cover.src, caption: p.title },
    ...p.slides.map((s) => ({ src: s.src, caption: t(s.title, lang) })),
    ...(p.results ? [{ src: p.results.src, caption: t(UI.results, lang) }] : []),
  ]
  const picture = (i: number, alt: string) => (
    <button className="zoom" onClick={() => setPhoto(i)}>
      <img src={pictures[i].src} alt={alt} loading="lazy" />
    </button>
  )
  return (
    <>
      <section className="slide slide--wall" ref={(el) => void (stage.slide = el)} aria-hidden>
        <img src={projects[shown].cover.src} alt="" />
      </section>
      {/* the whole column scrolls, the wall above the sheet too; a tap on the
          wall opens the cover */}
      <div className="project-scroll" ref={(el) => void (ref.current = stage.chrome = el)} onClick={(e) => e.target === e.currentTarget && setPhoto(0)}>
        <nav className="trays" aria-label="Projects">
          {projects.map((q, i) => (
            <button key={q.id} aria-current={i === at.project || undefined} onClick={() => setAt({ project: i, slide: 0 })}>
              <span>{String(i + 1).padStart(2, '0')}</span> {q.title}
            </button>
          ))}
        </nav>
        <article className="sheet project-scroll__page" key={p.id}>
          <p className="meta">{contextOf(p)}</p>
          <h2>{p.title}</h2>
          <p className="lead">{t(p.pitch, lang)}</p>
          <With p={p} lang={lang} />
          <Stack p={p} />
          <Links p={p} />
          {p.film && (
            <figure>
              <video src={t(p.film.src, lang)} poster={t(p.film.poster, lang)} controls muted playsInline preload="none" />
              <figcaption>
                <h3>{t(UI.film, lang)}</h3>
                <p>{t(p.film.caption, lang)}</p>
              </figcaption>
            </figure>
          )}
          {p.slides.map((s, i) => (
            <figure key={s.src}>
              {picture(i + 1, s.alt)}
              <figcaption>
                <h3>{t(s.title, lang)}</h3>
                <p>{t(s.body, lang)}</p>
              </figcaption>
            </figure>
          ))}
          {p.metrics.length > 0 && (
            <section>
              <h3>{t(UI.results, lang)}</h3>
              <Metrics p={p} />
              {p.results && <figure>{picture(pictures.length - 1, p.results.alt)}</figure>}
              {p.disclaimer && <p className="fine">{t(p.disclaimer, lang)}</p>}
            </section>
          )}
          <details className="story">
            <summary>{t(UI.story, lang)}</summary>
            {p.details.map((d) => (
              <section key={t(d.heading, 'en')}>
                <h3>{t(d.heading, lang)}</h3>
                {d.body.map((b) => (
                  <p key={t(b, 'en')}>{t(b, lang)}</p>
                ))}
              </section>
            ))}
          </details>
          <button className="next" onClick={() => setAt({ project: next, slide: 0 })}>
            {t(UI.next, lang)}: {projects[next].title} →
          </button>
        </article>
        {photo !== null && <PhotoViewer photos={pictures} at={photo} setAt={setPhoto} />}
      </div>
    </>
  )
}

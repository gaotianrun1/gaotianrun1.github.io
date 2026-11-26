import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { education, experience } from '../content/experience'
import { type Photo, photos } from '../content/board'
import { notes, portrait } from '../content/notes'
import { site } from '../content/site'
import { keyStrike, paperScroll } from '../scene/Typewriter'
import { setLang, t, useLang } from '../lang'
import { follow } from '../route'
import { onSoundChange, setSound, sfx, soundOn } from '../sound'
import { asset, withBase } from '../base'

// The reading layer of each page: flat, real text that sits over the shot
// once the camera has walked up to the object. 3D gets you there; you read
// on paper.

// The paper feeds out of the platen once the camera has arrived, a line at a
// time, then the newest company name types in.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const FEED_MS = 2600
const LINE_PX = 24

export function PaperRoll() {
  const sheet = useRef<HTMLElement>(null)
  const fedPx = useRef(0)
  const [fed, setFed] = useState(reduceMotion)
  const lang = useLang()

  useEffect(() => {
    const el = sheet.current!
    paperScroll.live = true
    // the sheet's own aged paper, drawn once at its full scrolled size, off the main thread
    let paperUrl = ''
    const worker = new Worker(new URL('./agedPaper.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }: MessageEvent<Blob>) => {
      paperUrl = URL.createObjectURL(data)
      el.style.setProperty('--aged', `url(${paperUrl})`)
      worker.terminate()
    }
    worker.postMessage({ w: el.clientWidth, h: el.scrollHeight })
    // the camera takes a moment to settle on the typewriter
    const t0 = performance.now() + 900
    let raf = 0
    let line = 0
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / FEED_MS))
      const e = p < 0.5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2
      const h = el.clientHeight
      fedPx.current = e * h
      el.style.translate = `0 ${(h - fedPx.current).toFixed(1)}px`
      paperScroll.px = fedPx.current + el.scrollTop
      if (Math.floor(fedPx.current / LINE_PX) !== line) {
        line = Math.floor(fedPx.current / LINE_PX)
        sfx.ratchet()
      }
      if (p < 1) raf = requestAnimationFrame(tick)
      else setFed(true)
    }
    if (!reduceMotion) raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      worker.terminate()
      URL.revokeObjectURL(paperUrl)
      paperScroll.live = false
      paperScroll.px = 0
    }
  }, [])

  return (
    <div className="paper-slot">
      <article ref={sheet} className="sheet sheet--paper" tabIndex={0} onScroll={(e) => (paperScroll.px = fedPx.current + e.currentTarget.scrollTop)}>
        {experience.map((job, i) => (
          <section key={job.url} className="job">
            <h2>
              <a href={job.url} target="_blank" rel="noreferrer">
                {i === 0 ? <Typed text={t(job.company, lang)} start={fed} /> : t(job.company, lang)}
              </a>
            </h2>
            <p className="job__line">
              <span>
                {t(job.role, lang)} · {t(job.place, lang)}
              </span>
              <span>
                {job.start} – {job.end}
              </span>
            </p>
            <ul>
              {job.bullets.map((b) => (
                <li key={t(b, 'en')}>
                  <Inline text={t(b, lang)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {education.length > 0 && (
          <section className="job">
            <h2>{lang === 'zh' ? '教育经历' : 'Education'}</h2>
            {education.map((e) => (
              <div key={e.start}>
                <p className="job__line">
                  <span>{t(e.school, lang)}</span>
                  <span>
                    {e.start} – {e.end}
                  </span>
                </p>
                <p className="edu">{t(e.degree, lang)}</p>
              </div>
            ))}
          </section>
        )}
      </article>
    </div>
  )
}

// The newest entry is typed in once the paper is out; the rest was typed before.
function Typed({ text, start }: { text: string; start: boolean }) {
  const [n, setN] = useState(reduceMotion ? text.length : 0)
  useEffect(() => {
    if (!start || n >= text.length) return
    const t = setTimeout(() => {
      keyStrike.at = performance.now()
      keyStrike.key = text.charCodeAt(n) * 7
      if (n + 1 === text.length) sfx.bell()
      else sfx.key()
      setN(n + 1)
    }, n === 0 ? 350 : 70 + Math.random() * 70)
    return () => clearTimeout(t)
  }, [n, text, start])
  return (
    <span aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      {start && n < text.length && <span className="caret" aria-hidden />}
    </span>
  )
}

export function Notebook({ onPhoto }: { onPhoto: (i: number) => void }) {
  const [page, setPage] = useState(0)
  const [pic, setPic] = useState<Photo | null>(null)
  const lang = useLang()
  const note = notes[page]
  const body = t(note.body, lang)
  // the photos that open whole are fetched while the camera settles, so a click opens them at once
  useEffect(() => {
    const urls = [...photos.map((p) => p.full ?? p.src), ...[...body.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1].split(' ').pop())]
    const id = setTimeout(() => urls.forEach((u) => u && /\.(jpe?g|png|webp)$/i.test(u) && (new Image().src = u)), 1500)
    return () => clearTimeout(id)
  }, [body])
  return (
    <article className="sheet sheet--notebook" key={note.date}>
      <img className="portrait" src={portrait.src} alt={portrait.alt} width={480} height={480} />
      <p className="meta">{note.date}</p>
      <h2>{t(note.title, lang)}</h2>
      {body.split(/\n\s*\n/).map((para) => (
        <p key={para}>
          <Inline text={para} onPicture={setPic} />
        </p>
      ))}
      {pic && <PhotoViewer photos={[pic]} at={0} setAt={() => setPic(null)} />}
      {/* the corkboard's photos as a strip: on phones the board is too small to
          read, and keyboard users reach the photos here too */}
      <ul className="board-strip" aria-label="Photos on the board">
        {photos.map((p, i) => (
          <li key={i}>
            <button onClick={() => onPhoto(i)}>
              <img src={p.src} alt={p.caption ?? ''} width={512} height={512} />
            </button>
          </li>
        ))}
      </ul>
      {notes.length > 1 && (
        <nav className="pager" aria-label="Notebook pages">
          <button disabled={page === notes.length - 1} onClick={() => setPage(page + 1)}>
            ← Earlier
          </button>
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Later →
          </button>
        </nav>
      )}
      <address className="contact">
        <a href={`mailto:${site.email}`}>{site.email}</a>
        {site.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </address>
    </article>
  )
}

// A paragraph of a note or a CV bullet: ![alt](src) is drawn as a small round
// picture, [text](url) as a link (a path on this site opens that shot in
// place). With onPicture, the round picture and links
// to an image open that image over the page instead.
function Inline({ text, onPicture }: { text: string; onPicture?: (p: Photo) => void }) {
  return text.split(/(!?\[[^\]]*\]\([^)]+\))/).map((part, i) => {
    const m = part.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/)
    if (!m) return part
    const [src0, full0 = src0] = m[3].split(' ')
    const src = asset(src0)
    const full = asset(full0)
    const pic = m[1] ? <img className="inline-pic" src={src} alt={m[2]} width={160} height={160} /> : m[2]
    if (onPicture && (m[1] || /\.(jpe?g|png|webp)$/i.test(src0)))
      return (
        <a key={i} href={full} onClick={(e) => (e.preventDefault(), onPicture({ src: full, caption: m[2] }))}>
          {pic}
        </a>
      )
    if (m[3].startsWith('/'))
      return (
        <a key={i} href={withBase(m[3])} onClick={(e) => follow(e, m[3])}>
          {m[2]}
        </a>
      )
    return m[1] ? (
      <Fragment key={i}>{pic}</Fragment>
    ) : (
      <a key={i} href={m[3]} target="_blank" rel="noreferrer">
        {m[2]}
      </a>
    )
  })
}

// A photo, whole, over the dimmed set. Arrows or a swipe step through the
// others; Esc, the button or a click outside closes it.
export function PhotoViewer({ photos, at, setAt }: { photos: Photo[]; at: number; setAt: (i: number | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const swipe = useRef(0)
  const photo = photos[at]
  const src = photo.full ?? photo.src
  // the print comes up once it is decoded, so the card never opens empty and then jumps to size
  const [shown, setShown] = useState<string>()
  const step = (d: number) => photos.length > 1 && setAt((at + d + photos.length) % photos.length)
  useEffect(() => {
    const dialog = ref.current!
    if (!dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="viewer"
      aria-label={photo.caption}
      onClose={() => setAt(null)}
      onClick={(e) => e.target === e.currentTarget && Math.abs(e.clientX - swipe.current) < 10 && ref.current!.close()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1)
        if (e.key === 'ArrowLeft') step(-1)
      }}
      onPointerDown={(e) => (swipe.current = e.clientX)}
      onPointerUp={(e) => {
        const dx = e.clientX - swipe.current
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
      }}
    >
      <figure key={src} className={shown === src ? 'is-shown' : undefined}>
        <img
          src={src}
          alt={photo.caption ?? ''}
          onLoad={(e) => e.currentTarget.decode().catch(() => {}).then(() => setShown(src))}
          onError={() => setShown(src)}
        />
        <figcaption>
          {photos.length > 1 && <button onClick={() => step(-1)} aria-label="Previous photo">←</button>}
          <span>{photo.caption}</span>
          {photos.length > 1 && <button onClick={() => step(1)} aria-label="Next photo">→</button>}
        </figcaption>
      </figure>
      <button className="viewer__close" onClick={() => ref.current!.close()} aria-label="Close">
        ×
      </button>
    </dialog>
  )
}

export function SoundToggle() {
  const on = useSyncExternalStore(onSoundChange, soundOn)
  return (
    <button className="sound" aria-pressed={on} onClick={() => setSound(!on)}>
      Sound {on ? 'on' : 'off'}
    </button>
  )
}

// Each language's name in its own script, so either reader finds the way back.
export function LangToggle() {
  const lang = useLang()
  return (
    <button className="lang" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} lang={lang === 'zh' ? 'en' : 'zh'}>
      {lang === 'zh' ? 'EN' : '中文'}
    </button>
  )
}

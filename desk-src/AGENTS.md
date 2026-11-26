# Working on desk-portfolio

A personal site as one 3D scene with four pages. Read `README.md` for how to
run it and where things live. This file holds what the code cannot tell you.

## The scene

A white photo-studio cove (a seamless background) with one desk. Each page is
a camera shot of an object on that desk:

| Page | Object | What it does |
|---|---|---|
| Landing `/` | the whole set | The projector throws a **title slide** (name, one-line caption, place) on the back wall. Each object wears a hand-written tag that links to its page. |
| Projects `/projects` | slide projector | The camera squares up to the projected frame, which becomes the stage: one tray of slides per project (a cover with the project at a glance, then one picture and a short note per slide, then results), as sharp DOM fitted onto the frame. The trays hang above it, the slide controls below. "Project details" opens the long version over the dimmed set. Slide 0 is the landing's title slide. |
| Experience `/experience` | typewriter with a roll of paper | The CV on the paper: company (linked to its site), role, place, dates and two or three bullets each. The 3D sheet winds back into the platen and the CV, as DOM pinned to the platen, feeds out in its place; then the newest company name types in. |
| About `/about` | small pinboard propped on the desk + open notebook | Photos and scraps on the board; writing in the notebook, newest entry open, older ones earlier. A square portrait heads the notebook page; contact links close it. A photo on the board opens whole on click (phones get a strip of them on the page). |

## Design rules

- **3D walks you there; you read on paper.** Every page's reading state is a
  flat layer of real DOM text (selectable, indexable, accessible) over the
  shot, never text baked into a texture. The landing's slide is drawn as
  projected light (`src/scene/Projection.tsx`); its words are also in the
  DOM, visually hidden.
- Text on the landing is part of the scene (the title slide, the tags), not
  page chrome.
- Content lives in `src/content/*.ts`. Adding a project, a job or a note is
  one entry there; the scene grows with it. Text in both languages is a
  `{ en, zh }` pair.
- Retro-futurism is a light touch: the objects' industrial design (60s–70s
  warm whites, beige, one orange; see `src/scene/look.ts`), their mechanical
  sounds (`src/sound.ts`), the title slide flickering on with the lamp, the
  projection opening like an old CRT, and a film grain over everything. No
  heavy theming, no CRT screens.
- Every shot is composed as a photograph, and the picture comes first: props
  may be added, moved or removed for it. One thing reads first and one
  second; balance comes from size, value, colour and empty space, not from
  filling gaps; empty space surrounds the group instead of splitting it.
  Light has a lit side and a shaded side: a key from the side, little fill,
  and a wall that falls off behind the set.
- Phones walk the camera between shots like the desktop. Only reduced motion
  cuts.

## Checking a change

1. `npm run check` (type-check and production build). The chunk-size warning
   is expected (three.js).
2. Drive the affected page in the browser at 1440×900 and at a phone size.
   The intro is a black terminal: click "Turn on the lights", then "Click
   anywhere to begin", before the set shows.

Browser quirks:
- A hidden or background tab throttles `requestAnimationFrame` to about
  1 fps, and the first frame can take several seconds while shaders compile.
  Wait or re-screenshot before calling the page blank; headless browser
  screenshots are more reliable.
- Vite sometimes serves a stale module on the first reload after an edit;
  navigate again with a new `?r=N`.

## Known traps

- drei `<Html>` rebuilds its React root when the canvas connects its events;
  an `<Html>` whose children do not change afterwards comes up empty. Give it
  a fixed `portal`, or render the DOM yourself and project positions in
  `useFrame` (as `src/scene/Tags.tsx` does). React StrictMode makes it worse,
  so it is off.

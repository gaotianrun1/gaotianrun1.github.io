import type { Route } from '../route'

// Where each object stands on the set, and the camera shot for each page.
// Units are metres; object positions are where they touch the desk or floor.
// The back wall of the cove is the projector's screen.
//
// Seen from the landing the set reads left to right: projector, typewriter,
// notebook and corkboard. Every shot keeps that order (the camera never
// crosses to the back of the desk), so a page's object stays on its side.

export const SET = {
  wallZ: -3.6,
  deskTop: 0.76,
  // the desk is staged as three groups, staggered in depth rather than in a
  // row: plant, projector and mug at the left; the typewriter in the middle;
  // the pinboard propped at the back and the open notebook at the right, lit
  // by a low lamp in the back corner
  projector: [-0.48, 0.76, -0.08] as const,
  mug: [-0.17, 0.76, 0.38] as const,
  plant: [-0.74, 0.76, -0.28] as const,
  typewriter: [0.05, 0.76, 0.1] as const,
  corkboard: [0.62, 0.76, -0.14] as const,
  deskLamp: [0.98, 0.76, 0.0] as const,
  lampHead: [0.98, 1.05, 0.0] as const,
  notebook: [0.74, 0.76, 0.28] as const,
  chair: [1.0, 0, 1.0] as const,
  // the slide is thrown over the middle of the desk
  screen: [0.15, 2.05, -3.57] as const,
}

type Frame = {
  position: [number, number, number]
  target: [number, number, number]
  // vertical field of view, degrees: about 35mm for the whole set, a longer
  // lens for the objects so they keep their proportions up close
  fov: number
  // metres across, at the target, that must stay in frame however narrow the screen
  fit?: number
  // where the target sits, as a fraction of the screen height from the top:
  // the lens shifts rather than the camera tilting, so a wall stays square
  top?: number
}

// A portrait phone sees about a third of a desktop's width, so it gets its own
// framing rather than a crop of the desktop one.
export type Shot = Frame & { phone: Frame }

export const SHOTS: Record<Route, Shot> = {
  landing: {
    // square on to the slide: the slide and the desk share the vertical
    // centre line, the chair turned off to the right so the middle stays open
    position: [0.15, 1.55, 3.5],
    target: [0.15, 1.12, -2],
    fov: 34,
    fit: 3.6,
    // a phone stands further back with a longer lens, looking level, so the
    // slide grows against the desk; the lens shift puts the slide above the
    // whole set, chair and all (the slide's lines also grow there, Projection.tsx)
    phone: { position: [0.15, 1.5, 4.6], target: [0.15, 1.5, 0], fov: 40, fit: 2.65, top: 0.4 },
  },
  projects: {
    // square on to the slide, at its height, with a long lens: the frame fills
    // most of the picture, with wall around it for the trays above and the
    // slide controls below, and the top of the beam under it
    position: [0.15, 2.05, 0.4],
    target: [0.15, 2.05, -3.6],
    fov: 25,
    // a phone looks level at the frame, with the lens shifted so the frame
    // sits square at the top, under the nav; the desk falls below it, under
    // the sheet that scrolls up over the wall
    phone: { position: [0.15, 2.05, 2.5], target: [0.15, 2.05, -3.57], fov: 52, fit: 2.2, top: 0.22 },
  },
  experience: {
    position: [0.05, 1.58, 1.14],
    target: [0.05, 0.98, -0.1],
    fov: 19,
    // close enough that the sheet is as wide as the reading column (100vw - 32px)
    phone: { position: [0.05, 1.32, 0.6], target: [0.05, 0.98, -0.1], fov: 53 },
  },
  about: {
    // sitting at the right end of the desk: pinboard, notebook and the lamp's
    // shade as one still life on the left; the typewriter, the lamp's base and
    // the plant out of frame; the page on the wall at the right
    position: [0.9, 1.3, 1.6],
    target: [0.95, 0.95, 0],
    fov: 26,
    // the phone's sheet covers the lower half, so the set sits high and centred
    phone: { position: [0.73, 1.3, 1.45], target: [0.68, 0.42, -0.1], fov: 50, fit: 0.95 },
  },
}

// Where a first visit to the landing opens, before the click: high and to the
// front left, the whole set small in the middle of the cove, the projector
// still dark (after henryheffernan.com's opening).
const INTRO_FRAME: Frame = { position: [-3.3, 3.6, 5.9], target: [0.2, 0.55, 0.2], fov: 38 }
export const INTRO: Shot = { ...INTRO_FRAME, phone: { ...INTRO_FRAME, target: [0.5, 0.62, 0.1], fov: 62, fit: 4.2 } }

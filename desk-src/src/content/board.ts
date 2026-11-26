// Figures pinned on the About corkboard: two rows of three. `src` is the
// square print on the board (512×512), `full` the whole figure the About
// page opens on click. A short caption is written under it.

import { asset } from '../base'

export type Photo = { src?: string; full?: string; caption?: string }

const captions = ['EqCollide · KDD 2026', 'RealBench · ICLR 2026', 'BuildArena · ICML 2026', 'HybridOM · ICML 2026', 'Multiphysics Post-Training', 'Occam’s Harness']

export const photos: Photo[] = captions.map((caption, i) => ({
  src: asset(`/board/photo-${i + 1}.jpg`),
  full: asset(`/board/full/photo-${i + 1}.jpg`),
  caption,
}))

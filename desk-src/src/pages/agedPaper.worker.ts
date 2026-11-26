import { agedPaper } from '../scene/look'

// The Experience sheet's aged paper takes a few hundred ms per pixel; drawn
// here, the camera's walk to the typewriter does not stall on it.
onmessage = async ({ data: { w, h } }: MessageEvent<{ w: number; h: number }>) => {
  const canvas = new OffscreenCanvas(w, h)
  agedPaper(canvas.getContext('2d')!, w, h)
  postMessage(await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 }))
}

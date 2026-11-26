import { CanvasTexture, SRGBColorSpace } from 'three'

// One palette for the set: warm whites and beige plastics, graphite, and a
// single orange (the typewriter) as the accent.
export const C = {
  cove: '#bab3a8',
  shell: '#ebe6dc',
  shellDark: '#d9d2c4',
  graphite: '#3b3a37',
  key: '#2c2a27',
  rubber: '#1d1c1a',
  orange: '#d4612f',
  chrome: '#cfcfca',
  cork: '#b58d60',
  paper: '#fbf9f4',
  desk: '#f4f1eb',
}

// Small canvas-drawn textures, so the set needs no image files yet.
export function paintTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  paint(canvas.getContext('2d')!)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Deterministic noise so textures look the same on every load.
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

// Grey dashes in rows: typed or written text seen from a distance.
export function scribble(g: CanvasRenderingContext2D, x: number, y: number, w: number, rows: number, lh: number, color: string, seed: number, mono = true) {
  const r = rng(seed)
  g.fillStyle = color
  for (let row = 0; row < rows; row++) {
    let cx = x
    const end = x + w * (row === rows - 1 ? 0.3 + r() * 0.4 : 0.8 + r() * 0.2)
    while (cx < end) {
      const word = (mono ? 3 : 2) + Math.floor(r() * 7)
      const ww = word * (mono ? lh * 0.32 : lh * 0.28)
      g.fillRect(cx, y + row * lh, Math.min(ww, end - cx), lh * 0.32)
      cx += ww + lh * 0.3
    }
  }
}

// Teak veneer: long grain lines with a little waviness and figure, drawn
// along the texture's width.
export function woodTexture(w = 1024, h = 512, base = '#b47c50', seed = 5) {
  const r = rng(seed)
  return paintTexture(w, h, (g) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    // broad bands of lighter and darker wood, then fine grain on top
    for (let i = 0; i < 40; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(70,38,16,${0.04 + r() * 0.06})` : `rgba(230,170,110,${0.03 + r() * 0.05})`
      g.fillRect(0, r() * h, w, 4 + r() * 30)
    }
    for (let i = 0; i < 220; i++) {
      const y0 = r() * h
      const amp = 1 + r() * 4
      const freq = 0.001 + r() * 0.004
      const phase = r() * 10
      g.strokeStyle = r() < 0.65 ? `rgba(60,32,14,${0.03 + r() * 0.09})` : `rgba(215,155,100,${0.03 + r() * 0.06})`
      g.lineWidth = 0.5 + r() * 1.4
      g.beginPath()
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase * 2) * amp * 0.3
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y)
      }
      g.stroke()
    }
    // pores
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = `rgba(40,20,8,${0.03 + r() * 0.06})`
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 1)
    }
  })
}

// Smooth 2D value noise in [0, 1], one lattice per seed.
function valueNoise(seed: number) {
  const r = rng(seed)
  const vals = Float32Array.from({ length: 256 }, r)
  const perm = new Uint8Array(512)
  for (let i = 0; i < 256; i++) perm[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]
  const at = (i: number, j: number) => vals[perm[(i & 255) + perm[j & 255]]]
  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = x - xi
    const fy = y - yi
    const u = fx * fx * (3 - 2 * fx)
    const v = fy * fy * (3 - 2 * fy)
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u
    return a + (b - a) * v
  }
}

// Typing paper that has sat in a drawer, drawn per pixel: cream with a fibre
// tooth and a faint unevenness lit from the left like the set, the soft
// creases of a sheet once folded in three, a little yellowing in patches and
// at the edges. Features are sized for a sheet ~600 px wide.
export function agedPaper(g: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number, seed = 7) {
  const n1 = valueNoise(seed)
  const n2 = valueNoise(seed + 1)
  const s = w / 600
  const pitch = (w * Math.SQRT2) / 3
  const folds = [pitch, 2 * pitch].filter((y) => y < h - 4)
  // each crease wanders a little across the sheet
  const wobble = folds.map((f) => Float32Array.from({ length: w }, (_, x) => f - (n2(x / (60 * s), f) - 0.5) * 3 * s))

  // relief, and how much each pixel has yellowed
  const H = new Float32Array(w * h)
  const Y = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hgt =
        n1(x / (1.4 * s), y / (1.4 * s)) * 0.07 + // tooth
        n2(x / (9 * s), y / (2.5 * s)) * 0.09 + // fibres, laid along the sheet
        n1(x / (110 * s) + 40, y / (110 * s) + 40) * 2.5 + // unevenness
        n2(x / (38 * s) + 70, y / (38 * s) + 70) * 0.6
      let yel = 0.05 + 0.18 * n1(x / (170 * s) + 9, y / (170 * s) + 9) ** 2
      for (const fy of wobble) {
        const dy = Math.abs(y - fy[x])
        if (dy > 120 * s) continue
        hgt += 1.8 * Math.exp(-dy / (18 * s)) + 0.5 * Math.exp(-dy / (1.6 * s))
        yel += 0.06 * Math.exp(-dy / (4 * s))
      }
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y)
      if (edge < 120 * s) yel += 0.3 * Math.exp(-edge / (18 * s)) * (0.55 + 0.45 * n2(x / (22 * s) + 5, y / (22 * s) + 5))
      H[y * w + x] = hgt
      Y[y * w + x] = Math.min(1, yel)
    }
  }

  // light from the upper left
  const L = [-0.5, -0.4, 0.77]
  const img = g.createImageData(w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const gx = (H[y * w + Math.min(w - 1, x + 1)] - H[y * w + Math.max(0, x - 1)]) / 2
      const gy = (H[Math.min(h - 1, y + 1) * w + x] - H[Math.max(0, y - 1) * w + x]) / 2
      const len = Math.hypot(gx, gy, 1)
      const lit = (-gx * L[0] - gy * L[1] + L[2]) / len / L[2]
      const k = 1 + (lit - 1) * 0.7
      const t = Y[i] * 0.6
      d[i * 4] = (246 - t * 26) * k
      d[i * 4 + 1] = (240 - t * 42) * k
      d[i * 4 + 2] = (226 - t * 74) * k
      d[i * 4 + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)

}

// The site is served under a sub-path (vite.config.ts `base`, e.g. /desk/).
// Routes and content keep writing root paths like '/projects' or
// '/board/x.jpg'; these helpers add the sub-path for the browser and strip
// it again when reading the address bar.

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function withBase(path: string) {
  return path.startsWith('/') && !path.startsWith('//') ? BASE + path : path
}

export function stripBase(path: string) {
  if (!BASE || !path.startsWith(BASE)) return path
  return path.slice(BASE.length) || '/'
}

// a file in public/, e.g. asset('/board/photo-1.jpg')
export const asset = withBase

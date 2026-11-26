import { useEffect, useState } from 'react'
import type { Text } from './lang'
import { stripBase, withBase } from './base'

// The four pages are four camera shots of one scene, so routing is just
// "which shot", kept in the URL so every page can be linked to.
export type Route = 'landing' | 'projects' | 'experience' | 'about'

const PATHS: Record<Route, string> = {
  landing: '/',
  projects: '/projects',
  experience: '/experience',
  about: '/about',
}

// what the nav and the tags on the set call each page
export const LABELS: Record<Exclude<Route, 'landing'>, Text> = {
  projects: { en: 'Projects', zh: '项目' },
  experience: { en: 'Experience', zh: '经历' },
  about: { en: 'About', zh: '关于我' },
}

// /projects/<id> is the projects shot, opened on that project's tray
function fromPath(path: string): Route {
  const clean = '/' + (path.split('/')[1] ?? '')
  return (Object.keys(PATHS) as Route[]).find((r) => PATHS[r] === clean) ?? 'landing'
}

export function pathOf(route: Route) {
  return withBase(PATHS[route])
}

// An in-page link to another shot: push the path and let useRoute pick it up.
export function follow(e: { preventDefault(): void }, path: string) {
  e.preventDefault()
  history.pushState(null, '', withBase(path))
  dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute() {
  const [path, setPath] = useState(stripBase(location.pathname))
  const route = fromPath(path)

  useEffect(() => {
    const onPop = () => setPath(stripBase(location.pathname))
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const go = (next: Route) => {
    if (next === route) return
    history.pushState(null, '', withBase(PATHS[next]))
    setPath(PATHS[next])
  }

  return [route, go, path] as const
}

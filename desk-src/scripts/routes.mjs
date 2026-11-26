// GitHub Pages has no single-page-app fallback, so after `vite build` every
// route gets its own copy of index.html: /desk/projects/, /desk/experience/,
// /desk/about/ and /desk/projects/<id>/ for each project in src/content.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'

const ids = [...readFileSync('src/content/projects.ts', 'utf8').matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1])
const routes = ['projects', 'experience', 'about', ...ids.map((id) => `projects/${id}`)]
for (const r of routes) {
  mkdirSync(`dist/${r}`, { recursive: true })
  copyFileSync('dist/index.html', `dist/${r}/index.html`)
}
console.log(`route copies: ${routes.join(', ')}`)

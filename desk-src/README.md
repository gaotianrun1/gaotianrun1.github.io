# desk

The 3D desk at <https://gaotianrun1.github.io/desk/>, built from
[hitianqi/desk-portfolio](https://github.com/hitianqi/desk-portfolio) (MIT, see
`LICENSE` and `NOTICE.md`). The academic site is the Jekyll project one level up;
this folder is excluded from Jekyll and built separately.

- Content: `src/content/` (`site.ts`, `projects.ts`, `experience.ts`, `notes.ts`, `board.ts`);
  pictures in `public/projects/`, `public/board/`, `public/about/`.
- Served under `/desk/`: `vite.config.ts` sets `base`, and `src/base.ts` adds the
  prefix to routes and asset paths.
- `npm run build` writes `dist/` and copies `index.html` into every route folder
  (`scripts/routes.mjs`), since GitHub Pages has no single-page-app fallback.
- Deploy: `.github/workflows/deploy.yml` builds this after Jekyll and copies
  `dist/` to `_site/desk/`.

Local preview: `npm install && npm run dev`, then open the printed URL plus `/desk/`.

# Tianrun Gao — Personal Page

Source of [gaotianrun1.github.io](https://gaotianrun1.github.io). Next.js app in
`magic-portfolio/`, based on the Magic Portfolio template (once-ui).

## Deploy

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`): every push to
`master` runs `npm ci` + `DEPLOY_TARGET=github-pages npx next build` (static
export, no base path — user site) and publishes `magic-portfolio/out/`.
Repo Settings → Pages → Source must be "GitHub Actions".

## Local development

```bash
cd magic-portfolio
npm ci
npm run dev        # http://localhost:3000
```

Static export, same as CI:

```bash
cd magic-portfolio
DEPLOY_TARGET=github-pages npx next build    # output in magic-portfolio/out/
```

## Content editing

- Person info, education, experience, publications:
  `magic-portfolio/src/resources/content.tsx`
- Project pages: `magic-portfolio/src/app/work/projects/*.mdx`
- CV: replace `magic-portfolio/public/files/CV of Tianrun Gao.pdf` and the page
  images under `magic-portfolio/public/images/cv/` (`page-1.png` … `page-3.png`,
  1191×1684); page count is listed in `src/app/cv/page.tsx` (`pages` array).

# Tianrun Gao — Personal Page

Source of [gaotianrun1.github.io](https://gaotianrun1.github.io). Jekyll site based
on the [al-folio](https://github.com/alshedivat/al-folio) template (v1.x, MIT).

## Content

| What | Where |
| --- | --- |
| Site settings, name, scholar settings | `_config.yml` |
| About page | `_pages/about.md` |
| News on the About page | `_news/*.md` (one file per item) |
| Experience page | `_pages/experience.md` |
| Publications | `_bibliography/papers.bib` (`selected={true}` puts it on the About page) |
| Venue badge colors | `_data/venues.yml` |
| Co-author links | `_data/coauthors.yml` |
| Social icons | `_data/socials.yml` |
| CV | `assets/pdf/Tianrun_Gao_CV.pdf` (shown on `_pages/cv.md`) |

Word sources of the CV live in `cv/`, which is gitignored.

## Local preview

The local Ruby is too old for al-folio, so use Docker:

```bash
docker compose up        # http://localhost:8080
```

## Deploy

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`): every push to
`master` runs `bundle exec jekyll build` and publishes `_site/`.
Repo Settings → Pages → Source must be "GitHub Actions".

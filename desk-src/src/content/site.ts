// The landing's title slide, and the contact links that close the About page.
// The caption and the place follow the reader's language (src/lang.ts).

import type { Text } from '../lang'

export const site: { name: string; caption: Text; place: Text; email: string; links: { label: string; href: string }[] } = {
  name: 'Tianrun Gao',
  caption: { en: 'PhD Student · HKU', zh: '香港大学 博士生' },
  place: { en: 'Hong Kong · 2026', zh: '香港 · 2026' },
  email: 'gaotianrun@connect.hku.hk',
  links: [
    { label: 'Academic homepage', href: 'https://gaotianrun1.github.io/' },
    { label: 'Google Scholar', href: 'https://scholar.google.com/citations?user=pkez5wUAAAAJ' },
    { label: 'GitHub', href: 'https://github.com/gaotianrun1' },
    { label: 'X', href: 'https://x.com/gao_tianrun' },
  ],
}

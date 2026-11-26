import { useSyncExternalStore } from 'react'

// The reading pages come in English and Chinese. A piece of content is either
// one string, the same in both (names, terms, numbers), or a pair. The choice
// lasts for the visit; every visit starts in English.

export type Lang = 'en' | 'zh'
export type Text = string | { en: string; zh: string }

let lang: Lang = 'en'
const listeners = new Set<() => void>()
document.documentElement.lang = lang

export function setLang(next: Lang) {
  lang = next
  document.documentElement.lang = next
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

export function useLang() {
  return useSyncExternalStore(subscribe, () => lang)
}

export function t(text: Text, l: Lang) {
  return typeof text === 'string' ? text : text[l]
}

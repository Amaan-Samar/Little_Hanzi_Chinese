// Encoding helpers for QR article shares, scanned codes, and JSON bundles.
import LZString from 'lz-string'
import { splitParagraphs } from './textProcessing'

export const SHARE_APP_ID = 'little-hanzi-chinese'
export const SHARE_VERSION = 1
export const SHARE_HASH_PREFIX = '#share='

// A QR code can hold roughly 2.9 kB in byte mode at the lowest error
// correction. Keep a margin so phones can still resolve it comfortably.
export const MAX_QR_CHARS = 2400

const cleanString = (value) => (typeof value === 'string' ? value : '')

const normalizeLikes = (value) => {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0),
    ),
  ].sort((a, b) => a - b)
}

// Existing builds stored the Chinese body under a few different names while
// the app was being ported. Read all of them so old articles still share.
const chineseContentOf = (article) =>
  cleanString(
    article?.chineseContent ?? article?.content ?? article?.koreanContent,
  )

/**
 * Stable signature for the Chinese text. It lets a separate "English only"
 * QR find the article created by an earlier "Chinese only" QR.
 */
export const contentSignature = (value) => {
  const text = cleanString(value).replace(/\s+/g, ' ').trim()
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Small, QR-friendly payload. Short keys keep the URL inside QR limits.
 *
 * part = 'full' shares Chinese + English in one code. When that is too big for
 * a QR, 'cn' and 'en' send the two halves separately; the English half carries
 * a signature of the Chinese text so the receiver can merge it into the right
 * article.
 */
export const buildSharePayload = (article, sharedBy, part = 'full') => {
  if (!article) return null

  const chineseContent = chineseContentOf(article)
  const englishContent = cleanString(article.englishContent)
  const by = sharedBy || article.sharedBy || 'A friend'
  const title =
    article.title || chineseContent.slice(0, 60) || 'Shared article'
  const hash = contentSignature(chineseContent)

  if (part === 'en') {
    if (!englishContent.trim()) return null
    return {
      v: SHARE_VERSION,
      t: 'article',
      p: 'en',
      ti: title,
      en: englishContent,
      h: hash,
      by,
      at: Date.now(),
    }
  }

  if (!chineseContent.trim()) return null

  const payload = {
    v: SHARE_VERSION,
    t: 'article',
    id: article.id || undefined,
    ti: title,
    cn: chineseContent,
    lk: normalizeLikes(article.likedParagraphs),
    h: hash,
    by,
    at: Date.now(),
  }

  if (part === 'cn') return { ...payload, p: 'cn', en: '' }
  return { ...payload, en: englishContent }
}

export const encodeSharePayload = (payload) => {
  if (!payload) return ''
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export const decodeSharePayload = (encoded) => {
  if (!encoded) return null
  const attempts = [encoded]
  try {
    attempts.push(decodeURIComponent(encoded))
  } catch {
    // The raw value was already decoded.
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(
        LZString.decompressFromEncodedURIComponent(candidate),
      )
      if (!parsed || typeof parsed !== 'object') continue
      if (parsed.t !== 'article') continue

      const part =
        parsed.p === 'cn' || parsed.p === 'en' ? parsed.p : 'full'
      const chineseContent = cleanString(parsed.cn)
      const englishContent = cleanString(parsed.en)

      if (part === 'en' ? !englishContent.trim() : !chineseContent.trim()) {
        continue
      }

      return {
        id: parsed.id || undefined,
        title:
          cleanString(parsed.ti) ||
          chineseContent.slice(0, 60) ||
          'Shared article',
        chineseContent,
        englishContent,
        part,
        contentHash:
          cleanString(parsed.h) || contentSignature(chineseContent),
        likedParagraphs: normalizeLikes(parsed.lk),
        sharedBy: cleanString(parsed.by) || 'A friend',
        sharedAt: Number(parsed.at) || Date.now(),
        timestamp: Number(parsed.at) || Date.now(),
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null
}

const basePath = () => {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

export const buildShareUrl = (payload) => {
  const encoded = encodeSharePayload(payload)
  if (!encoded) return { url: '', encoded: '', tooLarge: false }
  const url = `${window.location.origin}${basePath()}${SHARE_HASH_PREFIX}${encoded}`
  return { url, encoded, tooLarge: encoded.length > MAX_QR_CHARS }
}

export const parseShareHash = (hash) => {
  if (!hash) return null
  const value = hash.startsWith('#') ? hash.slice(1) : hash
  if (!value.startsWith('share=')) return null
  return decodeSharePayload(value.slice('share='.length))
}

export const makeShareBundle = (articles, sharedBy) => ({
  app: SHARE_APP_ID,
  version: SHARE_VERSION,
  kind: 'share',
  sharedBy: sharedBy || 'A friend',
  exportedAt: Date.now(),
  articles: (articles || []).map((article) => ({
    id: article.id,
    title: article.title,
    chineseContent: chineseContentOf(article),
    englishContent: article.englishContent || '',
    likedParagraphs: normalizeLikes(article.likedParagraphs),
    sharedBy: article.sharedBy || null,
    sharedAt: article.sharedAt || null,
    timestamp: article.timestamp || Date.now(),
  })),
})

const cleanProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return null
  const field = (key, max) =>
    typeof profile[key] === 'string' ? profile[key].slice(0, max) : ''
  return {
    name: field('name', 40),
    email: field('email', 120),
    phone: field('phone', 40),
    occupation: field('occupation', 80),
    country: field('country', 60),
    city: field('city', 60),
    address: field('address', 240),
    bio: field('bio', 600),
    photo:
      typeof profile.photo === 'string' &&
      profile.photo.startsWith('data:image/') &&
      profile.photo.length <= 400000
        ? profile.photo
        : '',
  }
}

export const makeBackupBundle = (articles, profile = null) => ({
  app: SHARE_APP_ID,
  version: SHARE_VERSION,
  kind: 'backup',
  exportedAt: Date.now(),
  ...(cleanProfile(profile) ? { profile: cleanProfile(profile) } : {}),
  articles: (articles || []).map((article) => ({
    id: article.id,
    title: article.title,
    chineseContent: chineseContentOf(article),
    englishContent: article.englishContent || '',
    bookmark:
      article.bookmark === null || article.bookmark === undefined
        ? null
        : Number(article.bookmark),
    likedParagraphs: normalizeLikes(article.likedParagraphs),
    read: Boolean(article.read),
    archived: Boolean(article.archived),
    sharedBy: article.sharedBy || null,
    sharedAt: article.sharedAt || null,
    timestamp: article.timestamp || Date.now(),
  })),
})

export const parseBundle = (text) => {
  let parsed
  try {
    parsed = typeof text === 'string' ? JSON.parse(text) : text
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'The bundle is empty or malformed.' }
  }
  if (!Array.isArray(parsed.articles)) {
    return { ok: false, error: 'The bundle does not contain an articles list.' }
  }
  if (parsed.app && parsed.app !== SHARE_APP_ID) {
    return {
      ok: false,
      error: 'This bundle belongs to a different Little Hanzi app.',
    }
  }
  return {
    ok: true,
    bundle: {
      kind: parsed.kind === 'share' ? 'share' : 'backup',
      sharedBy: cleanString(parsed.sharedBy) || 'A friend',
      exportedAt: Number(parsed.exportedAt) || Date.now(),
      profile: cleanProfile(parsed.profile),
      articles: parsed.articles,
    },
  }
}

/**
 * Accept anything a QR scanner might return: a full app URL with a share
 * payload, a bare `share=...` value, or a JSON bundle.
 */
export const parseScannedValue = (value) => {
  const text = cleanString(value).trim()
  if (!text) return { kind: 'none' }

  if (text.startsWith('{')) {
    const parsed = parseBundle(text)
    return parsed.ok
      ? { kind: 'bundle', bundle: parsed.bundle }
      : { kind: 'invalid', error: parsed.error }
  }

  try {
    const url = new URL(text)
    const shared = parseShareHash(url.hash)
    if (shared) return { kind: 'share', share: shared }
  } catch {
    // Not a URL; try the remaining formats below.
  }

  if (text.startsWith('share=') || text.startsWith('#share=')) {
    const shared = parseShareHash(text)
    if (shared) return { kind: 'share', share: shared }
  }

  const direct = decodeSharePayload(text)
  if (direct) return { kind: 'share', share: direct }

  return {
    kind: 'invalid',
    error: 'That code is not a Little Hanzi article.',
  }
}

export const articlePreview = (article, maxLength = 84) => {
  const paragraphs = splitParagraphs(chineseContentOf(article))
  const first = paragraphs[0] || ''
  return first.length > maxLength ? `${first.slice(0, maxLength)}...` : first
}

export const slugify = (value, fallback = 'article') => {
  const slug = cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || fallback
}

export const downloadJson = (
  data,
  filename,
  type = 'application/json',
) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type,
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

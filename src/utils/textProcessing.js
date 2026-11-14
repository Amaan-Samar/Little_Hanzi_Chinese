// Small text helpers shared by the Chinese reader.
//
// Paragraphs are separated by a blank line. Keep this in sync with the
// paragraph splitting used by FontConverter so bookmark indexes line up.

/**
 * Normalize line endings and collapse long runs of blank lines.
 * @param {string} text
 * @returns {string}
 */
export function normalizeParagraphBreaks(text) {
  return (text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/(?:\n[ \t]*){3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
}

/**
 * Split a text into non-empty paragraphs.
 * @param {string} text
 * @returns {string[]}
 */
export function splitParagraphs(text) {
  if (!text || !text.trim()) return []
  return normalizeParagraphBreaks(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/**
 * Count paragraphs in a text.
 * @param {string} text
 * @returns {number}
 */
export function countParagraphs(text) {
  return splitParagraphs(text).length
}

/**
 * Return the character range of every paragraph in a textarea value.
 * Useful for scrolling/focusing the paragraph the reader tapped.
 *
 * @param {string} text
 * @returns {{ start: number, end: number, text: string }[]}
 */
export function getParagraphRanges(text) {
  const normalized = (text || '').replace(/\r\n?/g, '\n')
  if (!normalized) return []

  const parts = normalized.split(/(\n\s*\n)/)
  const ranges = []
  let offset = 0

  for (const part of parts) {
    if (/^\n\s*\n$/.test(part)) {
      offset += part.length
      continue
    }

    const leading = part.length - part.trimStart().length
    const trailing = part.length - part.trimEnd().length
    const content = part.trim()

    if (content) {
      ranges.push({
        start: offset + leading,
        end: offset + part.length - trailing,
        text: content,
      })
    }

    offset += part.length
  }

  return ranges
}

// utils/clipboard.js
// Copying text is not equally reliable across browsers, so keep one helper
// that tries the async Clipboard API first and falls back to the old
// textarea + execCommand path.

export const copyText = async (text) => {
  const value = typeof text === 'string' ? text : String(text ?? '')
  if (!value) return false

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Permission denied or not a secure context: try the fallback.
    }
  }

  if (typeof document === 'undefined') return false

  try {
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.left = '-9999px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.focus({ preventScroll: true })
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}

export const isFirefox = () => {
  if (typeof navigator === 'undefined') return false
  return /firefox|fxios/i.test(navigator.userAgent)
}

export const appUrl = () => {
  if (typeof window === 'undefined') return ''
  const base = import.meta.env.BASE_URL || '/'
  return new URL(base, window.location.origin).href
}

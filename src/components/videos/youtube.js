let ytApiPromise = null

export function extractYouTubeVideoId(url) {
  const raw = String(url || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    // https://youtu.be/<id>
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '').trim()
      return id || null
    }
    // https://www.youtube.com/watch?v=<id>
    const v = u.searchParams.get('v')
    if (v) return v
    // https://www.youtube.com/embed/<id>
    const parts = u.pathname.split('/').filter(Boolean)
    const embedIdx = parts.indexOf('embed')
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1]
    // https://www.youtube.com/shorts/<id>
    const shortsIdx = parts.indexOf('shorts')
    if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1]
    return null
  } catch (_) {
    // If it's already an ID, accept safe-ish pattern
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(raw)) return raw
    return null
  }
}

export function loadYouTubeIFrameApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!existing) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => reject(new Error('Failed to load YouTube API'))
      document.head.appendChild(tag)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try { if (typeof prev === 'function') prev() } catch (_) {}
      resolve(window.YT)
    }
    // Safety timeout
    setTimeout(() => {
      if (window.YT && window.YT.Player) resolve(window.YT)
    }, 8000)
  })

  return ytApiPromise
}


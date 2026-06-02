import { useEffect, useMemo, useRef, useState } from 'react'
import { extractYouTubeVideoId, loadYouTubeIFrameApi } from './youtube'

export default function VideoDetail({
  T,
  video,
  leadId,
  onBack,
  trackEvent,
  submitQuestion,
}) {
  const ytId = useMemo(() => extractYouTubeVideoId(video?.youtube_url), [video?.youtube_url])
  const playerElRef = useRef(null)
  const playerRef = useRef(null)
  const playedRef = useRef(false)

  const storageKeyPlayed = `vollhub_video_${video?.id}_played`
  const storageKey50 = `vollhub_video_${video?.id}_mark50`
  const [hasPlayed, setHasPlayed] = useState(() => {
    try { return localStorage.getItem(storageKeyPlayed) === '1' } catch (_) { return false }
  })
  const [marked50, setMarked50] = useState(() => {
    try { return localStorage.getItem(storageKey50) === '1' } catch (_) { return false }
  })

  const [qText, setQText] = useState('')
  const [allowWhatsApp, setAllowWhatsApp] = useState(true)
  const [sendingQ, setSendingQ] = useState(false)

  const [loadingPlayer, setLoadingPlayer] = useState(true)
  const [playerError, setPlayerError] = useState('')

  const firePlayOnce = async () => {
    if (playedRef.current) return
    playedRef.current = true
    setHasPlayed(true)
    try { localStorage.setItem(storageKeyPlayed, '1') } catch (_) {}
    if (leadId && video?.id) await trackEvent({ leadId, videoId: video.id, eventType: 'play' })
  }

  useEffect(() => {
    let cancelled = false
    const mount = async () => {
      setPlayerError('')
      setLoadingPlayer(true)
      if (!ytId || !playerElRef.current) {
        setLoadingPlayer(false)
        setPlayerError('Vídeo inválido.')
        return
      }
      try {
        const YT = await loadYouTubeIFrameApi()
        if (cancelled) return
        if (playerRef.current?.destroy) playerRef.current.destroy()
        playerRef.current = new YT.Player(playerElRef.current, {
          videoId: ytId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => { if (!cancelled) setLoadingPlayer(false) },
            onStateChange: (e) => {
              // 1 = playing
              if (e?.data === 1) firePlayOnce()
            },
            onError: () => {
              if (!cancelled) {
                setPlayerError('Não foi possível carregar o player.')
                setLoadingPlayer(false)
              }
            },
          },
        })
      } catch (e) {
        if (!cancelled) {
          setPlayerError('Não foi possível carregar o player.')
          setLoadingPlayer(false)
        }
      }
    }
    mount()
    return () => {
      cancelled = true
      try { playerRef.current?.destroy?.() } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId, video?.id])

  const materials = Array.isArray(video?.materials) ? video.materials : []
  const cta = video?.cta && typeof video.cta === 'object' ? video.cta : {}

  const mark50 = async () => {
    if (!hasPlayed || marked50) return
    setMarked50(true)
    try { localStorage.setItem(storageKey50, '1') } catch (_) {}
    if (leadId && video?.id) await trackEvent({ leadId, videoId: video.id, eventType: 'mark_50' })
  }

  const sendQuestion = async () => {
    if (!leadId) return
    const text = String(qText || '').trim()
    if (text.length < 8) return
    setSendingQ(true)
    try {
      const ok = await submitQuestion({
        leadId,
        videoId: video.id,
        question: text,
        context: { allowWhatsApp: !!allowWhatsApp },
      })
      if (ok) {
        setQText('')
      }
    } finally {
      setSendingQ(false)
    }
  }

  const card = { background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 16 }
  const btnPrimary = { padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg, #349980, #7DE2C7)', color: '#060a09', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans'" }
  const btnSoft = { padding: '10px 14px', borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}`, color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans'" }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: T.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: "'Plus Jakarta Sans'" }}>
        ← Voltar
      </button>

      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: T.textFaint, textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>
          {String(video?.category || '').toUpperCase() || 'VÍDEO'}
        </p>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 8 }}>{video?.title}</h2>
        {!!video?.description && (
          <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans'" }}>{video.description}</p>
        )}
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: T.bg }}>
          <div ref={playerElRef} style={{ position: 'absolute', inset: 0 }} />
          {loadingPlayer && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textFaint, fontSize: 12, fontFamily: "'Plus Jakarta Sans'", background: T.bg }}>
              Carregando vídeo…
            </div>
          )}
          {!!playerError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dangerTxt || '#e8443a', fontSize: 12, fontFamily: "'Plus Jakarta Sans'", background: T.bg }}>
              {playerError}
            </div>
          )}
        </div>
      </div>

      <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={mark50} disabled={!hasPlayed || marked50} style={{ ...btnSoft, opacity: (!hasPlayed || marked50) ? 0.6 : 1, cursor: (!hasPlayed || marked50) ? 'not-allowed' : 'pointer' }}>
          {marked50 ? '✅ Marcado 50%+' : 'Marcar 50%+'}
        </button>
        <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>
          {hasPlayed ? 'Play detectado.' : 'Dê play para liberar o 50%+.'}
        </span>
      </div>

      {materials.length > 0 && (
        <div style={card}>
          <h3 style={{ fontSize: 13, fontWeight: 900, color: T.text, marginBottom: 10 }}>Materiais</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {materials.map((m, i) => (
              <a
                key={i}
                href={m?.url || '#'}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 12, background: T.statBg, border: `1px solid ${T.statBorder}` }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Plus Jakarta Sans'" }}>{m?.title || `Material ${i + 1}`}</span>
                <span style={{ fontSize: 12, color: T.accent, fontWeight: 800 }}>Baixar ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {(cta?.url || cta?.label) && (
        <div style={{ ...card, border: `2px solid ${T.gold}44`, background: (T.gold || '#c49500') + '11' }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: T.gold, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans'", marginBottom: 6 }}>Próximo passo</p>
          <p style={{ fontSize: 13, color: T.text, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5, marginBottom: 10 }}>
            {cta?.label || 'Quer ajuda para aplicar isso no seu estúdio?'}
          </p>
          {cta?.url && (
            <a href={cta.url} target="_blank" rel="noreferrer" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none' }}>
              {cta?.buttonText || 'Quero ajuda →'}
            </a>
          )}
        </div>
      )}

      <div style={card}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: T.text, marginBottom: 6 }}>Envie sua pergunta</h3>
        <p style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'", marginBottom: 10 }}>
          Use isso para eu entender suas dores e criar novos conteúdos/cursos.
        </p>
        <textarea
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Ex.: eu posto 3x/semana e não chega cliente… o que ajustar?"
          style={{ width: '100%', minHeight: 92, resize: 'vertical', padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 13, fontFamily: "'Plus Jakarta Sans'", lineHeight: 1.5, boxSizing: 'border-box' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: T.textMuted, fontFamily: "'Plus Jakarta Sans'" }}>
          <input type="checkbox" checked={allowWhatsApp} onChange={(e) => setAllowWhatsApp(e.target.checked)} />
          Pode me responder no WhatsApp
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
          <button type="button" onClick={sendQuestion} disabled={!leadId || sendingQ || String(qText || '').trim().length < 8} style={{ ...btnPrimary, opacity: (!leadId || sendingQ || String(qText || '').trim().length < 8) ? 0.6 : 1 }}>
            {sendingQ ? 'Enviando…' : 'Enviar pergunta'}
          </button>
          <span style={{ fontSize: 11, color: T.textFaint, fontFamily: "'Plus Jakarta Sans'" }}>
            {String(qText || '').trim().length < 8 ? 'Escreva pelo menos 8 caracteres.' : 'Obrigado!'}
          </span>
        </div>
      </div>
    </div>
  )
}


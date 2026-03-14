import { useState, useEffect, useCallback } from 'react'
import { THEMES } from '../constants'
import {
  getStoredToken,
  setStoredSession,
  getStoredEstudante,
  clearStoredSession,
  validateToken,
  createEstudante,
  requestMagicLink,
  requestMagicLinkWithEmail,
  getEstudanteById,
} from './estudanteApi'
import { computeResult } from './diagnosticoUtils'
import { downloadDiagnosticoCard } from './diagnosticoShareCard'

const T = THEMES.light
const BASE_URL = 'https://rafael.grupovoll.com.br'

function useQueryParam(name) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export default function EstudanteApp() {
  const [loading, setLoading] = useState(true)
  const [estudante, setEstudante] = useState(null)
  const [tab, setTab] = useState('documentos')
  const [estudanteWhatsApp, setEstudanteWhatsApp] = useState('')
  const tokenFromUrl = useQueryParam('token')

  useEffect(() => {
    if (estudante) {
      import('./estudanteApi').then(({ getConfig }) => {
        getConfig(['estudanteWhatsApp']).then((c) => setEstudanteWhatsApp(c.estudanteWhatsApp || ''))
      })
    }
  }, [estudante])

  const loadSession = useCallback(async () => {
    const t = getStoredToken()
    if (tokenFromUrl) {
      const user = await validateToken(tokenFromUrl)
      if (user) {
        setStoredSession(tokenFromUrl, user)
        setEstudante(user)
        window.history.replaceState({}, '', '/estudante')
      }
      setLoading(false)
      return
    }
    if (!t) {
      setLoading(false)
      return
    }
    const user = await validateToken(t)
    if (user) {
      setEstudante(user)
      setStoredSession(t, user)
    } else {
      clearStoredSession()
    }
    setLoading(false)
  }, [tokenFromUrl])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (!estudante) {
    return (
      <EstudanteLanding
        onLoggedIn={(e, t) => {
          setStoredSession(t, e)
          setEstudante(e)
        }}
      />
    )
  }

  const waNum = estudanteWhatsApp ? (() => { const d = (estudanteWhatsApp || '').replace(/\D/g, ''); return d.length === 11 ? '55' + d : d; })() : ''
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 80 }}>
      <header style={{ padding: '16px 20px', borderBottom: `1px solid ${T.cardBorder}`, background: T.cardBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: T.text }}>Área do Estudante</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: T.textMuted }}>{estudante.name}</span>
          {waNum && (
            <a
              href={`https://wa.me/${waNum}?text=${encodeURIComponent('Olá! Sou aluno da Área do Estudante e gostaria de falar com você.')}`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '6px 12px', borderRadius: 8, background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              💬 Fale comigo
            </a>
          )}
          <button
            type="button"
            onClick={() => { clearStoredSession(); setEstudante(null); }}
            style={{ padding: '6px 12px', borderRadius: 8, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </header>
      <nav style={{ display: 'flex', gap: 4, padding: '12px 20px', overflowX: 'auto', borderBottom: `1px solid ${T.cardBorder}`, background: T.tabBg }}>
        {[
          { id: 'documentos', label: 'Documentos', icon: '📄' },
          { id: 'links', label: 'Eventos e links', icon: '🔗' },
          { id: 'diagnostico', label: 'Diagnóstico de Carreira', icon: '🎯' },
          { id: 'historico', label: 'Meu histórico', icon: '📊' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: `1px solid ${tab === t.id ? T.statBorder : T.tabBorder}`,
              background: tab === t.id ? T.tabActiveBg : 'transparent',
              color: tab === t.id ? T.accent : T.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <main style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        {tab === 'documentos' && <EstudanteDocuments />}
        {tab === 'links' && <EstudanteLinks />}
        {tab === 'diagnostico' && <EstudanteDiagnostico estudanteId={estudante.id} onDone={() => setTab('historico')} />}
        {tab === 'historico' && <EstudanteHistorico estudanteId={estudante.id} />}
      </main>
    </div>
  )
}

function EstudanteLanding({ onLoggedIn }) {
  const [mode, setMode] = useState('cadastro')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailLogin, setEmailLogin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCadastro = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim()) {
      setError('Preencha nome e e-mail.')
      return
    }
    setSubmitting(true)
    const result = await createEstudante({ name: name.trim(), email: email.trim(), phone: phone.trim() })
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onLoggedIn(result.estudante, result.token)
  }

  const handleEntrar = async (e) => {
    e.preventDefault()
    setError('')
    if (!emailLogin.trim()) {
      setError('Informe seu e-mail.')
      return
    }
    setSubmitting(true)
    const result = await requestMagicLinkWithEmail(emailLogin.trim())
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.link) {
      window.location.href = result.link
      return
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400, background: T.cardBg, borderRadius: 16, padding: 28, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: 'center', color: T.text }}>Área do Estudante</h1>
        {mode === 'cadastro' ? (
          <form onSubmit={handleCadastro}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 14, marginBottom: 12 }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 14, marginBottom: 20 }}
            />
            {error && <p style={{ color: T.dangerTxt, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: 14, borderRadius: 12, background: `linear-gradient(135deg, ${T.accentDark}, ${T.accent})`, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Cadastrando...' : 'Fazer Cadastro'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEntrar}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>E-mail</label>
            <input
              type="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              placeholder="seu@email.com"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, fontSize: 14, marginBottom: 20 }}
            />
            {error && <p style={{ color: T.dangerTxt, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: 14, borderRadius: 12, background: T.dlBg, color: T.accent, fontSize: 15, fontWeight: 700, border: `1px solid ${T.spotBorder}`, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}
        <button type="button" onClick={() => { setMode(mode === 'cadastro' ? 'login' : 'cadastro'); setError(''); }} style={{ width: '100%', marginTop: 16, padding: 10, background: 'none', border: 'none', color: T.accent, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          {mode === 'cadastro' ? 'Já sou cadastrado' : 'Voltar ao cadastro'}
        </button>
      </div>
    </div>
  )
}

function EstudanteDocuments() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    setLoading(true)
    import('./estudanteApi').then(({ listDocuments }) => {
      listDocuments()
        .then(setDocs)
        .catch(() => setError('Não foi possível carregar os documentos. Tente novamente.'))
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <p style={{ color: T.textFaint }}>Carregando documentos...</p>
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: T.dangerTxt, fontSize: 14, marginBottom: 12 }}>{error}</p>
        <button type="button" onClick={load} style={{ padding: '10px 20px', borderRadius: 10, background: T.accent, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    )
  }
  if (docs.length === 0) return <p style={{ color: T.textFaint, textAlign: 'center' }}>Nenhum documento disponível no momento.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {docs.map((d) => (
        <div key={d.id} style={{ background: T.statBg, borderRadius: 12, padding: 16, border: `1px solid ${T.statBorder}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: T.text }}>{d.title}</h3>
          {d.description && <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 12 }}>{d.description}</p>}
          <a href={d.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: `linear-gradient(135deg, ${T.accentDark}, ${T.accent})`, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Baixar
          </a>
        </div>
      ))}
    </div>
  )
}

function EstudanteLinks() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    setLoading(true)
    import('./estudanteApi').then(({ listEstudanteLinks }) => {
      listEstudanteLinks()
        .then(setItems)
        .catch(() => setError('Não foi possível carregar os links. Tente novamente.'))
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <p style={{ color: T.textFaint }}>Carregando...</p>
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: T.dangerTxt, fontSize: 14, marginBottom: 12 }}>{error}</p>
        <button type="button" onClick={load} style={{ padding: '10px 20px', borderRadius: 10, background: T.accent, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    )
  }
  if (items.length === 0) return <p style={{ color: T.textFaint, textAlign: 'center' }}>Nenhum link disponível no momento.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((l) => (
        <div key={l.id} style={{ background: T.statBg, borderRadius: 12, padding: 16, border: `1px solid ${T.statBorder}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: T.text }}>{l.title}</h3>
          {l.description && <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 12 }}>{l.description}</p>}
          <a href={l.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: `linear-gradient(135deg, ${T.accentDark}, ${T.accent})`, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Acessar
          </a>
        </div>
      ))}
    </div>
  )
}

function EstudanteDiagnostico({ estudanteId, onDone }) {
  const [step, setStep] = useState('quiz')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const loadQuestions = useCallback(() => {
    setLoadError(null)
    setLoading(true)
    import('./estudanteApi').then(({ listDiagnosticoQuestions }) => {
      listDiagnosticoQuestions()
        .then((q) => { setQuestions(q); setLoadError(null) })
        .catch(() => setLoadError('Não foi possível carregar as perguntas. Tente novamente.'))
        .finally(() => setLoading(false))
    })
  }, [])

  useEffect(() => { loadQuestions() }, [loadQuestions])

  const handleAnswer = (questionId, optionIndex, points) => {
    const next = [...responses, { questionId, optionIndex, points }]
    setResponses(next)
    if (next.length >= questions.length) {
      const res = computeResult(questions, next)
      setResult(res)
      setStep('result')
      setSaveError(null)
      import('./estudanteApi').then(({ saveDiagnosticoResult }) => {
        setSaving(true)
        saveDiagnosticoResult(estudanteId, {
          responses: next,
          totalScore: res.totalScore,
          level: res.level,
          dimensionScores: res.dimensionScores,
          recommendations: res.recommendations,
        }).then(() => { setSaving(false); setSaveError(null) }).catch(() => { setSaving(false); setSaveError('Não foi possível salvar seu resultado.') })
      })
    } else {
      setTimeout(() => setCurrentIndex(next.length), 300)
    }
  }

  const retrySave = useCallback(() => {
    if (!result || !responses.length) return
    setSaveError(null)
    setSaving(true)
    import('./estudanteApi').then(({ saveDiagnosticoResult }) => {
      saveDiagnosticoResult(estudanteId, {
        responses,
        totalScore: result.totalScore,
        level: result.level,
        dimensionScores: result.dimensionScores,
        recommendations: result.recommendations,
      }).then(() => { setSaving(false); setSaveError(null) }).catch(() => { setSaving(false); setSaveError('Não foi possível salvar seu resultado.') })
    })
  }, [estudanteId, result, responses])

  if (loading) return <p style={{ color: T.textFaint }}>Carregando...</p>
  if (loadError) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: T.dangerTxt, fontSize: 14, marginBottom: 12 }}>{loadError}</p>
        <button type="button" onClick={loadQuestions} style={{ padding: '10px 20px', borderRadius: 10, background: T.accent, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    )
  }
  if (questions.length === 0) return <p style={{ color: T.textFaint }}>Perguntas não configuradas.</p>

  if (step === 'result' && result) {
    return (
      <EstudanteDiagnosticoResult
        result={result}
        saveError={saveError}
        onRetrySave={retrySave}
        saving={saving}
        onRefazer={() => { setStep('quiz'); setCurrentIndex(0); setResponses([]); setResult(null); setSaveError(null); }}
        onVerHistorico={onDone}
      />
    )
  }

  const q = questions[currentIndex]
  if (!q) return null
  const options = Array.isArray(q.options) ? q.options : []

  return (
    <div key={q.id} style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: T.textFaint }}>Pergunta {currentIndex + 1} de {questions.length}</span>
        <div style={{ height: 6, borderRadius: 3, background: T.progressTrack, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', background: T.accent, borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, lineHeight: 1.4, color: T.text }}>{q.question_text}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAnswer(q.id, i, opt.points != null ? opt.points : 0)}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${T.cardBorder}`,
              background: T.statBg,
              color: T.text,
              fontSize: 14,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )
}

function EstudanteDiagnosticoResult({ result, saveError, onRetrySave, saving, onRefazer, onVerHistorico }) {
  const [scoreAnimated, setScoreAnimated] = useState(0)
  const [config, setConfig] = useState({ diagnosticoCtaUrl: '', diagnosticoCtaText: 'Quero meu plano de ação' })

  useEffect(() => {
    import('./estudanteApi').then(({ getConfig }) => {
      getConfig(['diagnosticoCtaUrl', 'diagnosticoCtaText']).then((c) => setConfig((prev) => ({ ...prev, ...c })))
    })
  }, [])

  useEffect(() => {
    const duration = 2000
    const steps = 40
    const step = result.totalScore / steps
    let i = 0
    const t = setInterval(() => {
      i++
      setScoreAnimated(Math.min(Math.round(step * i), result.totalScore))
      if (i >= steps) clearInterval(t)
    }, duration / steps)
    return () => clearInterval(t)
  }, [result.totalScore])

  const dims = result.dimensionScores || {}
  const dimOrder = ['Presença Digital', 'Posicionamento', 'Networking', 'Comunicação', 'Mentalidade']

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 48, fontWeight: 800, color: result.color || T.accent, margin: '0 0 8px', transition: 'all 0.1s' }}>{scoreAnimated}/100</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Seu nível: {result.level}</p>
        <p style={{ fontSize: 14, color: T.textMuted, marginTop: 12, lineHeight: 1.5 }}>{result.impactPhrase}</p>
      </div>
      <div style={{ background: T.statBg, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${T.statBorder}` }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.textFaint, marginBottom: 12, textTransform: 'uppercase' }}>Por dimensão</p>
        {dimOrder.map((d) => (
          <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: T.text }}>{d}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{dims[d] != null ? dims[d] : 0}/20</span>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.textFaint, marginBottom: 10, textTransform: 'uppercase' }}>Recomendações</p>
        {(result.recommendations || []).map((rec, i) => (
          <p key={i} style={{ fontSize: 13, color: T.text, marginBottom: 10, paddingLeft: 12, borderLeft: `3px solid ${T.accent}` }}>{rec}</p>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {saveError && (
          <>
            <p style={{ color: T.dangerTxt, fontSize: 13 }}>{saveError}</p>
            <button type="button" onClick={onRetrySave} disabled={saving} style={{ width: '100%', padding: 12, borderRadius: 12, background: T.dangerBg, border: `1px solid ${T.dangerBrd}`, color: T.dangerTxt, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvando...' : 'Salvar resultado novamente'}
            </button>
          </>
        )}
        <button type="button" onClick={() => downloadDiagnosticoCard(result)} style={{ width: '100%', padding: 14, borderRadius: 12, background: T.dlBg, border: `1px solid ${T.spotBorder}`, color: T.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Compartilhe seu resultado (baixar imagem)
        </button>
        <button type="button" onClick={onRefazer} style={{ width: '100%', padding: 14, borderRadius: 12, background: T.statBg, border: `1px solid ${T.cardBorder}`, color: T.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Refazer diagnóstico
        </button>
        <button type="button" onClick={onVerHistorico} style={{ width: '100%', padding: 14, borderRadius: 12, background: T.statBg, border: `1px solid ${T.cardBorder}`, color: T.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Ver meu histórico
        </button>
        {config.diagnosticoCtaUrl && (
          <a href={config.diagnosticoCtaUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: 14, borderRadius: 12, background: `linear-gradient(135deg, ${T.accentDark}, ${T.accent})`, color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
            {config.diagnosticoCtaText || 'Quero meu plano de ação'}
          </a>
        )}
      </div>
    </div>
  )
}

function EstudanteHistorico({ estudanteId }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    setLoading(true)
    import('./estudanteApi').then(({ listDiagnosticoResults }) => {
      listDiagnosticoResults(estudanteId)
        .then(setResults)
        .catch(() => setError('Não foi possível carregar o histórico. Tente novamente.'))
        .finally(() => setLoading(false))
    })
  }, [estudanteId])

  useEffect(() => { load() }, [load])

  if (loading) return <p style={{ color: T.textFaint }}>Carregando histórico...</p>
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: T.dangerTxt, fontSize: 14, marginBottom: 12 }}>{error}</p>
        <button type="button" onClick={load} style={{ padding: '10px 20px', borderRadius: 10, background: T.accent, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    )
  }
  if (results.length === 0) return <p style={{ color: T.textFaint, textAlign: 'center' }}>Você ainda não fez nenhum diagnóstico. Vá em Diagnóstico de Carreira para começar.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {results.map((r) => (
        <div key={r.id} style={{ background: T.statBg, borderRadius: 12, padding: 16, border: `1px solid ${T.statBorder}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: T.textFaint }}>{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{r.total_score}/100</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: T.text }}>{r.level}</p>
        </div>
      ))}
    </div>
  )
}

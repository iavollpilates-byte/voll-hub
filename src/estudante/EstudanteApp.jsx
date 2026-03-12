import { useState, useEffect, useCallback } from 'react'
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

const BASE_URL = 'https://rafael.grupovoll.com.br'

function useQueryParam(name) {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export default function EstudanteApp() {
  const [loading, setLoading] = useState(true)
  const [estudante, setEstudante] = useState(null)
  const [tab, setTab] = useState('documentos')
  const tokenFromUrl = useQueryParam('token')

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #0d1f1a 0%, #1a2e28 50%, #0d1f1a 100%)', color: '#f0f0f0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
        onMagicLinkRequested={() => {}}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0d1f1a 0%, #1a2e28 50%, #0d1f1a 100%)', color: '#f0f0f0', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 80 }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Área do Estudante</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{estudante.name}</span>
          <button
            type="button"
            onClick={() => { clearStoredSession(); setEstudante(null); }}
            style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.5)', color: '#fca5a5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </header>
      <nav style={{ display: 'flex', gap: 4, padding: '12px 20px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { id: 'documentos', label: 'Documentos', icon: '📄' },
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
              border: 'none',
              background: tab === t.id ? 'rgba(52,153,128,0.4)' : 'rgba(255,255,255,0.06)',
              color: tab === t.id ? '#7dd3b0' : 'rgba(255,255,255,0.8)',
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
        {tab === 'diagnostico' && <EstudanteDiagnostico estudanteId={estudante.id} onDone={() => setTab('historico')} />}
        {tab === 'historico' && <EstudanteHistorico estudanteId={estudante.id} />}
      </main>
    </div>
  )
}

function EstudanteLanding({ onLoggedIn, onMagicLinkRequested }) {
  const [mode, setMode] = useState('cadastro')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailLogin, setEmailLogin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [successLink, setSuccessLink] = useState(null)
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

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
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
    setSuccess(result.message || 'Link gerado.')
    if (result.link) setSuccessLink(result.link)
    onMagicLinkRequested()
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #0d1f1a 0%, #1a2e28 50%, #0d1f1a 100%)', color: '#f0f0f0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>Área do Estudante</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 }}>Cadastre-se ou acesse com seu e-mail</p>
        {mode === 'cadastro' ? (
          <form onSubmit={handleCadastro}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, marginBottom: 12 }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, marginBottom: 12 }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Telefone (opcional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, marginBottom: 20 }}
            />
            {error && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #349980, #7DE2C7)', color: '#0d1f1a', fontSize: 15, fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Cadastrando...' : 'Cadastrar e entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>E-mail</label>
            <input
              type="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              placeholder="seu@email.com"
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 14, marginBottom: 20 }}
            />
            {error && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {success && <p style={{ color: '#86efac', fontSize: 13, marginBottom: 12 }}>{success}</p>}
            {successLink && (
              <a href={successLink} style={{ display: 'block', width: '100%', marginTop: 12, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #349980, #7DE2C7)', color: '#0d1f1a', fontSize: 15, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                Abrir meu link de acesso
              </a>
            )}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(52,153,128,0.5)', color: '#7dd3b0', fontSize: 15, fontWeight: 700, border: '1px solid rgba(52,153,128,0.5)', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        )}
        <button type="button" onClick={() => { setMode(mode === 'cadastro' ? 'login' : 'cadastro'); setError(''); setSuccess(''); }} style={{ width: '100%', marginTop: 16, padding: 10, background: 'none', border: 'none', color: 'rgba(125,211,176,0.9)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          {mode === 'cadastro' ? 'Já tenho cadastro – enviar link de acesso' : 'Voltar ao cadastro'}
        </button>
      </div>
    </div>
  )
}

function EstudanteDocuments() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    import('./estudanteApi').then(({ listDocuments }) => {
      listDocuments().then(setDocs).finally(() => setLoading(false))
    })
  }, [])
  if (loading) return <p style={{ color: 'rgba(255,255,255,0.6)' }}>Carregando documentos...</p>
  if (docs.length === 0) return <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Nenhum documento disponível no momento.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {docs.map((d) => (
        <div key={d.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{d.title}</h3>
          {d.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>{d.description}</p>}
          <a href={d.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #349980, #7DE2C7)', color: '#0d1f1a', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Baixar
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    import('./estudanteApi').then(({ listDiagnosticoQuestions }) => {
      listDiagnosticoQuestions().then((q) => {
        setQuestions(q)
        setLoading(false)
      })
    })
  }, [])

  const handleAnswer = (questionId, optionIndex, points) => {
    const next = [...responses, { questionId, optionIndex, points }]
    setResponses(next)
    if (next.length >= questions.length) {
      const res = computeResult(questions, next)
      setResult(res)
      setStep('result')
      import('./estudanteApi').then(({ saveDiagnosticoResult }) => {
        setSaving(true)
        saveDiagnosticoResult(estudanteId, {
          responses: next,
          totalScore: res.totalScore,
          level: res.level,
          dimensionScores: res.dimensionScores,
          recommendations: res.recommendations,
        }).then(() => setSaving(false)).catch(() => setSaving(false))
      })
    } else {
      setTimeout(() => setCurrentIndex(next.length), 300)
    }
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.6)' }}>Carregando...</p>
  if (questions.length === 0) return <p style={{ color: 'rgba(255,255,255,0.6)' }}>Perguntas não configuradas.</p>

  if (step === 'result' && result) {
    return (
      <EstudanteDiagnosticoResult
        result={result}
        onRefazer={() => { setStep('quiz'); setCurrentIndex(0); setResponses([]); setResult(null); }}
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
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Pergunta {currentIndex + 1} de {questions.length}</span>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #349980, #7DE2C7)', borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, lineHeight: 1.4 }}>{q.question_text}</h2>
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
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.06)',
              color: '#f0f0f0',
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

function EstudanteDiagnosticoResult({ result, onRefazer, onVerHistorico }) {
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
        <p style={{ fontSize: 48, fontWeight: 800, color: result.color || '#349980', margin: '0 0 8px', transition: 'all 0.1s' }}>{scoreAnimated}/100</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Seu nível: {result.level}</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 1.5 }}>{result.impactPhrase}</p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12, textTransform: 'uppercase' }}>Por dimensão</p>
        {dimOrder.map((d) => (
          <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>{d}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7dd3b0' }}>{dims[d] != null ? dims[d] : 0}/20</span>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10, textTransform: 'uppercase' }}>Recomendações</p>
        {(result.recommendations || []).map((rec, i) => (
          <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 10, paddingLeft: 12, borderLeft: '3px solid #349980' }}>{rec}</p>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" onClick={() => downloadDiagnosticoCard(result)} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(52,153,128,0.4)', border: '1px solid rgba(52,153,128,0.6)', color: '#7dd3b0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Compartilhe seu resultado (baixar imagem)
        </button>
        <button type="button" onClick={onRefazer} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Refazer diagnóstico
        </button>
        <button type="button" onClick={onVerHistorico} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Ver meu histórico
        </button>
        {config.diagnosticoCtaUrl && (
          <a href={config.diagnosticoCtaUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #349980, #7DE2C7)', color: '#0d1f1a', fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
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
  useEffect(() => {
    import('./estudanteApi').then(({ listDiagnosticoResults }) => {
      listDiagnosticoResults(estudanteId).then(setResults).finally(() => setLoading(false))
    })
  }, [estudanteId])
  if (loading) return <p style={{ color: 'rgba(255,255,255,0.6)' }}>Carregando histórico...</p>
  if (results.length === 0) return <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Você ainda não fez nenhum diagnóstico. Vá em Diagnóstico de Carreira para começar.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {results.map((r) => (
        <div key={r.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#7dd3b0' }}>{r.total_score}/100</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{r.level}</p>
        </div>
      ))}
    </div>
  )
}

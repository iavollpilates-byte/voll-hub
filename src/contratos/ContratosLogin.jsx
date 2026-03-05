import { useState } from 'react'

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0d1f1a 0%, #1a2e28 50%, #0d1f1a 100%)',
    color: '#f0f0f0',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(26, 46, 40, 0.9)',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ab5ad',
    marginBottom: 24,
    textAlign: 'center',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.08)',
    color: '#b8ccc6',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  tabActive: {
    background: '#349980',
    color: '#fff',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    marginBottom: 14,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    background: 'rgba(0,0,0,0.2)',
    color: '#f0f0f0',
    fontSize: 15,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#9ab5ad',
    marginBottom: 4,
  },
  btn: {
    width: '100%',
    padding: 14,
    marginTop: 8,
    border: 'none',
    borderRadius: 10,
    background: '#349980',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    fontSize: 13,
    color: '#e07c7c',
    marginTop: 8,
    textAlign: 'center',
  },
}

export default function ContratosLogin({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    cpf: '',
    whatsapp: '',
    password: '',
  })

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!loginForm.email.trim() || !loginForm.password) {
      setError('Preencha email e senha.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${window.location.origin}/api/contratos-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: loginForm.email.trim(), password: loginForm.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.user && data.token) {
        onLogin({ ...data.user, token: data.token })
        return
      }
      setError(data.error || 'Email ou senha incorretos.')
    } catch (_) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const { name, email, cpf, whatsapp, password } = registerForm
    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha nome, email e senha.')
      return
    }
    if (password.length < 6) {
      setError('Senha com pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${window.location.origin}/api/contratos-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: name.trim(),
          email: email.trim().toLowerCase(),
          cpf: (cpf || '').trim(),
          whatsapp: (whatsapp || '').trim(),
          password,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.user && data.token) {
        onLogin({ ...data.user, token: data.token })
        return
      }
      setError(data.error || 'Não foi possível criar a conta.')
    } catch (_) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Gerador de Contratos</h1>
        <p style={styles.subtitle}>Pilates — Dados do estúdio e do aluno</p>

        <div style={styles.tabs}>
          <button
            type="button"
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setMode('login'); setError('') }}
          >
            Entrar
          </button>
          <button
            type="button"
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
            onClick={() => { setMode('register'); setError('') }}
          >
            Cadastrar
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="seu@email.com"
              value={loginForm.email}
              onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
            />
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
            />
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <label style={styles.label}>Nome</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Seu nome"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
            />
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="seu@email.com"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
            />
            <label style={styles.label}>CPF (opcional)</label>
            <input
              type="text"
              style={styles.input}
              placeholder="000.000.000-00"
              value={registerForm.cpf}
              onChange={(e) => setRegisterForm((p) => ({ ...p, cpf: e.target.value }))}
            />
            <label style={styles.label}>WhatsApp com DDD (opcional)</label>
            <input
              type="text"
              style={styles.input}
              placeholder="(11) 99999-9999"
              value={registerForm.whatsapp}
              onChange={(e) => setRegisterForm((p) => ({ ...p, whatsapp: e.target.value }))}
            />
            <label style={styles.label}>Senha (mín. 6 caracteres)</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
            />
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  )
}

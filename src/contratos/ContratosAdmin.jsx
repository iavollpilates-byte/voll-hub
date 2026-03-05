import { useState, useEffect } from 'react'

const ADMIN_STORAGE_KEY = 'contratos_admin_token'

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_STORAGE_KEY, token)
    else localStorage.removeItem(ADMIN_STORAGE_KEY)
  } catch (_) {}
}

const styles = {
  box: { maxWidth: 640 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  input: {
    width: 200,
    padding: '10px 12px',
    marginRight: 8,
    marginBottom: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.2)',
    color: '#f0f0f0',
    fontSize: 14,
  },
  btn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: 8,
    background: '#349980',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  err: { color: '#e07c7c', fontSize: 13, marginTop: 8 },
}

export default function ContratosAdmin({ adminToken, onAdminToken }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (!adminToken) return
    setError('')
    fetch(`${window.location.origin}/api/contratos-admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users)
        else if (data.error) setError(data.error)
      })
      .catch(() => setError('Erro ao carregar.'))
  }, [adminToken])

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${window.location.origin}/api/contratos-verify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.token) {
        onAdminToken(data.token)
        setPin('')
      } else {
        setError(data.error || 'PIN incorreto.')
      }
    } catch (_) {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAdmin = () => {
    onAdminToken(null)
    setUsers([])
  }

  if (adminToken) {
    return (
      <div style={styles.box}>
        <h2 style={styles.h2}>Admin Contratos</h2>
        <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 12 }}>
          Usuários cadastrados no gerador de contratos.
        </p>
        <button type="button" style={{ ...styles.btn, background: 'rgba(255,255,255,0.15)', marginBottom: 16 }} onClick={handleLogoutAdmin}>
          Sair do admin
        </button>
        {error && <p style={styles.err}>{error}</p>}
        <ul style={styles.list}>
          {users.map((u) => (
            <li key={u.id} style={styles.item}>
              <strong>{u.name}</strong> — {u.email}
              {u.whatsapp && ` · ${u.whatsapp}`}
              <div style={{ fontSize: 12, color: '#9ab5ad', marginTop: 4 }}>
                Cadastro: {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div style={styles.box}>
      <h2 style={styles.h2}>Admin Contratos</h2>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 12 }}>
        Digite o PIN de administrador para ver a lista de usuários.
      </p>
      <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <input
          type="password"
          style={styles.input}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
          maxLength={10}
        />
        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
      {error && <p style={styles.err}>{error}</p>}
    </div>
  )
}

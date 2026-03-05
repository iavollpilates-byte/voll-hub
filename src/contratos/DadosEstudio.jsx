import { useState, useEffect } from 'react'

const styles = {
  box: {
    maxWidth: 560,
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  label: { display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    marginBottom: 14,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.2)',
    color: '#f0f0f0',
    fontSize: 14,
  },
  btn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: 8,
    background: '#349980',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  msg: { fontSize: 13, marginTop: 12, color: '#7dd3b0' },
  err: { fontSize: 13, marginTop: 12, color: '#e07c7c' },
}

export default function DadosEstudio({ user }) {
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    endereco: '',
    cnpj: '',
    telefone: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = user?.token
    if (!token) return
    fetch(`${window.location.origin}/api/contratos-studio`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.studio && typeof data.studio === 'object') {
          setForm((prev) => ({ ...prev, ...data.studio }))
        }
      })
      .catch(() => {})
  }, [user?.token])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(t)
  }, [message])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${window.location.origin}/api/contratos-studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessage('Dados do estúdio salvos.')
      } else {
        setError(data.error || 'Erro ao salvar.')
      }
    } catch (_) {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.box}>
      <h2 style={styles.h2}>Cadastrar dados do meu estúdio</h2>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 16 }}>
        Estes dados aparecerão no contrato. Preencha uma vez e use em todos os contratos.
      </p>
      <form onSubmit={handleSubmit}>
        <label style={styles.label}>Razão social</label>
        <input
          style={styles.input}
          value={form.razao_social}
          onChange={(e) => setForm((p) => ({ ...p, razao_social: e.target.value }))}
          placeholder="Ex.: Pilates Ltda"
        />
        <label style={styles.label}>Nome fantasia</label>
        <input
          style={styles.input}
          value={form.nome_fantasia}
          onChange={(e) => setForm((p) => ({ ...p, nome_fantasia: e.target.value }))}
          placeholder="Ex.: Estúdio Pilates XYZ"
        />
        <label style={styles.label}>Endereço completo</label>
        <input
          style={styles.input}
          value={form.endereco}
          onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))}
          placeholder="Rua, número, bairro, cidade, CEP"
        />
        <label style={styles.label}>CNPJ</label>
        <input
          style={styles.input}
          value={form.cnpj}
          onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
          placeholder="00.000.000/0001-00"
        />
        <label style={styles.label}>Telefone</label>
        <input
          style={styles.input}
          value={form.telefone}
          onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
          placeholder="(11) 3333-3333"
        />
        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar dados do estúdio'}
        </button>
      </form>
      {message && <p style={styles.msg}>{message}</p>}
      {error && <p style={styles.err}>{error}</p>}
    </div>
  )
}

import { useState, useEffect } from 'react'

const styles = {
  box: { maxWidth: 640, marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemName: { fontWeight: 600 },
  itemMeta: { fontSize: 12, color: '#9ab5ad' },
  btnSmall: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.1)',
    color: '#f0f0f0',
    cursor: 'pointer',
    fontSize: 12,
  },
  btnDanger: { background: 'rgba(224, 124, 124, 0.2)', color: '#e07c7c' },
  form: {
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 12,
    padding: 24,
    marginTop: 20,
  },
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
    marginRight: 8,
  },
  err: { fontSize: 13, marginTop: 8, color: '#e07c7c' },
  emptyHint: { fontSize: 13, color: '#9ab5ad', marginBottom: 16 },
}

export default function InserirAluno({ user }) {
  const [students, setStudents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    nome: '', cpf: '', rg: '', data_nascimento: '', email: '', telefone: '',
    endereco: '', cidade: '', estado: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadStudents = () => {
    const token = user?.token
    if (!token) return
    fetch(`${window.location.origin}/api/contratos-students`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.students)) setStudents(data.students)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadStudents()
  }, [user?.token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    setLoading(true)
    try {
      const url = `${window.location.origin}/api/contratos-students`
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { ...form, id: editingId } : form
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setForm({ nome: '', cpf: '', rg: '', data_nascimento: '', email: '', telefone: '', endereco: '', cidade: '', estado: '' })
        setEditingId(null)
        loadStudents()
      } else {
        setError(data.error || 'Erro ao salvar.')
      }
    } catch (_) {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (s) => {
    setForm({
      nome: s.nome || '',
      cpf: s.cpf || '',
      rg: s.rg || '',
      data_nascimento: s.data_nascimento || '',
      email: s.email || '',
      telefone: s.telefone || '',
      endereco: s.endereco || '',
      cidade: s.cidade || '',
      estado: s.estado || '',
    })
    setEditingId(s.id)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este aluno?')) return
    try {
      const res = await fetch(`${window.location.origin}/api/contratos-students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        loadStudents()
        if (editingId === id) {
          setEditingId(null)
          setForm({ nome: '', cpf: '', rg: '', data_nascimento: '', email: '', telefone: '', endereco: '', cidade: '', estado: '' })
        }
      }
    } catch (_) {}
  }

  return (
    <div style={styles.box}>
      <h2 style={styles.h2}>Inserir aluno</h2>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 12 }}>
        Cadastre os alunos para gerar contratos. Depois selecione o aluno na hora de gerar o PDF.
      </p>

      {students.length === 0 && (
        <p style={styles.emptyHint}>Nenhum aluno cadastrado. Use o formulário abaixo para adicionar o primeiro.</p>
      )}

      <ul style={styles.list}>
        {students.map((s) => (
          <li key={s.id} style={styles.item}>
            <div>
              <span style={styles.itemName}>{s.nome}</span>
              <div style={styles.itemMeta}>
                {[s.email, s.telefone].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div>
              <button type="button" style={styles.btnSmall} onClick={() => handleEdit(s)}>
                Editar
              </button>
              <button
                type="button"
                style={{ ...styles.btnSmall, ...styles.btnDanger }}
                onClick={() => handleDelete(s.id)}
              >
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div style={styles.form}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>
          {editingId ? 'Editar aluno' : 'Novo aluno'}
        </h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nome *</label>
          <input
            style={styles.input}
            value={form.nome}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Nome completo"
          />
          <label style={styles.label}>CPF</label>
          <input
            style={styles.input}
            value={form.cpf}
            onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
            placeholder="000.000.000-00"
          />
          <label style={styles.label}>RG</label>
          <input
            style={styles.input}
            value={form.rg}
            onChange={(e) => setForm((p) => ({ ...p, rg: e.target.value }))}
            placeholder="00.000.000-0"
          />
          <label style={styles.label}>Data de nascimento</label>
          <input
            style={styles.input}
            value={form.data_nascimento}
            onChange={(e) => setForm((p) => ({ ...p, data_nascimento: e.target.value }))}
            placeholder="DD/MM/AAAA"
          />
          <label style={styles.label}>Endereço completo</label>
          <input
            style={styles.input}
            value={form.endereco}
            onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))}
            placeholder="Rua, número, bairro, CEP"
          />
          <label style={styles.label}>Cidade / Estado</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
              value={form.cidade}
              onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
              placeholder="Cidade"
            />
            <input
              style={{ ...styles.input, width: 60, marginBottom: 0 }}
              value={form.estado}
              onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="UF"
              maxLength={2}
            />
          </div>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            style={styles.input}
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="aluno@email.com"
          />
          <label style={styles.label}>Telefone</label>
          <input
            style={styles.input}
            value={form.telefone}
            onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
            placeholder="(11) 99999-9999"
          />
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar aluno'}
          </button>
          {editingId && (
            <button
              type="button"
              style={{ ...styles.btn, background: 'rgba(255,255,255,0.15)' }}
              onClick={() => { setEditingId(null); setForm({ nome: '', cpf: '', rg: '', data_nascimento: '', email: '', telefone: '', endereco: '', cidade: '', estado: '' }); }}
            >
              Cancelar
            </button>
          )}
        </form>
        {error && <p style={styles.err}>{error}</p>}
      </div>
    </div>
  )
}

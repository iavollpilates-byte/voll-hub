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

const tabs = [
  { id: 'users', label: 'Usuários' },
  { id: 'studios', label: 'Estúdios' },
  { id: 'contracts', label: 'Contratos gerados' },
  { id: 'template', label: 'Modelo de contrato' },
]

const styles = {
  box: { maxWidth: 800 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
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
  btnSec: { background: 'rgba(255,255,255,0.15)' },
  btnDanger: { background: '#b85450' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    background: 'rgba(26, 46, 40, 0.6)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  err: { color: '#e07c7c', fontSize: 13, marginTop: 8 },
  tabRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tab: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#e0e8e6',
    cursor: 'pointer',
    fontSize: 14,
  },
  tabActive: { background: 'rgba(52, 153, 128, 0.4)', borderColor: '#349980' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: 'rgba(26, 46, 40, 0.98)',
    borderRadius: 12,
    padding: 24,
    maxWidth: 420,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 200,
    padding: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.2)',
    color: '#f0f0f0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
}

function fetchApi(adminToken, path, options = {}) {
  return fetch(`${window.location.origin}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json())
}

export default function ContratosAdmin({ adminToken, onAdminToken }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [studios, setStudios] = useState([])
  const [contracts, setContracts] = useState([])
  const [template, setTemplate] = useState({ body: '', optionals: [] })
  const [templateSaving, setTemplateSaving] = useState(false)
  const [userModal, setUserModal] = useState(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', cpf: '', whatsapp: '', password: '' })
  const [userSaveLoading, setUserSaveLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const loadUsers = () => {
    if (!adminToken) return
    fetchApi(adminToken, '/api/contratos-admin')
      .then((data) => { if (data.users) setUsers(data.users); else if (data.error) setError(data.error) })
      .catch(() => setError('Erro ao carregar usuários.'))
  }
  const loadStudios = () => {
    if (!adminToken) return
    fetchApi(adminToken, '/api/contratos-admin?list=studios')
      .then((data) => { if (data.studios) setStudios(data.studios); else if (data.error) setError(data.error) })
      .catch(() => setError('Erro ao carregar estúdios.'))
  }
  const loadContracts = () => {
    if (!adminToken) return
    fetchApi(adminToken, '/api/contratos-admin?list=contracts')
      .then((data) => { if (data.contracts) setContracts(data.contracts); else if (data.error) setError(data.error) })
      .catch(() => setError('Erro ao carregar contratos.'))
  }
  const loadTemplate = () => {
    if (!adminToken) return
    fetchApi(adminToken, '/api/contratos-admin?list=template')
      .then((data) => {
        if (data.template) setTemplate({ body: data.template.body || '', optionals: data.template.optionals || [] })
        else if (data.error) setError(data.error)
      })
      .catch(() => setError('Erro ao carregar modelo.'))
  }

  useEffect(() => {
    if (!adminToken) return
    setError('')
    loadUsers()
  }, [adminToken])

  useEffect(() => {
    if (!adminToken) return
    if (tab === 'studios') loadStudios()
    else if (tab === 'contracts') loadContracts()
    else if (tab === 'template') loadTemplate()
  }, [adminToken, tab])

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
    setStudios([])
    setContracts([])
    setUserModal(null)
    setDeleteConfirm(null)
  }

  const openNewUser = () => {
    setUserForm({ name: '', email: '', cpf: '', whatsapp: '', password: '' })
    setUserModal('create')
  }
  const openEditUser = (u) => {
    setUserForm({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      cpf: u.cpf || '',
      whatsapp: u.whatsapp || '',
      password: '',
    })
    setUserModal('edit')
  }
  const closeUserModal = () => {
    setUserModal(null)
    setUserForm({ name: '', email: '', cpf: '', whatsapp: '', password: '' })
  }

  const handleSaveUser = async () => {
    const { name, email, password } = userForm
    if (!name?.trim() || !email?.trim()) {
      setError('Nome e email são obrigatórios.')
      return
    }
    if (userModal === 'create' && (!password || password.length < 6)) {
      setError('Senha com pelo menos 6 caracteres.')
      return
    }
    setError('')
    setUserSaveLoading(true)
    try {
      if (userModal === 'create') {
        const data = await fetchApi(adminToken, '/api/contratos-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userForm.name.trim(),
            email: userForm.email.trim().toLowerCase(),
            cpf: (userForm.cpf || '').trim(),
            whatsapp: (userForm.whatsapp || '').trim(),
            password: userForm.password,
          }),
        })
        if (data.error) setError(data.error)
        else { loadUsers(); closeUserModal() }
      } else {
        const payload = {
          id: userForm.id,
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          cpf: (userForm.cpf || '').trim(),
          whatsapp: (userForm.whatsapp || '').trim(),
        }
        if (userForm.password && userForm.password.length >= 6) payload.password = userForm.password
        const data = await fetchApi(adminToken, '/api/contratos-admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (data.error) setError(data.error)
        else { loadUsers(); closeUserModal() }
      }
    } catch (_) {
      setError('Erro ao salvar.')
    } finally {
      setUserSaveLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    setError('')
    try {
      const data = await fetchApi(adminToken, '/api/contratos-admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      })
      if (data.error) setError(data.error)
      else { setDeleteConfirm(null); loadUsers() }
    } catch (_) {
      setError('Erro ao excluir.')
    }
  }

  const handleSaveTemplate = async () => {
    let optionals = template.optionals
    if (typeof template.optionals === 'string') {
      try {
        optionals = JSON.parse(template.optionals)
      } catch (_) {
        setError('Campo "Opcionais" deve ser um JSON válido (array).')
        return
      }
    }
    setError('')
    setTemplateSaving(true)
    try {
      const data = await fetchApi(adminToken, '/api/contratos-admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: template.body, optionals }),
      })
      if (data.error) setError(data.error)
      else setError('')
    } catch (_) {
      setError('Erro ao salvar modelo.')
    } finally {
      setTemplateSaving(false)
    }
  }

  if (adminToken) {
    return (
      <div style={styles.box}>
        <h2 style={styles.h2}>Admin Contratos</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={styles.tabRow}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
                onClick={() => { setTab(t.id); setError('') }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" style={{ ...styles.btn, ...styles.btnSec, marginLeft: 'auto' }} onClick={handleLogoutAdmin}>
            Sair do admin
          </button>
        </div>
        {error && <p style={styles.err}>{error}</p>}

        {tab === 'users' && (
          <>
            <button type="button" style={{ ...styles.btn, marginBottom: 16 }} onClick={openNewUser}>
              Novo usuário
            </button>
            <ul style={styles.list}>
              {users.map((u) => (
                <li key={u.id} style={styles.item}>
                  <div>
                    <strong>{u.name}</strong> — {u.email}
                    {u.whatsapp && ` · ${u.whatsapp}`}
                    <div style={{ fontSize: 12, color: '#9ab5ad', marginTop: 4 }}>
                      Cadastro: {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={{ ...styles.btn, ...styles.btnSec, padding: '6px 12px', fontSize: 13 }} onClick={() => openEditUser(u)}>
                      Editar
                    </button>
                    <button type="button" style={{ ...styles.btn, ...styles.btnDanger, padding: '6px 12px', fontSize: 13 }} onClick={() => setDeleteConfirm(u)}>
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'studios' && (
          <ul style={styles.list}>
            {studios.map((s) => (
              <li key={s.id} style={styles.item}>
                <div>
                  <strong>{s.razao_social || s.nome_fantasia || '—'}</strong>
                  <div style={{ fontSize: 13, color: '#9ab5ad', marginTop: 4 }}>
                    Usuário: {s.user_name} ({s.user_email})
                  </div>
                  {(s.endereco || s.cnpj || s.telefone) && (
                    <div style={{ fontSize: 12, color: '#9ab5ad', marginTop: 2 }}>
                      {[s.endereco, s.cnpj, s.telefone].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === 'contracts' && (
          <ul style={styles.list}>
            {contracts.map((c) => (
              <li key={c.id} style={styles.item}>
                <div>
                  <strong>{c.student_name || 'Aluno não informado'}</strong>
                  <div style={{ fontSize: 13, color: '#9ab5ad', marginTop: 4 }}>
                    Usuário: {c.user_name} ({c.user_email})
                  </div>
                  <div style={{ fontSize: 12, color: '#9ab5ad', marginTop: 2 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : '-'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === 'template' && (
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 }}>Texto do modelo (use {{RAZAO_SOCIAL}}, {{ALUNO_NOME}}, {{VALOR}}, {{DATA}}, {{MULTA_SIM_NAO}}, {{MULTA_TEXTO}}, etc.)</label>
            <textarea
              style={{ ...styles.textarea, minHeight: 320 }}
              value={template.body}
              onChange={(e) => setTemplate((t) => ({ ...t, body: e.target.value }))}
              placeholder="Texto do contrato com placeholders..."
            />
            <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginTop: 16, marginBottom: 4 }}>
              {'Opcionais (JSON array, ex.: [{"key":"valor","label":"Valor","type":"text"},{"key":"incluirMulta","label":"Incluir multa","type":"boolean"}]'}
            </label>
            <textarea
              style={{ ...styles.textarea, minHeight: 80 }}
              value={typeof template.optionals === 'string' ? template.optionals : JSON.stringify(template.optionals, null, 2)}
              onChange={(e) => setTemplate((t) => ({ ...t, optionals: e.target.value }))}
            />
            <button type="button" style={{ ...styles.btn, marginTop: 16 }} onClick={handleSaveTemplate} disabled={templateSaving}>
              {templateSaving ? 'Salvando...' : 'Salvar modelo'}
            </button>
          </div>
        )}

        {userModal && (
          <div style={styles.modalOverlay} onClick={closeUserModal}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 16 }}>{userModal === 'create' ? 'Novo usuário' : 'Editar usuário'}</h3>
              <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 }}>Nome</label>
              <input style={styles.input} value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome" />
              <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 }}>Email</label>
              <input style={styles.input} type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" />
              <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 }}>CPF</label>
              <input style={styles.input} value={userForm.cpf} onChange={(e) => setUserForm((f) => ({ ...f, cpf: e.target.value }))} placeholder="CPF" />
              <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 }}>WhatsApp</label>
              <input style={styles.input} value={userForm.whatsapp} onChange={(e) => setUserForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp" />
              <label style={{ display: 'block', fontSize: 12, color: '#9ab5ad', marginBottom: 4 }}>Senha {userModal === 'edit' && '(deixe em branco para não alterar)'}</label>
              <input style={styles.input} type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="Senha" />
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="button" style={styles.btn} onClick={handleSaveUser} disabled={userSaveLoading}>
                  {userSaveLoading ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.btnSec }} onClick={closeUserModal}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <p style={{ marginBottom: 16 }}>Excluir usuário <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})? Esta ação não pode ser desfeita.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => handleDeleteUser(deleteConfirm.id)}>
                  Excluir
                </button>
                <button type="button" style={{ ...styles.btn, ...styles.btnSec }} onClick={() => setDeleteConfirm(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.box}>
      <h2 style={styles.h2}>Admin Contratos</h2>
      <p style={{ fontSize: 13, color: '#9ab5ad', marginBottom: 12 }}>
        Digite o PIN de administrador para acessar estúdios, contratos, usuários e o modelo de contrato.
      </p>
      <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <input
          type="password"
          style={{ ...styles.input, width: 200 }}
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

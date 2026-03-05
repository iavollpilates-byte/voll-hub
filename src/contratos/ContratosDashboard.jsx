import { useState, useEffect } from 'react'
import ContratosAdmin, { getAdminToken, setAdminToken } from './ContratosAdmin.jsx'
import DadosEstudio from './DadosEstudio.jsx'
import InserirAluno from './InserirAluno.jsx'
import VerContrato from './VerContrato.jsx'
import GerarContrato from './GerarContrato.jsx'

const sections = [
  { id: 'estudio', label: 'Dados do meu estúdio', Icon: '🏢' },
  { id: 'ver', label: 'Ver contrato', Icon: '📄' },
  { id: 'alunos', label: 'Inserir aluno', Icon: '👤' },
  { id: 'gerar', label: 'Gerar contrato', Icon: '📥' },
  { id: 'admin', label: 'Admin', Icon: '🔧' },
]

const styles = {
  layout: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0d1f1a 0%, #1a2e28 50%, #0d1f1a 100%)',
    color: '#f0f0f0',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  user: {
    fontSize: 13,
    color: '#9ab5ad',
  },
  logout: {
    padding: '8px 16px',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 8,
    background: 'transparent',
    color: '#e07c7c',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  nav: {
    display: 'flex',
    gap: 8,
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    overflowX: 'auto',
  },
  navBtn: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.06)',
    color: '#b8ccc6',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  navBtnActive: {
    background: '#349980',
    color: '#fff',
  },
  main: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
  },
}

export default function ContratosDashboard({ user, onLogout }) {
  const [section, setSection] = useState('estudio')
  const [adminToken, setAdminTokenState] = useState(null)

  useEffect(() => {
    setAdminTokenState(getAdminToken())
  }, [])

  const handleAdminToken = (token) => {
    setAdminToken(token)
    setAdminTokenState(token)
  }

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <h1 style={styles.title}>Gerador de Contratos</h1>
        <span style={styles.user}>{user.name || user.email}</span>
        <button type="button" style={styles.logout} onClick={onLogout}>
          Sair
        </button>
      </header>

      <nav style={styles.nav}>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            style={{ ...styles.navBtn, ...(section === s.id ? styles.navBtnActive : {}) }}
            onClick={() => setSection(s.id)}
          >
            {s.Icon} {s.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {section === 'estudio' && <DadosEstudio user={user} />}
        {section === 'ver' && <VerContrato user={user} />}
        {section === 'alunos' && <InserirAluno user={user} />}
        {section === 'gerar' && <GerarContrato user={user} />}
        {section === 'admin' && <ContratosAdmin adminToken={adminToken} onAdminToken={handleAdminToken} />}
      </main>
    </div>
  )
}

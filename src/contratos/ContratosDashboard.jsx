import { useState } from 'react'
import DadosEstudio from './DadosEstudio.jsx'
import InserirAluno from './InserirAluno.jsx'
import VerContrato from './VerContrato.jsx'
import GerarContrato from './GerarContrato.jsx'

const sections = [
  { id: 'estudio', label: 'Dados do meu estúdio', Icon: '🏢' },
  { id: 'ver', label: 'Ver contrato', Icon: '📄' },
  { id: 'alunos', label: 'Inserir aluno', Icon: '👤' },
  { id: 'gerar', label: 'Gerar contrato', Icon: '📥' },
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

const focusVisibleStyle = `
  .contratos-nav-btn { outline: none; }
  .contratos-nav-btn:focus-visible { outline: 2px solid #7dd3b0; outline-offset: 2px; }
  @media (max-width: 480px) { .contratos-main { padding: 16px !important; } }
`

export default function ContratosDashboard({ user, onLogout }) {
  const [section, setSection] = useState('estudio')

  return (
    <div style={styles.layout}>
      <style>{focusVisibleStyle}</style>
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
            className="contratos-nav-btn"
            style={{ ...styles.navBtn, ...(section === s.id ? styles.navBtnActive : {}) }}
            onClick={() => setSection(s.id)}
          >
            {s.Icon} {s.label}
          </button>
        ))}
      </nav>

      <main className="contratos-main" style={styles.main}>
        {section === 'estudio' && <DadosEstudio user={user} />}
        {section === 'ver' && <VerContrato user={user} />}
        {section === 'alunos' && <InserirAluno user={user} />}
        {section === 'gerar' && <GerarContrato user={user} />}
      </main>
    </div>
  )
}

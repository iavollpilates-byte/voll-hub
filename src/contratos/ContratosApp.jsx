import { useState, useEffect } from 'react'
import ContratosLogin from './ContratosLogin.jsx'
import ContratosDashboard from './ContratosDashboard.jsx'
import ContratosAdmin, { getAdminToken, setAdminToken } from './ContratosAdmin.jsx'
import { getStoredUser, setStoredUser } from './contratosAuth.js'

const adminPageStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0d1f1a 0%, #1a2e28 50%, #0d1f1a 100%)',
    color: '#f0f0f0',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    padding: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: 700, margin: 0 },
  backLink: {
    color: '#7dd3b0',
    fontSize: 14,
    textDecoration: 'none',
    fontWeight: 600,
  },
}

export default function ContratosApp() {
  const [user, setUser] = useState(null)
  const [adminToken, setAdminTokenState] = useState(null)
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const isAdminRoute = path === '/contratos/admin' || path.startsWith('/contratos/admin')

  useEffect(() => {
    setUser(getStoredUser())
    setAdminTokenState(getAdminToken())
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    setStoredUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    setStoredUser(null)
  }

  const handleAdminToken = (token) => {
    setAdminToken(token)
    setAdminTokenState(token)
  }

  if (isAdminRoute) {
    return (
      <div style={adminPageStyles.page}>
        <header style={adminPageStyles.header}>
          <h1 style={adminPageStyles.title}>Gerador de Contratos — Admin</h1>
          <a href="/contratos" style={adminPageStyles.backLink}>Voltar ao Gerador</a>
        </header>
        <ContratosAdmin adminToken={adminToken} onAdminToken={handleAdminToken} />
      </div>
    )
  }

  if (user) {
    return <ContratosDashboard user={user} onLogout={handleLogout} />
  }

  return <ContratosLogin onLogin={handleLogin} />
}

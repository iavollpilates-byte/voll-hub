import { useState, useEffect } from 'react'
import ContratosLogin from './ContratosLogin.jsx'
import ContratosDashboard from './ContratosDashboard.jsx'
import { getStoredUser, setStoredUser } from './contratosAuth.js'

export default function ContratosApp() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    setStoredUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    setStoredUser(null)
  }

  if (user) {
    return <ContratosDashboard user={user} onLogout={handleLogout} />
  }

  return <ContratosLogin onLogin={handleLogin} />
}

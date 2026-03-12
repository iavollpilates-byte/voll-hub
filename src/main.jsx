import React from 'react'
import ReactDOM from 'react-dom/client'
import VollHub from './VollHub.jsx'
import ContratosApp from './contratos/ContratosApp.jsx'
import EstudanteApp from './estudante/EstudanteApp.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const path = typeof window !== 'undefined' ? window.location.pathname : ''
const isContratos = path === '/contratos' || path.startsWith('/contratos/')
const isEstudante = path === '/estudante' || path.startsWith('/estudante/')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isEstudante ? <EstudanteApp /> : isContratos ? <ContratosApp /> : <VollHub />}
    </ErrorBoundary>
  </React.StrictMode>
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import VollHub from './VollHub.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <VollHub />
    </ErrorBoundary>
  </React.StrictMode>
)

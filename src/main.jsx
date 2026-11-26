import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppBoundary } from './components/AppBoundary.jsx'
import './index.css'
import './q-theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </AppBoundary>
  </React.StrictMode>,
)

import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import './index.css'
import './q-theme.css'

createRoot(document.getElementById('probe')).render(
  <MemoryRouter><Dashboard /></MemoryRouter>,
)

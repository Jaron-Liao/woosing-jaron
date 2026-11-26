import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import CharacterGallery from './pages/CharacterGallery.jsx'
import './index.css'
import './q-theme.css'
createRoot(document.getElementById('probe')).render(<MemoryRouter><CharacterGallery /></MemoryRouter>)

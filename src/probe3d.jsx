import React from 'react'
import { createRoot } from 'react-dom/client'
import BuddyModel3D from './components/BuddyModel3D.jsx'

createRoot(document.getElementById('probe')).render(
  <div style={{ maxWidth: 820, margin: '24px auto', padding: 16 }}>
    <h2 style={{ fontSize: 18 }}>CodeVerse 立体建模验证</h2>
    <BuddyModel3D height={420} />
  </div>,
)

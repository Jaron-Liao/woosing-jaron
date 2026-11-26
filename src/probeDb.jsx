import React from 'react'
import { createRoot } from 'react-dom/client'
import { db } from './db.js'

const run = async () => {
  const out = []
  try {
    await db.userData.put({ kind: 'agent', key: 'history', value: { messages: [{ role: 'user', content: 'hi' }] }, updatedAt: new Date().toISOString() })
    out.push('put OK')
    const row = await db.userData.get(['agent', 'history'])
    out.push('get OK: ' + JSON.stringify(row?.value))
    const count = await db.userData.count()
    out.push('count=' + count)
    await db.userData.put({ kind: 'uploads', key: 'files', value: { files: [{ path: 'a.csv' }] }, updatedAt: new Date().toISOString() })
    out.push('second kind OK, count=' + await db.userData.count())
  } catch (e) { out.push('ERROR: ' + e.message) }
  createRoot(document.getElementById('probe')).render(<pre style={{ font: '14px monospace', padding: 20 }}>{out.join('\n')}</pre>)
}
run()

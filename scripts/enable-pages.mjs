import { execSync } from 'node:child_process'

let auth = ''
try {
  const out = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  })
  auth = out.split('\n').find(l => l.startsWith('password='))?.slice(9) || ''
} catch (e) { console.error('NO_CREDENTIAL:', e.message); process.exit(1) }
if (!auth) { console.error('EMPTY_TOKEN'); process.exit(1) }

const headers = {
  Authorization: `Bearer ${auth}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'workbuddy-codeverse',
}

// 开启 Pages： Deploy from a branch = main / root
const res = await fetch('https://api.github.com/repos/Jaron-Liao/woosing-jaron/pages', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    source: { branch: 'main', path: '/' },
    build_type: 'legacy',
  }),
})
const text = await res.text()
console.log('Pages HTTP', res.status)
try {
  const j = JSON.parse(text)
  console.log('url:', j.html_url || '-')
  console.log('status:', j.status || '-')
  if (j.message) console.log('message:', j.message)
} catch { console.log(text.slice(0, 400)) }

import { execSync } from 'node:child_process'

// 从 git credential helper 读取当前 GitHub 凭证（不打印）
let auth = ''
try {
  const out = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  })
  const pass = out.split('\n').find(l => l.startsWith('password='))?.slice(9) || ''
  auth = pass
} catch (e) {
  console.error('NO_CREDENTIAL:', e.message)
  process.exit(1)
}
if (!auth) { console.error('EMPTY_TOKEN'); process.exit(1) }

const body = JSON.stringify({
  name: 'woosing-jaron',
  description: 'CodeVerse 数学代码工作台 · Woosing Jaron',
  private: false,
  auto_init: false,
})

try {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'workbuddy-codeverse',
    },
    body,
  })
  const text = await res.text()
  console.log('HTTP', res.status)
  try {
    const j = JSON.parse(text)
    console.log('full_name:', j.full_name || '-')
    console.log('html_url:', j.html_url || '-')
    console.log('clone_url:', j.clone_url || '-')
    if (j.message) console.log('message:', j.message)
  } catch { console.log(text.slice(0, 500)) }
} catch (e) {
  console.error('FETCH_FAILED:', e.message, e.cause?.message || '')
}

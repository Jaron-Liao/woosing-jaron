import { execSync } from 'node:child_process'

let auth = ''
try {
  const out = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  })
  auth = out.split('\n').find(l => l.startsWith('password='))?.slice(9) || ''
} catch { console.error('NO_CREDENTIAL'); process.exit(1) }
if (!auth) { console.error('EMPTY_TOKEN'); process.exit(1) }

const H = { Authorization: `Bearer ${auth}`, Accept: 'application/vnd.github+json', 'User-Agent': 'workbuddy-check' }

// 1. 列出所有仓库，找重复
const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&type=owner', { headers: H })
const repos = await reposRes.json()
console.log('REPOS_HTTP', reposRes.status, '| total:', Array.isArray(repos) ? repos.length : '-')
if (Array.isArray(repos)) {
  const matches = repos.filter(r => /woosing|codeverse/i.test(r.name))
  console.log('MATCHING_REPOS:', matches.map(r => `${r.name}(${r.private ? 'private' : 'public'})`).join(', ') || 'none')
  console.log('ALL_REPOS:', repos.map(r => r.name).join(', '))
}

// 2. 检查目标仓库 + Pages
const repoRes = await fetch('https://api.github.com/repos/Jaron-Liao/woosing-jaron', { headers: H })
console.log('REPO_HTTP', repoRes.status)
if (repoRes.status === 200) {
  const r = await repoRes.json()
  console.log('  default_branch:', r.default_branch, '| private:', r.private, '| pushed_at:', r.pushed_at)
  const pgRes = await fetch('https://api.github.com/repos/Jaron-Liao/woosing-jaron/pages', { headers: H })
  console.log('PAGES_HTTP', pgRes.status)
  if (pgRes.status === 200) {
    const pg = await pgRes.json()
    console.log('  url:', pg.html_url, '| status:', pg.status, '| source:', JSON.stringify(pg.source))
  }
}

// 3. 站点可达性
try {
  const s = await fetch('https://jaron-liao.github.io/woosing-jaron/', { headers: { 'User-Agent': 'workbuddy-check' } })
  const t = await s.text()
  console.log('SITE_HTTP', s.status, '| title:', (t.match(/<title>(.*?)<\/title>/) || [])[1] || '-')
} catch (e) { console.log('SITE_ERR', e.message) }

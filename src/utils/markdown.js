// 极简 Markdown 渲染器：标题/粗斜体/行内代码/代码块/列表/引用/链接/表格
// 只做转义 + 结构化，不支持嵌套行内格式，笔记场景够用

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s) {
  return esc(s)
    .replace(/\[\[([^\]]+)\]\]/g, '<a class="ref" data-ref="$1">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

export function renderMarkdown(src) {
  const lines = String(src || '').split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (/^```/.test(line)) {
      const buf = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>')
      continue
    }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const lv = h[1].length
      out.push('<h' + lv + '>' + inline(h[2]) + '</h' + lv + '>')
      i++
      continue
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push('<blockquote>' + renderMarkdown(buf.join('\n')) + '</blockquote>')
      continue
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push('<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>')
        i++
      }
      out.push('<ul>' + buf.join('') + '</ul>')
      continue
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push('<li>' + inline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>')
        i++
      }
      out.push('<ol>' + buf.join('') + '</ol>')
      continue
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(cells(lines[i]))
        i++
      }
      out.push(
        '<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>',
      )
      continue
    }

    // 空行
    if (line.trim() === '') {
      i++
      continue
    }

    // 普通段落
    out.push('<p>' + inline(line) + '</p>')
    i++
  }
  return out.join('\n')
}

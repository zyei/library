import { readFile, access, stat } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createMarkdownRenderer, resolveConfig } from 'vitepress'
import footnote from 'markdown-it-footnote'
import { root, loadLibrary, docRoute, editionBase } from './content.mjs'

const { outDir: output, site: { base } } = await resolveConfig(path.join(root, 'docs'), 'build', 'production')
const { editions } = await loadLibrary()
const md = await createMarkdownRenderer(path.join(root, 'content'), { config: md => md.use(footnote) })
const emphasisCount = (html, tag) => (html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')) || []).length
const cache = new Map()
async function getHtml(route) {
  const file = path.join(output, route.endsWith('/') ? route + 'index.html' : route)
  if (!cache.has(file)) cache.set(file, await readFile(file, 'utf8'))
  return cache.get(file)
}
async function checkLinks(html, route) {
  for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&')
    if (/^(?:https?:|mailto:|data:|#)/.test(href)) continue
    const url = new URL(href, `http://local${base.slice(0, -1)}${route}`)
    assert.ok(url.pathname.startsWith(base), `链接超出站点路径：${href}`)
    let target = '/' + decodeURIComponent(url.pathname.slice(base.length))
    await access(path.join(output, target.endsWith('/') ? target + 'index.html' : target))
    if (url.hash.startsWith('#p-')) assert.ok((await getHtml(target)).includes(`id="${url.hash.slice(1)}"`), `段落锚点缺失：${href}`)
  }
}
for (const { book, edition, documents } of editions) {
  const excluded = new Set(edition.website?.excludeTitles || [])
  if (edition.website?.includePreface === false) excluded.add('Preface')
  const included = documents.filter(d => !d.content_path.some(x => excluded.has(x)))
  const paragraphs = []
  let notes = 0
  for (const doc of included) {
    const route = docRoute(book.id, edition.id, doc)
    const html = await getHtml(route)
    assert.ok(html.includes(`class="book-text" lang="${edition.language}"`), '正文语言标记错误')
    if (doc.id !== 'root') {
      const original = md.render(doc.payload + '\n\n' + doc.notes)
      for (const tag of ['strong', 'em']) assert.equal(emphasisCount(html, tag), emphasisCount(original, tag), `原文强调格式变化：${route}`)
    }
    paragraphs.push(...[...html.matchAll(/\bid="p-(\d+)"/g)].map(x => Number(x[1])))
    notes += [...html.matchAll(/<li\b[^>]*\bid="fn\d+"/g)].length
    for (const ref of html.matchAll(/href="#(fn\d+|fnref\d+(?::\d+)?)"/g)) assert.ok(html.includes(`id="${ref[1]}"`), `脚注引用缺失：${route}#${ref[1]}`)
    await checkLinks(html, route)
  }
  if (edition.paragraphRange) {
    const [a, b] = edition.paragraphRange
    assert.deepEqual(paragraphs, Array.from({ length: b - a + 1 }, (_, i) => a + i), '原段落缺失、重复或乱序')
  }
  assert.equal(notes, included.reduce((n, d) => n + [...d.notes.matchAll(/^\[\^[^\]]+\]:/gm)].length, 0), '脚注数量变化')
  for (const d of documents.filter(d => d.content_path.some(x => excluded.has(x)))) {
    const route = docRoute(book.id, edition.id, d)
    const file = path.join(output, route.endsWith('/') ? route + 'index.html' : route)
    assert.equal(await stat(file).then(() => true, () => false), false, `非阅读内容被发布：${d.title}`)
  }
  if (edition.appendix) {
    const route = editionBase(book.id, edition.id) + 'proofreading.html'
    const html = await getHtml(route)
    assert.ok((await getHtml(docRoute(book.id, edition.id, included.at(-1)))).includes(base.slice(0, -1) + route), '正文末尾未连接附录')
    await checkLinks(html, route)
  }
}
assert.ok((await getHtml('/')).includes('lang="zh-CN"'), '网页 UI 必须为中文')
console.log('内容验证通过：正文段落、脚注、粗斜体、站内链接和校对附录完整。')

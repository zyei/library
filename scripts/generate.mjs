import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { root, loadLibrary, docRoute, editionBase } from './content.mjs'

const { catalog, editions } = await loadLibrary()
await rm(path.join(root, 'docs/books'), { recursive: true, force: true })
await rm(path.join(root, 'docs/public/reader-data'), { recursive: true, force: true })
const generated = path.join(root, 'docs/.vitepress/generated')
await mkdir(generated, { recursive: true })
const frontmatter = data => '---\n' + Object.entries(data).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n') + '\n---\n\n'
const sidebar = {}
const starts = new Map()
for (const { book, edition, documents: allDocuments, manifest } of editions) {
  const excluded = new Set(edition.website?.excludeTitles || [])
  if (edition.website?.includePreface === false) excluded.add('Preface')
  const allowed = allDocuments.filter(d => !d.content_path.some(t => excluded.has(t)))
  const files = new Set(allowed.map(d => d.file))
  const documents = allowed.map(d => ({ ...d, children: d.children.filter(f => files.has(f)) }))
  const byFile = new Map(documents.map(d => [d.file, d]))
  const prefix = editionBase(book.id, edition.id)
  const out = path.join(root, 'docs', prefix)
  await mkdir(out, { recursive: true })
  const paragraphs = Object.fromEntries(Object.entries(manifest.paragraphs).map(([n, p]) => [n, docRoute(book.id, edition.id, byFile.get(p.file)) + `#p-${n}`]))
  const first = edition.paragraphRange?.[0]
  starts.set(`${book.id}/${edition.id}`, paragraphs[first] || prefix)
  const publicDir = path.join(root, 'docs/public/reader-data', book.id)
  await mkdir(publicDir, { recursive: true })
  await writeFile(path.join(publicDir, `${edition.id}.json`), JSON.stringify({ paragraphs }))
  const appendix = edition.appendix ? { text: '附录：校对问题汇总', link: prefix + 'proofreading.html' } : null
  function sideItem(doc, depth = 0) {
    const value = { text: doc.title, link: docRoute(book.id, edition.id, doc) }
    if (doc.children.length && depth < 3) {
      value.collapsed = true
      value.items = doc.children.map(f => sideItem(byFile.get(f), depth + 1))
    }
    return value
  }
  sidebar[prefix] = [{ text: book.title, link: prefix, items: [
    ...documents[0].children.map(f => sideItem(byFile.get(f))),
    ...(appendix ? [appendix] : [])
  ] }]
  function rebaseLinks(payload, sourceFile = '') {
    return payload.replace(/\]\(([^)]+)\)/g, (all, href) => {
      if (/^(?:https?:|mailto:|tel:|#)/.test(href)) return all
      const [name, anchor] = href.split('#')
      const decoded = decodeURIComponent(name)
      const file = decoded.startsWith(book.title + '/') ? decoded.slice(book.title.length + 1) : path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), decoded))
      const target = byFile.get(file)
      if (!target) throw new Error(`Unmapped content link ${href}`)
      return `](${docRoute(book.id, edition.id, target)}${anchor ? '#' + anchor : ''})`
    })
  }
  for (const [i, doc] of documents.entries()) {
    let payload = doc.id === 'root' ? `# ${book.title}\n\n${book.subtitle || ''}\n\n${book.author}\n` : doc.payload
    const firstHeading = payload.match(/^(#{1,6}) /m)
    if (firstHeading) {
      const shift = firstHeading[1].length - 1
      payload = payload.replace(/^(#{1,6}) /gm, (_, s) => '#'.repeat(Math.max(1, s.length - shift)) + ' ')
    } else payload = `# ${doc.title}\n\n${payload}`
    payload = rebaseLinks(payload, doc.file)
    const childLinks = doc.children.map(f => ({ text: byFile.get(f).title, link: docRoute(book.id, edition.id, byFile.get(f)) }))
    if (doc.id === 'root' && appendix) childLinks.push(appendix)
    const children = childLinks.length ? '\n\n## 本篇目录\n\n' + childLinks.map(c => `- [${c.text}](${c.link})`).join('\n') + '\n' : ''
    const prev = documents[i - 1], next = documents[i + 1]
    const data = {
      title: doc.id === 'root' ? book.title : `${book.title} — ${doc.title}`,
      bookId: book.id, editionId: edition.id, bodyLang: edition.language, paragraphIds: doc.paragraphs,
      search: doc.word_count > 20,
      prev: prev ? { text: prev.title, link: docRoute(book.id, edition.id, prev) } : false,
      next: next ? { text: next.title, link: docRoute(book.id, edition.id, next) } : appendix || false
    }
    await writeFile(path.join(out, `${doc.key}.md`), frontmatter(data) + `<div class="book-text" lang="${edition.language}">\n\n` + payload + '\n</div>\n' + children + (doc.notes ? '\n' + doc.notes : ''))
  }
  if (appendix) {
    const last = documents.at(-1)
    const payload = rebaseLinks(await readFile(path.join(root, edition.appendix), 'utf8'))
    await writeFile(path.join(out, 'proofreading.md'), frontmatter({
      title: `${book.title} — ${appendix.text}`, bookId: book.id, editionId: edition.id, appendix: true, pageClass: 'proofreading-page',
      prev: { text: last.title, link: docRoute(book.id, edition.id, last) }, next: false
    }) + payload)
  }
}
const books = catalog.books.map(book => ({ ...book, editions: book.editions.map(({ directory, sourceSha256, website, appendix, ...edition }) => ({
  ...edition, startRoute: starts.get(`${book.id}/${edition.id}`)
})) }))
await writeFile(path.join(generated, 'catalog.json'), JSON.stringify({ books }))
await writeFile(path.join(generated, 'sidebar.json'), JSON.stringify(sidebar))

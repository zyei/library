import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

export const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)))
export const hash = text => createHash('sha256').update(text).digest('hex')
export function block(text, name) {
  const start = `<!-- ${name}:start -->\n`
  const stop = `<!-- ${name}:end -->`
  const from = text.indexOf(start)
  assert.ok(from >= 0, `Missing ${name} marker`)
  const end = text.indexOf(stop, from)
  assert.ok(end >= 0)
  return text.slice(from + start.length, end)
}
export const stripAnchors = text => text.replace(/<a id="p-\d+"><\/a>\n/g, '')
export function pageKey(doc) {
  if (doc.id === 'root') return 'index'
  const id = doc.id.replace(/^root\./, '').replaceAll('.', '-')
  const label = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-$/, '')
  return `${id}-${label || 'section'}`
}
export const editionBase = (bookId, editionId) => `/books/${bookId}/${editionId}/`
export const docRoute = (bookId, editionId, doc) => editionBase(bookId, editionId) + (doc.id === 'root' ? '' : `${pageKey(doc)}.html`)
export async function loadLibrary() {
  const catalog = JSON.parse(await readFile(path.join(root, 'content/catalog.json'), 'utf8'))
  const ids = new Set()
  const editions = []
  for (const book of catalog.books) {
    assert.match(book.id, /^[a-z0-9-]+$/)
    assert.ok(!ids.has(book.id), 'Duplicate book id')
    ids.add(book.id)
    const languageIds = new Set()
    for (const edition of book.editions) {
      assert.match(edition.id, /^[a-z0-9-]+$/)
      assert.match(edition.language, /^[a-zA-Z-]+$/)
      assert.ok(!languageIds.has(edition.id), 'Duplicate edition id')
      languageIds.add(edition.id)
      const directory = path.resolve(root, edition.directory)
      assert.ok(directory.startsWith(root + path.sep), 'Content must be self-contained in the project')
      const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'))
      const documents = []
      for (const doc of manifest.documents) {
        const text = await readFile(path.join(directory, doc.file), 'utf8')
        const payload = block(text, 'original-content')
        assert.equal(hash(stripAnchors(payload)), doc.payload_sha256, `Source text changed: ${doc.file}`)
        const notes = text.includes('<!-- local-footnotes:start -->') ? block(text, 'local-footnotes') : ''
        documents.push({ ...doc, payload, notes, key: pageKey(doc) })
      }
      const allParagraphs = documents.flatMap(d => [...d.payload.matchAll(/^\*\*(\d+)\.\*\*/gm)].map(x => Number(x[1])))
      if (edition.paragraphRange) {
        const [lo, hi] = edition.paragraphRange
        assert.deepEqual(allParagraphs, Array.from({ length: hi - lo + 1 }, (_, i) => i + lo), 'Original paragraph order must remain intact')
      }
      const definitions = documents.flatMap(d => [...d.notes.matchAll(/^\[\^([^\]]+)\]:/gm)].map(x => x[1]))
      if (edition.footnotes) assert.equal(new Set(definitions).size, edition.footnotes)
      for (const doc of documents) {
        const refs = new Set([...doc.payload.matchAll(/\[\^([^\]]+)\](?!:)/g)].map(x => x[1]))
        const defs = new Set([...doc.notes.matchAll(/^\[\^([^\]]+)\]:/gm)].map(x => x[1]))
        assert.deepEqual(refs, defs, `Unresolved local footnotes: ${doc.file}`)
      }
      editions.push({ book, edition, manifest, documents })
    }
  }
  return { catalog, editions }
}

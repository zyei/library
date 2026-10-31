import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)))
export function block(text, name) {
  const start = `<!-- ${name}:start -->\n`
  const stop = `<!-- ${name}:end -->`
  const from = text.indexOf(start)
  if (from < 0) throw new Error(`Missing ${name} marker`)
  const end = text.indexOf(stop, from)
  if (end < 0) throw new Error(`Missing ${name} end marker`)
  return text.slice(from + start.length, end)
}
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
  const editions = []
  for (const book of catalog.books) {
    for (const edition of book.editions) {
      const directory = path.resolve(root, edition.directory)
      const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'))
      const documents = await Promise.all(manifest.documents.map(async doc => {
        const text = await readFile(path.join(directory, doc.file), 'utf8')
        const payload = block(text, 'original-content')
        const notes = text.includes('<!-- local-footnotes:start -->') ? block(text, 'local-footnotes') : ''
        return { ...doc, payload, notes, key: pageKey(doc) }
      }))
      editions.push({ book, edition, manifest, documents })
    }
  }
  return { catalog, editions }
}

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { root } from './content.mjs'

const input = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(root, '../The Philosophy of Hegel')
const target = path.join(root, 'content/books/the-philosophy-of-hegel/en')
const manifest = JSON.parse(await readFile(path.join(input, 'split-manifest.json'), 'utf8'))
assert.equal(manifest.validation.status, 'passed', 'Import only the validated split edition')
assert.equal(manifest.validation.paragraphs, 760)
for (const doc of manifest.documents) {
  const destination = path.resolve(target, doc.file)
  assert.ok(destination.startsWith(target + path.sep), 'Manifest path escapes the content directory')
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(path.join(input, doc.file), destination)
}
await writeFile(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`已导入 ${manifest.documents.length} 个文档。`)

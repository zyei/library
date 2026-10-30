import { computed } from 'vue'
import { useData, useRouter, withBase } from 'vitepress'
import catalog from '../generated/catalog.json'

export { catalog }
export function useReader() {
  const { frontmatter } = useData()
  const router = useRouter()
  const book = computed(() => catalog.books.find(b => b.id === frontmatter.value.bookId))
  const edition = computed(() => book.value?.editions.find(e => e.id === frontmatter.value.editionId))
  const go = (path: string) => router.go(withBase(path))
  return { book, edition, frontmatter, go }
}

type ReadingMap = { paragraphs: Record<string, string> }
const maps = new Map<string, ReadingMap>()
export async function readingMap(book: string, edition: string) {
  const key = `${book}/${edition}`
  const cached = maps.get(key)
  if (cached) return cached
  const response = await fetch(withBase(`/reader-data/${key}.json`))
  if (!response.ok) throw new Error(response.statusText)
  const map: ReadingMap = await response.json()
  maps.set(key, map)
  return map
}

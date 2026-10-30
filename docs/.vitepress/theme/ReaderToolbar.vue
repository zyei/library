<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReader, readingMap } from './reader'

const props = defineProps<{ bookId: string; editionId: string; paragraphRange?: number[] }>()
const { frontmatter, go } = useReader()
const paragraph = ref(''), error = ref(''), size = ref(21)
const range = computed(() => {
  const ids = frontmatter.value.paragraphIds
  return ids.length ? ids.length === 1 ? `§ ${ids[0]}` : `§§ ${ids[0]}–${ids.at(-1)}` : ''
})
onMounted(() => {
  try { const stored = Number(localStorage.getItem('reading-room.font-size')); if (stored >= 18 && stored <= 25) size.value = stored } catch {}
  document.documentElement.style.setProperty('--reader-font-size', `${size.value}px`)
})
function resize(delta: number) {
  size.value += delta
  document.documentElement.style.setProperty('--reader-font-size', `${size.value}px`)
  try { localStorage.setItem('reading-room.font-size', String(size.value)) } catch {}
}
async function jump() {
  error.value = ''
  try {
    const map = await readingMap(props.bookId, props.editionId)
    const destination = map.paragraphs[Number(paragraph.value)]
    if (destination) go(destination)
    else error.value = '请输入有效的原书段落编号。'
  } catch { error.value = '段落定位数据暂不可用，请刷新后重试。' }
}
</script>

<template>
  <div class="reader-toolbar">
    <span class="reading-range">{{ range || '循章节阅读' }}</span>
    <div class="reader-actions">
      <div class="font-buttons" aria-label="阅读字号">
        <button type="button" :disabled="size <= 18" aria-label="减小字号" @click="resize(-1)">A−</button>
        <button type="button" :disabled="size >= 25" aria-label="增大字号" @click="resize(1)">A+</button>
      </div>
      <form v-if="paragraphRange" class="paragraph-jump" @submit.prevent="jump">
        <label for="paragraph-number">§</label>
        <input id="paragraph-number" v-model="paragraph" required inputmode="numeric" aria-label="原书段落编号" :placeholder="`${paragraphRange[0]}–${paragraphRange[1]}`" />
        <button type="submit">前往</button>
      </form>
    </div>
    <p v-if="error" class="jump-error" role="alert">{{ error }}</p>
  </div>
</template>

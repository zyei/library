<script setup lang="ts">
import DefaultTheme from 'vitepress/theme-without-fonts'
import { useReader } from './reader'
import ReaderToolbar from './ReaderToolbar.vue'
const { book, edition, frontmatter } = useReader()
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <template v-if="book && edition">
        <div class="book-kicker"><span>{{ book.author }}</span><span>{{ edition.role }}</span></div>
        <ReaderToolbar v-if="!frontmatter.appendix" :book-id="book.id" :edition-id="edition.id" :paragraph-range="edition.paragraphRange" />
      </template>
    </template>
  </DefaultTheme.Layout>
</template>

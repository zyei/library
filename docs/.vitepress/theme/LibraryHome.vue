<script setup lang="ts">
import { withBase } from 'vitepress'
import { catalog } from './reader'
</script>

<template>
  <div class="library-home vp-doc">
    <h1>书籍</h1>
    <article v-for="book in catalog.books" :key="book.id" class="book-card">
      <div class="book-cover" aria-hidden="true">
        <span class="cover-author">{{ book.author.toUpperCase() }}</span>
        <span class="cover-letter">{{ book.initial }}</span>
        <span class="cover-name">{{ book.title.toUpperCase() }}</span>
        <span class="cover-rule"></span>
      </div>
      <div class="book-information">
        <h2>{{ book.title }}</h2>
        <p>{{ book.subtitle }}</p>
        <p>作者：{{ book.author }}</p>
        <div v-for="edition in book.editions" :key="edition.id" class="edition-entry">
          <p>{{ edition.role }}<span v-if="edition.paragraphRange"> · §§ {{ edition.paragraphRange[0] }}–{{ edition.paragraphRange[1] }}</span></p>
          <div class="edition-links">
            <a :href="withBase(edition.startRoute)">开始阅读</a>
            <a :href="withBase(`/books/${book.id}/${edition.id}/`)">浏览章节</a>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

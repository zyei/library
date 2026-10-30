import { defineConfig } from 'vitepress'
import footnote from 'markdown-it-footnote'
import sidebar from './generated/sidebar.json'

const base = '/library/'

export default defineConfig({
  title: '书库',
  description: '书籍与章节阅读',
  lang: 'zh-CN',
  appearance: false,
  base,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }]],
  themeConfig: {
    logo: '/favicon.svg',
    nav: [{ text: '书架', link: '/' }],
    outline: { label: '本页内容', level: [2, 3] },
    sidebarMenuLabel: '章节目录',
    returnToTopLabel: '返回顶部',
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebar,
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索书籍正文' },
          modal: { noResultsText: '没有找到相关内容', resetButtonTitle: '清空', backButtonTitle: '关闭搜索', displayDetails: '显示上下文', footer: { selectText: '选择', navigateText: '移动', closeText: '关闭' } }
        }
      }
    }
  },
  markdown: {
    config(md) {
      md.use(footnote)
      md.renderer.rules.footnote_block_open = (_tokens, _index, _options, env) => {
        const language = env.frontmatter.bodyLang
        return `<section class="footnotes" lang="${language}" aria-label="脚注"><h2 id="footnotes">脚注</h2><ol class="footnotes-list">\n`
      }
    }
  }
})

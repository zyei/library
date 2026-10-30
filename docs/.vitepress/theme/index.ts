import DefaultTheme from 'vitepress/theme-without-fonts'
import Layout from './Layout.vue'
import LibraryHome from './LibraryHome.vue'
import '@fontsource-variable/literata/standard.css'
import '@fontsource-variable/literata/standard-italic.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) { app.component('LibraryHome', LibraryHome) }
}

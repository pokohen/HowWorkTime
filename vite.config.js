import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 테마 localStorage 키. define 으로 넣어 index.html 의 %THEME_KEY% 와 import.meta.env.THEME_KEY 양쪽에 주입된다 */
const THEME_KEY = 'how-work-time:theme'

export default defineConfig({
  base: '/HowWorkTime/',
  plugins: [vue()],
  define: {
    'import.meta.env.THEME_KEY': JSON.stringify(THEME_KEY),
  },
  test: {
    setupFiles: ['tests/setup.js'],
  },
})

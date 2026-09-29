import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { 테마저장키 } from './src/constants.js'

/** index.html 의 첫 렌더 테마 스크립트에 저장 키를 주입해 constants.js 와 한 곳에서 관리한다 */
function 테마키주입() {
  return {
    name: 'theme-key-inject',
    transformIndexHtml: (html) => html.replaceAll('%THEME_KEY%', 테마저장키),
  }
}

export default defineConfig({
  base: '/HowWorkTime/',
  plugins: [vue(), 테마키주입()],
  test: {
    setupFiles: ['tests/setup.js'],
  },
})

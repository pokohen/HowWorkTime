import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 테마 관련 값의 단일 출처. define 으로 넣어 index.html 의 %THEME_*% 플레이스홀더와
 * import.meta.env.THEME_* 양쪽에 주입된다. 앱 배경(--bg-app)은 index.html 인라인 스타일에서만 정의한다.
 */
const THEME_KEY = 'how-work-time:theme'
const THEME_BG_LIGHT = '#f7f8fa'
const THEME_BG_DARK = '#0d1117'

export default defineConfig({
  base: '/HowWorkTime/',
  plugins: [vue()],
  define: {
    'import.meta.env.THEME_KEY': JSON.stringify(THEME_KEY),
    'import.meta.env.THEME_BG_LIGHT': JSON.stringify(THEME_BG_LIGHT),
    'import.meta.env.THEME_BG_DARK': JSON.stringify(THEME_BG_DARK),
  },
  test: {
    setupFiles: ['tests/setup.js'],
  },
})

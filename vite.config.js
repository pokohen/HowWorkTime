import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 테마 관련 값의 단일 출처. define 으로 넣어 index.html 의 %THEME_*% 플레이스홀더와
 * import.meta.env.THEME_* 양쪽에 주입된다. 앱 배경(--bg-app)은 index.html 인라인 스타일에서만 정의한다.
 */
const THEME_KEY = 'how-work-time:theme'
const THEME_BG_LIGHT = '#f7f8fa'
const THEME_BG_DARK = '#0d1117'

/**
 * 모듈상태(import.meta.hot, …) 를 호출하는 모듈에 HMR 자체 수용 코드를 붙인다.
 * Vite 는 모듈 소스에 `import.meta.hot.accept(` 가 있어야 그 모듈의 dispose 를 실행하므로,
 * 파일마다 같은 줄을 적는 대신 여기서 한 번에 주입한다. (개발 서버 전용)
 */
function 모듈상태HMR() {
  return {
    name: 'module-state-hmr',
    apply: 'serve',
    transform(code, id) {
      // 헬퍼를 import 하는 모듈이 대상이다. 호출 문구로 고르면 별칭 import 나 변수로 넘긴 hot 을 놓쳐 리스너·타이머가 샌다
      if (id.includes('node_modules') || !/from\s+['"][^'"]*\/moduleState(?:\.js)?['"]/.test(code)) return null
      return {
        code: `${code}\nif (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())\n`,
        map: null,
      }
    },
  }
}

export default defineConfig({
  base: '/HowWorkTime/',
  plugins: [vue(), 모듈상태HMR()],
  // 동적 import 로만 쓰는 SDK 를 미리 번들해 둔다. 개발 중 첫 전송 때 뒤늦게 발견되면
  // Vite 가 의존성을 다시 최적화하며 페이지를 새로고침해 진행 중 요청이 끊긴다.
  optimizeDeps: {
    include: ['@anthropic-ai/sdk'],
  },
  define: {
    'import.meta.env.THEME_KEY': JSON.stringify(THEME_KEY),
    'import.meta.env.THEME_BG_LIGHT': JSON.stringify(THEME_BG_LIGHT),
    'import.meta.env.THEME_BG_DARK': JSON.stringify(THEME_BG_DARK),
  },
  test: {
    setupFiles: ['tests/setup.js'],
  },
})

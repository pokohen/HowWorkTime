import { ref, computed, watch } from 'vue'
import { 테마저장키 as 저장키 } from '../constants'
import { 저장소읽기, 저장소쓰기 } from '../utils/storage'
import { 모듈상태 } from './moduleState'

function 저장된테마() {
  const 값 = 저장소읽기(저장키)
  return 값 === 'light' || 값 === 'dark' ? 값 : null
}

function 시스템테마() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function 적용(값) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('theme-dark', 값 === 'dark')
  document.documentElement.classList.toggle('theme-light', 값 === 'light')
  // 브라우저 툴바 색을 앱 배경과 맞춘다 (같은 값이 index.html 의 --bg-app 에 주입된다)
  const 메타 = document.querySelector('meta[name="theme-color"]')
  if (메타) 메타.content = 값 === 'dark' ? import.meta.env.THEME_BG_DARK : import.meta.env.THEME_BG_LIGHT
}

const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const 테마 = ref(저장된테마() ?? 시스템테마())

  watch(테마, 적용, { immediate: true })

  // 사용자가 직접 고른 적이 없을 때만 시스템 테마를 따라간다.
  // 시스템 변경은 저장하지 않으므로 이후에도 계속 따라간다.
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const 시스템변경 = (e) => {
      if (저장된테마() == null) 테마.value = e.matches ? 'dark' : 'light'
    }
    mq.addEventListener('change', 시스템변경)
    정리등록(() => mq.removeEventListener('change', 시스템변경))
  }

  /** 사용자가 명시적으로 바꿀 때만 저장한다 */
  function 토글() {
    테마.value = 테마.value === 'dark' ? 'light' : 'dark'
    저장소쓰기(저장키, 테마.value)
  }

  const 다크모드 = computed(() => 테마.value === 'dark')

  return { 테마, 다크모드, 토글 }
})

export function useTheme() {
  return 상태
}

// 이 모듈을 고치면 Vite 가 통째로 다시 불러오게 한다. 모듈상태가 등록한 정리 함수(타이머·리스너)가 그때 실행된다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

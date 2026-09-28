import { ref, watch } from 'vue'

const 저장키 = 'how-work-time:theme'

function 저장된테마() {
  if (typeof localStorage === 'undefined') return null
  const 값 = localStorage.getItem(저장키)
  return 값 === 'light' || 값 === 'dark' ? 값 : null
}

function 시스템테마() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const 테마 = ref(저장된테마() ?? 시스템테마())

function 적용(값) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('theme-dark', 값 === 'dark')
  document.documentElement.classList.toggle('theme-light', 값 === 'light')
}

적용(테마.value)

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', (e) => {
    if (저장된테마() == null) {
      테마.value = e.matches ? 'dark' : 'light'
    }
  })
}

watch(테마, (값) => {
  적용(값)
  try { localStorage.setItem(저장키, 값) } catch (_) {}
})

export function 테마사용() {
  function 토글() {
    테마.value = 테마.value === 'dark' ? 'light' : 'dark'
  }
  return { 테마, 토글 }
}

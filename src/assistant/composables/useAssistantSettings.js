import { ref, computed, watch } from 'vue'
import { 어시스턴트설정키 } from '../../shared/constants'
import { 제공자목록, 제공자여부 } from '../ai/providers'
import { 기본설정, 설정직렬화, 설정복원 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기 } from '../../shared/utils/storage'
import { 모듈상태 } from '../../shared/composables/moduleState'

// 로컬 개발 편의용. 빌드에서는 import.meta.env.DEV 가 false 로 치환돼 이 분기가 사라진다.
// (CI 에는 이 변수를 두지 않는다 — 정적 사이트 번들에 키가 박히기 때문)
// vitest 도 DEV=true 이고 .env.local 을 읽으므로, 테스트에서는 개발용 키를 쓰지 않는다
function 개발용키(제공자) {
  if (!import.meta.env.DEV || import.meta.env.TEST) return ''
  return {
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
    openai: import.meta.env.VITE_OPENAI_API_KEY,
    gemini: import.meta.env.VITE_GEMINI_API_KEY,
  }[제공자] ?? ''
}

/** 쉬는 날 플래너의 제공자·모델·API 키. 이 브라우저 localStorage 에만 남는다 */
const 상태 = 모듈상태(import.meta.hot, () => {
  const 설정 = ref(설정복원(저장소읽기(어시스턴트설정키)))
  watch(설정, () => 저장소쓰기(어시스턴트설정키, 설정직렬화(설정.value)), { deep: true })

  const 제공자 = computed({
    get: () => 설정.value.제공자,
    set: (값) => { if (제공자여부(값)) 설정.value.제공자 = 값 },
  })
  const 제공자정보 = computed(() => 제공자목록[제공자.value])
  const 모델 = computed({
    get: () => 설정.value.모델[제공자.value],
    set: (값) => { 설정.value.모델[제공자.value] = String(값 ?? '').trim() || 제공자정보.value.기본모델 },
  })
  const 저장된키 = computed({
    get: () => 설정.value.키[제공자.value],
    set: (값) => { 설정.value.키[제공자.value] = String(값 ?? '').trim() },
  })
  const 현재키 = computed(() => 저장된키.value || 개발용키(제공자.value))
  const 키있음 = computed(() => 현재키.value.length > 0)
  const 개발용키사용중 = computed(() => !저장된키.value && 개발용키(제공자.value).length > 0)
  function 설정초기화() { 설정.value = 기본설정() }

  return { 설정, 제공자, 제공자정보, 모델, 저장된키, 현재키, 키있음, 개발용키사용중, 설정초기화 }
})

export function useAssistantSettings() {
  return 상태
}

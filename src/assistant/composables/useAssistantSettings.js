import { ref, computed, watch } from 'vue'
import { 어시스턴트설정키 } from '../../shared/constants'
import { 제공자목록, 제공자여부 } from '../ai/providers'
import { 기본설정, 설정직렬화, 설정복원, 설정합치기 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기, 다른창저장감시 } from '../../shared/utils/storage'
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
const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const 설정 = ref(설정복원(저장소읽기(어시스턴트설정키)))
  const 설정저장실패 = ref(false)
  /** 이 창이 마지막으로 저장했거나 받아들인 설정. 다른 창의 변경을 필드 단위로 합칠 때 '이 창에서 바꾼 것'을 가리는 기준 */
  let 마지막저장 = 설정복원(설정직렬화(설정.value))
  watch(설정, () => {
    설정저장실패.value = !저장소쓰기(어시스턴트설정키, 설정직렬화(설정.value))
    // 저장에 실패했으면 '이 창에서 바꾼 값'으로 남겨 둬 다른 창의 저장이 덮어쓰지 않게 한다
    if (!설정저장실패.value) 마지막저장 = 설정복원(설정직렬화(설정.value))
  }, { deep: true })
  // 다른 창에서 설정을 바꾸면 이 창에서 안 바꾼 필드만 따라간다 (고치던 키·모델은 지키고, 옛 설정이 새 키를 덮어쓰지 않게)
  정리등록(다른창저장감시(어시스턴트설정키, (새값) => {
    if (새값 == null) return
    const 남의설정 = 설정복원(새값)
    const 합친 = 설정합치기(설정.value, 마지막저장, 남의설정)
    마지막저장 = 남의설정
    if (설정직렬화(합친) !== 설정직렬화(설정.value)) 설정.value = 합친
  }))

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

  return { 설정, 설정저장실패, 제공자, 제공자정보, 모델, 저장된키, 현재키, 키있음, 개발용키사용중, 설정초기화 }
})

export function useAssistantSettings() {
  return 상태
}

// 이 모듈을 고치면 Vite 가 통째로 다시 불러오게 한다. 모듈상태가 등록한 정리 함수(타이머·리스너)가 그때 실행된다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

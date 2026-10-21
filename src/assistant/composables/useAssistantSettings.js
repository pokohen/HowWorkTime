import { ref, computed, watch } from 'vue'
import { 어시스턴트설정키 } from '../../shared/constants'
import { 제공자목록, 제공자여부 } from '../ai/providers'
import { 기본설정, 설정직렬화, 설정복원, 설정합치기 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기, 다른창저장감시 } from '../../shared/utils/storage'
import { 쓰기재시도 } from '../../shared/composables/useWriteRetry'
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
  /**
   * 다른 창이 지운 뒤 따라 바꾼 설정(직렬화 값). 이 값으로 바뀐 것은 쓰지 않는다 (지운 키가 곧바로 되살아나지 않게).
   * 직렬화 값으로 견주므로 같은 틈에 사용자가 고친 것은 그대로 저장된다
   */
  let 쓰지않을설정 = null
  /** 다른 창이 설정을 지워 이 창의 저장 못 한 수정을 버렸다 (실패 안내를 일부러 남긴다: 다시 입력해야 함을 알리게) */
  let 버려진수정 = false
  function 설정쓰기() {
    쓰기다시.거둠()
    버려진수정 = false
    설정저장실패.value = !저장소쓰기(어시스턴트설정키, 설정직렬화(설정.value))
    if (설정저장실패.value) 쓰기다시.실패함()
    // 저장에 실패했으면 '이 창에서 바꾼 값'으로 남겨 둬 다른 창의 저장이 덮어쓰지 않게 한다
    if (!설정저장실패.value) 마지막저장 = 설정복원(설정직렬화(설정.value))
  }
  // 쓰지 못한 설정(API 키 등)을 다시 써 보는 규칙 (공용: 공간이 생기면 바로, 설정 키가 늘면 간격 뒤, 떠날 때).
  // 저장소와 다른 것이 있을 때만 쓴다: 다른 창이 설정을 지워 이 창도 기본으로 돌아간 뒤에는 쓸 것이 없다(지움 유지)
  const 쓰기다시 = 쓰기재시도(정리등록, {
    키: 어시스턴트설정키,
    쓸것있음: () => 설정저장실패.value && 설정직렬화(설정.value) !== 설정직렬화(마지막저장),
    다시쓰기: () => 설정쓰기(),
  })
  watch(설정, () => {
    const 건너뜀 = 쓰지않을설정 !== null && 설정직렬화(설정.value) === 쓰지않을설정
    쓰지않을설정 = null
    if (!건너뜀) 설정쓰기()
  }, { deep: true })
  // 다른 창에서 설정을 바꾸면 이 창에서 안 바꾼 필드만 따라간다 (고치던 키·모델은 지키고, 옛 설정이 새 키를 덮어쓰지 않게).
  // 다른 창이 설정을 지웠으면(사이트 데이터 비우기 등) 이 창도 기본 설정으로 따라가고 그것을 다시 쓰지 않는다.
  // 지움은 비밀(API 키)을 없애려는 뜻일 수 있다. 저장이 실패해 남아 있던 필드도 지운다 (메모리에 남기면 다음 수정 때
  // 지운 키가 함께 저장돼 되살아난다). 이 창의 수정은 마이크로태스크에서 곧바로 쓰이므로 이벤트보다 늘 먼저 저장된다
  정리등록(다른창저장감시(어시스턴트설정키, (새값, e) => { // 새값: 지금 저장소 값 (다른창저장감시가 다시 읽어 준다)
    설정키바뀜(새값)
    쓰기다시.이키이벤트(e) // 합친 뒤의 상태로 재시도를 판단한다
    // 저장소가 이미 이 창의 설정과 같으면(다른 창이 같은 값을 씀) 낡은 실패 안내를 거둔다 (버려진 수정을 알리는 중이면 남긴다)
    if (설정저장실패.value && !버려진수정 && 설정직렬화(설정.value) === 설정직렬화(마지막저장)) 설정저장실패.value = false
  }))
  function 설정키바뀜(새값) {
    if (새값 == null) {
      마지막저장 = 기본설정()
      // 저장에 실패해 있던 수정은 여기서 버려진다. 실패 안내는 그대로 둬 다시 입력해야 함을 알린다 (조용히 잃지 않게)
      const 기본과다름 = 설정직렬화(설정.value) !== 설정직렬화(기본설정())
      // 정말 버린 수정이 있을 때만 (저장 못 한 것이 기본과 다를 때) 안내를 남긴다
      if (설정저장실패.value && 기본과다름) 버려진수정 = true
      if (기본과다름) {
        쓰지않을설정 = 설정직렬화(기본설정())
        설정.value = 기본설정()
      }
      return
    }
    const 남의설정 = 설정복원(새값)
    const 합친 = 설정합치기(설정.value, 마지막저장, 남의설정)
    마지막저장 = 남의설정
    if (설정직렬화(합친) !== 설정직렬화(설정.value)) 설정.value = 합친
  }

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

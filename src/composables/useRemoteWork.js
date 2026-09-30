import { ref, computed, watch } from 'vue'
import { 모듈상태 } from './moduleState'
import { useMonth } from './useMonth'

// 금요일 재택근무: 남은 금요일 중 신청한 일수만큼 8시간이 자동 인정된다.
// 그 날들은 유연근무가 불가능하므로 일평균 목표 계산의 분모(출근일)에서 제외한다.
const 상태 = 모듈상태(import.meta.hot, () => {
  const { 남은금요일, 월넘김횟수 } = useMonth()

  const 재택근무여부 = ref(false)
  // null 이면 '남은 금요일 전체'. 사용자가 고르면 그 값을 기억하되 남은 금요일 수를 넘지 않게 표시한다.
  const 재택근무일수 = ref(null)

  const 재택선택일수 = computed({
    get: () => Math.min(남은금요일.value, 재택근무일수.value ?? 남은금요일.value),
    set: (값) => { 재택근무일수.value = Math.max(0, Number(값) || 0) },
  })
  const 재택일수 = computed(() => (재택근무여부.value ? 재택선택일수.value : 0))

  // 달이 자동으로 넘어가면 재택 신청도 새 달 기준으로 다시 고르게 한다
  watch(월넘김횟수, () => {
    재택근무여부.value = false
    재택근무일수.value = null
  })

  return { 재택근무여부, 재택선택일수, 재택일수 }
})

export function useRemoteWork() {
  return 상태
}

// HMR: 스스로 수용해야 위 모듈상태의 dispose 가 실행되고, invalidate 로 사용하는 컴포넌트까지 갱신한다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

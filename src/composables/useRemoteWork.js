import { computed } from 'vue'
import { 모듈상태 } from './moduleState'
import { 월별상태 } from './monthScoped'
import { useMonth } from './useMonth'

// 재택근무: 남은 재택 가능일(재택 요일이면서 공휴일이 아닌 날) 중 신청한 일수만큼
// 유연근무가 불가능하므로 일평균 목표 계산의 분모(출근일)에서 제외한다.
const 상태 = 모듈상태(import.meta.hot, () => {
  const { 월키, 남은재택가능일 } = useMonth()

  const 재택근무여부 = 월별상태(월키, false)
  // null 이면 '남은 재택 가능일 전체'. 사용자가 고르면 그 값을 기억하되 남은 수를 넘지 않게 표시한다.
  const 재택근무일수 = 월별상태(월키, null)

  const 재택선택일수 = computed({
    get: () => Math.min(남은재택가능일.value, 재택근무일수.value ?? 남은재택가능일.value),
    set: (값) => { 재택근무일수.value = Math.max(0, Number(값) || 0) },
  })
  const 재택일수 = computed(() => (재택근무여부.value ? 재택선택일수.value : 0))

  return { 재택근무여부, 재택선택일수, 재택일수 }
})

export function useRemoteWork() {
  return 상태
}

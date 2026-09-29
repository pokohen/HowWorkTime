import { ref, computed, watch, watchEffect } from 'vue'
import { 모듈상태 } from './moduleState'
import { useMonth } from './useMonth'

// 금요일 재택근무: 남은 금요일 중 신청한 일수만큼 8시간이 자동 인정된다.
// 그 날들은 유연근무가 불가능하므로 일평균 목표 계산의 분모(출근일)에서 제외한다.
const 상태 = 모듈상태(import.meta.hot, () => {
  const { 남은금요일 } = useMonth()

  const 재택근무여부 = ref(false)
  const 재택근무일수 = ref(0)

  const 재택일수 = computed(() => {
    if (!재택근무여부.value) return 0
    return Math.max(0, Math.min(남은금요일.value, Number(재택근무일수.value) || 0))
  })

  // 처음 켤 때 남은 금요일 전체를 기본 선택
  watch(재택근무여부, (켜짐) => {
    if (켜짐 && 재택근무일수.value === 0) 재택근무일수.value = 남은금요일.value
  })
  // 월·입사일 변경으로 남은 금요일이 줄면 선택값 보정
  watchEffect(() => {
    if (재택근무일수.value > 남은금요일.value) 재택근무일수.value = 남은금요일.value
  })

  return { 재택근무여부, 재택근무일수, 재택일수 }
})

export function useRemoteWork() {
  return 상태
}

import { computed } from 'vue'
import { 하루근무분 } from '../constants'
import { 시분변환 } from '../utils/timeFormat'
import { 모듈상태 } from './moduleState'
import { useMonth } from './useMonth'
import { useWorkInput } from './useWorkInput'
import { useTodayWork } from './useTodayWork'
import { useRemoteWork } from './useRemoteWork'
import { useLeave } from './useLeave'

const 상태 = 모듈상태(import.meta.hot, () => {
  const { 의무근로분, 남은근무일, 이번달여부 } = useMonth()
  const { 입력분, 최대근로분 } = useWorkInput()
  const { 오늘예상분 } = useTodayWork()
  const { 재택일수 } = useRemoteWork()
  const { 연차일수환산 } = useLeave()

  // 계산에 반영되는 총 근무시간 = 누적 입력 + 오늘 예상 (오늘은 이번 달에만 속한다)
  const 오늘반영분 = computed(() => (이번달여부.value ? 오늘예상분.value : 0))
  const 반영분 = computed(() => 입력분.value + 오늘반영분.value)

  // ── 달성 현황 ──────────────────────────────────────────────
  const 달성률 = computed(() => {
    if (의무근로분.value === 0) return 0
    // 곱셈을 먼저 해서 부동소수 오차로 1% 낮게 나오는 것을 막는다 (예: 2784/9600)
    return Math.min(100, Math.floor((반영분.value * 100) / 의무근로분.value))
  })
  // 반영분 − 의무. 양수면 초과, 음수면 미달. 아래 파생값들은 모두 이 하나에서 나온다
  const 의무대비분 = computed(() => 반영분.value - 의무근로분.value)
  const 최대대비분 = computed(() => 반영분.value - 최대근로분.value)
  const 의무달성여부 = computed(() => 의무대비분.value >= 0)
  const 초과분 = computed(() => Math.max(0, 의무대비분.value))
  // 인라인 style 에 그대로 쓰는 CSS 토큰. 테마에 따라 값이 바뀐다.
  const 진행바색상 = computed(() => {
    if (달성률.value >= 100) return 'var(--accent-green)'
    if (달성률.value >= 70) return 'var(--tint-amber-text)'
    return 'var(--accent-blue)'
  })

  // ── 남은 계획 ──────────────────────────────────────────────
  // 재택·연차일의 8시간은 사용자가 '현재까지 근무시간'에 포함시키므로 이미 반영돼 있다.
  // 남은 의무에서 다시 빼지 않고(이중 차감 방지), 유연근무가 가능한 '출근일' 수로만 분배한다.
  const 출근남은일 = computed(() =>
    Math.max(0, 남은근무일.value - 재택일수.value - 연차일수환산.value),
  )
  // 재택·연차로 출근일이 남은 근무일보다 줄었는지 (부제·안내 문구 분기용)
  const 출근조정있음 = computed(() => 재택일수.value > 0 || 연차일수환산.value > 0)
  // '재택 3일 · 연차 0.5일' 처럼 카드 부제와 안내 문구에 같이 쓰는 내역
  const 출근조정내역 = computed(() =>
    [
      재택일수.value > 0 && `재택 ${재택일수.value}일`,
      연차일수환산.value > 0 && `연차 ${연차일수환산.value}일`,
    ].filter(Boolean).join(' · '),
  )
  const 남은의무분 = computed(() => Math.max(0, -의무대비분.value))
  // 카드 부제의 ' − 누적 X − 오늘 Y' 부분. 반영된 것이 없으면 빈 문자열
  const 차감내역 = computed(() =>
    [
      입력분.value > 0 && `누적 ${시분변환(입력분.value)}`,
      오늘반영분.value > 0 && `오늘 ${시분변환(오늘반영분.value)}`,
    ].filter(Boolean).map((항목) => ` − ${항목}`).join(''),
  )
  const 남은최대분 = computed(() => Math.max(0, 최대근로분.value - 반영분.value))

  // 반차 등으로 남은 출근일이 하루 미만(예: 0.25일)이면 하루로 나눠, 남은 시간보다 큰 '일평균'이 나오지 않게 한다
  const 일평균 = (남은분) =>
    출근남은일.value === 0 ? 0 : Math.round(남은분 / Math.max(1, 출근남은일.value))
  const 의무일평균분 = computed(() => 일평균(남은의무분.value))
  const 최대일평균분 = computed(() => 일평균(남은최대분.value))

  // 근무 마일리지: 남은 출근일을 매일 8시간씩 채웠을 때 의무 대비 초과(+)/부족(−)
  const 남은정규분 = computed(() => 출근남은일.value * 하루근무분)
  const 마일리지분 = computed(() => 남은정규분.value + 의무대비분.value)

  return {
    반영분, 오늘반영분,
    달성률, 의무달성여부, 초과분, 의무대비분, 최대대비분, 진행바색상,
    출근남은일, 출근조정있음, 출근조정내역, 차감내역, 남은의무분, 남은최대분, 의무일평균분, 최대일평균분,
    남은정규분, 마일리지분,
  }
})

export function useWorkResult() {
  return 상태
}

// HMR: 스스로 수용해야 위 모듈상태의 dispose 가 실행되고, invalidate 로 사용하는 컴포넌트까지 갱신한다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

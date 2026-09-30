import { ref, computed, watch, watchEffect } from 'vue'
import { 월말일수, 소정근로일수, 남은근무일수, 남은금요일수 } from '../utils/workDays'
import { 월공휴일, 공휴일데이터여부 } from '../utils/holidays'
import { 하루근무분 } from '../constants'
import { 모듈상태 } from './moduleState'
import { useToday } from './useToday'

const 상태 = 모듈상태(import.meta.hot, () => {
  const { 오늘, 현재연도, 현재월 } = useToday()

  // ── 선택 상태 ──────────────────────────────────────────────
  const 선택연도 = ref(현재연도.value)
  const 선택월 = ref(현재월.value)
  const 입사한달여부 = ref(false)
  const 입사일 = ref(오늘.value.getDate())

  // 자정을 넘겨 달이 바뀌면, 이번 달을 보고 있던 경우 선택도 새 달로 따라간다.
  // 이때 월넘김횟수가 올라가며, 누적 근무시간·연차·재택처럼 '그 달'에 속한 입력은 각 composable 이 초기화한다.
  const 월넘김횟수 = ref(0)
  watch([현재연도, 현재월], ([연도, 월], [이전연도, 이전월]) => {
    if (선택연도.value === 이전연도 && 선택월.value === 이전월) {
      선택연도.value = 연도
      선택월.value = 월
      입사한달여부.value = false // 입사는 지난 달의 일
      월넘김횟수.value++
    }
  })

  // 현재−1 ~ 현재+2. 해가 바뀌어 범위가 밀려도 보고 있던 연도는 목록에 남긴다
  const 연도목록 = computed(() => {
    const 목록 = Array.from({ length: 4 }, (_, i) => 현재연도.value - 1 + i)
    if (!목록.includes(선택연도.value)) 목록.push(선택연도.value)
    return 목록.sort((a, b) => a - b)
  })
  const 월목록 = Array.from({ length: 12 }, (_, i) => i + 1)

  const 월말일 = computed(() => 월말일수(선택연도.value, 선택월.value))
  const 일목록 = computed(() => Array.from({ length: 월말일.value }, (_, i) => i + 1))
  const 유효입사일 = computed(() => {
    if (!입사한달여부.value) return 1
    return Math.max(1, Math.min(월말일.value, Number(입사일.value) || 1))
  })

  const 선택월표시 = computed(() => `${선택연도.value}년 ${선택월.value}월`)
  // 선택 월이 이번 달에서 몇 달 떨어졌는지 (음수 = 과거)
  const 월차이 = computed(
    () => (선택연도.value * 12 + 선택월.value) - (현재연도.value * 12 + 현재월.value),
  )
  const 이번달여부 = computed(() => 월차이.value === 0)
  const 지난달여부 = computed(() => 월차이.value < 0)

  // 입사 체크를 켤 때 그 달의 기본값으로 시작: 이번 달이면 오늘, 아니면 1일
  watch(입사한달여부, (켜짐) => {
    if (켜짐) 입사일.value = 이번달여부.value ? 오늘.value.getDate() : 1
  })
  // 월을 바꿔 사용자가 고른 입사일이 말일을 넘기면 말일로만 보정 (그 외에는 유지)
  watchEffect(() => {
    if (입사한달여부.value && 입사일.value > 월말일.value) 입사일.value = 월말일.value
  })

  // ── 근무일 계산 ────────────────────────────────────────────
  const 소정근로일 = computed(() => 소정근로일수(선택연도.value, 선택월.value, 유효입사일.value))
  const 의무근로분 = computed(() => 소정근로일.value * 하루근무분)
  const 남은근무일 = computed(() => 남은근무일수(선택연도.value, 선택월.value, 유효입사일.value, 오늘.value))
  const 경과근무일 = computed(() => 소정근로일.value - 남은근무일.value)
  const 남은금요일 = computed(() => 남은금요일수(선택연도.value, 선택월.value, 유효입사일.value, 오늘.value))

  const 이달공휴일 = computed(() => 월공휴일(선택연도.value, 선택월.value))

  // ── 다음 달 ────────────────────────────────────────────────
  const 다음달 = computed(() => {
    const 월 = 선택월.value === 12 ? 1 : 선택월.value + 1
    const 연도 = 선택월.value === 12 ? 선택연도.value + 1 : 선택연도.value
    return { 연도, 월 }
  })
  const 다음달표시 = computed(() => `${다음달.value.연도}년 ${다음달.value.월}월`)
  const 다음달근로일 = computed(() => 소정근로일수(다음달.value.연도, 다음달.value.월))
  const 다음달의무분 = computed(() => 다음달근로일.value * 하루근무분)
  const 다음달공휴일 = computed(() => 월공휴일(다음달.value.연도, 다음달.value.월))

  const 공휴일있음 = computed(() => 공휴일데이터여부(선택연도.value))
  const 다음달공휴일있음 = computed(() => 공휴일데이터여부(다음달.value.연도))

  return {
    선택연도, 선택월, 입사한달여부, 입사일, 월넘김횟수,
    연도목록, 월목록, 일목록, 유효입사일,
    선택월표시, 월차이, 이번달여부, 지난달여부,
    소정근로일, 의무근로분, 남은근무일, 경과근무일, 남은금요일,
    이달공휴일, 공휴일있음,
    다음달표시, 다음달근로일, 다음달의무분, 다음달공휴일, 다음달공휴일있음,
  }
})

export function useMonth() {
  return 상태
}

// HMR: 스스로 수용해야 위 모듈상태의 dispose 가 실행되고, invalidate 로 사용하는 컴포넌트까지 갱신한다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

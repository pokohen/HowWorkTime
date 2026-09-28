import { ref, computed, watchEffect } from 'vue'
import { 소정근로일수, 남은근무일수, 남은금요일수 } from '../utils/workDays'
import { 월공휴일, 공휴일데이터여부 } from '../utils/holidays'
import { 하루근무분 } from '../constants'
import { useToday } from './useToday'

const { 오늘, 현재연도, 현재월 } = useToday()

// ── 선택 상태 ──────────────────────────────────────────────
const 선택연도 = ref(현재연도)
const 선택월 = ref(현재월)
const 입사한달여부 = ref(false)
const 입사일 = ref(오늘.getDate())

const 연도목록 = Array.from({ length: 4 }, (_, i) => 현재연도 - 1 + i)
const 월목록 = Array.from({ length: 12 }, (_, i) => i + 1)

const 월말일 = computed(() => new Date(선택연도.value, 선택월.value, 0).getDate())
const 일목록 = computed(() => Array.from({ length: 월말일.value }, (_, i) => i + 1))
const 유효입사일 = computed(() => {
  if (!입사한달여부.value) return 1
  return Math.max(1, Math.min(월말일.value, Number(입사일.value) || 1))
})

const 선택월표시 = computed(() => `${선택연도.value}년 ${선택월.value}월`)
const 이번달여부 = computed(() => 선택연도.value === 현재연도 && 선택월.value === 현재월)
const 지난달여부 = computed(() => {
  const 선택 = new Date(선택연도.value, 선택월.value - 1, 1)
  const 이번달 = new Date(현재연도, 현재월 - 1, 1)
  return 선택 < 이번달
})

// 월을 바꾸거나 입사 체크를 켰을 때 입사일이 범위를 벗어나면 보정
watchEffect(() => {
  if (!입사한달여부.value) return
  const 기본 = 이번달여부.value ? 오늘.getDate() : 1
  if (입사일.value < 1 || 입사일.value > 월말일.value) {
    입사일.value = Math.min(월말일.value, 기본)
  }
})

// ── 근무일 계산 ────────────────────────────────────────────
const 소정근로일 = computed(() => 소정근로일수(선택연도.value, 선택월.value, 유효입사일.value))
const 의무근로분 = computed(() => 소정근로일.value * 하루근무분)
const 남은근무일 = computed(() => 남은근무일수(선택연도.value, 선택월.value, 유효입사일.value))
const 경과근무일 = computed(() => 소정근로일.value - 남은근무일.value)
const 남은금요일 = computed(() => 남은금요일수(선택연도.value, 선택월.value, 유효입사일.value))

const 이달공휴일 = computed(() => 월공휴일(선택연도.value, 선택월.value))
const 공휴일있음 = computed(() => 공휴일데이터여부(선택연도.value))

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

export function useMonth() {
  return {
    선택연도, 선택월, 입사한달여부, 입사일,
    연도목록, 월목록, 일목록, 월말일, 유효입사일,
    선택월표시, 이번달여부, 지난달여부,
    소정근로일, 의무근로분, 남은근무일, 경과근무일, 남은금요일,
    이달공휴일, 공휴일있음,
    다음달표시, 다음달근로일, 다음달의무분, 다음달공휴일,
  }
}

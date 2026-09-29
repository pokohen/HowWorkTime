import { ref, computed } from 'vue'
import { 급여일조회 } from '../utils/workDays'
import { 요일이름 } from '../constants'
import { 모듈상태 } from './moduleState'

// 오늘 날짜. 자정이 지나거나 탭이 다시 보일 때 갱신되어 하루 넘겨 켜둬도 어긋나지 않는다.
const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const 오늘 = ref(new Date())

  function 갱신() {
    const 지금 = new Date()
    if (지금.toDateString() !== 오늘.value.toDateString()) 오늘.value = 지금
  }

  if (typeof document !== 'undefined') {
    const 복귀시갱신 = () => {
      if (document.visibilityState === 'visible') 갱신()
    }
    document.addEventListener('visibilitychange', 복귀시갱신)
    정리등록(() => document.removeEventListener('visibilitychange', 복귀시갱신))

    let 타이머
    const 자정예약 = () => {
      const 다음자정 = new Date()
      다음자정.setHours(24, 0, 0, 0)
      타이머 = setTimeout(() => { 갱신(); 자정예약() }, 다음자정 - Date.now() + 1000)
    }
    자정예약()
    정리등록(() => clearTimeout(타이머))
  }

  const 현재연도 = computed(() => 오늘.value.getFullYear())
  const 현재월 = computed(() => 오늘.value.getMonth() + 1)
  const 오늘요일 = computed(() => 오늘.value.getDay())
  const 오늘금요일여부 = computed(() => 오늘요일.value === 5)

  const 오늘표시 = computed(
    () => `${현재연도.value}년 ${현재월.value}월 ${오늘.value.getDate()}일 ${요일이름[오늘요일.value]}요일`,
  )
  const 재택안내 = computed(() =>
    오늘요일.value === 5 ? '오늘은 재택근무' :
    오늘요일.value === 4 ? '내일은 재택근무' : '',
  )

  // 이번 주(일~토)에 급여일이 포함되는지
  const 급여주여부 = computed(() => {
    const 급여일 = 급여일조회(현재연도.value, 현재월.value)
    const 주시작 = new Date(현재연도.value, 오늘.value.getMonth(), 오늘.value.getDate() - 오늘요일.value)
    const 주끝 = new Date(주시작)
    주끝.setDate(주끝.getDate() + 6)
    return 급여일 >= 주시작 && 급여일 <= 주끝
  })

  return { 오늘, 현재연도, 현재월, 오늘금요일여부, 오늘표시, 재택안내, 급여주여부 }
})

export function useToday() {
  return 상태
}

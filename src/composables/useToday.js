import { ref, computed } from 'vue'
import { 급여일조회, 재택가능일여부, 내일날짜 } from '../utils/workDays'
import { 요일이름 } from '../constants'
import { 모듈상태 } from './moduleState'

// 오늘 날짜. 자정이 지나거나 탭이 다시 보일 때 갱신되어 하루 넘겨 켜둬도 어긋나지 않는다.
const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const 오늘 = ref(new Date())

  function 갱신() {
    const 지금 = new Date()
    if (지금.toDateString() !== 오늘.value.toDateString()) 오늘.value = 지금
  }

  // 자정 하나만 예약하면 절전에서 깨어났을 때 늦게 울릴 수 있어, 1분마다 확인하고 화면 복귀 시에도 확인한다
  if (typeof window !== 'undefined') {
    const 타이머 = setInterval(갱신, 60_000)
    정리등록(() => clearInterval(타이머))
    for (const [대상, 이벤트] of [[document, 'visibilitychange'], [window, 'focus'], [window, 'pageshow']]) {
      대상.addEventListener(이벤트, 갱신)
      정리등록(() => 대상.removeEventListener(이벤트, 갱신))
    }
  }

  const 현재연도 = computed(() => 오늘.value.getFullYear())
  const 현재월 = computed(() => 오늘.value.getMonth() + 1)
  const 오늘요일 = computed(() => 오늘.value.getDay())
  // 재택 대상일: 재택 요일이면서 공휴일이 아닌 날 (남은재택가능일수 와 같은 기준)
  const 오늘재택가능여부 = computed(() => 재택가능일여부(오늘.value))
  const 내일재택가능여부 = computed(() => 재택가능일여부(내일날짜(오늘.value)))

  const 오늘표시 = computed(
    () => `${현재연도.value}년 ${현재월.value}월 ${오늘.value.getDate()}일 ${요일이름[오늘요일.value]}요일`,
  )
  const 재택안내 = computed(() =>
    오늘재택가능여부.value ? '오늘은 재택근무' :
    내일재택가능여부.value ? '내일은 재택근무' : '',
  )

  // 이번 주(일~토)에 급여일이 포함되는지
  const 급여주여부 = computed(() => {
    const 주시작 = new Date(현재연도.value, 오늘.value.getMonth(), 오늘.value.getDate() - 오늘요일.value)
    const 주끝 = new Date(주시작)
    주끝.setDate(주끝.getDate() + 6)
    // 주가 월 경계에 걸치면 양쪽 달의 급여일을 모두 본다
    return [주시작, 주끝].some((날짜) => {
      const 급여일 = 급여일조회(날짜.getFullYear(), 날짜.getMonth() + 1)
      return 급여일 >= 주시작 && 급여일 <= 주끝
    })
  })

  return { 오늘, 현재연도, 현재월, 오늘재택가능여부, 오늘표시, 재택안내, 급여주여부 }
})

export function useToday() {
  return 상태
}

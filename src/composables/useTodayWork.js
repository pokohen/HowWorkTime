import { ref, computed, watch } from 'vue'
import { 시분파싱, 시각파싱 } from '../utils/timeFormat'
import { 근무일여부 } from '../utils/workDays'
import { 모듈상태 } from './moduleState'
import { useToday } from './useToday'

// 오늘 하루의 예상 근무시간. 세 가지 방식 중 하나로 정한다.
//  - 재택: 8시간 자동 인정. 누적 근무시간에 이미 포함된 것으로 보고 0으로 계산
//  - 출퇴근: 출근·퇴근 시각과 휴게시간으로 계산
//  - 직접: "h:mm" 문자열 입력
const 상태 = 모듈상태(import.meta.hot, () => {
  const { 오늘, 오늘금요일여부 } = useToday()

  const 오늘재택근무 = ref(false)
  // 재택은 금요일에만 유효하다. 저장값을 고치는 대신 유효 여부를 파생시킨다
  const 오늘재택적용 = computed(() => 오늘재택근무.value && 오늘금요일여부.value)
  // 재택은 '오늘' 하루에 대한 선택이므로 날짜가 바뀌면 초기화 (다음 금요일에 저절로 켜지지 않도록)
  const 오늘예상시간 = ref('0:00')
  // '오늘'에 대한 입력은 날짜가 바뀌면 의미가 없으므로 모두 기본값으로 되돌린다 (출퇴근 시각은 매일 비슷하므로 유지)
  watch(오늘, () => {
    오늘재택근무.value = false
    오늘입력모드.value = 기본모드()
    오늘예상시간.value = '0:00'
  })
  // 주말·공휴일에는 출퇴근 기본값(09–18)이 8시간을 더해 버리므로 직접 입력(0:00)으로 시작한다
  const 기본모드 = () => (근무일여부(오늘.value) ? '출퇴근' : '직접')
  const 오늘입력모드 = ref(기본모드())
  const 출근시각 = ref('09:00')
  const 퇴근시각 = ref('18:00')
  const 휴게자동 = ref(true)
  const 휴게수동분 = ref(60)

  // ── 출퇴근 계산 ────────────────────────────────────────────
  const 출근분 = computed(() => 시각파싱(출근시각.value))
  const 퇴근분 = computed(() => 시각파싱(퇴근시각.value))
  const 출퇴근유효 = computed(() => 출근분.value !== null && 퇴근분.value !== null)
  const 자정넘김여부 = computed(() => 출퇴근유효.value && 퇴근분.value < 출근분.value)

  const 총체류분 = computed(() => {
    if (!출퇴근유효.value) return 0
    const 차 = 퇴근분.value - 출근분.value
    return 차 < 0 ? 차 + 24 * 60 : 차
  })
  // 5시간 초과 체류 시 휴게 1시간 자동 부여
  const 휴게자동분 = computed(() => (총체류분.value > 5 * 60 ? 60 : 0))
  const 휴게분 = computed(() => {
    if (!출퇴근유효.value) return 0
    return 휴게자동.value ? 휴게자동분.value : Math.max(0, Number(휴게수동분.value) || 0)
  })
  const 출퇴근근무분 = computed(() =>
    출퇴근유효.value ? Math.max(0, 총체류분.value - 휴게분.value) : 0,
  )

  // ── 최종값 ─────────────────────────────────────────────────
  const 오늘예상분 = computed(() => {
    if (오늘재택적용.value) return 0
    if (오늘입력모드.value === '출퇴근') return 출퇴근근무분.value
    return 시분파싱(오늘예상시간.value).분
  })

  // UI용: 재택 / 출퇴근 / 직접 을 하나의 세그먼트 값으로
  const 오늘모드 = computed(() => (오늘재택적용.value ? '재택' : 오늘입력모드.value))
  function 오늘모드설정(모드) {
    if (모드 === '재택') {
      오늘재택근무.value = true
      return
    }
    오늘재택근무.value = false
    오늘입력모드.value = 모드
  }

  return {
    오늘재택적용, 출근시각, 퇴근시각, 휴게자동, 휴게수동분, 오늘예상시간,
    자정넘김여부, 총체류분, 휴게분, 오늘예상분,
    오늘모드, 오늘모드설정,
  }
})

export function useTodayWork() {
  return 상태
}

// HMR: 스스로 수용해야 위 모듈상태의 dispose 가 실행되고, invalidate 로 사용하는 컴포넌트까지 갱신한다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

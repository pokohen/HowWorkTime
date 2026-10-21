import { 날짜키, 다음달 as 다음달계산, 월표시 } from '../../worktime/utils/workDays'
import { 월공휴일 } from '../../worktime/utils/holidays'
import { 남은연차문장 } from '../../worktime/utils/leaveBalance'
import { useToday } from '../../worktime/composables/useToday'
import { useMonth } from '../../worktime/composables/useMonth'
import { useWorkResult } from '../../worktime/composables/useWorkResult'
import { useLeave } from '../../worktime/composables/useLeave'
import { 연휴찾기 } from '../utils/longWeekends'

/** 연휴를 찾는 최대 범위(달). 몇 해 뒤를 보고 있어도 프롬프트가 지나치게 길어지지 않게 */
const 최대탐색개월 = 12

/**
 * 쉬는 날 플래너가 근무시간 계산기에서 읽어 오는 것들. assistant 가 worktime 상태(composable)를 읽는 곳은 여기 한 군데다.
 * 보내는 순간의 값을 모아 시스템프롬프트() 에 넘길 모양으로 돌려준다.
 */
export function usePlannerContext() {
  const { 오늘, 오늘표시, 재택안내, 급여주여부, 현재연도, 현재월 } = useToday()
  const { 선택월표시, 남은근무일, 선택연도, 선택월, 월차이, 이번달여부 } = useMonth()
  const { 출근남은일 } = useWorkResult()
  const { 연차일수환산, 남은연차조회 } = useLeave()

  function 컨텍스트수집() {
    // 계획은 앞날에 대한 것이다. 지난 달을 보고 있으면 그 달이 아니라 오늘이 속한 달부터 본다
    const 지난달보는중 = 월차이.value < 0
    const 기준연도 = 지난달보는중 ? 현재연도.value : 선택연도.value
    const 기준월 = 지난달보는중 ? 현재월.value : 선택월.value
    const { 연도: 다음연도, 월: 다음월 } = 다음달계산(기준연도, 기준월)
    // 연휴는 오늘이 속한 달부터 기준 달의 다음 달까지 한 번에 찾는다. 앞으로의 달을 보고 있어도
    // "가장 가까운 연휴"를 물으면 그 사이 연휴가 빠지면 안 된다. (따로 찾아 합치면 경계에 걸친 구간이 잘리거나 겹친다)
    const 오늘키 = 날짜키(오늘.value)
    const 개월수 = Math.min(Math.max(월차이.value, 0) + 2, 최대탐색개월)
    // 끝난 연휴와, 징검다리 날이 이미 지난 조합은 뺀다 (뒤쪽만 남은 부분은 따로 후보로 들어 있다). 지난 공휴일도 뺀다
    const 연휴 = 연휴찾기(현재연도.value, 현재월.value, undefined, 개월수)
      .filter((구간) => 구간.끝 >= 오늘키 && 구간.징검다리.every((날) => 날 > 오늘키)) // 오늘 쓸 연차는 제안할 수 없다
    const 앞날만 = (목록) => 목록.filter((h) => h.날짜 >= 오늘키)
    // 남은 연차는 연도별 값이라, 오늘·기준 달·다음 달이 걸친 해를 모두 준다 (12월에 1월을 계획하면 두 해가 필요하다)
    const 연도들 = [...new Set([현재연도.value, 기준연도, 다음연도])].sort()
    const 남은연차목록 = 연도들
      .map((연도) => ({ 연도, 남은: 남은연차문장(남은연차조회(연도)) }))
      .filter((항목) => 항목.남은)
    return {
      오늘표시: 오늘표시.value,
      이번달표시: 월표시(기준연도, 기준월),
      보는달이오늘달: 이번달여부.value,
      지난달보는중,
      보는달표시: 선택월표시.value,
      다음달표시: 월표시(다음연도, 다음월),
      이번달공휴일: 앞날만(월공휴일(기준연도, 기준월)),
      다음달공휴일: 앞날만(월공휴일(다음연도, 다음월)),
      연휴,
      // 근무일·연차 숫자는 보고 있는 달의 것이라, 지난 달을 보는 중에는 오늘 달과 섞이지 않게 뺀다
      남은근무일: 지난달보는중 ? null : 남은근무일.value,
      출근남은일: 지난달보는중 ? null : 출근남은일.value,
      연차일수: 지난달보는중 ? 0 : 연차일수환산.value,
      남은연차목록,
      재택안내: 재택안내.value,
      급여주여부: 급여주여부.value,
    }
  }

  return { 컨텍스트수집 }
}

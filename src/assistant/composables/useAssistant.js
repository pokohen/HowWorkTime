import { ref, computed, watch } from 'vue'
import { 어시스턴트저장키 } from '../../shared/constants'
import { 대화요청 } from '../ai/client'
import { 연휴찾기, 시스템프롬프트, 이력만들기 } from '../utils/assistantContext'
import { 날짜키, 다음달 as 다음달계산, 월표시 } from '../../worktime/utils/workDays'
import { 월공휴일 } from '../../worktime/utils/holidays'
import { 남은연차문장 } from '../../worktime/utils/leaveBalance'
import { 새탭, 새ID, 제목추출, 탭이름, 직렬화, 복원, 탭최대 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기 } from '../../shared/utils/storage'
import { 모듈상태 } from '../../shared/composables/moduleState'
import { useAssistantSettings } from './useAssistantSettings'
import { useToday } from '../../worktime/composables/useToday'
import { useMonth } from '../../worktime/composables/useMonth'
import { useWorkResult } from '../../worktime/composables/useWorkResult'
import { useLeave } from '../../worktime/composables/useLeave'

/** 모델에 보낼 최근 대화 수 (사용자+응답 합산). 오래된 것은 잘라 요청 크기를 억제한다 */
const 이력최대 = 40
/** 스트리밍 중 조각마다 저장하지 않도록 묶는 시간(ms) */
const 저장지연 = 400
/** 하단 알림이 떠 있는 시간(ms) */
const 알림표시시간 = 12_000

const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const { 오늘, 오늘표시, 재택안내, 급여주여부, 현재연도, 현재월 } = useToday()
  const { 선택월표시, 남은근무일, 선택연도, 선택월, 월차이, 이번달여부 } = useMonth()
  const { 출근남은일 } = useWorkResult()
  const { 연차일수환산, 남은연차조회 } = useLeave()
  const 설정상태 = useAssistantSettings()
  const { 제공자, 모델, 현재키 } = 설정상태

  // ── 모달 ──────────────────────────────────────────────────
  const 열림 = ref(false)
  const 설정열림 = ref(false)
  function 열기() { 열림.value = true; 알림닫기() }
  function 닫기() { 열림.value = false; 설정열림.value = false }
  function 토글() { 열림.value ? 닫기() : 열기() }

  // ── 대화 탭 ──────────────────────────────────────────────
  const 저장본 = 복원(저장소읽기(어시스턴트저장키))
  const 탭목록 = ref(저장본?.탭목록 ?? [새탭()])
  const 활성탭ID = ref(저장본?.활성탭ID ?? 탭목록.value[0].id)
  const 활성탭 = computed(() => 탭목록.value.find((탭) => 탭.id === 활성탭ID.value) ?? 탭목록.value[0])

  function 탭선택(id) {
    if (탭목록.value.some((탭) => 탭.id === id)) {
      활성탭ID.value = id
      설정열림.value = false
    }
  }
  /**
   * 이미 비어 있는 탭이 있으면 새로 만들지 않고 그 탭으로 간다.
   * 저장 상한(탭최대)을 넘기면 가장 오래된 탭을 지워, 화면과 저장되는 내용이 어긋나지 않게 한다
   */
  function 새탭추가() {
    const 빈탭 = 탭목록.value.find((탭) => 탭.메시지.length === 0)
    const 탭 = 빈탭 ?? 새탭()
    if (!빈탭) {
      while (탭목록.value.length >= 탭최대) {
        const 가장오래된 = 탭목록.value.findIndex((t) => t.id !== 응답중탭ID.value)
        if (가장오래된 === -1) break
        탭목록.value.splice(가장오래된, 1)
      }
      탭목록.value.push(탭)
      저장예약()
    }
    탭선택(탭.id)
    return 탭
  }
  function 탭삭제(id) {
    const 색인 = 탭목록.value.findIndex((탭) => 탭.id === id)
    if (색인 === -1) return
    // 지우는 탭이 응답을 받는 중이면 그 요청만 끊는다 (보고 있는 탭과는 무관)
    if (응답중탭ID.value === id) 중단()
    탭목록.value.splice(색인, 1)
    if (탭목록.value.length === 0) 탭목록.value.push(새탭())
    if (활성탭ID.value === id) 활성탭ID.value = 탭목록.value[Math.min(색인, 탭목록.value.length - 1)].id
    저장예약()
  }
  /** 모든 대화를 지우고 빈 탭 하나로 돌아간다. 저장은 watcher 가 빈 탭 상태로 덮어쓴다 */
  function 모든대화삭제() {
    if (전송중.value) 중단()
    탭목록.value = [새탭()]
    활성탭ID.value = 탭목록.value[0].id
    저장예약()
  }

  // 변경을 모아서 저장. 조각이 들어올 때마다 쓰지 않도록 지연시키고, 닫을 때는 바로 쓴다.
  // 탭 전체를 깊게 감시하면 조각마다 모든 메시지를 다시 훑게 되므로, 바꾸는 쪽에서 저장예약() 을 부른다
  let 저장타이머 = null
  function 저장() {
    clearTimeout(저장타이머)
    저장타이머 = null
    저장소쓰기(어시스턴트저장키, 직렬화({ 탭목록: 탭목록.value, 활성탭ID: 활성탭ID.value }))
  }
  function 저장예약() {
    if (저장타이머) return
    저장타이머 = setTimeout(저장, 저장지연)
  }
  watch(활성탭ID, 저장예약)
  // 받는 중에는 조각마다 저장하지 않으므로, 닫거나 떠날 때는 예약 여부와 무관하게 바로 쓴다
  watch(열림, (값) => { if (!값 && (저장타이머 || 전송중.value)) 저장() })
  if (typeof window !== 'undefined') {
    const 즉시저장 = () => { if (저장타이머 || 전송중.value) 저장() }
    window.addEventListener('pagehide', 즉시저장)
    정리등록(() => window.removeEventListener('pagehide', 즉시저장))
  }
  정리등록(() => { if (저장타이머) 저장() }) // 모듈이 다시 평가될 때(HMR) 예약된 저장을 버리지 않고 바로 쓴다

  // ── 알림 ──────────────────────────────────────────────────
  // 모달을 닫아 둔 채 응답이 끝나면 화면 하단에 띄운다. { 종류: 'done'|'error', 탭ID, 제목 }
  const 알림 = ref(null)
  let 알림타이머 = null
  function 알림닫기() {
    clearTimeout(알림타이머)
    알림타이머 = null
    알림.value = null
  }
  function 알림띄우기(종류, 탭) {
    알림닫기()
    알림.value = { 종류, 탭ID: 탭.id, 제목: 탭이름(탭) }
    알림타이머 = setTimeout(알림닫기, 알림표시시간)
  }
  /** 알림을 눌러 그 대화를 연다 */
  function 알림열기() {
    const 탭ID = 알림.value?.탭ID
    알림닫기()
    if (탭ID) 탭선택(탭ID)
    열기()
  }
  정리등록(() => clearTimeout(알림타이머))

  // ── 전송 ──────────────────────────────────────────────────
  const 전송중 = ref(false)
  let 중단컨트롤러 = null
  /** 지금 응답을 받고 있는 탭. 탭을 지울 때 어느 요청을 끊을지, 중단 버튼을 어느 탭에 보일지의 기준 */
  const 응답중탭ID = ref(null)
  /** 보고 있는 탭이 응답을 받는 중인지 (중단 버튼은 이 탭에만) */
  const 활성탭응답중 = computed(() => 전송중.value && 응답중탭ID.value === 활성탭ID.value)

  function 컨텍스트수집() {
    // 계획은 앞날에 대한 것이다. 지난 달을 보고 있으면 그 달이 아니라 오늘이 속한 달부터 본다
    const 지난달보는중 = 월차이.value < 0
    const 기준연도 = 지난달보는중 ? 현재연도.value : 선택연도.value
    const 기준월 = 지난달보는중 ? 현재월.value : 선택월.value
    const { 연도: 다음연도, 월: 다음월 } = 다음달계산(기준연도, 기준월)
    // 기준 달과 다음 달을 한 번에 찾는다 (따로 찾아 합치면 경계에 걸친 구간이 잘리거나 겹친다). 이미 끝난 연휴는 뺀다
    const 오늘키 = 날짜키(오늘.value)
    // 끝난 연휴와, 징검다리 날이 이미 지난 조합은 뺀다 (뒤쪽만 남은 부분은 따로 후보로 들어 있다). 지난 공휴일도 뺀다
    const 연휴 = 연휴찾기(기준연도, 기준월, undefined, 2)
      .filter((구간) => 구간.끝 >= 오늘키 && 구간.징검다리.every((날) => 날 >= 오늘키))
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

  async function 전송(텍스트) {
    const 내용 = String(텍스트 ?? '').trim()
    if (!내용 || 전송중.value) return
    const 탭 = 활성탭.value
    if (!탭.제목) 탭.제목 = 제목추출(내용)
    탭.메시지.push({ id: 새ID(), 역할: 'user', 내용, 시각: Date.now() })
    저장예약()
    await 응답받기(탭)
  }

  /** 탭의 마지막 사용자 메시지에 대한 응답을 받는다 (전송·재시도 공용) */
  async function 응답받기(탭) {
    const 이력 = 이력만들기(탭.메시지, 이력최대)
    탭.메시지.push({ id: 새ID(), 역할: 'assistant', 내용: '', 시각: Date.now(), 진행중: true })
    const 응답 = 탭.메시지[탭.메시지.length - 1]
    저장예약()

    전송중.value = true
    const 컨트롤러 = new AbortController()
    중단컨트롤러 = 컨트롤러
    응답중탭ID.value = 탭.id
    try {
      const { 잘림 } = await 대화요청({
        제공자: 제공자.value,
        키: 현재키.value,
        모델: 모델.value,
        시스템: 시스템프롬프트(컨텍스트수집()),
        메시지: 이력,
        신호: 컨트롤러.signal,
        조각: (조각) => { 응답.내용 += 조각 }, // 조각마다 전체를 직렬화하지 않는다. 끝·닫기·pagehide 때 저장
      })
      if (잘림) 응답.잘림 = true
      // 오류 없이 끝났는데 글자가 하나도 없으면(빈 end_turn, parts 없는 STOP) 빈 말풍선으로 두지 않고 다시 시도할 수 있게 한다
      if (!응답.내용.trim()) 응답.오류 = '모델이 빈 답을 돌려줬어요. 다시 시도해 주세요.'
    } catch (오류) {
      // 우리가 끊은 요청은 제공자가 어떤 예외를 던지든 '중단'이다
      if (컨트롤러.signal.aborted || 오류.종류 === 'abort') 응답.중단됨 = true
      else 응답.오류 = 오류.message
    } finally {
      응답.진행중 = false
      전송중.value = false
      중단컨트롤러 = null
      응답중탭ID.value = null
      저장예약()
      // 모달이 닫혀 있거나 다른 탭을 보고 있으면 끝났다고 알려 준다
      // (사용자가 직접 중단했거나 그 사이 탭을 지운 경우는 제외)
      const 탭남아있음 = 탭목록.value.some((t) => t.id === 탭.id)
      if (!응답.중단됨 && 탭남아있음 && (!열림.value || 활성탭ID.value !== 탭.id)) {
        알림띄우기(응답.오류 ? 'error' : 'done', 탭)
      }
    }
  }

  function 중단() {
    중단컨트롤러?.abort()
  }

  /** 실패·중단된 마지막 응답을 지우고 같은 질문으로 다시 요청한다 */
  async function 재시도() {
    if (전송중.value) return
    const 탭 = 활성탭.value
    const 마지막 = 탭.메시지[탭.메시지.length - 1]
    if (마지막?.역할 === 'assistant' && (마지막.오류 || 마지막.중단됨)) { 탭.메시지.pop(); 저장예약() }
    if (탭.메시지[탭.메시지.length - 1]?.역할 !== 'user') return
    await 응답받기(탭)
  }

  // 모듈이 다시 평가되거나 페이지가 떠날 때 진행 중 요청을 끊는다
  정리등록(() => 중단컨트롤러?.abort())

  return {
    열림, 설정열림, 열기, 닫기, 토글,
    탭목록, 활성탭ID, 활성탭, 탭선택, 새탭추가, 탭삭제, 모든대화삭제,
    ...설정상태, // 제공자·모델·키 (useAssistantSettings). 화면 쪽에서 한 번에 꺼내 쓰도록 펼쳐 둔다
    전송중, 응답중탭ID, 활성탭응답중, 전송, 중단, 재시도,
    알림, 알림열기, 알림닫기,
  }
})

export function useAssistant() {
  return 상태
}

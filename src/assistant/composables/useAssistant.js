import { ref, computed, watch } from 'vue'
import { 어시스턴트저장키 } from '../../shared/constants'
import { 대화요청 } from '../ai/client'
import { 시스템프롬프트 } from '../utils/systemPrompt'
import { 이력만들기 } from '../utils/history'
import { 새탭, 새ID, 제목추출, 탭이름, 직렬화, 복원, 탭최대 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기 } from '../../shared/utils/storage'
import { 모듈상태 } from '../../shared/composables/moduleState'
import { useAssistantSettings } from './useAssistantSettings'
import { usePlannerContext } from './usePlannerContext'

/** 모델에 보낼 최근 대화 수 (사용자+응답 합산). 오래된 것은 잘라 요청 크기를 억제한다 */
const 이력최대 = 40
/** 스트리밍 중 조각마다 저장하지 않도록 묶는 시간(ms) */
const 저장지연 = 400
/** 하단 알림이 떠 있는 시간(ms) */
const 알림표시시간 = 12_000

const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const { 컨텍스트수집 } = usePlannerContext()
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
    if (폐기됨 || 저장타이머) return
    저장타이머 = setTimeout(저장, 저장지연)
  }
  /** 예약된 저장이 있거나 받는 중이면 바로 쓴다 (받는 중에는 조각마다 저장하지 않으므로 떠날 때 몰아서 쓴다) */
  function 즉시저장() {
    if (저장타이머 || 전송중.value) 저장()
  }
  watch(활성탭ID, 저장예약)
  watch(열림, (값) => { if (!값) 즉시저장() })
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', 즉시저장)
    정리등록(() => window.removeEventListener('pagehide', 즉시저장))
  }
  // 정리 순서: 먼저 진행 중 요청을 끊고 폐기 표시를 한 뒤, 예약된 저장을 바로 쓴다 (끊긴 요청의 finally 가 옛 상태를 다시 저장하지 않게)
  정리등록(() => {
    즉시저장() // abort 의 finally 는 다음 마이크로태스크라 여기선 아직 전송중이다 → 받은 글까지 저장된다
    폐기됨 = true
    중단컨트롤러?.abort()
  })

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
    if (폐기됨) return
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
  // 모듈이 다시 평가되면(HMR) 이 클로저는 버려진다. 그 뒤에 끝나는 비동기 작업이 옛 상태를 저장하거나 알리지 않게 막는다
  let 폐기됨 = false
  /** 지금 응답을 받고 있는 탭. 탭을 지울 때 어느 요청을 끊을지, 중단 버튼을 어느 탭에 보일지의 기준 */
  const 응답중탭ID = ref(null)
  /** 보고 있는 탭이 응답을 받는 중인지 (중단 버튼은 이 탭에만) */
  const 활성탭응답중 = computed(() => 전송중.value && 응답중탭ID.value === 활성탭ID.value)

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

// 이 모듈을 고치면 Vite 가 통째로 다시 불러오게 한다. 모듈상태가 등록한 정리 함수(타이머·리스너)가 그때 실행된다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

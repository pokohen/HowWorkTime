import { ref, computed, watch } from 'vue'
import { 어시스턴트저장키, 어시스턴트잠금접두사 } from '../../shared/constants'
import { 대화요청 } from '../ai/client'
import { 시스템프롬프트 } from '../utils/systemPrompt'
import { 이력만들기 } from '../utils/history'
import { 새탭, 새ID, 제목추출, 탭이름, 직렬화, 복원, 대화합치기, 상한맞추기 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기, 다른창저장감시 } from '../../shared/utils/storage'
import { 모듈상태 } from '../../shared/composables/moduleState'
import { useAssistantSettings } from './useAssistantSettings'
import { usePlannerContext } from './usePlannerContext'

/** 모델에 보낼 최근 대화 수 (사용자+응답 합산). 오래된 것은 잘라 요청 크기를 억제한다 */
const 이력최대 = 40
/** 스트리밍 중 조각마다 저장하지 않도록 묶는 시간(ms) */
const 저장지연 = 400
/**
 * '받는 중' 판단은 브라우저 Web Locks 로 한다. 받는 창이 요청 내내 그 대화 이름의 잠금을 쥐고, 다른 창은 그 잠금이 풀리기를
 * 기다린다. 창을 닫거나 비정상 종료·탭 버리기가 일어나도 브라우저가 잠금을 풀어 주고, 숨겨진 창의 타이머 지연과도 무관하다.
 * (Web Locks 가 없는 환경에서는 다른 창이 받는 중인지 알 수 없으므로 중단됨으로 본다)
 */
const 잠금지원 = typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function'
const 잠금이름 = (탭ID) => `${어시스턴트잠금접두사}${탭ID}`

/** 이 대화를 받는 동안 잠금을 쥔다. 돌려준 함수를 부르면 놓는다 */
async function 받는동안잠그기(탭ID) {
  if (!잠금지원) return () => {}
  let 놓기
  const 끝 = new Promise((풀림) => { 놓기 = 풀림 })
  await new Promise((얻음) => { navigator.locks.request(잠금이름(탭ID), () => { 얻음(); return 끝 }) })
  return 놓기
}

/** 대화 목록에서 다른 창이 받는 중인 대화 id (마지막 답이 다른창받는중) */
const 다른창받는탭ID = (목록) => 목록.filter((탭) => 탭.메시지.at(-1)?.다른창받는중).map((탭) => 탭.id)

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
  // 저장본의 '받는중' 답은 일단 다른 창에서 받는 중으로 두고, 아래 잠금 확인이 곧바로 끊긴 것은 중단됨으로 바꾼다
  const 저장본 = 복원(저장소읽기(어시스턴트저장키))
  const 탭목록 = ref(저장본?.탭목록 ?? [새탭()])
  const 활성탭ID = ref(저장본?.활성탭ID ?? 탭목록.value[0].id)
  const 활성탭 = computed(() => 탭목록.value.find((탭) => 탭.id === 활성탭ID.value) ?? 탭목록.value[0])
  /** 지운 대화의 id → 지운 시각. 여러 창의 저장본을 합칠 때 지운 대화가 되살아나지 않게 한다 */
  const 삭제기록 = ref(저장본?.삭제기록 ?? {})
  /** 대화를 바꿨다고 표시한다. 여러 창의 저장본을 합칠 때 더 최근 쪽을 가리는 기준이다 */
  const 고침 = (탭) => { 탭.수정시각 = Date.now() }
  const 지움기록 = (id) => { 삭제기록.value = { ...삭제기록.value, [id]: Date.now() } }

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
      // 새 대화를 넣고 상한에 맞춘다. 어느 창이든 받는 중인 대화는 버리지 않는다 (공용 규칙: 상한맞추기)
      const 목록 = [...탭목록.value, 탭]
      const 기록 = { ...삭제기록.value }
      상한맞추기(목록, 기록, { 지킬ID: new Set([...다른창받는탭ID(목록), 탭.id, ...(응답중탭ID.value ? [응답중탭ID.value] : [])]) })
      탭목록.value = 목록
      삭제기록.value = 기록
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
    지움기록(id)
    탭목록.value.splice(색인, 1)
    if (탭목록.value.length === 0) 탭목록.value.push(새탭())
    if (활성탭ID.value === id) 활성탭ID.value = 탭목록.value[Math.min(색인, 탭목록.value.length - 1)].id
    저장예약()
  }
  /** 모든 대화를 지우고 빈 탭 하나로 돌아간다. 다른 창에 남은 같은 대화도 지워지도록 모두 삭제 기록에 남긴다 */
  function 모든대화삭제() {
    if (전송중.value) 중단()
    for (const 탭 of 탭목록.value) 지움기록(탭.id)
    탭목록.value = [새탭()]
    활성탭ID.value = 탭목록.value[0].id
    저장예약()
  }

  // 변경을 모아서 저장. 조각이 들어올 때마다 쓰지 않도록 지연시키고, 닫을 때는 바로 쓴다.
  // 탭 전체를 깊게 감시하면 조각마다 모든 메시지를 다시 훑게 되므로, 바꾸는 쪽에서 저장예약() 을 부른다
  let 저장타이머 = null
  const 저장실패 = ref(false)
  /** 이 창이 마지막으로 쓰거나 받아들인 저장본. 저장소가 그대로면 합치기를 건너뛴다 */
  let 마지막저장본 = null
  /** 합친 결과를 이 창 상태로. 내 쪽이 이긴 대화는 같은 객체라 받는 중인 응답의 참조가 그대로다. 바뀐 게 없으면 배열도 그대로 */
  function 합친것적용(합친) {
    const 새목록 = 합친.탭목록.length ? 합친.탭목록 : [새탭()]
    const 같음 = 새목록.length === 탭목록.value.length && 새목록.every((탭, i) => 탭 === 탭목록.value[i])
    if (!같음) 탭목록.value = 새목록
    삭제기록.value = 합친.삭제기록
    if (!탭목록.value.some((탭) => 탭.id === 활성탭ID.value)) 활성탭ID.value = 탭목록.value[탭목록.value.length - 1].id
  }
  /** 다른 창의 저장본과 대화 단위로 합친다 (통째로 바꿔치지 않는다) */
  function 다른창것과합치기(문자열) {
    if (!문자열 || 문자열 === 마지막저장본) return
    마지막저장본 = 문자열
    const 남의것 = 복원(문자열)
    if (!남의것) return
    // 이 창이 받고 있는 대화를 다른 창에서 지웠으면 요청을 끊고 지운 쪽을 따른다 (끝난 뒤 되살아나지 않게)
    const 받는탭 = 탭목록.value.find((탭) => 탭.id === 응답중탭ID.value)
    const 지운시각 = 받는탭 ? 남의것.삭제기록?.[받는탭.id] : undefined
    const 다른창에서지움 = 지운시각 != null && 지운시각 >= (받는탭.수정시각 ?? 0)
    if (다른창에서지움) 중단()
    // 받는 대화를 이 창에서 이미 지웠으면(목록에 없음) 고정하지 않는다. 고정하면 남의 사본이 되살아난다
    const 고정ID = 받는탭 && !다른창에서지움 ? 받는탭.id : null
    // 상한에서 버리지 않을 대화: 어느 쪽에서든 다른 창이 받는 중인 대화
    const 받는중 = new Set([...다른창받는탭ID(탭목록.value), ...다른창받는탭ID(남의것.탭목록)])
    합친것적용(대화합치기({ 탭목록: 탭목록.value, 삭제기록: 삭제기록.value }, 남의것, { 고정ID, 살아있는탭: 받는중 }))
  }
  function 저장() {
    clearTimeout(저장타이머)
    저장타이머 = null
    if (폐기됨) return // 모듈이 다시 평가된 뒤(HMR) 끝난 옛 작업이 새 상태 위에 쓰지 않게
    // 쓰기 전에 저장소의 최신본(다른 창이 쓴 것)과 먼저 합친다. 오래 받던 창이 끝나며 다른 창의 새 대화를 지우지 않게
    다른창것과합치기(저장소읽기(어시스턴트저장키))
    // 저장하지 못하면(공간이 가득 찼거나 브라우저가 막음) 입력창 아래 안내를 바꿔 알린다 (조용히 잃지 않게)
    const 글 = 직렬화({ 탭목록: 탭목록.value, 활성탭ID: 활성탭ID.value, 삭제기록: 삭제기록.value })
    저장실패.value = !저장소쓰기(어시스턴트저장키, 글)
    if (!저장실패.value) 마지막저장본 = 글
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
    // 떠날 때 받은 데까지 저장한다 (잠금은 브라우저가 풀어 준다)
    window.addEventListener('pagehide', 즉시저장)
    정리등록(() => window.removeEventListener('pagehide', 즉시저장))
    // 다른 창이 대화를 저장하면 대화 단위로 합친다. 이 창의 아직 저장 안 한 변경(예약된 저장)은 그대로 살아 있다
    정리등록(다른창저장감시(어시스턴트저장키, 다른창것과합치기))
  }
  // 정리 순서: 먼저 진행 중 요청을 끊고 폐기 표시를 한 뒤, 예약된 저장을 바로 쓴다 (끊긴 요청의 finally 가 옛 상태를 다시 저장하지 않게)
  정리등록(() => {
    즉시저장() // abort 의 finally 는 다음 마이크로태스크라 여기선 아직 전송중이다 → 받은 글까지 저장된다
    폐기됨 = true
    중단컨트롤러?.abort()
  })

  // ── 알림 ──────────────────────────────────────────────────
  // 모달을 닫아 둔 채 응답이 끝나면 화면 하단에 띄운다. { 종류: 'done'|'error'|'load', 탭ID, 제목 }
  const 알림 = ref(null)
  let 알림타이머 = null
  function 알림닫기() {
    clearTimeout(알림타이머)
    알림타이머 = null
    알림.value = null
  }
  /** @param {{ 종류: 'done'|'error'|'load', 탭ID: string|null, 제목: string }} 내용 */
  function 알림띄우기(내용) {
    if (폐기됨) return
    알림닫기()
    알림.value = 내용
    알림타이머 = setTimeout(알림닫기, 알림표시시간)
  }
  /** 플래너 모달을 받아 오지 못했을 때. 눌러서 새로고침한다 */
  function 불러오기실패알림() {
    알림띄우기({ 종류: 'load', 탭ID: null, 제목: '네트워크를 확인하거나 새로고침해 주세요' })
  }
  /** 알림을 눌러 그 대화를 연다 (불러오기 실패 알림이면 새로고침) */
  function 알림열기() {
    const { 탭ID, 종류 } = 알림.value ?? {}
    알림닫기()
    if (종류 === 'load') { if (typeof location !== 'undefined') location.reload(); return }
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
  /** 보고 있는 대화의 답을 다른 창이 받는 중인지. 그동안은 이 창에서 보내지 않는다 (두 창이 같은 대화에 쓰면 한쪽이 사라진다) */
  const 활성탭다른창받는중 = computed(() => Boolean(활성탭.value.메시지.at(-1)?.다른창받는중))

  // ── 다른 창이 받는 중인 답 지켜보기 ─────────────────────────
  // 그 대화의 잠금이 풀리기를 기다렸다가(받던 창이 끝났거나 닫힘), 저장본을 다시 읽어 끝난 답이면 반영하고
  // 아니면(닫히거나 죽음) 중단됨으로 바꿔 다시 시도할 수 있게 한다. 받던 창은 최종 저장 뒤에 잠금을 놓는다
  const 지켜보는중 = new Set()
  const 지켜보기중단 = new AbortController()
  function 끊김처리(탭ID) {
    지켜보는중.delete(탭ID)
    if (폐기됨) return
    다른창것과합치기(저장소읽기(어시스턴트저장키))
    const 탭 = 탭목록.value.find((t) => t.id === 탭ID)
    const m = 탭?.메시지.at(-1)
    if (!m?.다른창받는중) return
    delete m.다른창받는중
    m.중단됨 = true
    고침(탭)
    저장예약()
  }
  function 다른창받는답지켜보기() {
    for (const 탭ID of 다른창받는탭ID(탭목록.value)) {
      if (지켜보는중.has(탭ID)) continue
      지켜보는중.add(탭ID)
      if (!잠금지원) { 끊김처리(탭ID); continue }
      navigator.locks.request(잠금이름(탭ID), { signal: 지켜보기중단.signal }, () => 끊김처리(탭ID))
        .catch(() => 지켜보는중.delete(탭ID)) // 정리(HMR)로 기다림을 그만둔 경우
    }
  }
  watch(() => 다른창받는탭ID(탭목록.value).join(','), 다른창받는답지켜보기, { immediate: true })
  정리등록(() => 지켜보기중단.abort())

  async function 전송(텍스트) {
    const 내용 = String(텍스트 ?? '').trim()
    if (!내용 || 전송중.value || 활성탭다른창받는중.value) return false // 보내지 않았다 (입력창이 글을 되살린다)
    const 탭 = 활성탭.value
    if (!탭.제목) 탭.제목 = 제목추출(내용)
    탭.메시지.push({ id: 새ID(), 역할: 'user', 내용, 시각: Date.now() })
    고침(탭)
    저장예약()
    await 응답받기(탭)
    return true
  }

  /** 탭의 마지막 사용자 메시지에 대한 응답을 받는다 (전송·재시도 공용) */
  async function 응답받기(탭) {
    const 이력 = 이력만들기(탭.메시지, 이력최대)
    탭.메시지.push({ id: 새ID(), 역할: 'assistant', 내용: '', 시각: Date.now(), 진행중: true })
    고침(탭)
    const 응답 = 탭.메시지[탭.메시지.length - 1]
    저장예약()

    전송중.value = true
    const 컨트롤러 = new AbortController()
    중단컨트롤러 = 컨트롤러
    응답중탭ID.value = 탭.id
    // 받는 동안 이 대화의 잠금을 쥔다 (다른 창이 '받는 중'을 아는 기준)
    const 잠금놓기 = await 받는동안잠그기(탭.id)
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
      고침(탭)
      전송중.value = false
      중단컨트롤러 = null
      // 마지막 상태를 먼저 저장하고 나서 잠금을 놓는다 (기다리던 창이 저장본을 읽을 때 끝난 답이 있게)
      저장()
      잠금놓기()
      응답중탭ID.value = null
      // 모달이 닫혀 있거나 다른 탭을 보고 있으면 끝났다고 알려 준다
      // (사용자가 직접 중단했거나 그 사이 탭을 지운 경우는 제외)
      const 탭남아있음 = 탭목록.value.some((t) => t.id === 탭.id)
      if (!응답.중단됨 && 탭남아있음 && (!열림.value || 활성탭ID.value !== 탭.id)) {
        알림띄우기({ 종류: 응답.오류 ? 'error' : 'done', 탭ID: 탭.id, 제목: 탭이름(탭) })
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
    if (마지막?.역할 === 'assistant' && (마지막.오류 || 마지막.중단됨)) { 탭.메시지.pop(); 고침(탭); 저장예약() }
    if (탭.메시지[탭.메시지.length - 1]?.역할 !== 'user') return
    await 응답받기(탭)
  }


  return {
    열림, 설정열림, 열기, 닫기, 토글,
    탭목록, 활성탭ID, 활성탭, 탭선택, 새탭추가, 탭삭제, 모든대화삭제,
    ...설정상태, // 제공자·모델·키 (useAssistantSettings). 화면 쪽에서 한 번에 꺼내 쓰도록 펼쳐 둔다
    전송중, 응답중탭ID, 활성탭응답중, 활성탭다른창받는중, 전송, 중단, 재시도,
    알림, 알림열기, 알림닫기, 불러오기실패알림, 저장실패,
  }
})

export function useAssistant() {
  return 상태
}

// 이 모듈을 고치면 Vite 가 통째로 다시 불러오게 한다. 모듈상태가 등록한 정리 함수(타이머·리스너)가 그때 실행된다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

import { ref, computed, watch } from 'vue'
import { 어시스턴트저장키 } from '../constants'
import { 대화요청 } from '../ai/client'
import { 연휴찾기, 시스템프롬프트 } from '../utils/assistantContext'
import { 남은연차문장 } from '../utils/leaveBalance'
import { 새탭, 새ID, 제목추출, 직렬화, 복원 } from '../utils/assistantStorage'
import { 저장소읽기, 저장소쓰기, 저장소삭제 } from '../utils/storage'
import { 모듈상태 } from './moduleState'
import { useAssistantSettings } from './useAssistantSettings'
import { useToday } from './useToday'
import { useMonth } from './useMonth'
import { useWorkResult } from './useWorkResult'
import { useLeave } from './useLeave'

/** 모델에 보낼 최근 대화 수 (사용자+응답 합산). 오래된 것은 잘라 요청 크기를 억제한다 */
const 이력최대 = 40
/** 스트리밍 중 조각마다 저장하지 않도록 묶는 시간(ms) */
const 저장지연 = 400
/** 하단 알림이 떠 있는 시간(ms) */
const 알림표시시간 = 12_000

const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const { 오늘표시, 재택안내, 급여주여부 } = useToday()
  const { 선택월표시, 다음달표시, 이달공휴일, 다음달공휴일, 남은근무일, 선택연도, 선택월 } = useMonth()
  const { 출근남은일 } = useWorkResult()
  const { 연차일수환산, 남은연차분 } = useLeave()
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
  /** 이미 비어 있는 탭이 있으면 새로 만들지 않고 그 탭으로 간다 */
  function 새탭추가() {
    const 빈탭 = 탭목록.value.find((탭) => 탭.메시지.length === 0)
    const 탭 = 빈탭 ?? 새탭()
    if (!빈탭) 탭목록.value.push(탭)
    탭선택(탭.id)
    return 탭
  }
  function 탭삭제(id) {
    const 색인 = 탭목록.value.findIndex((탭) => 탭.id === id)
    if (색인 === -1) return
    if (전송중.value && 활성탭ID.value === id) 중단()
    탭목록.value.splice(색인, 1)
    if (탭목록.value.length === 0) 탭목록.value.push(새탭())
    if (활성탭ID.value === id) 활성탭ID.value = 탭목록.value[Math.min(색인, 탭목록.value.length - 1)].id
  }
  function 모든대화삭제() {
    if (전송중.value) 중단()
    탭목록.value = [새탭()]
    활성탭ID.value = 탭목록.value[0].id
    저장소삭제(어시스턴트저장키)
  }

  // 변경을 모아서 저장. 조각이 들어올 때마다 쓰지 않도록 지연시키고, 닫을 때는 바로 쓴다
  let 저장타이머 = null
  function 저장() {
    clearTimeout(저장타이머)
    저장타이머 = null
    저장소쓰기(어시스턴트저장키, 직렬화({ 탭목록: 탭목록.value, 활성탭ID: 활성탭ID.value }))
  }
  watch([탭목록, 활성탭ID], () => {
    if (저장타이머) return
    저장타이머 = setTimeout(저장, 저장지연)
  }, { deep: true })
  watch(열림, (값) => { if (!값 && 저장타이머) 저장() })
  if (typeof window !== 'undefined') {
    const 즉시저장 = () => { if (저장타이머) 저장() }
    window.addEventListener('pagehide', 즉시저장)
    정리등록(() => window.removeEventListener('pagehide', 즉시저장))
  }
  정리등록(() => clearTimeout(저장타이머))

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
    알림.value = { 종류, 탭ID: 탭.id, 제목: 탭.제목 || '새 대화' }
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

  function 컨텍스트수집() {
    const 연휴 = [
      ...연휴찾기(선택연도.value, 선택월.value),
      ...연휴찾기(...다음달연월()),
    ].filter((구간, i, 전체) => 전체.findIndex((g) => g.시작 === 구간.시작) === i)
    return {
      오늘표시: 오늘표시.value,
      이번달표시: 선택월표시.value,
      다음달표시: 다음달표시.value,
      이번달공휴일: 이달공휴일.value,
      다음달공휴일: 다음달공휴일.value,
      연휴,
      남은근무일: 남은근무일.value,
      출근남은일: 출근남은일.value,
      연차일수: 연차일수환산.value,
      남은연차: 남은연차문장(남은연차분.value) || null,
      재택안내: 재택안내.value,
      급여주여부: 급여주여부.value,
    }
  }
  function 다음달연월() {
    const d = new Date(선택연도.value, 선택월.value, 1) // 월은 0 기준이라 그대로 넣으면 다음 달
    return [d.getFullYear(), d.getMonth() + 1]
  }

  /** 모델에 보낼 이력: 실패·빈 응답은 빼고, 같은 역할이 이어지면 합친다 (첫 메시지는 user) */
  function 이력만들기(메시지들) {
    const 결과 = []
    for (const m of 메시지들) {
      if (m.역할 === 'assistant' && (!m.내용 || m.오류)) continue
      if (!m.내용) continue
      const 마지막 = 결과[결과.length - 1]
      if (마지막 && 마지막.역할 === m.역할) 마지막.내용 += `\n\n${m.내용}`
      else 결과.push({ 역할: m.역할, 내용: m.내용 })
    }
    while (결과.length && 결과[0].역할 !== 'user') 결과.shift()
    return 결과.slice(-이력최대)
  }

  async function 전송(텍스트) {
    const 내용 = String(텍스트 ?? '').trim()
    if (!내용 || 전송중.value) return
    const 탭 = 활성탭.value
    if (!탭.제목) 탭.제목 = 제목추출(내용)
    탭.메시지.push({ id: 새ID(), 역할: 'user', 내용, 시각: Date.now() })
    await 응답받기(탭)
  }

  /** 탭의 마지막 사용자 메시지에 대한 응답을 받는다 (전송·재시도 공용) */
  async function 응답받기(탭) {
    const 이력 = 이력만들기(탭.메시지)
    탭.메시지.push({ id: 새ID(), 역할: 'assistant', 내용: '', 시각: Date.now(), 진행중: true })
    const 응답 = 탭.메시지[탭.메시지.length - 1]

    전송중.value = true
    중단컨트롤러 = new AbortController()
    try {
      await 대화요청({
        제공자: 제공자.value,
        키: 현재키.value,
        모델: 모델.value,
        시스템: 시스템프롬프트(컨텍스트수집()),
        메시지: 이력,
        신호: 중단컨트롤러.signal,
        조각: (조각) => { 응답.내용 += 조각 },
      })
    } catch (오류) {
      if (오류.종류 === 'abort') 응답.중단됨 = true
      else 응답.오류 = 오류.message
    } finally {
      응답.진행중 = false
      전송중.value = false
      중단컨트롤러 = null
      // 모달이 닫혀 있거나 다른 탭을 보고 있으면 끝났다고 알려 준다 (사용자가 직접 중단한 경우는 제외)
      if (!응답.중단됨 && (!열림.value || 활성탭ID.value !== 탭.id)) {
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
    if (마지막?.역할 === 'assistant' && (마지막.오류 || 마지막.중단됨)) 탭.메시지.pop()
    if (탭.메시지[탭.메시지.length - 1]?.역할 !== 'user') return
    await 응답받기(탭)
  }

  // 모듈이 다시 평가되거나 페이지가 떠날 때 진행 중 요청을 끊는다
  정리등록(() => 중단컨트롤러?.abort())

  return {
    열림, 설정열림, 열기, 닫기, 토글,
    탭목록, 활성탭ID, 활성탭, 탭선택, 새탭추가, 탭삭제, 모든대화삭제,
    ...설정상태, // 제공자·모델·키 (useAssistantSettings). 화면 쪽에서 한 번에 꺼내 쓰도록 펼쳐 둔다
    전송중, 전송, 중단, 재시도,
    알림, 알림열기, 알림닫기,
  }
})

export function useAssistant() {
  return 상태
}

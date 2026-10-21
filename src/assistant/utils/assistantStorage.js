import { 제공자목록, 제공자여부, 기본제공자 } from '../ai/providers'

/** 저장 형식 버전. 구조를 바꾸면 올리고 복원에서 변환한다 */
const 저장버전 = 1
/** 보관 상한. 넘치면 오래된 것부터 버린다 */
export const 탭최대 = 20
export const 메시지최대 = 200
const 제목최대길이 = 18

export function 새ID() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 빈 대화 탭. 수정시각은 여러 브라우저 탭의 저장본을 합칠 때 어느 쪽이 최신인지 가리는 기준이다 */
export function 새탭(시각 = Date.now()) {
  return { id: 새ID(), 제목: '', 생성시각: 시각, 수정시각: 시각, 메시지: [] }
}

/** 삭제 기록 보관: 개수 상한과 기간. 둘 다 넘은 기록부터 버린다 (그보다 오래 열어 둔 창의 옛 대화는 되살아날 수 있다) */
const 삭제기록최대 = 500
const 삭제기록기간 = 30 * 24 * 60 * 60 * 1000

/** 문자열을 보이는 글자(grapheme) 단위로 나눈다. Intl.Segmenter 가 없으면 코드 포인트 단위로 */
function 글자단위(문자열) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(문자열), (조각) => 조각.segment)
  }
  return Array.from(문자열)
}

/** 화면에 보일 탭 이름. 아직 질문이 없으면 '새 대화' */
export function 탭이름(탭) {
  return 탭?.제목 || '새 대화'
}

/** 첫 질문에서 탭 제목을 뽑는다 (첫 줄, 공백 정리, 길이 제한) */
export function 제목추출(텍스트, 최대 = 제목최대길이) {
  const 한줄 = String(텍스트 ?? '').split('\n').map((줄) => 줄.trim()).find(Boolean) ?? ''
  const 정리 = 한줄.replace(/\s+/g, ' ')
  const 글자들 = 글자단위(정리) // 보이는 글자 단위. 코드 단위로 자르면 이모지·국기·가족 이모지 가운데가 잘린다
  return 글자들.length > 최대 ? `${글자들.slice(0, 최대).join('').trimEnd()}…` : 정리
}

/**
 * 저장할 모양으로 다듬는다. 아무 표시도 없는 빈 응답만 버린다.
 * 받는 도중이던 응답은 '받는중'으로 저장한다: 다른 창은 받는 중으로 보여 주고, 이 창을 새로 열면 중단됨으로 본다 (복원 참고)
 * @param {{ 탭목록: Array, 활성탭ID: string, 삭제기록?: Record<string, number> }} 상태
 * @returns {string} JSON
 */
export function 직렬화({ 탭목록, 활성탭ID, 삭제기록 = {} }) {
  const 탭들 = 탭목록.slice(-탭최대).map((탭) => ({
    id: 탭.id,
    제목: 탭.제목 ?? '',
    생성시각: 탭.생성시각,
    수정시각: 탭.수정시각 ?? 탭.생성시각,
    메시지: 탭.메시지
      .filter((m) => m.내용 || m.오류 || m.중단됨 || m.진행중 || m.다른창받는중)
      .slice(-메시지최대)
      .map((m) => {
        const 저장 = { id: m.id, 역할: m.역할, 내용: m.내용, 시각: m.시각 }
        if (m.오류) 저장.오류 = m.오류
        if (m.중단됨) 저장.중단됨 = true
        else if (m.진행중 || m.다른창받는중) {
          저장.받는중 = true
          if (m.잠금없이) 저장.잠금없이 = true // 받는 창이 잠금 없이 받는 중 (다른 창은 수정시각으로 판단)
        }
        if (m.잘림) 저장.잘림 = true
        return 저장
      }),
  }))
  return JSON.stringify({ 버전: 저장버전, 활성탭ID, 탭목록: 탭들, 삭제기록: 삭제기록정리(삭제기록) })
}

function 삭제기록정리(기록, 지금 = Date.now()) {
  const 항목들 = Object.entries(기록 ?? {})
    .filter(([id, 시각]) => typeof id === 'string' && Number.isFinite(Number(시각)) && 지금 - Number(시각) < 삭제기록기간)
    .sort((가, 나) => Number(나[1]) - Number(가[1]))
    .slice(0, 삭제기록최대)
  return Object.fromEntries(항목들.map(([id, 시각]) => [id, Number(시각)]))
}

/**
 * 저장된 JSON 을 상태로 되돌린다. 깨졌거나 모양이 다르면 null (호출 쪽이 기본 상태로 시작).
 * 메시지 단위로도 검증해 일부가 망가져도 나머지는 살린다.
 * '받는중' 응답은 다른창받는중으로 되돌린다. 정말 어느 창이 받고 있는지는 부르는 쪽이 잠금(Web Locks)으로 곧바로 확인해,
 * 받던 창이 없으면 중단됨으로 바꾼다 (useAssistant 의 '다른 창이 받는 중인 답 지켜보기').
 * @param {string|null} 문자열
 */
export function 복원(문자열) {
  if (!문자열) return null
  let 데이터
  try { 데이터 = JSON.parse(문자열) } catch { return null }
  if (!데이터 || typeof 데이터 !== 'object' || !Array.isArray(데이터.탭목록)) return null

  const 탭목록 = 데이터.탭목록
    .filter((탭) => 탭 && typeof 탭.id === 'string' && Array.isArray(탭.메시지))
    .map((탭) => ({
      id: 탭.id,
      제목: typeof 탭.제목 === 'string' ? 탭.제목 : '',
      생성시각: Number(탭.생성시각) || 0,
      수정시각: Number(탭.수정시각) || Number(탭.생성시각) || 0,
      메시지: 탭.메시지
        .filter((m) => m && (m.역할 === 'user' || m.역할 === 'assistant') && typeof m.내용 === 'string')
        .map((m) => {
          const 복구 = { id: typeof m.id === 'string' ? m.id : 새ID(), 역할: m.역할, 내용: m.내용, 시각: Number(m.시각) || 0 }
          if (typeof m.오류 === 'string') 복구.오류 = m.오류
          if (m.중단됨 === true) 복구.중단됨 = true
          else if (m.받는중 === true) {
            복구.다른창받는중 = true
            if (m.잠금없이 === true) 복구.잠금없이 = true
          }
          if (m.잘림 === true) 복구.잘림 = true
          return 복구
        }),
    }))
  const 삭제기록 = 삭제기록정리(데이터.삭제기록)
  if (탭목록.length === 0) return null // 창은 늘 대화를 하나 이상 가지므로 빈 목록은 깨진 저장값으로 본다

  const 활성탭ID = 탭목록.some((탭) => 탭.id === 데이터.활성탭ID) ? 데이터.활성탭ID : 탭목록[탭목록.length - 1].id
  return { 탭목록, 활성탭ID, 삭제기록 }
}

/**
 * 대화 수를 상한(탭최대)에 맞춘다. 만든 순서로 가장 오래된 것부터 버리되 지킬 대화(어느 창이든 받는 중)는 버리지 않고,
 * 버린 대화는 삭제 기록에 남겨 창마다 같은 것을 버리게 한다. 탭목록·삭제기록을 그 자리에서 고친다.
 * @param {Array} 탭목록 만든 순서로 정렬된 대화
 * @param {Record<string, number>} 삭제기록
 * @param {{ 지킬ID?: Set<string>, 상한?: number, 지금?: number }} [옵션]
 */
export function 상한맞추기(탭목록, 삭제기록, { 지킬ID = new Set(), 상한 = 탭최대, 지금 = Date.now() } = {}) {
  while (탭목록.length > 상한) {
    const 버릴 = 탭목록.findIndex((탭) => !지킬ID.has(탭.id))
    if (버릴 === -1) break
    삭제기록[탭목록[버릴].id] = Math.max(지금, 탭목록[버릴].수정시각 ?? 0)
    탭목록.splice(버릴, 1)
  }
}

/** 다른 창에서 아직 받는 중인 답인가 */
const 받는중인답 = (m) => Boolean(m.진행중 || m.다른창받는중 || m.받는중)
/** 다 받은 답 (오류·중단 없이 내용이 있다) */
const 다받은답 = (m) => m.역할 === 'assistant' && Boolean(m.내용) && !m.오류 && !m.중단됨 && !받는중인답(m)

/**
 * 같은 대화의 두 사본에서 메시지를 합친다. 기준 쪽(더 최근)을 바탕으로
 * - 기준에서 '다른 창이 받는 중'(또는 그 판단으로 중단됨)인 답이 다른 쪽에서 다 받은 답이면 그것으로 바꾸고
 * - 다른 쪽에만 있는 '질문 + 바로 뒤 답' 묶음을 질문 시각 순서에 맞춰 끼운다 (한 창이 예전 사본에 이어 써도 다른 창의 질문·답이
 *   사라지지 않게). 답이 아직 받는 중인 묶음, 답 없는 질문, 짝 없는 답(다시 시도로 지운 실패 답 등)은 옮기지 않는다.
 * 입력 배열은 바꾸지 않는다.
 * @returns {Array} 바꿀 것이 없으면 기준 배열 그대로
 */
export function 메시지합치기(기준, 다른쪽) {
  const 다른쪽색인 = new Map(다른쪽.map((m) => [m.id, m]))
  const 있음 = new Set(기준.map((m) => m.id))
  let 결과 = 기준
  기준.forEach((m, i) => {
    const 저쪽 = 다른쪽색인.get(m.id)
    if (저쪽 && (m.다른창받는중 || m.중단됨) && !m.진행중 && 다받은답(저쪽)) {
      if (결과 === 기준) 결과 = [...기준]
      결과[i] = 저쪽
    }
  })
  // 다른 쪽에만 있는 묶음과, 그 앞에 오는 공통 메시지(이음점)
  const 묶음들 = []
  let 앞ID = null
  for (let i = 0; i < 다른쪽.length; i++) {
    const m = 다른쪽[i]
    if (있음.has(m.id)) { 앞ID = m.id; continue }
    const 답 = 다른쪽[i + 1]
    if (m.역할 === 'user' && 답 && !있음.has(답.id) && 답.역할 === 'assistant' && !받는중인답(답)) {
      묶음들.push({ 앞ID, 메시지: [m, 답] })
      i++
    }
  }
  if (묶음들.length === 0) return 결과
  if (결과 === 기준) 결과 = [...기준]
  for (const 묶음 of 묶음들) {
    let 자리 = 묶음.앞ID == null ? 0 : 결과.findIndex((x) => x.id === 묶음.앞ID) + 1
    // 이음점의 답들은 건너뛰고, 그 뒤 기준 쪽 질문 가운데 이 질문보다 먼저 한 것은 (답과 함께) 앞에 둔다
    while (결과[자리]?.역할 === 'assistant') 자리++
    const 질문시각 = 묶음.메시지[0].시각 ?? 0
    while (결과[자리]?.역할 === 'user' && (결과[자리].시각 ?? 0) <= 질문시각) {
      자리++
      while (결과[자리]?.역할 === 'assistant') 자리++
    }
    결과.splice(자리, 0, ...묶음.메시지)
  }
  return 결과
}

/**
 * 두 창의 대화를 합친다. 대화(탭) id 별로 수정시각이 더 최근인 쪽을 쓰고, 다른 쪽에만 있는 끝난 메시지는 끼워 넣는다
 * (메시지합치기). 지운 기록이 더 최근이면 버린다.
 * 내 쪽이 이기면 내 탭 객체를 그대로 돌려줘, 받는 중인 응답이 쥐고 있는 참조가 끊기지 않는다.
 * 통째로 바꿔치지 않으므로 한 창의 옛 목록이 다른 창의 새 대화를 지우지 않는다.
 * @param {{ 탭목록: Array, 삭제기록?: Record<string, number> }} 내것
 * @param {{ 탭목록: Array, 삭제기록?: Record<string, number> } | null} 남의것
 * 상한(탭최대)을 넘으면 오래된 대화부터 버리되 고정ID 는 지키고, 버린 대화는 삭제 기록에 남겨 창마다 같은 것을 버리게 한다.
 * @param {{ 고정ID?: string|null, 살아있는탭?: Set<string>, 지금?: number }} [옵션]
 *   고정ID: 이 창에서 지금 받는 중인 탭(늘 내 것을 쓴다). 살아있는탭: 어느 창이든 받는 중인 탭(상한에서 버리지 않는다)
 * @returns {{ 탭목록: Array, 삭제기록: Record<string, number> }}
 */
export function 대화합치기(내것, 남의것, { 고정ID = null, 살아있는탭 = new Set(), 지금 = Date.now() } = {}) {
  if (!남의것) return { 탭목록: 내것.탭목록, 삭제기록: 삭제기록정리(내것.삭제기록, 지금) }
  const 삭제기록 = { ...(남의것.삭제기록 ?? {}) }
  for (const [id, 시각] of Object.entries(내것.삭제기록 ?? {})) 삭제기록[id] = Math.max(시각, 삭제기록[id] ?? 0)

  const 수정 = (탭) => 탭.수정시각 ?? 탭.생성시각 ?? 0
  const 남의 = new Map(남의것.탭목록.map((탭) => [탭.id, 탭]))
  const 결과 = new Map()
  for (const 탭 of 내것.탭목록) {
    const 저쪽 = 남의.get(탭.id)
    const 이긴 = 탭.id === 고정ID || !저쪽 || 수정(탭) >= 수정(저쪽) ? 탭 : 저쪽
    const 합친 = 저쪽 ? 메시지합치기(이긴.메시지, (이긴 === 탭 ? 저쪽 : 탭).메시지) : 이긴.메시지
    if (합친 === 이긴.메시지) 결과.set(탭.id, 이긴)
    else if (이긴 === 탭) { 탭.메시지 = 합친; 결과.set(탭.id, 탭) } // 내 탭 객체는 그대로 고친다 (받는 중인 응답의 참조를 지킨다)
    else 결과.set(탭.id, { ...저쪽, 메시지: 합친 }) // 남의 것은 고치지 않는다
  }
  for (const 탭 of 남의것.탭목록) if (!결과.has(탭.id)) 결과.set(탭.id, 탭)

  const 탭목록 = [...결과.values()]
    .filter((탭) => 탭.id === 고정ID || !(삭제기록[탭.id] >= 수정(탭)))
    .sort((가, 나) => (가.생성시각 ?? 0) - (나.생성시각 ?? 0))
  상한맞추기(탭목록, 삭제기록, { 지킬ID: new Set([...살아있는탭, ...(고정ID ? [고정ID] : [])]), 지금 })
  return { 탭목록, 삭제기록: 삭제기록정리(삭제기록, 지금) }
}

/** 제공자별 모델·키를 담는 설정. 키는 이 브라우저 localStorage 에만 머문다 */
export function 기본설정() {
  return {
    제공자: 기본제공자,
    모델: Object.fromEntries(Object.entries(제공자목록).map(([id, 정보]) => [id, 정보.기본모델])),
    키: Object.fromEntries(Object.keys(제공자목록).map((id) => [id, ''])),
  }
}

export function 설정직렬화(설정) {
  return JSON.stringify({ 버전: 저장버전, 제공자: 설정.제공자, 모델: 설정.모델, 키: 설정.키 })
}

/**
 * 다른 창의 설정을 필드 단위로 받아들인다. 이 창에서 마지막 저장 뒤로 바꾸지 않은 필드만 남의 값으로 바꾼다
 * (이 창에서 고치던 키·모델을 다른 창의 저장이 덮어쓰지 않게).
 * @param {object} 내설정 지금 이 창의 설정
 * @param {object} 마지막저장 이 창이 마지막으로 저장(또는 받아들인) 설정
 * @param {object} 남의설정 다른 창이 저장한 설정
 */
export function 설정합치기(내설정, 마지막저장, 남의설정) {
  const 결과 = { 제공자: 내설정.제공자, 모델: { ...내설정.모델 }, 키: { ...내설정.키 } }
  if (내설정.제공자 === 마지막저장.제공자) 결과.제공자 = 남의설정.제공자
  for (const 묶음 of ['모델', '키']) {
    for (const id of Object.keys(결과[묶음])) {
      if (내설정[묶음][id] === 마지막저장[묶음]?.[id]) 결과[묶음][id] = 남의설정[묶음]?.[id] ?? 결과[묶음][id]
    }
  }
  return 결과
}

/** 저장된 설정을 기본값 위에 덧씌운다. 모르는 제공자 항목은 무시한다 */
export function 설정복원(문자열) {
  const 설정 = 기본설정()
  if (!문자열) return 설정
  let 데이터
  try { 데이터 = JSON.parse(문자열) } catch { return 설정 }
  if (!데이터 || typeof 데이터 !== 'object') return 설정
  if (제공자여부(데이터.제공자)) 설정.제공자 = 데이터.제공자
  for (const id of Object.keys(제공자목록)) {
    if (typeof 데이터.모델?.[id] === 'string' && 데이터.모델[id].trim()) 설정.모델[id] = 데이터.모델[id].trim()
    if (typeof 데이터.키?.[id] === 'string') 설정.키[id] = 데이터.키[id].trim()
  }
  return 설정
}

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

/** 빈 대화 탭 */
export function 새탭(시각 = Date.now()) {
  return { id: 새ID(), 제목: '', 생성시각: 시각, 메시지: [] }
}

/** 첫 질문에서 탭 제목을 뽑는다 (첫 줄, 공백 정리, 길이 제한) */
export function 제목추출(텍스트, 최대 = 제목최대길이) {
  const 한줄 = String(텍스트 ?? '').split('\n').map((줄) => 줄.trim()).find(Boolean) ?? ''
  const 정리 = 한줄.replace(/\s+/g, ' ')
  return 정리.length > 최대 ? `${정리.slice(0, 최대).trimEnd()}…` : 정리
}

/**
 * 저장할 모양으로 다듬는다. 진행 중 표시 같은 일시 상태는 '중단됨'으로 바꾸고, 아무 표시도 없는 빈 응답만 버린다.
 * @returns {string} JSON
 */
export function 직렬화({ 탭목록, 활성탭ID }) {
  const 탭들 = 탭목록.slice(-탭최대).map((탭) => ({
    id: 탭.id,
    제목: 탭.제목 ?? '',
    생성시각: 탭.생성시각,
    메시지: 탭.메시지
      .filter((m) => m.내용 || m.오류 || m.중단됨 || m.진행중)
      .slice(-메시지최대)
      .map((m) => {
        const 저장 = { id: m.id, 역할: m.역할, 내용: m.내용, 시각: m.시각 }
        if (m.오류) 저장.오류 = m.오류
        // 받는 도중이던 응답은 다시 열었을 때 '중단됨'으로 보여 다시 시도할 수 있게 한다 (새로고침 대비)
        if (m.중단됨 || m.진행중) 저장.중단됨 = true
        if (m.잘림) 저장.잘림 = true
        return 저장
      }),
  }))
  return JSON.stringify({ 버전: 저장버전, 활성탭ID, 탭목록: 탭들 })
}

/**
 * 저장된 JSON 을 상태로 되돌린다. 깨졌거나 모양이 다르면 null (호출 쪽이 기본 상태로 시작).
 * 메시지 단위로도 검증해 일부가 망가져도 나머지는 살린다.
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
      메시지: 탭.메시지
        .filter((m) => m && (m.역할 === 'user' || m.역할 === 'assistant') && typeof m.내용 === 'string')
        .map((m) => {
          const 복구 = { id: typeof m.id === 'string' ? m.id : 새ID(), 역할: m.역할, 내용: m.내용, 시각: Number(m.시각) || 0 }
          if (typeof m.오류 === 'string') 복구.오류 = m.오류
          if (m.중단됨 === true) 복구.중단됨 = true
          if (m.잘림 === true) 복구.잘림 = true
          return 복구
        }),
    }))
  if (탭목록.length === 0) return null

  const 활성탭ID = 탭목록.some((탭) => 탭.id === 데이터.활성탭ID) ? 데이터.활성탭ID : 탭목록[탭목록.length - 1].id
  return { 탭목록, 활성탭ID }
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

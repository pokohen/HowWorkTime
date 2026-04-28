import { 연도별공휴일조회 } from './공휴일'

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 * @param {Date} 날짜
 * @returns {string}
 */
function 날짜문자열변환(날짜) {
  const 연도값 = 날짜.getFullYear()
  const 월값 = String(날짜.getMonth() + 1).padStart(2, '0')
  const 일값 = String(날짜.getDate()).padStart(2, '0')
  return `${연도값}-${월값}-${일값}`
}

/**
 * 주말 여부 확인
 * @param {Date} 날짜
 * @returns {boolean}
 */
function 주말여부확인(날짜) {
  const 요일 = 날짜.getDay()
  return 요일 === 0 || 요일 === 6 // 일요일(0) 또는 토요일(6)
}

/**
 * 특정 월의 소정 근로일 수 계산 (주말 및 공휴일 제외)
 * @param {number} 연도
 * @param {number} 월 - 1~12
 * @param {number} [시작일=1] - 카운트를 시작할 일(day of month). 입사일을 반영할 때 사용.
 * @returns {number}
 */
export function 월소정근로일수조회(연도, 월, 시작일 = 1) {
  const 공휴일셋 = 연도별공휴일조회(연도)
  const 월말일 = new Date(연도, 월, 0).getDate()
  const 시작 = Math.max(1, Math.min(월말일, 시작일))
  let 근로일수 = 0

  for (let 일 = 시작; 일 <= 월말일; 일++) {
    const 날짜 = new Date(연도, 월 - 1, 일)
    const 날짜문자열 = 날짜문자열변환(날짜)
    if (!주말여부확인(날짜) && !공휴일셋.has(날짜문자열)) {
      근로일수++
    }
  }
  return 근로일수
}

/**
 * 내일부터 해당 월 말일까지 남은 근무일 수 계산 (오늘 제외)
 * @param {number} 연도
 * @param {number} 월 - 1~12
 * @param {number} [시작일=1] - 입사일이 미래인 경우 그날부터 카운트
 * @returns {number}
 */
export function 남은근무일수조회(연도, 월, 시작일 = 1) {
  const 공휴일셋 = 연도별공휴일조회(연도)
  const 내일 = new Date()
  내일.setHours(0, 0, 0, 0)
  내일.setDate(내일.getDate() + 1)

  const 마지막날 = new Date(연도, 월, 0)
  const 시작 = Math.max(1, Math.min(마지막날.getDate(), 시작일))
  const 월시작 = new Date(연도, 월 - 1, 시작)

  // 선택한 월의 마지막 날이 오늘 이전이면 0
  if (마지막날 < 내일) return 0

  // 입사일/월시작이 내일 이후면 그 날부터, 아니면 내일부터
  const 시작날 = 월시작 > 내일 ? 월시작 : 내일

  let 남은일수 = 0
  const 현재날짜 = new Date(시작날)
  while (현재날짜 <= 마지막날) {
    const 날짜문자열 = 날짜문자열변환(현재날짜)
    if (!주말여부확인(현재날짜) && !공휴일셋.has(날짜문자열)) {
      남은일수++
    }
    현재날짜.setDate(현재날짜.getDate() + 1)
  }
  return 남은일수
}

/**
 * 특정 월의 소정 근로일 목록 반환 (날짜 문자열 배열)
 * @param {number} 연도
 * @param {number} 월 - 1~12
 * @returns {string[]}
 */
export function 근무일목록조회(연도, 월) {
  const 공휴일셋 = 연도별공휴일조회(연도)
  const 월말일 = new Date(연도, 월, 0).getDate()
  const 근무일목록 = []

  for (let 일 = 1; 일 <= 월말일; 일++) {
    const 날짜 = new Date(연도, 월 - 1, 일)
    const 날짜문자열 = 날짜문자열변환(날짜)
    if (!주말여부확인(날짜) && !공휴일셋.has(날짜문자열)) {
      근무일목록.push(날짜문자열)
    }
  }
  return 근무일목록
}

/**
 * 이미 지난 근무일 수 계산
 * @param {number} 연도
 * @param {number} 월 - 1~12
 * @returns {number}
 */
export function 경과근무일수조회(연도, 월) {
  const 전체일수 = 월소정근로일수조회(연도, 월)
  const 남은일수 = 남은근무일수조회(연도, 월)
  return 전체일수 - 남은일수
}

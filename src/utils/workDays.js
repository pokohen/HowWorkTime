import { 연도공휴일 } from './holidays'
import { 두자리 } from './timeFormat'
import { 급여기준일, 재택요일 } from '../constants'

/** 해당 월의 마지막 날짜 (28~31) */
export function 월말일수(연도, 월) {
  return new Date(연도, 월, 0).getDate()
}

/** Date → "YYYY-MM-DD" */
function 날짜키(날짜) {
  return `${날짜.getFullYear()}-${두자리(날짜.getMonth() + 1)}-${두자리(날짜.getDate())}`
}

function 주말여부(날짜) {
  const 요일 = 날짜.getDay()
  return 요일 === 0 || 요일 === 6
}

/** 주말·공휴일이 아닌 소정 근로일인지. 공휴일셋을 생략하면 해당 연도 것을 조회한다 */
export function 근무일여부(날짜, 공휴일셋 = 연도공휴일(날짜.getFullYear())) {
  return !주말여부(날짜) && !공휴일셋.has(날짜키(날짜))
}

/** 재택근무 요일이면서 공휴일이 아닌 날인지 */
export function 재택가능일여부(날짜) {
  return 날짜.getDay() === 재택요일 && !연도공휴일(날짜.getFullYear()).has(날짜키(날짜))
}

/** 해당 월의 [시작일, 말일] 범위. 시작일은 1~말일로 보정한다. */
function 월범위(연도, 월, 시작일) {
  const 말일 = new Date(연도, 월 - 1, 월말일수(연도, 월))
  const 시작 = Math.max(1, Math.min(말일.getDate(), 시작일))
  return { 월시작: new Date(연도, 월 - 1, 시작), 말일 }
}

/** 시작날~끝날(포함) 중 조건을 만족하는 날 수 */
function 날짜세기(시작날, 끝날, 조건) {
  let 개수 = 0
  const 현재 = new Date(시작날)
  while (현재 <= 끝날) {
    if (조건(현재)) 개수++
    현재.setDate(현재.getDate() + 1)
  }
  return 개수
}

/** 오늘 다음 날 00:00 */
export function 내일날짜(오늘) {
  const 내일 = new Date(오늘)
  내일.setHours(0, 0, 0, 0)
  내일.setDate(내일.getDate() + 1)
  return 내일
}

/**
 * 특정 월의 소정 근로일 수 (주말·공휴일 제외)
 * @param {number} 연도
 * @param {number} 월 - 1~12
 * @param {number} [시작일=1] - 입사일을 반영할 때 그 날부터 카운트
 */
export function 소정근로일수(연도, 월, 시작일 = 1) {
  const 공휴일셋 = 연도공휴일(연도)
  const { 월시작, 말일 } = 월범위(연도, 월, 시작일)
  return 날짜세기(월시작, 말일, (날짜) => 근무일여부(날짜, 공휴일셋))
}

/**
 * 내일부터 해당 월 말일까지 조건을 만족하는 날 수 (오늘 제외).
 * 입사일이 내일 이후면 입사일부터 센다.
 */
function 남은날수(연도, 월, 시작일, 오늘, 조건) {
  const { 월시작, 말일 } = 월범위(연도, 월, 시작일)
  const 내일 = 내일날짜(오늘)
  if (말일 < 내일) return 0
  return 날짜세기(월시작 > 내일 ? 월시작 : 내일, 말일, 조건)
}

/** 내일부터 월말까지 남은 근무일 수 */
export function 남은근무일수(연도, 월, 시작일 = 1, 오늘 = new Date()) {
  const 공휴일셋 = 연도공휴일(연도)
  return 남은날수(연도, 월, 시작일, 오늘, (날짜) => 근무일여부(날짜, 공휴일셋))
}

/** 내일부터 월말까지 남은 금요일 수 (공휴일 제외). 재택근무 가능일 산정용 */
export function 남은금요일수(연도, 월, 시작일 = 1, 오늘 = new Date()) {
  const 공휴일셋 = 연도공휴일(연도)
  return 남은날수(
    연도, 월, 시작일, 오늘,
    (날짜) => 날짜.getDay() === 재택요일 && !공휴일셋.has(날짜키(날짜)),
  )
}

/**
 * 해당 월의 실제 급여일.
 * 기준일이 주말·공휴일이면 직전의 가장 가까운 평일로 앞당긴다.
 * @returns {Date}
 */
export function 급여일조회(연도, 월, 기준일 = 급여기준일) {
  const 공휴일셋 = 연도공휴일(연도)
  const 날짜 = new Date(연도, 월 - 1, 기준일)
  while (!근무일여부(날짜, 공휴일셋)) {
    날짜.setDate(날짜.getDate() - 1)
  }
  return 날짜
}

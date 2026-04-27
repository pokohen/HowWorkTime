import { getHolidaysForYear } from './holidays'

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 * @param {Date} date
 * @returns {string}
 */
function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 주말 여부 확인
 * @param {Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  const day = date.getDay()
  return day === 0 || day === 6 // 일요일(0) 또는 토요일(6)
}

/**
 * 특정 월의 소정 근로일 수 계산 (주말 및 공휴일 제외)
 * @param {number} year
 * @param {number} month - 1~12
 * @returns {number}
 */
export function getWorkDaysInMonth(year, month) {
  const holidays = getHolidaysForYear(year)
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dateStr = toDateString(date)
    if (!isWeekend(date) && !holidays.has(dateStr)) {
      count++
    }
  }
  return count
}

/**
 * 오늘부터 해당 월 말일까지 남은 근무일 수 계산 (오늘 포함)
 * @param {number} year
 * @param {number} month - 1~12
 * @returns {number}
 */
export function getRemainingWorkDays(year, month) {
  const holidays = getHolidaysForYear(year)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)

  // 선택한 월이 과거이면 0 반환
  if (lastDay < today) return 0

  // 선택한 월이 미래이면 전체 근무일 반환
  const startDay = firstDay > today ? firstDay : today

  let count = 0
  const current = new Date(startDay)
  while (current <= lastDay) {
    const dateStr = toDateString(current)
    if (!isWeekend(current) && !holidays.has(dateStr)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

/**
 * 특정 월의 소정 근로일 목록 반환 (날짜 문자열 배열)
 * @param {number} year
 * @param {number} month - 1~12
 * @returns {string[]}
 */
export function getWorkDayList(year, month) {
  const holidays = getHolidaysForYear(year)
  const daysInMonth = new Date(year, month, 0).getDate()
  const workDays = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dateStr = toDateString(date)
    if (!isWeekend(date) && !holidays.has(dateStr)) {
      workDays.push(dateStr)
    }
  }
  return workDays
}

/**
 * 이미 지난 근무일 수 계산
 * @param {number} year
 * @param {number} month - 1~12
 * @returns {number}
 */
export function getPassedWorkDays(year, month) {
  const total = getWorkDaysInMonth(year, month)
  const remaining = getRemainingWorkDays(year, month)
  return total - remaining
}

import { 요일이름 } from '../constants'

export const 두자리 = (n) => String(n).padStart(2, '0')

/**
 * 근무시간 문자열을 분 단위로 파싱 (0 이상만 허용)
 *  - "23:30" → 1410
 *  - "23"    → 1380 (23:00)
 *  - "230"   → 150  (2:30)
 *  - "2330"  → 1410 (23:30)
 *  - "13730" → 8250 (137:30, 3자리 시간 + 2자리 분)
 * 잘못된 형식(음수 포함)은 { 분: 0, 유효: false }
 */
export function 시분파싱(문자열) {
  if (문자열 == null) return { 분: 0, 유효: true, 비어있음: true }
  const 정리 = String(문자열).trim()
  if (!정리) return { 분: 0, 유효: true, 비어있음: true }

  const 콜론매칭 = 정리.match(/^(\d+):(\d{1,2})$/)
  if (콜론매칭) {
    const 시 = parseInt(콜론매칭[1], 10)
    const 분 = parseInt(콜론매칭[2], 10)
    if (분 >= 60) return 무효
    return { 분: 시 * 60 + 분, 유효: true, 비어있음: false }
  }

  const 숫자매칭 = 정리.match(/^(\d+)$/)
  if (!숫자매칭) return 무효

  const 숫자 = 숫자매칭[1]
  if (숫자.length <= 2) {
    return { 분: parseInt(숫자, 10) * 60, 유효: true, 비어있음: false }
  }
  if (숫자.length > 5) return 무효

  // 3~5자리: 뒤 2자리가 분, 앞이 시
  const 시 = parseInt(숫자.slice(0, -2), 10)
  const 분 = parseInt(숫자.slice(-2), 10)
  if (분 >= 60) return 무효
  return { 분: 시 * 60 + 분, 유효: true, 비어있음: false }
}
const 무효 = Object.freeze({ 분: 0, 유효: false, 비어있음: false })

/** 분 → "h:mm" (음수는 "-h:mm") */
export function 시분변환(전체분) {
  if (!Number.isFinite(전체분)) return '0:00'
  const 정수분 = Math.round(전체분)
  const 부호 = 정수분 < 0 ? '-' : ''
  const 절대분 = Math.abs(정수분)
  return `${부호}${Math.floor(절대분 / 60)}:${두자리(절대분 % 60)}`
}

/** "HH:MM" 시각 → 자정 기준 분(0~1439). 형식이 틀리면 null */
export function 시각파싱(문자열) {
  const 매칭 = String(문자열 ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!매칭) return null
  const 시 = Number(매칭[1])
  const 분 = Number(매칭[2])
  if (시 > 23 || 분 > 59) return null
  return 시 * 60 + 분
}

/** (시, 분) → "HH:MM" */
export function 시각조립(시, 분) {
  return `${두자리(시)}:${두자리(분)}`
}

/** 현재 시각 → "HH:MM" */
export function 지금시각() {
  const 지금 = new Date()
  return 시각조립(지금.getHours(), 지금.getMinutes())
}

/** "YYYY-MM-DD" → 요일 한 글자. 로컬 날짜로 해석해 시간대 영향을 받지 않는다. */
export function 요일명(날짜문자열) {
  const [연도, 월, 일] = 날짜문자열.split('-').map(Number)
  return 요일이름[new Date(연도, 월 - 1, 일).getDay()]
}

/** "YYYY-MM-DD" → "M월 D일" */
export function 날짜포맷(날짜문자열) {
  const [, 월, 일] = 날짜문자열.split('-')
  return `${parseInt(월, 10)}월 ${parseInt(일, 10)}일`
}

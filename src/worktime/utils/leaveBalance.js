import { 하루근무분 } from '../../shared/constants'

/**
 * 올해 남은 연차. 회사마다 "7일 4시간"처럼 시간까지 주므로 내부는 분으로 들고 다닌다.
 * (연차 8h · 반차 4h · 반반차 2h 와 같은 단위)
 */

const 최대분 = 365 * 하루근무분
const 반올림단위 = 30 // 30분 단위로 다듬는다

/**
 * 일·시간 입력을 분으로 합친다. 둘 다 비었거나 숫자가 아니면 null.
 * 시간이 8 을 넘으면 그대로 일로 올려 센다 (7일 12시간 → 8일 4시간).
 * @param {string|number|null|undefined} 일
 * @param {string|number|null|undefined} 시간
 * @returns {number|null}
 */
export function 남은연차분만들기(일, 시간) {
  const 일수 = 입력숫자(일)
  const 시간수 = 입력숫자(시간)
  if (일수 == null && 시간수 == null) return null
  return 분정리((일수 ?? 0) * 하루근무분 + (시간수 ?? 0) * 60)
}

/** 분을 30분 단위로 다듬고 0~최대 범위로 자른다. 입력 파서와 저장 복원이 같이 쓴다 */
function 분정리(분) {
  const 정리 = Math.round(분 / 반올림단위) * 반올림단위
  return Math.min(최대분, Math.max(0, 정리))
}

/** 입력 칸의 값 → 0 이상의 수. 비었거나 숫자가 아니거나 음수면 null (음수를 다른 칸에서 빼 주듯 조용히 섞지 않는다) */
export function 입력숫자(값) {
  if (값 === '' || 값 == null) return null
  if (typeof 값 === 'number') return Number.isFinite(값) && 값 >= 0 ? 값 : null
  // 자릿수 쉼표만 허용하고 그 외는 십진수 꼴이어야 한다 ("1e1", "0x10", "1 0" 은 Number() 가 받아들이지만 입력 실수다)
  const 정리 = String(값).trim().replace(/,/g, '')
  if (!/^\d+(\.\d+)?$/.test(정리)) return null
  return Number(정리)
}

/**
 * 분 → { 일, 시간 }. 시간은 0 이상 8 미만, 0.5 단위가 나올 수 있다.
 * @param {number|null} 분
 */
export function 남은연차분해(분) {
  if (분 == null) return { 일: null, 시간: null }
  const 일 = Math.floor(분 / 하루근무분)
  const 시간 = (분 - 일 * 하루근무분) / 60
  return { 일, 시간 }
}

/**
 * 사람이 읽는 표기. "7일 4시간" · "7일" · "4시간" · "0일"
 * @param {number|null} 분
 */
export function 남은연차문장(분) {
  if (분 == null) return ''
  const { 일, 시간 } = 남은연차분해(분)
  if (일 === 0 && 시간 === 0) return '0일'
  const 조각 = []
  if (일 > 0) 조각.push(`${일}일`)
  if (시간 > 0) 조각.push(`${시간}시간`)
  return 조각.join(' ')
}

/**
 * 저장된 JSON → { 'YYYY': 분 }. 깨졌거나 모양이 다르면 빈 객체.
 * 초기 버전은 일수(숫자)만 저장했으므로 숫자 값은 일 → 분으로 올려 읽는다.
 * @param {string|null} 문자열
 */
export function 남은연차복원(문자열) {
  if (!문자열) return {}
  let 데이터
  try { 데이터 = JSON.parse(문자열) } catch { return {} }
  if (!데이터 || typeof 데이터 !== 'object' || Array.isArray(데이터)) return {}
  const 결과 = {}
  for (const [연도, 값] of Object.entries(데이터)) {
    if (!/^\d{4}$/.test(연도)) continue
    let 분 = null
    if (값 && typeof 값 === 'object') 분 = typeof 값.분 === 'number' && Number.isFinite(값.분) ? 분정리(값.분) : null
    else if (입력숫자(값) != null) 분 = 남은연차분만들기(값, 0) // 초기 형식(일수). 음수·쓰레기는 '모름'
    if (분 != null) 결과[연도] = 분
  }
  return 결과
}

/** 저장용. 숫자만 저장하던 초기 형식과 구분하려고 { 분 } 객체로 둔다 */
export function 남은연차직렬화(표) {
  return JSON.stringify(Object.fromEntries(Object.entries(표).map(([연도, 분]) => [연도, { 분 }])))
}

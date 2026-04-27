/**
 * 문자열을 분 단위로 파싱
 *  - "23:30" → 1410
 *  - "23"    → 1380 (23:00)
 *  - "230"   → 150  (2:30)
 *  - "2330"  → 1410 (23:30)
 *  - "13730" → 8250 (137:30, 3자리 시간 + 2자리 분)
 * 잘못된 형식은 { 분: 0, 유효: false }
 */
export function 시분파싱(문자열) {
  if (문자열 == null) return { 분: 0, 유효: true, 비어있음: true }
  const 정리 = String(문자열).trim()
  if (!정리) return { 분: 0, 유효: true, 비어있음: true }

  const 콜론매칭 = 정리.match(/^(-?\d+):(\d{1,2})$/)
  if (콜론매칭) {
    const 시 = parseInt(콜론매칭[1], 10)
    const 분 = parseInt(콜론매칭[2], 10)
    if (분 >= 60) return { 분: 0, 유효: false, 비어있음: false }
    const 합 = 시 < 0 ? 시 * 60 - 분 : 시 * 60 + 분
    return { 분: 합, 유효: true, 비어있음: false }
  }

  const 숫자매칭 = 정리.match(/^(-?)(\d+)$/)
  if (숫자매칭) {
    const 부호 = 숫자매칭[1] === '-' ? -1 : 1
    const 숫자 = 숫자매칭[2]
    if (숫자.length <= 2) {
      return { 분: 부호 * parseInt(숫자, 10) * 60, 유효: true, 비어있음: false }
    }
    if (숫자.length === 3) {
      const 시 = parseInt(숫자[0], 10)
      const 분 = parseInt(숫자.slice(1), 10)
      if (분 >= 60) return { 분: 0, 유효: false, 비어있음: false }
      return { 분: 부호 * (시 * 60 + 분), 유효: true, 비어있음: false }
    }
    if (숫자.length === 4) {
      const 시 = parseInt(숫자.slice(0, 2), 10)
      const 분 = parseInt(숫자.slice(2), 10)
      if (분 >= 60) return { 분: 0, 유효: false, 비어있음: false }
      return { 분: 부호 * (시 * 60 + 분), 유효: true, 비어있음: false }
    }
    if (숫자.length === 5) {
      const 시 = parseInt(숫자.slice(0, 3), 10)
      const 분 = parseInt(숫자.slice(3), 10)
      if (분 >= 60) return { 분: 0, 유효: false, 비어있음: false }
      return { 분: 부호 * (시 * 60 + 분), 유효: true, 비어있음: false }
    }
    return { 분: 0, 유효: false, 비어있음: false }
  }

  return { 분: 0, 유효: false, 비어있음: false }
}

/**
 * 분을 "h:mm" 형식 문자열로 변환
 */
export function 시분변환(전체분) {
  if (!Number.isFinite(전체분)) return '0:00'
  const 정수분 = Math.round(전체분)
  const 부호 = 정수분 < 0 ? '-' : ''
  const 절대분 = Math.abs(정수분)
  const 시 = Math.floor(절대분 / 60)
  const 분 = 절대분 % 60
  return `${부호}${시}:${String(분).padStart(2, '0')}`
}

/**
 * 날짜 문자열에서 요일 가져오기
 */
export function 요일가져오기(날짜문자열) {
  const 요일목록 = ['일', '월', '화', '수', '목', '금', '토']
  const 날짜 = new Date(날짜문자열)
  return 요일목록[날짜.getDay()]
}

/**
 * "YYYY-MM-DD" → "M월 D일"
 */
export function 날짜포맷(날짜문자열) {
  const [, 월, 일] = 날짜문자열.split('-')
  return `${parseInt(월)}월 ${parseInt(일)}일`
}

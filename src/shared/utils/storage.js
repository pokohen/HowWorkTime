/**
 * localStorage 를 안전하게 감싼다. 막힌 환경(사생활 보호 모드, 쿠키 차단, 샌드박스, 용량 초과 등)에서도 앱이 죽지 않는다.
 * 저장소를 인자로 받아 테스트에서 가짜를 넣을 수 있다.
 */

/** 쿠키·사이트 데이터를 막으면 localStorage 에 접근하는 것만으로 SecurityError 가 난다. 그때는 저장소 없음으로 */
function 기본저장소() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

export function 저장소읽기(키, 저장소 = 기본저장소()) {
  try { return 저장소?.getItem(키) ?? null } catch { return null }
}
/** 성공하면 true. 저장소가 없거나 가득 찼거나 막혔으면 false */
export function 저장소쓰기(키, 값, 저장소 = 기본저장소()) {
  try {
    if (!저장소) return false
    저장소.setItem(키, 값)
    return true
  } catch { return false }
}
export function 저장소삭제(키, 저장소 = 기본저장소()) {
  try { 저장소?.removeItem(키) } catch { /* 무시 */ }
}
/**
 * 다른 브라우저 탭(창)이 이 키를 저장하면 새 값을 넘겨준다. 같은 창의 저장에는 불리지 않는다 (storage 이벤트의 성질).
 * @param {string} 키
 * @param {(새값: string|null) => void} 콜백
 * @returns {() => void} 감시 해제
 */
export function 다른창저장감시(키, 콜백) {
  if (typeof window === 'undefined') return () => {}
  const 받기 = (e) => { if (e.key === 키) 콜백(e.newValue) }
  window.addEventListener('storage', 받기)
  return () => window.removeEventListener('storage', 받기)
}

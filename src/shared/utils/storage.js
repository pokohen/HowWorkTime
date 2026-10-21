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
 * 접두사로 시작하는 키를 지운다 (예전 판이 남긴 키 정리 등). 저장소는 다른 함수들처럼 두 번째 인자다
 * @param {(키: string, 값: string|null) => boolean} [지울까] 키마다 지울지 고른다. 없으면 모두
 */
export function 저장소접두사삭제(접두사, 저장소 = 기본저장소(), 지울까 = () => true) {
  try {
    const 키들 = []
    for (let i = 0; i < (저장소?.length ?? 0); i++) {
      const 키 = 저장소.key(i)
      if (키?.startsWith(접두사) && 지울까(키, 저장소.getItem(키))) 키들.push(키)
    }
    for (const 키 of 키들) 저장소.removeItem(키)
  } catch { /* 막힌 환경 */ }
}

/**
 * 다른 브라우저 탭(창)이 이 키를 바꾸면 알린다. 같은 창의 저장에는 불리지 않는다 (storage 이벤트의 성질).
 * 이벤트가 담은 값이 아니라 지금 저장소 값을 넘긴다: 이벤트가 닿기 전에 이 창이 다시 썼을 수 있어서다 (늦게 닿은 옛 값으로 판단하지 않게)
 * @param {string} 키
 * @param {(새값: string|null) => void} 콜백
 * 다른 창이 localStorage 를 통째로 비웠을 때(clear, 이벤트 key 가 null)도 지금 값을 다시 읽어 알린다
 * (sessionStorage 를 비운 이벤트는 무시한다)
 * @returns {() => void} 감시 해제
 */
export function 다른창저장감시(키, 콜백) {
  if (typeof window === 'undefined') return () => {}
  const 받기 = (e) => {
    if (e.storageArea && e.storageArea !== 기본저장소()) return
    if (e.key === 키 || e.key === null) 콜백(저장소읽기(키))
  }
  window.addEventListener('storage', 받기)
  return () => window.removeEventListener('storage', 받기)
}

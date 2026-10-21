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
 * 다른 창의 localStorage 변경 이벤트를 받는다 (sessionStorage 이벤트는 거른다). 아래 두 감시가 함께 쓴다
 * @param {(e: StorageEvent) => void} 받기
 * @returns {() => void} 감시 해제
 */
function 저장이벤트감시(받기) {
  if (typeof window === 'undefined') return () => {}
  const 걸러받기 = (e) => {
    if (e.storageArea && e.storageArea !== 기본저장소()) return
    받기(e)
  }
  window.addEventListener('storage', 걸러받기)
  return () => window.removeEventListener('storage', 걸러받기)
}

/**
 * 다른 브라우저 탭(창)이 이 키를 바꾸면 알린다. 같은 창의 저장에는 불리지 않는다 (storage 이벤트의 성질).
 * 이벤트가 담은 값이 아니라 지금 저장소 값을 넘긴다: 이벤트가 닿기 전에 이 창이 다시 썼을 수 있어서다 (늦게 닿은 옛 값으로 판단하지 않게).
 * 다른 창이 localStorage 를 통째로 비웠을 때(clear, 이벤트 key 가 null)도 알린다
 * @param {string} 키
 * @param {(새값: string|null) => void} 콜백
 * @returns {() => void} 감시 해제
 */
export function 다른창저장감시(키, 콜백) {
  // 값이 클 수 있어도 다시 읽는다: 이벤트 값을 쓰면 이 창이 그 뒤에 쓴 값을 옛 값으로 덮는다(앞선 회차의 결함).
  // 다른 창의 저장은 묶어서(수백 ms 간격) 오므로 비용은 작다
  return 저장이벤트감시((e) => { if (e.key === 키 || e.key === null) 콜백(저장소읽기(키)) })
}

/**
 * 다른 창이 localStorage 에서 무언가를 지우거나 줄였을 때 알린다 (어떤 키든, 통째 비움 포함).
 * 공간이 비었다는 신호로 쓴다: 쓰기에 실패한 저장을 다시 해 볼 때. 늘리기만 한 변경에는 부르지 않는다 (공간이 생기지 않았다)
 * @param {() => void} 콜백
 * @param {{ 뺄키?: string }} [옵션] 뺄키: 따로 감시하는 키 (같은 이벤트로 두 번 부르지 않게)
 * @returns {() => void} 감시 해제
 */
export function 다른창공간생김감시(콜백, { 뺄키 } = {}) {
  return 저장이벤트감시((e) => {
    if (뺄키 && e.key === 뺄키) return
    const 줄었음 = e.key === null || e.newValue == null || (e.oldValue != null && e.newValue.length < e.oldValue.length)
    if (줄었음) 콜백()
  })
}

/**
 * localStorage 를 안전하게 감싼다. 막힌 환경(사생활 보호 모드, 용량 초과 등)에서도 앱이 죽지 않는다.
 * 저장소를 인자로 받아 테스트에서 가짜를 넣을 수 있다.
 */
export function 저장소읽기(키, 저장소 = globalThis.localStorage) {
  try { return 저장소?.getItem(키) ?? null } catch { return null }
}
export function 저장소쓰기(키, 값, 저장소 = globalThis.localStorage) {
  try { 저장소?.setItem(키, 값); return true } catch { return false }
}
export function 저장소삭제(키, 저장소 = globalThis.localStorage) {
  try { 저장소?.removeItem(키) } catch { /* 무시 */ }
}

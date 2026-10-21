import { 저장소읽기, 저장이벤트감시, 공간생긴변경 } from '../utils/storage'

/** 단조 시계(ms). 시스템 시계가 바뀌어도 거꾸로 가지 않는다 */
const 지금 = () => (globalThis.performance?.now?.() ?? Date.now())

/**
 * 저장소에 쓰지 못한 것을 다시 써 보는 규칙 (대화·설정이 함께 쓴다).
 * - 다른 창이 무언가를 지우거나 줄이면(통째 비움 포함) 공간이 생겼으니 바로 (다음 틈에: 같은 이벤트로 이미 돈 쓰기와 겹치지 않게)
 * - 다른 창이 이 키를 늘렸으면 쓰기에 실패한 뒤 간격이 지나서 한 번 (버리지 않고 미룬다. 자주 쓰는 창 때문에 되풀이하지 않게)
 * - 이 창을 떠날 때(떠날때다시쓰기) 마지막으로
 * 이벤트가 담은 값이 이미 지금 저장소 값과 다르면(늦게 닿음) 그 이벤트의 '줄었음'은 믿지 않는다.
 * 이벤트는 마이크로태스크로 미뤄 다룬다: 부르는 모듈이 같은 이벤트로 먼저 합친 뒤의 상태로 쓸것있음을 판단하게 (리스너 순서와 무관하게).
 * 스스로는 되풀이하지 않는다: 다시 쓰기가 또 실패하면 다음 바깥 일을 기다린다
 * @param {(fn: () => void) => void} 정리등록
 * @param {{ 키: string, 쓸것있음: () => boolean, 다시쓰기: () => void, 간격?: number, 떠날때다시쓰기?: boolean }} 옵션
 * @returns {{ 실패함: () => void, 거둠: () => void }} 실패함: 쓰기에 실패했을 때 부른다. 거둠: 지금 쓰니 미뤄 둔 재시도를 거둔다
 */
export function 쓰기재시도(정리등록, { 키, 쓸것있음, 다시쓰기, 간격 = 5_000, 떠날때다시쓰기 = true }) {
  let 실패때 = -Infinity
  let 타이머 = null
  let 바로 = false
  const 거둠 = () => {
    clearTimeout(타이머)
    타이머 = null
    바로 = false
  }
  function 예약(기다림) {
    if (타이머) {
      if (바로 || 기다림 > 0) return // 이미 바로 하거나, 같은 간격으로 미뤄 두었다
      거둠() // 미뤄 둔 것을 바로로 앞당긴다
    }
    바로 = 기다림 === 0
    타이머 = setTimeout(() => {
      타이머 = null
      바로 = false
      if (쓸것있음()) 다시쓰기()
    }, 기다림)
  }
  정리등록(거둠)
  let 멈춤 = false
  정리등록(() => { 멈춤 = true })
  정리등록(저장이벤트감시((e) => queueMicrotask(() => {
    if (멈춤 || !쓸것있음()) return
    if (공간생긴변경(e)) {
      const 늦게닿음 = e.key === 키 && e.newValue != null && e.newValue !== 저장소읽기(키)
      if (!늦게닿음) return 예약(0)
    }
    if (e.key === 키 || e.key === null) 예약(Math.max(0, 실패때 + 간격 - 지금()))
  })))
  if (떠날때다시쓰기 && typeof window !== 'undefined') {
    const 떠날때 = () => { if (쓸것있음()) 다시쓰기() }
    window.addEventListener('pagehide', 떠날때)
    정리등록(() => window.removeEventListener('pagehide', 떠날때))
  }
  return { 실패함: () => { 실패때 = 지금() }, 거둠 }
}

import { effectScope } from 'vue'

/**
 * 모듈 단위 싱글턴 상태를 만든다.
 * 정의 함수 안의 watch/computed 는 하나의 effectScope 에 묶이고,
 * Vite HMR 로 모듈이 다시 평가될 때 이전 스코프와 등록한 정리 함수가 함께 해제된다.
 * (그렇지 않으면 리스너·타이머·watcher 가 갱신마다 쌓인다)
 *
 * 주의: Vite 는 모듈이 스스로 HMR 을 수용해야 그 모듈의 dispose 를 호출하고, 수용 여부는
 * 모듈 소스의 텍스트로 판단한다. 그래서 수용 코드는 여기서 호출하지 않고, vite.config.js 의
 * 모듈상태HMR 플러그인이 src/composables/use*.js 에 주입한다.
 *
 * @param {ImportMeta['hot']} hot - import.meta.hot
 * @param {(정리등록: (fn: () => void) => void) => T} 정의
 * @returns {T}
 * @template T
 */
export function 모듈상태(hot, 정의) {
  const 스코프 = effectScope(true)
  const 정리목록 = []
  const 상태 = 스코프.run(() => 정의((fn) => 정리목록.push(fn)))
  hot?.dispose(() => {
    스코프.stop()
    정리목록.forEach((fn) => fn())
  })
  return 상태
}

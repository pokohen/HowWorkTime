import { effectScope } from 'vue'

/**
 * 모듈 단위 싱글턴 상태를 만든다.
 * 정의 함수 안의 watch/computed 는 하나의 effectScope 에 묶이고,
 * Vite HMR 로 모듈이 다시 평가될 때 이전 스코프와 등록한 정리 함수가 함께 해제된다.
 * (그렇지 않으면 리스너·타이머·watcher 가 갱신마다 쌓인다)
 *
 * 주의: Vite 는 모듈이 스스로 HMR 을 수용해야 그 모듈의 dispose 를 호출하고, 수용 여부는
 * 모듈 소스의 텍스트로 판단한다. 그래서 이 헬퍼를 쓰는 모듈은 파일 끝에 직접 한 줄을 둔다:
 *   if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())
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
  let 정리됨 = false
  const 정리 = () => { // HMR 과 테스트 정리가 겹쳐도 한 번만
    if (정리됨) return
    정리됨 = true
    살아있는상태정리().delete(정리)
    // 하나가 실패해도 나머지는 꼭 정리한다 (남은 리스너·타이머가 옛 상태로 새 상태 위에 쓰지 않게). 스코프 멈춤도 그중 하나다
    for (const fn of [() => 스코프.stop(), ...정리목록]) {
      try { fn() } catch (예외) { console.error('[모듈상태] 정리 중 예외', 예외) }
    }
  }
  hot?.dispose(정리)
  // 목록은 테스트·개발(HMR)에서만 쓴다. 배포 판에는 남기지 않는다 (상태를 붙잡는 전역 목록이 생기지 않게)
  if (hot || import.meta.env?.TEST) 살아있는상태정리().add(정리)
  return 상태
}

/**
 * 만든 모듈 상태들의 정리 함수. 테스트가 모듈을 다시 불러와도(vi.resetModules) 옛 상태의 리스너·타이머를 걷어 낼 수 있게
 * 모듈 밖(globalThis)에 둔다 (이 모듈도 다시 불러와지므로 모듈 안의 목록으로는 옛 상태에 닿지 못한다)
 */
const 살아있는상태정리 = () => (globalThis.__how_work_time_모듈상태정리 ??= new Set())
/**
 * 지금까지 만든 모듈 상태를 모두 정리한다. 테스트 전용 (앱에서는 HMR 이 모듈마다 정리한다).
 * 이 작업자의 모든 상태를 멈추므로, 부르는 테스트 파일은 매 테스트마다 vi.resetModules 뒤 다시 불러와 써야 한다
 */
export function 모듈상태모두정리() {
  for (const 정리 of [...살아있는상태정리()]) 정리()
}

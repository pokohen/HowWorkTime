import { reactive, computed } from 'vue'

/**
 * 선택한 월마다 따로 보관되는 상태.
 * 누적 근무시간·연차·재택·입사일처럼 '그 달'에 속한 입력에 쓴다.
 * 월을 바꾸면 그 달의 값(없으면 기본값)이 보이고, 돌아오면 입력해 둔 값이 그대로 있다.
 *
 * @param {import('vue').Ref<string>} 월키 - 'YYYY-MM' 형태의 현재 선택 월
 * @param {T | (() => T)} 기본값 - 값 또는 그 달의 기본값을 계산하는 함수
 * @returns {import('vue').WritableComputedRef<T>}
 * @template T
 */
export function 월별상태(월키, 기본값) {
  const 저장 = reactive(new Map())
  const 기본 = () => (typeof 기본값 === 'function' ? 기본값() : 기본값)
  return computed({
    get: () => (저장.has(월키.value) ? 저장.get(월키.value) : 기본()),
    set: (값) => { 저장.set(월키.value, 값) },
  })
}

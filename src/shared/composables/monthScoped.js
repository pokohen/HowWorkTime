import { reactive, computed } from 'vue'

/**
 * 선택한 월마다 따로 보관되는 상태.
 * 누적 근무시간·연차·재택·입사일처럼 '그 달'에 속한 입력에 쓴다.
 * 월을 바꾸면 그 달의 값(없으면 기본값)이 보이고, 돌아오면 입력해 둔 값이 그대로 있다.
 *
 * 기본값이 함수면 저장된 값이 없는 동안 읽을 때마다 다시 계산된다(예: '오늘 날짜').
 * 어느 시점의 기본값을 그 달의 값으로 굳히려면 반환값의 `확정()` 을 호출한다.
 *
 * @param {import('vue').Ref<string>} 월키 - 'YYYY-MM' 형태의 현재 선택 월
 * @param {T | (() => T)} 기본값 - 값 또는 그 달의 기본값을 계산하는 함수
 * @returns {import('vue').WritableComputedRef<T> & { 확정: () => void }}
 * @template T
 */
export function 월별상태(월키, 기본값) {
  const 저장 = reactive(new Map())
  const 기본 = () => (typeof 기본값 === 'function' ? 기본값() : 기본값)
  const 상태 = computed({
    get: () => (저장.has(월키.value) ? 저장.get(월키.value) : 기본()),
    set: (값) => { 저장.set(월키.value, 값) },
  })
  /** 지금 보이는 값(기본값 포함)을 현재 월의 값으로 저장한다 */
  상태.확정 = () => { 저장.set(월키.value, 상태.value) }
  return 상태
}

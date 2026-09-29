import { ref, computed, watchEffect } from 'vue'
import { 연차단위 } from '../constants'
import { 모듈상태 } from './moduleState'
import { useWorkInput } from './useWorkInput'

// 연차(8h)·반차(4h)·반반차(2h)는 '현재까지 근무시간'에 이미 포함된 시간이다.
// 따라서 반영분에 다시 더하지 않고, '현재까지 근무시간'을 지정 가능한 한도로 둔다.
// 대신 사용한 만큼 환산 일수(연차 1d·반차 0.5d·반반차 0.25d)를 출근 남은일에서 뺀다.
const 상태 = 모듈상태(import.meta.hot, () => {
  const { 입력분 } = useWorkInput()

  const 연차여부 = ref(false)
  const 연차일수 = ref(0)
  const 반차수 = ref(0)
  const 반반차수 = ref(0)
  const 대상ref = { 연차: 연차일수, 반차: 반차수, 반반차: 반반차수 }

  const 개수 = (r) => Number(r.value) || 0
  const 연차분요청 = computed(() =>
    개수(연차일수) * 연차단위.연차 + 개수(반차수) * 연차단위.반차 + 개수(반반차수) * 연차단위.반반차,
  )
  const 연차예산분 = 입력분 // 현재까지 근무시간 = 연차 상한
  const 연차잔여분 = computed(() => Math.max(0, 연차예산분.value - 연차분요청.value))
  const 연차분 = computed(() =>
    연차여부.value ? Math.min(연차분요청.value, 연차예산분.value) : 0,
  )
  const 연차일수환산 = computed(() => 연차분.value / 연차단위.연차)

  // 스텝퍼 UI에 뿌릴 항목 목록
  const 연차항목 = computed(() => [
    { 키: '연차', 시간: '8h', 값: 개수(연차일수), 단위: 연차단위.연차 },
    { 키: '반차', 시간: '4h', 값: 개수(반차수), 단위: 연차단위.반차 },
    { 키: '반반차', 시간: '2h', 값: 개수(반반차수), 단위: 연차단위.반반차 },
  ])

  /** 잔여 한도 안에서만 증가를 허용하는 증감 */
  function 연차증감(키, 델타) {
    if (델타 > 0 && 연차잔여분.value < 연차단위[키]) return
    const 대상 = 대상ref[키]
    대상.value = Math.max(0, 개수(대상) + 델타)
  }

  // '현재까지 근무시간'이 줄면 합계가 한도를 넘지 않도록 반반차→반차→연차 순으로 줄인다
  watchEffect(() => {
    const 예산 = 연차예산분.value
    let 연 = 개수(연차일수)
    let 반 = 개수(반차수)
    let 반반 = 개수(반반차수)
    let 합 = 연 * 연차단위.연차 + 반 * 연차단위.반차 + 반반 * 연차단위.반반차
    while (합 > 예산 && 반반 > 0) { 반반--; 합 -= 연차단위.반반차 }
    while (합 > 예산 && 반 > 0) { 반--; 합 -= 연차단위.반차 }
    while (합 > 예산 && 연 > 0) { 연--; 합 -= 연차단위.연차 }
    if (연 !== 연차일수.value) 연차일수.value = 연
    if (반 !== 반차수.value) 반차수.value = 반
    if (반반 !== 반반차수.value) 반반차수.value = 반반
  })

  return {
    연차여부, 연차분, 연차예산분, 연차잔여분, 연차일수환산, 연차항목,
    연차증감,
  }
})

export function useLeave() {
  return 상태
}

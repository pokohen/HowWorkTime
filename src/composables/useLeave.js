import { ref, computed } from 'vue'
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
  // 근무시간을 줄여 지정한 연차가 한도를 넘으면 자동으로 깎지 않고(입력 중 값이 흔들려도 지정이 지워지지 않도록) 안내만 한다
  const 연차초과여부 = computed(() => 연차여부.value && 연차분요청.value > 연차예산분.value)

  // 스텝퍼 UI에 뿌릴 항목 목록
  const 연차항목 = computed(() =>
    Object.entries(연차단위).map(([키, 단위]) => ({
      키, 단위, 시간: `${단위 / 60}h`, 값: 개수(대상ref[키]),
    })),
  )

  /** 잔여 한도 안에서만 증가를 허용하는 증감 */
  function 연차증감(키, 델타) {
    if (델타 > 0 && 연차잔여분.value < 연차단위[키]) return
    const 대상 = 대상ref[키]
    대상.value = Math.max(0, 개수(대상) + 델타)
  }

  return {
    연차여부, 연차분, 연차예산분, 연차잔여분, 연차일수환산, 연차초과여부, 연차항목,
    연차증감,
  }
})

export function useLeave() {
  return 상태
}

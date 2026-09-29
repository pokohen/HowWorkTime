import { ref, computed } from 'vue'
import { 시분파싱 } from '../utils/timeFormat'
import { 모듈상태 } from './moduleState'
import { useMonth } from './useMonth'

const 상태 = 모듈상태(import.meta.hot, () => {
  const { 의무근로분, 다음달의무분 } = useMonth()

  // 사용자가 직접 입력하는 두 시간값 ("h:mm" 문자열)
  const 고정연장시간 = ref('10:00')
  const 입력근무시간 = ref('')

  const 고정연장분 = computed(() => Math.max(0, 시분파싱(고정연장시간.value).분))
  const 입력분 = computed(() => Math.max(0, 시분파싱(입력근무시간.value).분))

  const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
  const 다음달최대분 = computed(() => 다음달의무분.value + 고정연장분.value)

  return { 고정연장시간, 입력근무시간, 고정연장분, 입력분, 최대근로분, 다음달최대분 }
})

export function useWorkInput() {
  return 상태
}

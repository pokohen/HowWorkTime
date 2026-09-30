import { ref, computed, watch } from 'vue'
import { 시분파싱 } from '../utils/timeFormat'
import { 모듈상태 } from './moduleState'
import { useMonth } from './useMonth'

const 상태 = 모듈상태(import.meta.hot, () => {
  const { 의무근로분, 다음달의무분, 월넘김횟수 } = useMonth()

  // 사용자가 직접 입력하는 두 시간값 ("h:mm" 문자열)
  const 고정연장시간 = ref('10:00')
  const 입력근무시간 = ref('')
  // 달이 자동으로 넘어가면 지난 달의 누적 시간을 새 달에 적용하지 않는다 (고정 연장은 매달 같으므로 유지)
  watch(월넘김횟수, () => { 입력근무시간.value = '' })

  const 고정연장분 = computed(() => 시분파싱(고정연장시간.value).분)
  const 입력분 = computed(() => 시분파싱(입력근무시간.value).분)

  const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
  const 다음달최대분 = computed(() => 다음달의무분.value + 고정연장분.value)

  return { 고정연장시간, 입력근무시간, 고정연장분, 입력분, 최대근로분, 다음달최대분 }
})

export function useWorkInput() {
  return 상태
}

// HMR: 스스로 수용해야 위 모듈상태의 dispose 가 실행되고, invalidate 로 사용하는 컴포넌트까지 갱신한다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

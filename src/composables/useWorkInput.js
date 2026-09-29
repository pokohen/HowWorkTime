import { ref, computed } from 'vue'
import { 시분파싱 } from '../utils/timeFormat'
import { useMonth } from './useMonth'

const { 의무근로분, 다음달의무분 } = useMonth()

// 사용자가 직접 입력하는 두 시간값 ("h:mm" 문자열)
const 고정연장시간 = ref('10:00')
const 입력근무시간 = ref('')

const 고정연장결과 = computed(() => 시분파싱(고정연장시간.value))
const 입력결과 = computed(() => 시분파싱(입력근무시간.value))

const 고정연장분 = computed(() => Math.max(0, 고정연장결과.value.분))
const 입력분 = computed(() => Math.max(0, 입력결과.value.분))

const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
const 다음달최대분 = computed(() => 다음달의무분.value + 고정연장분.value)

export function useWorkInput() {
  return {
    고정연장시간, 입력근무시간,
    고정연장분, 입력분,
    최대근로분, 다음달최대분,
  }
}

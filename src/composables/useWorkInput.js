import { ref, computed, watch } from 'vue'
import { 시분파싱 } from '../utils/timeFormat'
import { 모듈상태 } from './moduleState'
import { 월별상태 } from './monthScoped'
import { useMonth } from './useMonth'
import { useToday } from './useToday'

const 상태 = 모듈상태(import.meta.hot, () => {
  const { 월키, 의무근로분, 다음달의무분 } = useMonth()

  // 사용자가 직접 입력하는 두 시간값 ("h:mm" 문자열)
  const 고정연장시간 = ref('10:00') // 매달 같은 값
  const 입력근무시간 = 월별상태(월키, '') // 그 달의 누적 근무시간

  // 앱을 켜둔 채 날짜가 바뀌면 누적 시간이 어제까지 반영됐는지 확인하도록 안내한다.
  // 누적 시간을 고치거나 안내를 닫으면 내려간다.
  const 누적갱신필요 = ref(false)
  watch(useToday().오늘, () => { 누적갱신필요.value = 입력근무시간.value !== '' })
  watch(입력근무시간, () => { 누적갱신필요.value = false })

  const 고정연장분 = computed(() => 시분파싱(고정연장시간.value).분)
  const 입력분 = computed(() => 시분파싱(입력근무시간.value).분)

  const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
  const 다음달최대분 = computed(() => 다음달의무분.value + 고정연장분.value)

  return { 고정연장시간, 입력근무시간, 누적갱신필요, 고정연장분, 입력분, 최대근로분, 다음달최대분 }
})

export function useWorkInput() {
  return 상태
}

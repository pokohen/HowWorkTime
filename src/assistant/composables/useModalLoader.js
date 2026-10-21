import { ref, shallowRef, markRaw, watch } from 'vue'
import { 모듈상태 } from '../../shared/composables/moduleState'
import { useAssistant } from './useAssistant'

/**
 * 플래너 모달(마크다운 해석기 포함)은 처음 열 때 내려받는다. 근무시간만 보는 사람은 받지 않는다.
 * 받는 동안은 FAB 가 진행 중으로 보이고, 실패하면(오프라인·새 버전 배포로 옛 청크가 사라짐) 닫고 새로고침을 안내한다.
 * 실패를 기억하지 않으므로 다음에 열면 다시 시도한다.
 */
const 상태 = 모듈상태(import.meta.hot, () => {
  const { 열림, 닫기, 불러오기실패알림 } = useAssistant()
  const 모달 = shallowRef(null)
  const 불러오는중 = ref(false)

  async function 불러오기() {
    if (모달.value || 불러오는중.value) return
    불러오는중.value = true
    try {
      모달.value = markRaw((await import('../components/AssistantModal.vue')).default)
    } catch {
      닫기()
      불러오기실패알림()
    } finally {
      불러오는중.value = false
    }
  }
  // 즉시(sync) 실행: 여는 순간 '받는 중'이 되어야 바로 이어지는 두 번째 클릭이 여는 것을 취소하지 않는다
  watch(열림, (값) => { if (값) 불러오기() }, { immediate: true, flush: 'sync' })

  return { 모달, 불러오는중 }
})

export function useModalLoader() {
  return 상태
}

// 이 모듈을 고치면 Vite 가 통째로 다시 불러오게 한다. 모듈상태가 등록한 정리 함수(타이머·리스너)가 그때 실행된다
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot.invalidate())

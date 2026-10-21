import { ref, shallowRef, markRaw, watch } from 'vue'
import { 모듈상태 } from '../../shared/composables/moduleState'
import { useAssistant } from './useAssistant'

/**
 * 플래너 모달(마크다운 해석기 포함)은 처음 열 때 내려받는다. 근무시간만 보는 사람은 받지 않는다.
 * 받는 동안은 FAB 가 진행 중으로 보이고, 실패하면(오프라인·새 버전 배포로 옛 청크가 사라짐) 닫고 새로고침을 안내한다.
 * 우리 쪽에서는 실패를 기억하지 않아 다음에 열면 다시 시도한다. 다만 브라우저가 실패한 모듈을 기억해 바로 다시 실패할 수 있어,
 * 실패 안내는 늘 새로고침을 권한다. 받는 동안은 대화 상자가 없으므로 Esc 로 여는 것을 취소할 수 있게 한다.
 */
const 상태 = 모듈상태(import.meta.hot, (정리등록) => {
  const { 열림, 닫기, 불러오기실패알림 } = useAssistant()
  const 모달 = shallowRef(null)
  const 불러오는중 = ref(false)

  // 받는 동안만 붙는다. 다른 곳(입력창·다른 팝업)이 이미 처리한 Esc 는 건드리지 않고, 한 번 취소하면 바로 뗀다
  const Esc취소 = (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !열림.value) return
    window.removeEventListener('keydown', Esc취소)
    닫기()
  }
  if (typeof window !== 'undefined') 정리등록(() => window.removeEventListener('keydown', Esc취소))
  async function 불러오기() {
    if (모달.value || 불러오는중.value) return
    불러오는중.value = true
    if (typeof window !== 'undefined') window.addEventListener('keydown', Esc취소)
    try {
      모달.value = markRaw((await import('../components/AssistantModal.vue')).default)
    } catch {
      // 받는 사이 사용자가 취소(Esc)했으면 실패를 알리지 않는다. 다음에 열 때 다시 시도한다
      if (열림.value) {
        닫기()
        불러오기실패알림()
      }
    } finally {
      불러오는중.value = false
      if (typeof window !== 'undefined') window.removeEventListener('keydown', Esc취소)
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

import { ref, nextTick } from 'vue'

/**
 * 스크린리더용 live region 에 넣을 문구. 같은 문구가 연달아 오면 DOM 이 바뀌지 않아 읽히지 않으므로,
 * 비웠다가 다음 틱에 넣는다. 화면에는 `<p class="sr-only" aria-live="polite">{{ 문구 }}</p>` 로 둔다.
 */
export function useLiveAnnounce() {
  const 문구 = ref('')
  function 알리기(글) {
    문구.value = ''
    nextTick(() => { 문구.value = 글 })
  }
  return { 문구, 알리기 }
}

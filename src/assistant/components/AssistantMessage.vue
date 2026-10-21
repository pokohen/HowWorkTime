<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useAssistant } from '../composables/useAssistant'
import { 마크다운HTML, 마크다운텍스트 } from '../utils/miniMarkdown'
import { 클립보드복사 } from '../../shared/utils/clipboard'

// 말풍선 하나. 사용자 말은 그대로, 응답은 가벼운 마크다운으로 그린다
const props = defineProps({
  메시지: { type: Object, required: true },
  /** 탭의 마지막 메시지인지. 실패·중단된 마지막 응답에만 '다시 시도'를 붙인다 */
  마지막: Boolean,
})
const { 전송중, 재시도 } = useAssistant()

const 응답 = computed(() => props.메시지.역할 === 'assistant')
const 재시도가능 = computed(() => props.마지막 && (props.메시지.오류 || props.메시지.중단됨))
/** 답변이 끝났고 내용이 있을 때만 복사 버튼을 보여 준다 */
const 복사가능 = computed(() => 응답.value && !props.메시지.진행중 && !props.메시지.오류 && Boolean(props.메시지.내용?.trim()))

// ── 렌더 ──────────────────────────────────────────────────
// 조각이 올 때마다 전체 글을 다시 파싱하면 긴 답변에서 O(n²) 이 된다.
// 받는 중에는 150ms 에 한 번만 파싱하고, 끝나면 즉시 최종본을 그린다
const 파싱간격 = 150
const 렌더HTML = ref('')
let 파싱타이머 = null
function 파싱() {
  clearTimeout(파싱타이머)
  파싱타이머 = null
  렌더HTML.value = 마크다운HTML(props.메시지.내용)
}
watch(() => [props.메시지.내용, props.메시지.진행중], ([, 진행중], 이전) => {
  if (!응답.value) return // 사용자 말풍선은 그대로 보여 주므로 파싱하지 않는다
  // 끝났거나 처음 그릴 때(탭을 오가며 다시 마운트되는 경우 포함)는 바로, 받는 중의 조각은 묶어서
  if (!진행중 || !이전) return 파싱()
  if (!파싱타이머) 파싱타이머 = setTimeout(파싱, 파싱간격)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(파싱타이머))

// ── 복사 ──────────────────────────────────────────────────
const 복사상태 = ref('') // '' | 'done' | 'fail'. 잠깐 보여 주고 되돌린다
let 복사표시타이머 = null
async function 복사() {
  const 성공 = await 클립보드복사(마크다운텍스트(props.메시지.내용))
  clearTimeout(복사표시타이머)
  복사상태.value = 성공 ? 'done' : 'fail'
  복사표시타이머 = setTimeout(() => { 복사상태.value = '' }, 1800)
}
onBeforeUnmount(() => clearTimeout(복사표시타이머))
const 복사문구 = computed(() => ({ done: '복사됨', fail: '복사 실패' }[복사상태.value] ?? '복사'))
</script>

<template>
  <div
    class="msg"
    :class="[`msg--${메시지.역할}`, { 'msg--error': 메시지.오류, 'msg--streaming': 메시지.진행중 }]"
  >
    <div v-if="!응답" class="bubble">{{ 메시지.내용 }}</div>
    <div v-else class="bubble">
      <div v-if="렌더HTML" class="md" v-html="렌더HTML" />
      <span v-if="메시지.진행중" class="typing" aria-label="응답 작성 중"><i /><i /><i /></span>
      <p v-if="메시지.오류" class="msg-error">{{ 메시지.오류 }}</p>
      <p v-else-if="메시지.중단됨" class="msg-note">응답을 중단했어요.</p>
      <p v-else-if="메시지.잘림" class="msg-note">답변이 길어서 여기서 잘렸어요. 이어서 써 달라고 요청해 보세요.</p>
      <button
        v-if="재시도가능"
        type="button"
        class="retry-btn"
        :disabled="전송중"
        @click="재시도"
      >다시 시도</button>
      <div v-if="복사가능" class="bubble-actions">
        <button
          type="button"
          class="copy-btn"
          :class="{ 'copy-btn--done': 복사상태 === 'done', 'copy-btn--fail': 복사상태 === 'fail' }"
          :aria-label="복사상태 === 'done' ? '복사됨' : '이 답변 복사'"
          title="이 답변 복사"
          @click="복사"
        >
          <svg v-if="복사상태 === 'done'" class="copy-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
          </svg>
          <svg v-else class="copy-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
          <span>{{ 복사문구 }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
}
.msg--user { justify-content: flex-end; }
.msg--assistant { justify-content: flex-start; }
.bubble {
  max-width: 86%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.93rem;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}
.msg--user .bubble {
  background: var(--primary);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.msg--assistant .bubble {
  background: var(--surface-soft);
  border: 1px solid var(--card-border);
  border-bottom-left-radius: 6px;
  white-space: normal;
}
.msg--error .bubble {
  background: var(--tint-red-bg);
  border-color: var(--tint-red-border);
}
.md :deep(p) { margin: 0 0 8px; }
.md :deep(p:last-child) { margin-bottom: 0; }
.md :deep(h4) { margin: 10px 0 4px; font-size: 0.95rem; font-weight: 700; }
.md :deep(h4:first-child) { margin-top: 0; }
.md :deep(ul), .md :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.md :deep(li) { margin: 2px 0; }
.md :deep(hr) { margin: 10px 0; border: 0; border-top: 1px solid var(--hairline); }
.md :deep(pre) {
  margin: 6px 0 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-muted);
  overflow-x: auto;
  white-space: pre;
}
.md :deep(pre code) { padding: 0; background: none; font-size: 0.82em; }
.md :deep(code) {
  font-size: 0.85em;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--surface-muted);
}
.msg-error {
  margin: 4px 0 0;
  font-size: 0.86rem;
  color: var(--tint-red-text);
}
.msg-note {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--label);
}
.retry-btn {
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--card-bg);
  color: var(--text-soft);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.retry-btn:hover { background: var(--surface-muted); }
.retry-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.bubble-actions {
  display: flex;
  justify-content: flex-end;
  margin: 8px -6px -4px 0;
}
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--label);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.copy-btn:hover { background: var(--surface-muted); color: var(--text-soft); }
.copy-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.copy-btn--done { color: var(--tint-green-text); }
.copy-btn--fail { color: var(--tint-red-text); }
.copy-icon { width: 14px; height: 14px; fill: currentColor; }

.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 1.2em;
  vertical-align: middle;
}
.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--label);
  animation: typing-dot 1.2s ease-in-out infinite;
}
.typing i:nth-child(2) { animation-delay: 0.15s; }
.typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing-dot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}
/* 스트리밍 중 내용이 있으면 점은 글 끝에 작게 붙는다 */
.md + .typing { margin-top: 4px; }

@media (max-width: 640px) {
  .bubble { max-width: 92%; }
}
@media (prefers-reduced-motion: reduce) {
  .typing i { animation: none; opacity: 0.6; }
}
</style>

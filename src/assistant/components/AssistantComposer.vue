<script setup>
import { ref, computed, nextTick } from 'vue'
import { useAssistant } from '../composables/useAssistant'

// 입력창 + 보내기/중단. 전송 자체는 composable 이 하고, 부모는 '보냄'을 받아 스크롤만 맞춘다
const emit = defineEmits(['보냄', '설정열기'])
const { 키있음, 전송중, 활성탭응답중, 활성탭다른창받는중, 전송, 중단, 저장실패, 합치기실패 } = useAssistant()

const 입력창 = ref(null)
const 입력 = ref('')
const 보낼수있음 = computed(() => 키있음.value && !전송중.value && !활성탭다른창받는중.value && 입력.value.trim().length > 0)

function 높이맞춤() {
  const el = 입력창.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}
async function 보내기() {
  if (!보낼수있음.value) return
  const 내용 = 입력.value
  입력.value = ''
  await nextTick()
  높이맞춤()
  emit('보냄')
  // 그 사이 상황이 바뀌어(다른 창이 이 대화를 받기 시작 등) 보내지 않았으면 적은 글을 되살린다.
  // 보낸 뒤의 실패는 대화 안에 오류로 남는다 (응답받기는 예외를 밖으로 던지지 않는다). 같은 질문이 두 번 들어가지 않게
  let 보냄
  try {
    보냄 = await 전송(내용)
  } catch (예외) {
    console.error('[플래너] 보내기 중 예외', 예외) // 대화에 이미 들어갔을 수 있으므로 글은 되살리지 않는다
    return
  }
  if (보냄 === false && !입력.value) {
    입력.value = 내용
    await nextTick()
    높이맞춤()
  }
}
function 키입력(e) {
  // Enter 는 전송, Shift+Enter 는 줄바꿈. 한글 조합 중에는 보내지 않는다.
  // Safari 는 조합을 확정하는 Enter 를 isComposing=false 로 보내므로 keyCode 229 도 함께 거른다
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
    e.preventDefault()
    보내기()
  }
}
function 포커스() {
  입력창.value?.focus()
}
/** 시작 제안 등으로 문장을 채우고 바로 보낼 수 있게 포커스한다 */
function 채우기(문장) {
  입력.value = 문장
  nextTick(() => { 높이맞춤(); 포커스() })
}
defineExpose({ 포커스, 채우기 })
</script>

<template>
  <footer class="composer">
    <div v-if="!키있음" class="key-banner">
      <span>API 키를 설정하면 대화를 시작할 수 있어요.</span>
      <button type="button" class="key-banner-btn" @click="emit('설정열기')">설정 열기</button>
    </div>
    <div class="composer-row">
      <textarea
        ref="입력창"
        v-model="입력"
        class="composer-input"
        rows="1"
        :placeholder="!키있음 ? '먼저 설정에서 API 키를 넣어 주세요' : 활성탭다른창받는중 ? '다른 창에서 이 대화의 답을 받는 중이에요' : '예: 다음 달 연휴에 뭐 하면 좋을까?'"
        :disabled="!키있음"
        aria-label="메시지 입력"
        @input="높이맞춤"
        @keydown="키입력"
      />
      <!-- 중단 버튼은 지금 보는 탭이 응답을 받는 중일 때만. 다른 탭이 받는 중이면 보내기를 잠그고 이유를 알려 준다 -->
      <button
        v-if="활성탭응답중"
        type="button"
        class="send-btn send-btn--stop"
        aria-label="응답 중단"
        title="응답 중단"
        @click="중단"
      >
        <svg class="send-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" />
        </svg>
      </button>
      <button
        v-else
        type="button"
        class="send-btn"
        :disabled="!보낼수있음"
        aria-label="보내기"
        :title="활성탭다른창받는중 ? '다른 창에서 이 대화의 답을 받는 중이에요' : 전송중 ? '다른 대화의 응답을 받는 중이에요' : '보내기 (Enter)'"
        @click="보내기"
      >
        <svg class="send-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <p v-if="합치기실패" class="composer-hint composer-hint--warn" role="status">⚠ 다른 창에서 저장한 대화를 읽지 못해 이 창의 저장을 잠시 미루고 있어요. 곧 다시 시도해요</p>
    <p v-else-if="저장실패" class="composer-hint composer-hint--warn" role="status">⚠ 대화를 이 브라우저에 저장하지 못하고 있어요. 저장 공간이 가득 찼거나 브라우저가 저장을 막았어요 (대화 탭을 닫으면 공간이 생겨요)</p>
    <p v-else class="composer-hint">Enter 전송 · Shift+Enter 줄바꿈 · 대화는 이 브라우저에 저장돼요</p>
  </footer>
</template>

<style scoped>
.composer {
  border-top: 1px solid var(--hairline);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;
  background: var(--card-bg);
}
.key-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--tint-amber-bg);
  border: 1px solid var(--tint-amber-border);
  color: var(--tint-amber-text);
  font-size: 0.84rem;
  font-weight: 600;
}
.key-banner-btn {
  flex: none;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--tint-amber-border);
  background: var(--card-bg);
  color: var(--tint-amber-text);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}
.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.composer-input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  max-height: 160px;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font: inherit;
  font-size: 0.93rem;
  line-height: 1.45;
  resize: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.composer-input:focus-visible {
  outline: none;
  border-color: var(--focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.composer-input:disabled { opacity: 0.6; cursor: not-allowed; }
.send-btn {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 0;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, transform 0.1s, background 0.15s;
}
.send-icon { width: 22px; height: 22px; display: block; }
.send-btn:hover { transform: translateY(-1px); }
.send-btn:active { transform: translateY(0) scale(0.96); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.send-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.send-btn--stop { background: var(--accent-red); }
.send-btn--stop:hover { background: var(--accent-red-deep); }
.composer-hint {
  margin: 8px 2px 0;
  font-size: 0.74rem;
  color: var(--hint);
}
.composer-hint.composer-hint--warn { color: var(--tint-red-text); } /* 기본 힌트 색보다 뒤·더 구체적으로 */
@media (max-width: 640px) {
  .composer-hint:not(.composer-hint--warn) { display: none; }
}
</style>

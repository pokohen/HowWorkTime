<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { useAssistant } from '../composables/useAssistant'
import { 마크다운HTML } from '../utils/miniMarkdown'
import AssistantSettings from './AssistantSettings.vue'

const {
  열림, 설정열림, 닫기,
  탭목록, 활성탭ID, 활성탭, 탭선택, 새탭추가, 탭삭제,
  키있음, 제공자정보, 모델,
  전송중, 전송, 중단, 재시도,
} = useAssistant()

const 다이얼로그 = ref(null)
const 입력창 = ref(null)
const 메시지영역 = ref(null)
const 입력 = ref('')

/** 빈 탭에서 보여 주는 시작 제안. 누르면 입력창에 채워져 바로 보낼 수 있다 */
const 시작제안 = [
  { 아이콘: '🌴', 제목: '휴가 추천', 문장: '이번 달이나 다음 달에 연차 하루 붙여서 쉬기 좋은 날이 있을까? 그때 뭐 하면 좋을지도 같이 추천해 줘.' },
  { 아이콘: '🎉', 제목: '주말 계획', 문장: '이번 주말에 할 만한 걸 몇 가지 추천해 줘. 집에서 쉬는 것 하나, 가볍게 나가는 것 하나, 좀 특별한 것 하나.' },
  { 아이콘: '✈️', 제목: '여행 일정', 문장: '다가오는 연휴에 맞춰 2박 3일 국내 여행 일정을 짜고 싶어. 어디로 가면 좋을지부터 같이 정해 줘.' },
]

const 보낼수있음 = computed(() => 키있음.value && !전송중.value && 입력.value.trim().length > 0)

// ── 열고 닫기 ──────────────────────────────────────────────
watch(열림, async (값) => {
  const el = 다이얼로그.value
  if (!el) return
  if (값) {
    if (!el.open) el.showModal()
    await nextTick()
    아래로스크롤(true)
    입력창.value?.focus()
  } else if (el.open) {
    el.close()
  }
})
// 열린 상태에서 컴포넌트가 다시 마운트되면(HMR 등) 새 dialog 요소도 열어 둔다
onMounted(() => {
  if (열림.value && 다이얼로그.value && !다이얼로그.value.open) 다이얼로그.value.showModal()
})
// Esc 로 닫혔을 때 상태를 맞춘다
function 다이얼로그닫힘() {
  if (열림.value) 닫기()
}
// 바깥(backdrop) 클릭. 내용 영역 클릭은 target 이 dialog 자신이 아니다
function 바깥클릭(e) {
  if (e.target === 다이얼로그.value) 닫기()
}

// ── 메시지 스크롤 ──────────────────────────────────────────
function 아래로스크롤(강제 = false) {
  const el = 메시지영역.value
  if (!el) return
  const 바닥근처 = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  if (강제 || 바닥근처) el.scrollTop = el.scrollHeight
}
// 스트리밍 조각이 들어올 때마다 바닥에 붙어 있으면 따라 내려간다
watch(() => 활성탭.value.메시지.map((m) => m.내용.length).join(','), () => nextTick(() => 아래로스크롤()))
watch(활성탭ID, () => nextTick(() => 아래로스크롤(true)))
watch(설정열림, (값) => { if (!값) nextTick(() => { 아래로스크롤(true); 입력창.value?.focus() }) })

// ── 입력 ──────────────────────────────────────────────────
function 입력높이맞춤() {
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
  입력높이맞춤()
  아래로스크롤(true)
  await 전송(내용)
}
function 키입력(e) {
  // Enter 는 전송, Shift+Enter 는 줄바꿈. 한글 조합 중(isComposing)에는 보내지 않는다
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    보내기()
  }
}
function 제안선택(문장) {
  입력.value = 문장
  nextTick(() => { 입력높이맞춤(); 입력창.value?.focus() })
}
function 새탭열기() {
  새탭추가()
  nextTick(() => 입력창.value?.focus())
}
function 탭이름(탭) {
  return 탭.제목 || '새 대화'
}
</script>

<template>
  <dialog
    ref="다이얼로그"
    class="assistant-dialog"
    aria-labelledby="assistant-title"
    @close="다이얼로그닫힘"
    @click="바깥클릭"
  >
    <div class="assistant-panel">
      <header class="assistant-head">
        <div class="assistant-head-text">
          <h2 id="assistant-title" class="assistant-title">
            <svg class="assistant-title-star" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.6l2.65 5.95 6.45.7-4.8 4.4 1.35 6.35L12 16.8 6.35 20l1.35-6.35-4.8-4.4 6.45-.7z" />
            </svg>
            쉬는 날 플래너
          </h2>
          <p class="assistant-sub">
            <template v-if="설정열림">제공자와 키를 설정해요</template>
            <template v-else-if="키있음">{{ 제공자정보.모델가족 }} · {{ 모델 }}</template>
            <template v-else>휴가 · 주말 · 여행을 AI와 같이 계획해요</template>
          </p>
        </div>
        <!-- 설정 중에는 톱니 대신 '완료'를 보여 설정에서 어떻게 돌아가는지 분명히 한다 -->
        <button
          v-if="설정열림"
          type="button"
          class="done-btn"
          @click="설정열림 = false"
        >완료</button>
        <button
          v-else
          type="button"
          class="icon-btn"
          aria-label="설정"
          title="설정"
          @click="설정열림 = true"
        >
          <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.4-2.5a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.3 7.3 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1a7.3 7.3 0 0 0 1.7 1l.4 2.6a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a7.3 7.3 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13z" />
          </svg>
        </button>
        <button type="button" class="icon-btn" aria-label="닫기" title="닫기 (Esc)" @click="닫기">✕</button>
      </header>

      <div v-if="!설정열림" class="tabs" role="tablist" aria-label="대화 목록">
        <div class="tabs-scroll">
          <button
            v-for="탭 in 탭목록"
            :key="탭.id"
            type="button"
            role="tab"
            class="tab"
            :class="{ active: 탭.id === 활성탭ID }"
            :aria-selected="탭.id === 활성탭ID"
            :title="탭이름(탭)"
            @click="탭선택(탭.id)"
          >
            <span class="tab-name">{{ 탭이름(탭) }}</span>
            <span
              v-if="탭.id === 활성탭ID"
              class="tab-close"
              role="button"
              tabindex="0"
              aria-label="이 대화 닫기"
              @click.stop="탭삭제(탭.id)"
              @keydown.enter.space.prevent.stop="탭삭제(탭.id)"
            >×</span>
          </button>
        </div>
        <button type="button" class="tab-add" aria-label="새 대화" title="새 대화" @click="새탭열기">＋</button>
      </div>

      <AssistantSettings v-if="설정열림" class="assistant-body" />

      <template v-else>
        <div ref="메시지영역" class="assistant-body messages" aria-live="polite">
          <div v-if="활성탭.메시지.length === 0" class="empty">
            <p class="empty-lead">무엇을 계획해 볼까요?</p>
            <p class="empty-desc">이번 달 공휴일, 연휴, 남은 출근일을 이미 알고 있어서 달력 없이 바로 물어볼 수 있어요.</p>
            <div class="suggestions">
              <button
                v-for="제안 in 시작제안"
                :key="제안.제목"
                type="button"
                class="suggestion"
                @click="제안선택(제안.문장)"
              >
                <span class="suggestion-icon">{{ 제안.아이콘 }}</span>
                <span class="suggestion-text">
                  <strong>{{ 제안.제목 }}</strong>
                  <span>{{ 제안.문장 }}</span>
                </span>
              </button>
            </div>
          </div>

          <div
            v-for="m in 활성탭.메시지"
            :key="m.id"
            class="msg"
            :class="[`msg--${m.역할}`, { 'msg--error': m.오류, 'msg--streaming': m.진행중 }]"
          >
            <div v-if="m.역할 === 'user'" class="bubble">{{ m.내용 }}</div>
            <div v-else class="bubble">
              <div v-if="m.내용" class="md" v-html="마크다운HTML(m.내용)" />
              <span v-if="m.진행중" class="typing" aria-label="응답 작성 중"><i /><i /><i /></span>
              <p v-if="m.오류" class="msg-error">{{ m.오류 }}</p>
              <p v-else-if="m.중단됨" class="msg-note">응답을 중단했어요.</p>
              <button
                v-if="(m.오류 || m.중단됨) && m === 활성탭.메시지[활성탭.메시지.length - 1]"
                type="button"
                class="retry-btn"
                :disabled="전송중"
                @click="재시도"
              >다시 시도</button>
            </div>
          </div>
        </div>

        <footer class="composer">
          <div v-if="!키있음" class="key-banner">
            <span>API 키를 설정하면 대화를 시작할 수 있어요.</span>
            <button type="button" class="key-banner-btn" @click="설정열림 = true">설정 열기</button>
          </div>
          <div class="composer-row">
            <textarea
              ref="입력창"
              v-model="입력"
              class="composer-input"
              rows="1"
              :placeholder="키있음 ? '예: 다음 달 연휴에 뭐 하면 좋을까?' : '먼저 설정에서 API 키를 넣어 주세요'"
              :disabled="!키있음"
              aria-label="메시지 입력"
              @input="입력높이맞춤"
              @keydown="키입력"
            />
            <button
              v-if="전송중"
              type="button"
              class="send-btn send-btn--stop"
              aria-label="응답 중단"
              title="응답 중단"
              @click="중단"
            >■</button>
            <button
              v-else
              type="button"
              class="send-btn"
              :disabled="!보낼수있음"
              aria-label="보내기"
              title="보내기 (Enter)"
              @click="보내기"
            >↑</button>
          </div>
          <p class="composer-hint">Enter 전송 · Shift+Enter 줄바꿈 · 대화는 이 브라우저에 저장돼요</p>
        </footer>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.assistant-dialog {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  width: min(600px, calc(100vw - 32px));
  height: min(720px, calc(100dvh - 48px));
  max-width: none;
  max-height: none;
  overflow: visible;
}
.assistant-dialog::backdrop {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}
.assistant-dialog[open] .assistant-panel {
  animation: panel-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
.assistant-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 22px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

/* ── 머리 ── */
.assistant-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 14px 12px 20px;
}
.assistant-head-text {
  flex: 1;
  min-width: 0;
}
.assistant-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.assistant-title-star {
  width: 20px;
  height: 20px;
  fill: var(--accent-amber);
  flex: none;
}
.assistant-sub {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--label);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-soft);
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.icon-btn:hover { background: var(--surface-muted); }
.icon-btn.active { background: var(--tint-amber-bg); border-color: var(--tint-amber-border); color: var(--tint-amber-text); }
.icon-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.icon-svg { width: 19px; height: 19px; fill: currentColor; }
.done-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 0;
  background: var(--primary);
  color: #fff;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.done-btn:hover { opacity: 0.9; }
.done-btn:active { transform: scale(0.97); }
.done-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }

/* ── 탭 ── */
.tabs {
  display: flex;
  align-items: stretch;
  gap: 6px;
  padding: 0 12px 0 20px;
  border-bottom: 1px solid var(--hairline);
}
.tabs-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
}
.tabs-scroll::-webkit-scrollbar { display: none; }
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  max-width: 180px;
  padding: 10px 10px 11px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--label);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: var(--text-soft); }
.tab.active {
  color: var(--text);
  border-bottom-color: var(--accent-amber);
}
.tab:focus-visible { outline: none; border-radius: 8px; box-shadow: 0 0 0 3px var(--focus-ring); }
.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.95rem;
  line-height: 1;
  color: var(--label);
  transition: background 0.15s, color 0.15s;
}
.tab-close:hover { background: var(--surface-muted); color: var(--accent-red); }
.tab-add {
  flex: none;
  align-self: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px dashed var(--input-border);
  background: transparent;
  color: var(--label);
  font: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tab-add:hover { background: var(--surface-muted); color: var(--text); border-color: var(--input-border-hover); }

/* ── 본문 ── */
.assistant-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  scroll-behavior: smooth;
}
.empty {
  margin: auto 0;
  text-align: center;
  padding: 12px 4px 20px;
}
.empty-lead {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.empty-desc {
  margin: 0 auto 18px;
  max-width: 360px;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--label);
}
.suggestions {
  display: grid;
  gap: 8px;
  text-align: left;
}
.suggestion {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--surface-soft);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}
.suggestion:hover { background: var(--surface-muted); border-color: var(--input-border-hover); transform: translateY(-1px); }
.suggestion:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.suggestion-icon { font-size: 1.3rem; line-height: 1.2; }
.suggestion-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-soft);
}
.suggestion-text strong { font-size: 0.9rem; color: var(--text); }

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

/* ── 입력 ── */
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
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, transform 0.1s, background 0.15s;
}
.send-btn:hover { transform: translateY(-1px); }
.send-btn:active { transform: translateY(0) scale(0.96); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.send-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.send-btn--stop { background: var(--accent-red); font-size: 0.9rem; }
.send-btn--stop:hover { background: var(--accent-red-deep); }
.composer-hint {
  margin: 8px 2px 0;
  font-size: 0.74rem;
  color: var(--hint);
}

/* ── 모바일: 바텀시트 ── */
@media (max-width: 640px) {
  .assistant-dialog {
    width: 100vw;
    height: 92dvh;
    margin: auto 0 0;
    max-width: 100vw;
  }
  .assistant-panel {
    border-radius: 22px 22px 0 0;
    border-bottom: 0;
  }
  .assistant-dialog[open] .assistant-panel {
    animation-name: sheet-in;
  }
  @keyframes sheet-in {
    from { transform: translateY(40px); opacity: 0.6; }
    to { transform: none; opacity: 1; }
  }
  .bubble { max-width: 92%; }
  .composer-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .assistant-dialog[open] .assistant-panel { animation: none; }
  .typing i { animation: none; opacity: 0.6; }
  .messages { scroll-behavior: auto; }
}
</style>

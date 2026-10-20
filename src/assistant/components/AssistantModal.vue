<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAssistant } from '../composables/useAssistant'
import AssistantSettings from './AssistantSettings.vue'
import AssistantTabs from './AssistantTabs.vue'
import AssistantEmptyState from './AssistantEmptyState.vue'
import AssistantMessage from './AssistantMessage.vue'
import AssistantComposer from './AssistantComposer.vue'
import StarIcon from './StarIcon.vue'
import { useLiveAnnounce } from '../../shared/composables/useLiveAnnounce'

// 쉬는 날 플래너 모달. 열고 닫기·머리·스크롤만 맡고, 탭·말풍선·입력은 각 컴포넌트가 맡는다
const { 열림, 설정열림, 닫기, 활성탭, 활성탭ID, 새탭추가, 키있음, 제공자정보, 모델 } = useAssistant()

const 다이얼로그 = ref(null)
const 메시지영역 = ref(null)
const 입력부 = ref(null)

// ── 열고 닫기 ──────────────────────────────────────────────
watch(열림, async (값) => {
  const el = 다이얼로그.value
  if (!el) return
  if (값) {
    if (!el.open) el.showModal()
    await nextTick()
    아래로스크롤(true)
    입력부.value?.포커스()
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
// 바깥(backdrop) 클릭. 내용 영역 클릭은 target 이 dialog 자신이 아니다.
// 글을 드래그해 고르다 backdrop 위에서 손을 떼면 click 의 target 도 dialog 가 되므로, 누르기 시작한 곳도 바깥이어야 닫는다
let 바깥에서누름 = false
function 바깥누름(e) {
  바깥에서누름 = e.target === 다이얼로그.value
}
function 바깥클릭(e) {
  if (바깥에서누름 && e.target === 다이얼로그.value) 닫기()
  바깥에서누름 = false
}

// ── 메시지 스크롤 ──────────────────────────────────────────
// '따라가는중'은 사용자가 바닥 근처에 있는지의 기록이다. 스크롤 이벤트에서만 갱신하므로
// 말풍선이 한꺼번에 자라도(150ms 묶음 파싱, 두 말풍선 동시 추가) 자라기 전의 위치로 판단한다.
let 따라가는중 = true
const 바닥여유 = 80
function 스크롤됨() {
  const el = 메시지영역.value
  if (el) 따라가는중 = el.scrollHeight - el.scrollTop - el.clientHeight < 바닥여유
}
function 아래로스크롤(강제 = false) {
  const el = 메시지영역.value
  if (!el) return
  if (강제) 따라가는중 = true
  // 프로그램이 내리는 스크롤은 즉시 이동한다 (CSS smooth 애니메이션 도중의 위치로 판단이 흔들리지 않게)
  if (따라가는중) el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
}
// 내용이 실제로 커진 뒤(렌더 커밋 후)에 따라 내려간다. 조각 수신 시점이 아니라 DOM 이 자란 시점이 기준이다
const 내용영역 = ref(null)
let 크기관찰 = null
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  크기관찰 = new ResizeObserver(() => 아래로스크롤())
  watch(내용영역, (el, 이전) => {
    if (이전) 크기관찰.unobserve(이전)
    if (el) 크기관찰.observe(el)
  }, { immediate: true })
})
onBeforeUnmount(() => 크기관찰?.disconnect())
// 메시지가 새로 추가되면(내가 보낸 말 + 응답 자리) 항상 끝까지 내려간다
watch(() => 활성탭.value.메시지.length, (지금, 이전) => { if (지금 > 이전) nextTick(() => 아래로스크롤(true)) })
watch(활성탭ID, () => nextTick(() => 아래로스크롤(true)))
watch(설정열림, (값) => { if (!값) nextTick(() => { 아래로스크롤(true); 입력부.value?.포커스() }) })

function 새탭열기() {
  새탭추가()
  nextTick(() => 입력부.value?.포커스())
}

// 스크린리더 안내. 메시지 목록 전체를 live region 으로 두면 조각마다 다시 읽으므로, 응답이 끝났을 때 한 줄만 알린다.
// 같은 메시지의 진행중이 true→false 로 바뀔 때만이다 (탭을 바꿔서 다른 메시지가 보이는 것은 도착이 아니다)
const { 문구: 읽기안내, 알리기 } = useLiveAnnounce()
watch(() => { const m = 활성탭.value.메시지.at(-1); return m ? { id: m.id, 진행중: m.진행중 } : null }, (지금, 이전) => {
  if (!지금 || !이전 || 지금.id !== 이전.id || 이전.진행중 !== true || 지금.진행중 !== false) return
  const 마지막 = 활성탭.value.메시지.at(-1)
  알리기(마지막?.오류 ? '응답을 받지 못했어요.' : 마지막?.중단됨 ? '응답을 중단했어요.' : '응답이 도착했어요.')
})
</script>

<template>
  <dialog
    ref="다이얼로그"
    class="assistant-dialog"
    aria-labelledby="assistant-title"
    @close="다이얼로그닫힘"
    @pointerdown="바깥누름"
    @click="바깥클릭"
  >
    <div class="assistant-panel">
      <header class="assistant-head">
        <div class="assistant-head-text">
          <h2 id="assistant-title" class="assistant-title">
            <StarIcon class="assistant-title-star" />
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
        <button type="button" class="icon-btn" aria-label="닫기" title="닫기 (Esc)" @click="닫기">
          <svg class="icon-svg icon-svg--stroke" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <AssistantTabs v-if="!설정열림" @새대화="새탭열기" />

      <AssistantSettings v-if="설정열림" class="assistant-body" />

      <template v-else>
        <p class="sr-only" aria-live="polite">{{ 읽기안내 }}</p>
        <div ref="메시지영역" class="assistant-body messages" @scroll.passive="스크롤됨">
          <div ref="내용영역" class="messages-inner">
            <AssistantEmptyState v-if="활성탭.메시지.length === 0" @선택="입력부?.채우기($event)" />
            <AssistantMessage
              v-for="(m, i) in 활성탭.메시지"
              :key="m.id"
              :메시지="m"
              :마지막="i === 활성탭.메시지.length - 1"
            />
          </div>
        </div>
        <AssistantComposer ref="입력부" @보냄="아래로스크롤(true)" @설정열기="설정열림 = true" />
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
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.icon-btn:hover { background: var(--surface-muted); }
.icon-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.icon-svg { width: 19px; height: 19px; fill: currentColor; }
.icon-svg--stroke { fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
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

/* ── 본문 ── */
.assistant-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.messages {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  scroll-behavior: smooth;
}
.messages-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: none; /* 부모(flex 컬럼)에 맞춰 줄어들지 않고 내용 높이를 따라야 ResizeObserver 가 커지는 것을 본다 */
  min-height: 100%; /* 빈 상태 안내가 가운데 오도록 */
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
}
@media (prefers-reduced-motion: reduce) {
  .assistant-dialog[open] .assistant-panel { animation: none; }
  .messages { scroll-behavior: auto; }
}
</style>

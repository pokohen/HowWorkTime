<script setup>
import { useAssistant } from '../composables/useAssistant'

const { 열림, 토글, 전송중 } = useAssistant()
</script>

<template>
  <button
    type="button"
    class="assistant-fab"
    :class="{ open: 열림, busy: 전송중 }"
    aria-label="쉬는 날 플래너 열기"
    title="쉬는 날 플래너 · 휴가·주말·여행을 AI와 계획해요"
    :aria-expanded="열림"
    @click="토글"
  >
    <svg class="assistant-fab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6l2.65 5.95 6.45.7-4.8 4.4 1.35 6.35L12 16.8 6.35 20l1.35-6.35-4.8-4.4 6.45-.7z" />
    </svg>
  </button>
</template>

<style scoped>
/* 다크모드 버튼(52px, bottom 20px) 바로 위에 12px 간격으로 쌓인다 */
.assistant-fab {
  position: fixed;
  right: 20px;
  bottom: calc(max(20px, env(safe-area-inset-bottom)) + 64px);
  z-index: 50;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--accent-amber);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14), 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s, color 0.15s;
}
.assistant-fab:hover {
  background: var(--surface-muted);
  border-color: var(--input-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18), 0 3px 6px rgba(0, 0, 0, 0.1);
}
.assistant-fab:active {
  transform: translateY(0) scale(0.95);
}
.assistant-fab:focus-visible {
  outline: none;
  border-color: var(--accent-amber);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25), 0 6px 20px rgba(0, 0, 0, 0.14);
}
.assistant-fab.open {
  background: var(--tint-amber-bg);
  border-color: var(--tint-amber-border);
}
.assistant-fab-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.12));
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.assistant-fab:hover .assistant-fab-icon {
  transform: rotate(18deg) scale(1.08);
}
/* 응답을 받는 중이면 모달을 닫아도 별이 숨 쉬듯 깜빡인다 */
.assistant-fab.busy .assistant-fab-icon {
  animation: star-breathe 1.4s ease-in-out infinite;
}
@keyframes star-breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.82); opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .assistant-fab.busy .assistant-fab-icon { animation: none; }
}
</style>

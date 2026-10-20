<script setup>
import { useAssistant } from '../composables/useAssistant'

// 모달을 닫아 둔 사이 응답이 끝났을 때 화면 하단에 뜨는 알림. 누르면 그 대화가 열린다.
const { 알림, 알림열기, 알림닫기 } = useAssistant()
</script>

<template>
  <Transition name="toast">
    <div v-if="알림" class="toast" :class="`toast--${알림.종류}`" role="status" aria-live="polite">
      <button type="button" class="toast-main" @click="알림열기">
        <span class="toast-icon" aria-hidden="true">{{ 알림.종류 === 'error' ? '!' : '✦' }}</span>
        <span class="toast-text">
          <strong>{{ 알림.종류 === 'error' ? '답변을 받지 못했어요' : '답변이 도착했어요' }}</strong>
          <span class="toast-sub">{{ 알림.제목 }} · 눌러서 보기</span>
        </span>
      </button>
      <button type="button" class="toast-close" aria-label="알림 닫기" @click="알림닫기">✕</button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: max(20px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: min(420px, calc(100vw - 112px)); /* 오른쪽 FAB 두 개와 겹치지 않게 */
  padding: 6px 6px 6px 8px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.1);
}
.toast-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.toast-main:hover { background: var(--surface-muted); }
.toast-main:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.toast-icon {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  background: var(--tint-amber-bg);
  color: var(--accent-amber);
}
.toast--error .toast-icon {
  background: var(--tint-red-bg);
  color: var(--accent-red);
}
.toast-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.86rem;
  line-height: 1.3;
}
.toast-sub {
  font-size: 0.76rem;
  color: var(--label);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.toast-close {
  flex: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--label);
  font-size: 0.85rem;
  cursor: pointer;
}
.toast-close:hover { background: var(--surface-muted); color: var(--text); }
.toast-close:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }

.toast-enter-active { transition: opacity 0.25s, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }

@media (max-width: 640px) {
  .toast {
    left: 16px;
    right: 88px;
    transform: none;
    max-width: none;
  }
  .toast-enter-from,
  .toast-leave-to { transform: translateY(12px); }
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: opacity 0.15s; }
}
</style>

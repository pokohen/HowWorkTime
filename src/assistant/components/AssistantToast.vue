<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAssistant } from '../composables/useAssistant'
import { useLiveAnnounce } from '../../shared/composables/useLiveAnnounce'

// 모달을 닫아 둔 사이 응답이 끝났을 때 화면 하단에 뜨는 알림. 누르면 그 대화가 열린다.
const { 알림, 알림열기, 알림닫기 } = useAssistant()

const 제목 = (알림) => (알림.종류 === 'error' ? '답변을 받지 못했어요' : '답변이 도착했어요')

// live region 은 내용이 바뀌기 전에 이미 있어야 읽힌다. 토스트 요소는 v-if 로 생겼다 사라지므로
// 항상 떠 있는 sr-only 영역에 문구를 따로 넣는다
const { 문구: 읽기안내, 알리기 } = useLiveAnnounce()
watch(알림, (값) => { if (값) 알리기(`${제목(값)}. ${값.제목}`) })

// 모달이 showModal() 로 열려 있으면 보통 요소는 그 뒤(top layer 아래)에 깔려 보이지도 눌리지도 않는다.
// popover 로 띄우면 같은 top layer 에 올라가 모달 위에 보인다. (미지원 브라우저는 기존처럼 일반 레이어)
const 겉 = ref(null)
watch(알림, async (값) => {
  await nextTick()
  const el = 겉.value
  if (!el || typeof el.showPopover !== 'function') return
  try {
    if (값 && !el.matches(':popover-open')) el.showPopover()
    else if (!값 && el.matches(':popover-open')) setTimeout(() => { if (!알림.value) el.hidePopover() }, 250) // 사라지는 전환 뒤에
  } catch { /* 이미 열림/닫힘 등 */ }
}, { immediate: true })
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ 읽기안내 }}</p>
  <div ref="겉" class="toast-layer" popover="manual">
  <Transition name="toast">
    <div v-if="알림" class="toast" :class="`toast--${알림.종류}`">
      <button type="button" class="toast-main" @click="알림열기">
        <span class="toast-icon" aria-hidden="true">{{ 알림.종류 === 'error' ? '!' : '✦' }}</span>
        <span class="toast-text">
          <strong>{{ 제목(알림) }}</strong>
          <span class="toast-sub">{{ 알림.제목 }} · 눌러서 보기</span>
        </span>
      </button>
      <button type="button" class="toast-close" aria-label="알림 닫기" @click="알림닫기">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  </Transition>
  </div>
</template>

<style scoped>
/* popover 의 기본 스타일(가운데 박스·테두리·배경)을 지우고, 안쪽 .toast 가 위치를 잡게 한다 */
.toast-layer {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  width: 0;
  height: 0;
}
.toast-layer:not(:popover-open) { display: contents; } /* popover 미지원·닫힘 상태에서도 자식이 보이게 */
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
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.toast-close svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
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

<script setup>
import { useAssistant } from '../composables/useAssistant'

// 대화 탭 줄. 새 대화는 부모가 입력창 포커스까지 맡으므로 이벤트로 올린다
const emit = defineEmits(['새대화'])
const { 탭목록, 활성탭ID, 탭선택, 탭삭제 } = useAssistant()

function 탭이름(탭) {
  return 탭.제목 || '새 대화'
}
</script>

<template>
  <div class="tabs" role="tablist" aria-label="대화 목록">
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
    <button type="button" class="tab-add" aria-label="새 대화" title="새 대화" @click="emit('새대화')">＋</button>
  </div>
</template>

<style scoped>
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
</style>

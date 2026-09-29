<script setup>
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

const { 테마, 토글 } = useTheme()
const 다크모드 = computed(() => 테마.value === 'dark')
</script>

<template>
  <button
    type="button"
    class="theme-fab"
    :aria-label="다크모드 ? '라이트 모드로 전환' : '다크 모드로 전환'"
    :title="다크모드 ? '라이트 모드로' : '다크 모드로'"
    @click="토글"
  >
    <span class="theme-fab-icon">{{ 다크모드 ? '☀️' : '🌙' }}</span>
  </button>
</template>

<style scoped>
.theme-fab {
  position: fixed;
  right: 20px;
  bottom: max(20px, env(safe-area-inset-bottom));
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
  font-size: 1.35rem;
  color: var(--text-soft);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14), 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
}
.theme-fab:hover {
  background: var(--surface-muted);
  border-color: var(--input-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18), 0 3px 6px rgba(0, 0, 0, 0.1);
}
.theme-fab:active {
  transform: translateY(0) scale(0.95);
}
.theme-fab:focus-visible {
  outline: none;
  border-color: var(--accent-green);
  box-shadow: 0 0 0 3px rgba(6, 199, 85, 0.22), 0 6px 20px rgba(0, 0, 0, 0.14);
}
.theme-fab-icon {
  display: inline-block;
  line-height: 1;
}
</style>

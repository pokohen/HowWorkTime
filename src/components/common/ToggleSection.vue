<script setup>
// 제목 + 토글 스위치 한 줄. 켜지면 본문 슬롯이 펼쳐지고, 힌트 슬롯은 항상 아래에 표시된다.
const 켜짐 = defineModel({ type: Boolean, default: false })

defineProps({
  제목: { type: String, required: true },
  비활성: Boolean,
  비활성안내: String,
  인라인: Boolean, // 본문을 한 줄(가로) 배치
})
</script>

<template>
  <div class="setting-row">
    <label
      class="setting-head"
      :class="{ disabled: 비활성 }"
      :title="비활성 ? 비활성안내 : undefined"
    >
      <span class="setting-title">{{ 제목 }}</span>
      <span class="switch">
        <input type="checkbox" class="switch-input" v-model="켜짐" :disabled="비활성" />
        <span class="switch-track"><span class="switch-thumb" /></span>
      </span>
    </label>
    <div
      v-if="켜짐 && !비활성 && $slots.default"
      class="setting-body"
      :class="{ 'setting-body--inline': 인라인 }"
    >
      <slot />
    </div>
    <p v-if="$slots.힌트" class="setting-hint"><slot name="힌트" /></p>
  </div>
</template>

<style scoped>
.setting-row {
  display: flex;
  flex-direction: column;
  padding: 4px 2px;
  border-top: 1px solid var(--hairline);
}
.setting-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px;
  cursor: pointer;
  user-select: none;
}
.setting-head.disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.setting-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}
.setting-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 12px;
}
.setting-body--inline {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}
.setting-body--inline :deep(.setting-hint) {
  flex: 1 1 auto;
}
.setting-hint,
:deep(.setting-hint) {
  margin: 0;
  font-size: 0.78rem;
  color: var(--label);
  line-height: 1.5;
}
.setting-hint :deep(strong),
:deep(.setting-hint strong) {
  color: var(--text-soft);
  font-weight: 700;
}

/* 토글 스위치 */
.switch {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}
.switch-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.switch-input:disabled {
  cursor: not-allowed;
}
.switch-track {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #d1d6db;
  transition: background 0.2s ease;
}
.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.28);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.switch-input:checked + .switch-track {
  background: #3182f6;
}
.switch-input:checked + .switch-track .switch-thumb {
  transform: translateX(18px);
}
.switch-input:focus-visible + .switch-track {
  box-shadow: 0 0 0 3px rgba(49, 130, 246, 0.3);
}
.theme-dark .switch-track { background: #30363d; }
.theme-dark .switch-input:checked + .switch-track { background: #1f6feb; }
@media (prefers-reduced-motion: reduce) {
  .switch-thumb { transition: none; }
}
</style>

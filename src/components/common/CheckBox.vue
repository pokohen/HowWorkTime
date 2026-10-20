<script setup>
// 네이티브 체크박스 대신 SVG 로 그린 체크박스. 입력 요소는 숨기되 포커스·키보드·라벨 클릭은 그대로 동작한다.
const 체크 = defineModel({ type: Boolean, default: false })

defineProps({
  /** 아이콘 한 변 (px) */
  크기: { type: Number, default: 18 },
  disabled: Boolean,
})
</script>

<template>
  <label class="checkbox" :class="{ checked: 체크, disabled }">
    <input
      v-model="체크"
      type="checkbox"
      class="checkbox-input"
      :disabled="disabled"
    />
    <svg
      class="checkbox-icon"
      :style="{ width: `${크기}px`, height: `${크기}px` }"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <rect class="checkbox-box" x="1.5" y="1.5" width="17" height="17" rx="5" />
      <path class="checkbox-mark" d="M5.5 10.3 8.6 13.3 14.5 7" />
    </svg>
    <span v-if="$slots.default" class="checkbox-label"><slot /></span>
  </label>
</template>

<style scoped>
.checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  color: inherit;
}
.checkbox.disabled { cursor: not-allowed; opacity: 0.55; }
.checkbox-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}
.checkbox-icon {
  flex: none;
  display: block;
  overflow: visible;
}
.checkbox-box {
  fill: var(--input-bg);
  stroke: var(--input-border-hover);
  stroke-width: 1.5;
  transition: fill 0.15s, stroke 0.15s;
}
.checkbox-mark {
  fill: none;
  stroke: #fff;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 14;
  stroke-dashoffset: 14;
  transition: stroke-dashoffset 0.18s ease-out;
}
.checkbox:hover:not(.disabled) .checkbox-box { stroke: var(--focus); }
.checkbox.checked .checkbox-box { fill: var(--primary); stroke: var(--primary); }
.checkbox.checked .checkbox-mark { stroke-dashoffset: 0; }
.checkbox-input:focus-visible ~ .checkbox-icon .checkbox-box {
  stroke: var(--focus);
  filter: drop-shadow(0 0 0 3px var(--focus-ring));
}
.checkbox-input:focus-visible ~ .checkbox-icon {
  border-radius: 7px;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.checkbox-label { line-height: 1; }
@media (prefers-reduced-motion: reduce) {
  .checkbox-mark, .checkbox-box { transition: none; }
}
</style>

<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useLeave } from '../composables/useLeave'
import ToggleSection from './common/ToggleSection.vue'

const { 연차여부, 연차분, 연차예산분, 연차잔여분, 연차일수환산, 연차항목, 연차증감 } = useLeave()
</script>

<template>
  <ToggleSection
    v-model="연차여부"
    제목="🌴 연차 / 반차"
    :비활성="연차예산분 === 0"
    비활성안내="현재까지 근무시간을 먼저 입력하세요"
  >
    <div class="annual-steppers">
      <div
        v-for="항목 in 연차항목"
        :key="항목.키"
        class="annual-stepper"
        :class="{ filled: 항목.값 > 0 }"
      >
        <span class="annual-stepper-name">{{ 항목.키 }}</span>
        <span class="annual-stepper-hour">{{ 항목.시간 }}</span>
        <div class="annual-stepper-ctrl">
          <button
            type="button"
            class="annual-btn"
            :disabled="항목.값 <= 0"
            :aria-label="`${항목.키} 줄이기`"
            @click="연차증감(항목.키, -1)"
          >−</button>
          <span class="annual-count">{{ 항목.값 }}</span>
          <button
            type="button"
            class="annual-btn"
            :disabled="연차잔여분 < 항목.단위"
            :aria-label="`${항목.키} 늘리기`"
            @click="연차증감(항목.키, 1)"
          >+</button>
        </div>
      </div>
    </div>

    <template #힌트>
      <template v-if="연차예산분 === 0">현재까지 근무시간을 먼저 입력하면 그 안에서 연차를 지정할 수 있어요.</template>
      <template v-else-if="연차여부">
        <template v-if="연차분 > 0">지정 <strong>{{ 시분변환(연차분) }}</strong> · 출근일 −{{ 연차일수환산 }}일 · </template>남은 한도 {{ 시분변환(연차잔여분) }} / {{ 시분변환(연차예산분) }}
      </template>
      <template v-else>연차·반차를 지정하면 그만큼 출근일이 줄어요 <span class="hint-extra">· 연차 −1일 · 반차 −0.5일 · 반반차 −0.25일</span></template>
    </template>
  </ToggleSection>
</template>

<style scoped>
.annual-steppers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.annual-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  background: #f7f8fa;
  border-radius: 10px;
  transition: background 0.15s;
}
.annual-stepper.filled {
  background: #e8fbfb;
}
.annual-stepper-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: #33383f;
}
.annual-stepper-hour {
  font-size: 0.68rem;
  font-weight: 800;
  color: #0e7490;
  background: #d3f6f7;
  padding: 2px 5px;
  border-radius: 5px;
  letter-spacing: 0.01em;
}
.annual-stepper-ctrl {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.annual-btn {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  border: none;
  background: #eef1f4;
  color: #4e5968;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, transform 0.08s;
}
.annual-btn:hover:not(:disabled) {
  background: #e2e6ea;
  color: #191f28;
}
.annual-btn:active:not(:disabled) {
  transform: scale(0.92);
}
.annual-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.22);
}
.annual-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.annual-count {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text);
  min-width: 1.4ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.hint-extra {
  color: #94a3b8;
}

.theme-dark .annual-stepper {
  background: rgba(255, 255, 255, 0.05);
}
.theme-dark .annual-stepper.filled {
  background: rgba(14, 165, 233, 0.16);
}
.theme-dark .annual-stepper-name { color: #f0f6fc; }
.theme-dark .annual-stepper-hour {
  background: #0c3a52;
  color: #7dd3fc;
}
.theme-dark .annual-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #c9d1d9;
}
.theme-dark .annual-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.theme-dark .hint-extra { color: #8b949e; }
</style>

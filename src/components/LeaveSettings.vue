<script setup>
import { 시분변환 } from '../utils/timeFormat'

const 연차여부 = defineModel('연차여부')
const 연차일수 = defineModel('연차일수')
const 반차수 = defineModel('반차수')
const 반반차수 = defineModel('반반차수')

const props = defineProps({
  연차분: Number,
  연차예산분: Number,
  연차잔여분: Number,
  연차일수환산: Number,
})

// 증감: 잔여 예산(현재까지 근무시간 − 이미 지정한 연차) 안에서만 증가 허용
function 연차증감(필드, 델타) {
  const 단위 = 필드 === '연차' ? 480 : 필드 === '반차' ? 240 : 120
  if (델타 > 0 && props.연차잔여분 < 단위) return
  const 대상 = 필드 === '연차' ? 연차일수 : 필드 === '반차' ? 반차수 : 반반차수
  대상.value = Math.max(0, (Number(대상.value) || 0) + 델타)
}
</script>

<template>
  <div class="input-today setting-row">
    <label
      class="setting-head"
      :class="{ disabled: 연차예산분 === 0 }"
      :title="연차예산분 === 0 ? '현재까지 근무시간을 먼저 입력하세요' : undefined"
    >
      <span class="setting-title">🌴 연차 / 반차</span>
      <span class="switch">
        <input type="checkbox" class="switch-input" v-model="연차여부" :disabled="연차예산분 === 0" />
        <span class="switch-track"><span class="switch-thumb"></span></span>
      </span>
    </label>
    <div v-if="연차여부 && 연차예산분 > 0" class="setting-body">
      <div class="annual-steppers">
        <div
          v-for="항목 in [
            { 키: '연차', 이름: '연차', 시간: '8h', 값: 연차일수, 단위: 480 },
            { 키: '반차', 이름: '반차', 시간: '4h', 값: 반차수, 단위: 240 },
            { 키: '반반차', 이름: '반반차', 시간: '2h', 값: 반반차수, 단위: 120 },
          ]"
          :key="항목.키"
          class="annual-stepper"
          :class="{ filled: 항목.값 > 0 }"
        >
          <span class="annual-stepper-name">{{ 항목.이름 }}</span>
          <span class="annual-stepper-hour">{{ 항목.시간 }}</span>
          <div class="annual-stepper-ctrl">
            <button
              type="button"
              class="annual-btn"
              :disabled="항목.값 <= 0"
              :aria-label="`${항목.이름} 줄이기`"
              @click="연차증감(항목.키, -1)"
            >−</button>
            <span class="annual-count">{{ 항목.값 }}</span>
            <button
              type="button"
              class="annual-btn"
              :disabled="연차잔여분 < 항목.단위"
              :aria-label="`${항목.이름} 늘리기`"
              @click="연차증감(항목.키, 1)"
            >+</button>
          </div>
        </div>
      </div>
      <p class="setting-hint">
        <template v-if="연차분 > 0">지정 <strong>{{ 시분변환(연차분) }}</strong> · 출근일 −{{ 연차일수환산 }}일 · </template>남은 한도 {{ 시분변환(연차잔여분) }} / {{ 시분변환(연차예산분) }}
      </p>
    </div>
    <p v-else-if="연차예산분 === 0" class="setting-hint">현재까지 근무시간을 먼저 입력하면 그 안에서 연차를 지정할 수 있어요.</p>
    <p v-else class="setting-hint">연차·반차를 지정하면 그만큼 출근일이 줄어요 <span class="hint-extra">· 연차 −1일 · 반차 −0.5일 · 반반차 −0.25일</span></p>
  </div>
</template>

<style scoped>
/* 연차 스텝퍼 — 1 : 1 : 1 세 열 */
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
  color: #0f172a;
  min-width: 1.4ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Dark mode */
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
.theme-dark .annual-count { color: #f0f6fc; }
</style>

<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useToday } from '../composables/useToday'
import { useTodayWork } from '../composables/useTodayWork'
import TimeField from './common/TimeField.vue'
import ClockField from './common/ClockField.vue'

const { 오늘금요일여부 } = useToday()
const {
  오늘재택근무, 오늘입력모드, 출근시각, 퇴근시각, 휴게자동, 휴게수동분, 오늘예상시간,
  자정넘김여부, 총체류분, 휴게분, 오늘예상분,
  오늘모드, 오늘모드설정,
} = useTodayWork()

const 입력모드들 = [
  { 키: '재택', 이름: '🏠 재택', 금요일만: true },
  { 키: '출퇴근', 이름: '출·퇴근으로 계산' },
  { 키: '직접', 이름: '직접 입력' },
]
const 휴게선택지 = [
  { 분: 0, 이름: '0분' },
  { 분: 30, 이름: '30분' },
  { 분: 45, 이름: '45분' },
  { 분: 60, 이름: '1시간' },
  { 분: 90, 이름: '1시간 30분' },
  { 분: 120, 이름: '2시간' },
]
</script>

<template>
  <div class="today-input">
    <div class="today-header">
      <label>오늘 예상 근무시간</label>
      <div class="mode-switch" role="tablist" aria-label="입력 방식">
        <template v-for="모드 in 입력모드들" :key="모드.키">
          <button
            v-if="!모드.금요일만 || 오늘금요일여부"
            type="button"
            role="tab"
            :aria-selected="오늘모드 === 모드.키"
            :class="{ active: 오늘모드 === 모드.키 }"
            @click="오늘모드설정(모드.키)"
          >{{ 모드.이름 }}</button>
        </template>
      </div>
    </div>

    <div v-if="오늘재택근무" class="wfh-active-card">
      <span class="wfh-active-icon">🏠</span>
      <div class="wfh-active-body">
        <p class="wfh-active-title">오늘 재택근무 적용됨 · <strong>8:00</strong></p>
        <p class="wfh-active-sub">
          오늘 근무시간은 <strong>8:00</strong>으로 계산됩니다.
          재택 근무시간은 위 ‘현재까지 근무시간’에 포함해 주세요.
        </p>
      </div>
    </div>

    <template v-else-if="오늘입력모드 === '출퇴근'">
      <div class="commute-grid">
        <ClockField v-model="출근시각" 라벨="출근" placeholder="출근 시각" />
        <ClockField v-model="퇴근시각" 라벨="퇴근 예상" placeholder="퇴근 시각" />
        <div class="commute-field">
          <label for="휴게수동">휴게시간</label>
          <div class="break-row">
            <select
              id="휴게수동"
              v-model.number="휴게수동분"
              :disabled="휴게자동"
              class="select-field select-field--lg break-select"
            >
              <option v-for="선택 in 휴게선택지" :key="선택.분" :value="선택.분">{{ 선택.이름 }}</option>
            </select>
            <label class="auto-toggle">
              <input type="checkbox" v-model="휴게자동" />
              <span>자동</span>
            </label>
          </div>
        </div>
      </div>

      <div class="commute-result" :class="{ midnight: 자정넘김여부 }" aria-live="polite">
        <span class="result-tag">오늘 예상</span>
        <span class="result-time">{{ 시분변환(오늘예상분) }}</span>
        <span class="result-formula">
          체류 {{ 시분변환(총체류분) }} − 휴게 {{ 시분변환(휴게분) }}
          <template v-if="휴게자동">(자동)</template>
        </span>
        <span v-if="자정넘김여부" class="midnight-badge" title="퇴근이 출근보다 빠르거나 같음">
          🌙 자정 넘김
        </span>
      </div>
    </template>

    <TimeField
      v-else
      id="오늘예상"
      v-model="오늘예상시간"
      :예시="['8:00']"
      빈값="0:00"
    >
      <template #힌트>
        오늘 추가로 일할 시간 · <strong>현재까지에 더해</strong> 합산
        <span class="hint-extra">(기본 <code>0:00</code>)</span>
      </template>
    </TimeField>
  </div>
</template>

<style scoped>
.today-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 12px;
}
.today-header > label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-soft);
}
.mode-switch {
  display: inline-flex;
  background: var(--surface-muted);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.mode-switch button {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--label);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mode-switch button:hover {
  color: var(--text-soft);
}
.mode-switch button.active {
  background: var(--elevated);
  color: var(--tint-blue-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.wfh-active-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--tint-blue-bg);
  border: 1.5px solid var(--tint-blue-border);
  border-radius: 12px;
}
.wfh-active-icon {
  font-size: 1.5rem;
  line-height: 1.2;
}
.wfh-active-body {
  flex: 1;
  min-width: 0;
}
.wfh-active-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--tint-blue-text);
  margin: 0 0 4px;
}
.wfh-active-sub {
  font-size: 0.8rem;
  color: var(--text-soft);
  margin: 0;
  line-height: 1.55;
}

.commute-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.commute-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.commute-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--label);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.break-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.break-select {
  flex: 1;
  min-width: 0;
}
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.auto-toggle input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--focus);
  cursor: pointer;
  margin: 0;
}
.commute-result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--tint-green-bg);
  border: 1px solid var(--tint-green-border);
  border-radius: 12px;
}
.commute-result .result-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--tint-green-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.commute-result .result-time {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
}
.commute-result .result-formula {
  font-size: 0.78rem;
  color: var(--text-soft);
  margin-left: auto;
}
.commute-result.midnight {
  background: var(--tint-indigo-bg);
  border-color: var(--tint-indigo-border);
}
.midnight-badge {
  flex-basis: 100%;
  font-size: 0.78rem;
  color: var(--tint-indigo-text);
  font-weight: 600;
}

@media (max-width: 640px) {
  .commute-grid {
    grid-template-columns: 1fr;
  }
  .commute-result .result-formula {
    margin-left: 0;
    flex-basis: 100%;
  }
}
</style>

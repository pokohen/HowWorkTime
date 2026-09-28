<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { 시분파싱, 시분변환 } from '../utils/timeFormat'

const 오늘재택근무 = defineModel('오늘재택근무')
const 오늘입력모드 = defineModel('오늘입력모드')
const 출근시각 = defineModel('출근시각')
const 퇴근시각 = defineModel('퇴근시각')
const 휴게수동분 = defineModel('휴게수동분')
const 휴게자동 = defineModel('휴게자동')
const 오늘예상시간 = defineModel('오늘예상시간')

defineProps({
  오늘금요일여부: Boolean,
  다크모드: Boolean,
  오늘예상유효: Boolean,
  자정넘김여부: Boolean,
  총체류분: Number,
  휴게분: Number,
  오늘예상분: Number,
})

function 시각분리(시각) {
  const 매칭 = String(시각 ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!매칭) return { 시: 9, 분: 0 }
  return { 시: Number(매칭[1]), 분: Number(매칭[2]) }
}
function 시각조립(시, 분) {
  return `${String(시).padStart(2, '0')}:${String(분).padStart(2, '0')}`
}
function 시각객체(시각) {
  if (!시각) return null
  const { 시, 분 } = 시각분리(시각)
  return { hours: 시, minutes: 분, seconds: 0 }
}
const 출근객체 = computed({
  get: () => 시각객체(출근시각.value),
  set: (값) => { 출근시각.value = 값 ? 시각조립(값.hours, 값.minutes) : '' },
})
const 퇴근객체 = computed({
  get: () => 시각객체(퇴근시각.value),
  set: (값) => { 퇴근시각.value = 값 ? 시각조립(값.hours, 값.minutes) : '' },
})

// 오늘 입력 방식: 재택 / 출퇴근 / 직접 을 하나의 세그먼트 토글로 통합
const 오늘모드 = computed(() => (오늘재택근무.value ? '재택' : 오늘입력모드.value))
function 오늘모드설정(모드) {
  if (모드 === '재택') {
    오늘재택근무.value = true
  } else {
    오늘재택근무.value = false
    오늘입력모드.value = 모드
  }
}

function 지금시각() {
  const 지금 = new Date()
  const 시 = String(지금.getHours()).padStart(2, '0')
  const 분 = String(지금.getMinutes()).padStart(2, '0')
  return `${시}:${분}`
}
function 출근지금() { 출근시각.value = 지금시각() }
function 퇴근지금() { 퇴근시각.value = 지금시각() }

function 오늘예상정규화() {
  const 결과 = 시분파싱(오늘예상시간.value)
  if (!결과.유효) return
  오늘예상시간.value = 결과.비어있음 ? '0:00' : 시분변환(Math.max(0, 결과.분))
}
</script>

<template>
  <div class="input-today">
    <div class="today-header">
      <label>오늘 예상 근무시간</label>
      <div class="mode-switch" role="tablist" aria-label="입력 방식">
        <button
          v-if="오늘금요일여부"
          type="button"
          role="tab"
          :aria-selected="오늘모드 === '재택'"
          :class="{ active: 오늘모드 === '재택' }"
          @click="오늘모드설정('재택')"
        >🏠 재택</button>
        <button
          type="button"
          role="tab"
          :aria-selected="오늘모드 === '출퇴근'"
          :class="{ active: 오늘모드 === '출퇴근' }"
          @click="오늘모드설정('출퇴근')"
        >출·퇴근으로 계산</button>
        <button
          type="button"
          role="tab"
          :aria-selected="오늘모드 === '직접'"
          :class="{ active: 오늘모드 === '직접' }"
          @click="오늘모드설정('직접')"
        >직접 입력</button>
      </div>
    </div>

    <!-- 재택근무 활성 상태: 입력 영역을 대체 -->
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

    <template v-if="!오늘재택근무 && 오늘입력모드 === '출퇴근'">
      <div class="commute-grid">
        <div class="commute-field">
          <label>출근</label>
          <div class="time-input-wrap">
            <VueDatePicker
              v-model="출근객체"
              time-picker
              :is-24="true"
              auto-apply
              :clearable="false"
              :minutes-increment="5"
              :minutes-grid-increment="5"
              :dark="다크모드"
              placeholder="출근 시각"
              class="dp-wrap"
            />
            <button type="button" class="now-btn" @click="출근지금" title="현재 시각으로">📍 지금</button>
          </div>
        </div>
        <div class="commute-field">
          <label>퇴근 예상</label>
          <div class="time-input-wrap">
            <VueDatePicker
              v-model="퇴근객체"
              time-picker
              :is-24="true"
              auto-apply
              :clearable="false"
              :minutes-increment="5"
              :minutes-grid-increment="5"
              :dark="다크모드"
              placeholder="퇴근 시각"
              class="dp-wrap"
            />
            <button type="button" class="now-btn" @click="퇴근지금" title="현재 시각으로">📍 지금</button>
          </div>
        </div>
        <div class="commute-field commute-break">
          <label for="휴게수동">휴게시간</label>
          <div class="break-row">
            <select
              id="휴게수동"
              v-model.number="휴게수동분"
              :disabled="휴게자동"
              class="break-select"
            >
              <option :value="0">0분</option>
              <option :value="30">30분</option>
              <option :value="45">45분</option>
              <option :value="60">1시간</option>
              <option :value="90">1시간 30분</option>
              <option :value="120">2시간</option>
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

    <template v-else-if="!오늘재택근무">
      <div class="input-with-unit">
        <input
          id="오늘예상"
          v-model="오늘예상시간"
          @blur="오늘예상정규화"
          :class="{ error: !오늘예상유효 }"
          :aria-invalid="!오늘예상유효"
          type="text"
          inputmode="numeric"
          placeholder="0:00"
          pattern="[0-9:]*"
        />
      </div>
      <p v-if="!오늘예상유효" class="input-error">
        ⚠ 형식이 올바르지 않습니다. 예: <code>8:00</code> 또는 <code>800</code>
      </p>
      <p v-else class="input-hint">
        오늘 추가로 일할 시간 · <strong>현재까지에 더해</strong> 합산
        <span class="hint-extra">(기본 <code>0:00</code>)</span>
      </p>
    </template>
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
.mode-switch {
  display: inline-flex;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
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
  color: #64748b;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mode-switch button:hover {
  color: #334155;
}
.mode-switch button.active {
  background: #fff;
  color: #1d4ed8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

/* 재택근무 활성 상태 카드 */
.wfh-active-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
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
  color: #1d4ed8;
  margin: 0 0 4px;
}
.wfh-active-sub {
  font-size: 0.8rem;
  color: #475569;
  margin: 0;
  line-height: 1.55;
}

.dp-wrap {
  flex: 1;
  min-width: 0;
}
.dp-wrap :deep(.dp__input) {
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  padding-left: 36px;
}
.dp-wrap :deep(.dp__input:focus),
.dp-wrap :deep(.dp__input_focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
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
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.time-input-wrap {
  display: flex;
  gap: 6px;
}
.now-btn {
  appearance: none;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.now-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.break-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.break-select {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 32px 0 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.break-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.break-select:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.auto-toggle input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: #3b82f6;
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
  background: #e6f9f0;
  border: 1px solid #b7e8c8;
  border-radius: 12px;
}
.commute-result .result-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: #06873e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.commute-result .result-time {
  font-size: 1.15rem;
  font-weight: 800;
  color: #04632d;
  letter-spacing: -0.02em;
}
.commute-result .result-formula {
  font-size: 0.78rem;
  color: #4b5563;
  margin-left: auto;
}
.commute-result.midnight {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.midnight-badge {
  flex-basis: 100%;
  font-size: 0.78rem;
  color: #4338ca;
  font-weight: 600;
}

/* Dark mode */
.theme-dark .mode-switch {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .mode-switch button { color: #8b949e; }
.theme-dark .mode-switch button.active {
  background: #161b22;
  color: #56d364;
}
.theme-dark .commute-field label { color: #8b949e; }
.theme-dark .dp-wrap :deep(.dp__input) {
  background: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
}
.theme-dark .now-btn {
  background: #161b22;
  border-color: #21262d;
  color: #c9d1d9;
}
.theme-dark .now-btn:hover {
  background: #0a2e1c;
  border-color: #2ea44f;
  color: #56d364;
}
.theme-dark .break-select {
  background-color: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.theme-dark .auto-toggle { color: #c9d1d9; }
.theme-dark .commute-result {
  background: #0a2e1c;
  border-color: #155f3a;
}
.theme-dark .commute-result .result-tag { color: #56d364; }
.theme-dark .commute-result .result-time { color: #f0f6fc; }
.theme-dark .commute-result .result-formula { color: #c9d1d9; }
.theme-dark .commute-result.midnight {
  background: #161335;
  border-color: #3730a3;
}
.theme-dark .midnight-badge { color: #a5b4fc; }
.theme-dark .wfh-active-card {
  background: #122440;
  border-color: #27477e;
}
.theme-dark .wfh-active-title { color: #8cc2ff; }
.theme-dark .wfh-active-sub { color: #8b949e; }

/* Responsive */
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

<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { 시분변환, 시각파싱, 시각조립 } from '../utils/timeFormat'
import { useTheme } from '../composables/useTheme'
import { useToday } from '../composables/useToday'
import { useTodayWork } from '../composables/useTodayWork'
import TimeField from './common/TimeField.vue'

const { 테마 } = useTheme()
const 다크모드 = computed(() => 테마.value === 'dark')
const { 오늘금요일여부 } = useToday()
const {
  오늘재택근무, 오늘입력모드, 출근시각, 퇴근시각, 휴게자동, 휴게수동분, 오늘예상시간,
  자정넘김여부, 총체류분, 휴게분, 오늘예상분,
  오늘모드, 오늘모드설정, 출근지금, 퇴근지금,
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

// VueDatePicker 는 { hours, minutes } 객체를 쓰므로 "HH:MM" 문자열과 상호 변환
function 시각객체(시각ref) {
  return computed({
    get: () => {
      if (!시각ref.value) return null
      const 분합 = 시각파싱(시각ref.value) ?? 9 * 60
      return { hours: Math.floor(분합 / 60), minutes: 분합 % 60, seconds: 0 }
    },
    set: (값) => {
      시각ref.value = 값 ? 시각조립(값.hours, 값.minutes) : ''
    },
  })
}
const 출근객체 = 시각객체(출근시각)
const 퇴근객체 = 시각객체(퇴근시각)
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
            <button type="button" class="now-btn" title="현재 시각으로" @click="출근지금">📍 지금</button>
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
            <button type="button" class="now-btn" title="현재 시각으로" @click="퇴근지금">📍 지금</button>
          </div>
        </div>
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
  color: #374151;
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
  color: var(--label);
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

.theme-dark .today-header > label { color: #c9d1d9; }
.theme-dark .mode-switch {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .mode-switch button { color: #8b949e; }
.theme-dark .mode-switch button.active {
  background: #161b22;
  color: #56d364;
}
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

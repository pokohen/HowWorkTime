<script setup>
import { ref, computed } from 'vue'
import { getWorkDaysInMonth, getRemainingWorkDays } from '../utils/workHours'
import { getHolidaysForMonth, getHolidayName } from '../utils/holidays'

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1

const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)
const fixedOvertime = ref(10)
const workedHours = ref(null)

const HOURS_PER_DAY = 8

const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    years.push(y)
  }
  return years
})

const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// 소정 근로일
const workDays = computed(() =>
  getWorkDaysInMonth(selectedYear.value, selectedMonth.value),
)

// 의무 근로시간
const mandatoryHours = computed(() => workDays.value * HOURS_PER_DAY)

// 최대 근로시간
const maxHours = computed(
  () => workDays.value * HOURS_PER_DAY + (fixedOvertime.value || 0),
)

// 남은 근무일 (오늘 포함)
const remainingWorkDays = computed(() =>
  getRemainingWorkDays(selectedYear.value, selectedMonth.value),
)

// 경과 근무일
const passedWorkDays = computed(() => workDays.value - remainingWorkDays.value)

// 현재까지 근무시간 (입력값, 없으면 0)
const inputHours = computed(() => Number(workedHours.value) || 0)

// 남은 의무 근무시간
const remainingMandatory = computed(() =>
  Math.max(0, mandatoryHours.value - inputHours.value),
)

// 남은 최대 근무시간
const remainingMax = computed(() =>
  Math.max(0, maxHours.value - inputHours.value),
)

// 의무 달성을 위한 일평균 근무시간
const avgForMandatory = computed(() => {
  if (remainingWorkDays.value === 0) return 0
  return (remainingMandatory.value / remainingWorkDays.value).toFixed(2)
})

// 최대 달성을 위한 일평균 근무시간
const avgForMax = computed(() => {
  if (remainingWorkDays.value === 0) return 0
  return (remainingMax.value / remainingWorkDays.value).toFixed(2)
})

// 달성률 (의무 기준)
const achievementRate = computed(() => {
  if (mandatoryHours.value === 0) return 0
  return Math.min(100, Math.round((inputHours.value / mandatoryHours.value) * 100))
})

// 초과 근무시간 (의무 기준)
const overtimeHours = computed(() =>
  Math.max(0, inputHours.value - mandatoryHours.value),
)

// 이미 의무 달성 여부
const isMandatoryAchieved = computed(() => inputHours.value >= mandatoryHours.value)

// 공휴일 목록 (선택 월)
const holidaysInMonth = computed(() =>
  getHolidaysForMonth(selectedYear.value, selectedMonth.value),
)

// 프로그레스 바 색상
const progressColor = computed(() => {
  if (achievementRate.value >= 100) return '#10b981'
  if (achievementRate.value >= 70) return '#f59e0b'
  return '#3b82f6'
})

// 선택 월 표시
const selectedMonthLabel = computed(
  () => `${selectedYear.value}년 ${selectedMonth.value}월`,
)

// 날짜 포맷
function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}월 ${parseInt(d)}일`
}

// 요일 반환
function getDayOfWeek(dateStr) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const date = new Date(dateStr)
  return days[date.getDay()]
}

// 과거 월 여부
const isPastMonth = computed(() => {
  const selected = new Date(selectedYear.value, selectedMonth.value - 1, 1)
  const thisMonth = new Date(currentYear, currentMonth - 1, 1)
  return selected < thisMonth
})

// 현재 월 여부
const isCurrentMonth = computed(
  () => selectedYear.value === currentYear && selectedMonth.value === currentMonth,
)
</script>

<template>
  <div class="calculator">
    <header class="calc-header">
      <h1>⏱ 근무시간 계산기</h1>
      <p class="subtitle">소정근로일 기준 의무·최대 근로시간과 일평균 목표를 확인하세요</p>
    </header>

    <!-- 월 선택 -->
    <section class="card month-selector">
      <div class="selector-row">
        <div class="select-group">
          <label>연도</label>
          <select v-model="selectedYear">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}년</option>
          </select>
        </div>
        <div class="select-group">
          <label>월</label>
          <select v-model="selectedMonth">
            <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}월</option>
          </select>
        </div>
        <div class="month-badge">
          <span>{{ selectedMonthLabel }}</span>
          <span v-if="isCurrentMonth" class="badge current">이번 달</span>
          <span v-else-if="isPastMonth" class="badge past">지난 달</span>
          <span v-else class="badge future">다음 달</span>
        </div>
      </div>
    </section>

    <!-- 근무일 요약 -->
    <section class="summary-grid">
      <div class="summary-card blue">
        <div class="summary-icon">📅</div>
        <div class="summary-label">소정 근로일</div>
        <div class="summary-value">{{ workDays }}<span class="unit">일</span></div>
        <div class="summary-sub">주말·공휴일 제외</div>
      </div>
      <div class="summary-card green">
        <div class="summary-icon">✅</div>
        <div class="summary-label">의무 근로시간</div>
        <div class="summary-value">{{ mandatoryHours }}<span class="unit">H</span></div>
        <div class="summary-sub">8H × {{ workDays }}일</div>
      </div>
      <div class="summary-card purple">
        <div class="summary-icon">🚀</div>
        <div class="summary-label">최대 근로시간</div>
        <div class="summary-value">{{ maxHours }}<span class="unit">H</span></div>
        <div class="summary-sub">8H × {{ workDays }}일 + {{ fixedOvertime }}H</div>
      </div>
    </section>

    <!-- 입력 설정 -->
    <section class="card input-section">
      <h2 class="section-title">⚙️ 근무 설정</h2>
      <div class="input-grid">
        <div class="input-group">
          <label for="overtime">월 고정 연장근무 (H)</label>
          <div class="input-with-unit">
            <input
              id="overtime"
              v-model.number="fixedOvertime"
              type="number"
              min="0"
              max="100"
              step="0.5"
              placeholder="10"
            />
            <span class="input-unit">H</span>
          </div>
          <p class="input-hint">최대 근로시간 계산에 포함됩니다</p>
        </div>
        <div class="input-group">
          <label for="worked">현재까지 근무시간 (H)</label>
          <div class="input-with-unit">
            <input
              id="worked"
              v-model.number="workedHours"
              type="number"
              min="0"
              step="0.5"
              placeholder="0"
            />
            <span class="input-unit">H</span>
          </div>
          <p class="input-hint">오늘까지 실제로 근무한 총 시간</p>
        </div>
      </div>
    </section>

    <!-- 진행 상황 -->
    <section class="card progress-section" v-if="inputHours > 0">
      <h2 class="section-title">📊 달성 현황</h2>
      <div class="progress-info">
        <span>{{ inputHours }}H / {{ mandatoryHours }}H</span>
        <span class="achievement-rate" :style="{ color: progressColor }">{{ achievementRate }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: achievementRate + '%', backgroundColor: progressColor }"
        ></div>
      </div>
      <div class="progress-tags">
        <span v-if="isMandatoryAchieved" class="tag success">🎉 의무시간 달성!</span>
        <span v-if="overtimeHours > 0" class="tag overtime">추가 {{ overtimeHours }}H 근무</span>
        <span class="tag info">경과 근무일: {{ passedWorkDays }}일 / {{ workDays }}일</span>
      </div>
    </section>

    <!-- 결과 -->
    <section class="card result-section">
      <h2 class="section-title">📋 남은 근무 계획</h2>

      <div v-if="isPastMonth" class="notice past-notice">
        ℹ️ 지난 달입니다. 이번 달을 선택하면 남은 근무일 계산이 가능합니다.
      </div>

      <div class="result-grid">
        <div class="result-item">
          <div class="result-label">남은 근무일</div>
          <div class="result-value highlight-blue">
            {{ remainingWorkDays }}<span class="unit">일</span>
          </div>
          <div class="result-sub">오늘 포함</div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 의무 근무시간</div>
          <div class="result-value highlight-green">
            {{ remainingMandatory }}<span class="unit">H</span>
          </div>
          <div class="result-sub">{{ mandatoryHours }}H - {{ inputHours }}H</div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 최대 근무시간</div>
          <div class="result-value highlight-purple">
            {{ remainingMax }}<span class="unit">H</span>
          </div>
          <div class="result-sub">{{ maxHours }}H - {{ inputHours }}H</div>
        </div>
      </div>

      <div v-if="remainingWorkDays > 0" class="avg-section">
        <h3>일평균 목표 근무시간</h3>
        <div class="avg-grid">
          <div class="avg-card avg-mandatory">
            <div class="avg-label">의무 달성 일평균</div>
            <div class="avg-value">{{ avgForMandatory }}<span class="unit">H</span></div>
            <div class="avg-sub">{{ remainingWorkDays }}일 동안 매일</div>
          </div>
          <div class="avg-card avg-max">
            <div class="avg-label">최대 달성 일평균</div>
            <div class="avg-value">{{ avgForMax }}<span class="unit">H</span></div>
            <div class="avg-sub">{{ remainingWorkDays }}일 동안 매일</div>
          </div>
        </div>
      </div>
      <div v-else-if="!isPastMonth" class="notice">
        🎊 남은 근무일이 없습니다!
      </div>
    </section>

    <!-- 공휴일 목록 -->
    <section class="card holiday-section" v-if="holidaysInMonth.length > 0">
      <h2 class="section-title">🗓 {{ selectedMonthLabel }} 공휴일</h2>
      <ul class="holiday-list">
        <li v-for="h in holidaysInMonth" :key="h" class="holiday-item">
          <span class="holiday-date">{{ formatDate(h) }} ({{ getDayOfWeek(h) }})</span>
          <span class="holiday-name">{{ getHolidayName(h) }}</span>
        </li>
      </ul>
    </section>
    <section class="card holiday-section" v-else>
      <h2 class="section-title">🗓 {{ selectedMonthLabel }} 공휴일</h2>
      <p class="no-holiday">이 달에는 공휴일이 없습니다.</p>
    </section>
  </div>
</template>

<style scoped>
.calculator {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  font-family: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif;
  color: #1e293b;
}

/* Header */
.calc-header {
  text-align: center;
  margin-bottom: 32px;
}
.calc-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: #0f172a;
}
.subtitle {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0;
}

/* Card */
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

/* Section title */
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 20px;
}

/* Month selector */
.selector-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.select-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.select-group select {
  padding: 10px 36px 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 500;
  color: #0f172a;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.select-group select:focus {
  outline: none;
  border-color: #3b82f6;
}
.month-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}
.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}
.badge.current {
  background: #dbeafe;
  color: #1d4ed8;
}
.badge.past {
  background: #f1f5f9;
  color: #64748b;
}
.badge.future {
  background: #fef3c7;
  color: #92400e;
}

/* Summary grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.summary-card {
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid transparent;
}
.summary-card.blue {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.summary-card.green {
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.summary-card.purple {
  background: #faf5ff;
  border-color: #e9d5ff;
}
.summary-icon {
  font-size: 1.75rem;
  margin-bottom: 8px;
}
.summary-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.summary-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 6px;
}
.summary-value .unit {
  font-size: 1rem;
  font-weight: 500;
  margin-left: 2px;
  color: #64748b;
}
.summary-sub {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* Input section */
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-group label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}
.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-unit input {
  width: 100%;
  padding: 12px 44px 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-with-unit input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
}
.input-unit {
  position: absolute;
  right: 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
  pointer-events: none;
}
.input-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  margin: 0;
}

/* Progress section */
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #64748b;
}
.achievement-rate {
  font-size: 1.1rem;
  font-weight: 700;
}
.progress-bar {
  height: 12px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 12px;
}
.progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s ease;
}
.progress-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tag {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}
.tag.success {
  background: #dcfce7;
  color: #166534;
}
.tag.overtime {
  background: #fef3c7;
  color: #92400e;
}
.tag.info {
  background: #f1f5f9;
  color: #475569;
}

/* Result section */
.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.result-item {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 1px solid #e2e8f0;
}
.result-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.result-value {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 6px;
}
.result-value .unit {
  font-size: 0.9rem;
  font-weight: 500;
  margin-left: 2px;
}
.highlight-blue {
  color: #2563eb;
}
.highlight-green {
  color: #16a34a;
}
.highlight-purple {
  color: #7c3aed;
}
.result-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Average section */
.avg-section h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 14px;
}
.avg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.avg-card {
  border-radius: 12px;
  padding: 18px;
  text-align: center;
}
.avg-mandatory {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1px solid #a7f3d0;
}
.avg-max {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  border: 1px solid #c4b5fd;
}
.avg-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.avg-value {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 6px;
}
.avg-value .unit {
  font-size: 1rem;
  font-weight: 500;
  color: #64748b;
  margin-left: 2px;
}
.avg-sub {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* Notice */
.notice {
  padding: 14px 18px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #475569;
  border: 1px solid #e2e8f0;
}
.past-notice {
  margin-bottom: 20px;
}

/* Holiday section */
.no-holiday {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  padding: 8px 0;
}
.holiday-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.holiday-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fefce8;
  border-radius: 10px;
  border: 1px solid #fde68a;
}
.holiday-date {
  font-size: 0.88rem;
  font-weight: 600;
  color: #78350f;
}
.holiday-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #92400e;
  background: #fef3c7;
  padding: 2px 10px;
  border-radius: 20px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .calculator {
    color: #e2e8f0;
  }
  .calc-header h1 {
    color: #f1f5f9;
  }
  .subtitle {
    color: #94a3b8;
  }
  .card {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  .section-title {
    color: #cbd5e1;
  }
  .select-group label {
    color: #94a3b8;
  }
  .select-group select {
    background-color: #0f172a;
    border-color: #334155;
    color: #e2e8f0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  }
  .month-badge {
    color: #f1f5f9;
  }
  .summary-card.blue {
    background: #172554;
    border-color: #1e40af;
  }
  .summary-card.green {
    background: #14532d;
    border-color: #166534;
  }
  .summary-card.purple {
    background: #2e1065;
    border-color: #5b21b6;
  }
  .summary-label {
    color: #94a3b8;
  }
  .summary-value {
    color: #f1f5f9;
  }
  .input-group label {
    color: #cbd5e1;
  }
  .input-with-unit input {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
  }
  .input-with-unit input:focus {
    background: #0f172a;
  }
  .result-item {
    background: #0f172a;
    border-color: #334155;
  }
  .result-label {
    color: #94a3b8;
  }
  .progress-bar {
    background: #334155;
  }
  .progress-info {
    color: #94a3b8;
  }
  .tag.info {
    background: #334155;
    color: #94a3b8;
  }
  .avg-mandatory {
    background: linear-gradient(135deg, #14532d 0%, #166534 100%);
    border-color: #16a34a;
  }
  .avg-max {
    background: linear-gradient(135deg, #2e1065 0%, #4c1d95 100%);
    border-color: #6d28d9;
  }
  .avg-value {
    color: #f1f5f9;
  }
  .notice {
    background: #0f172a;
    border-color: #334155;
    color: #94a3b8;
  }
  .holiday-item {
    background: #292524;
    border-color: #78350f;
  }
  .holiday-date {
    color: #fde68a;
  }
  .holiday-name {
    background: #451a03;
    color: #fbbf24;
  }
  .no-holiday {
    color: #64748b;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .result-grid {
    grid-template-columns: 1fr;
  }
  .input-grid {
    grid-template-columns: 1fr;
  }
  .avg-grid {
    grid-template-columns: 1fr;
  }
  .calc-header h1 {
    font-size: 1.5rem;
  }
  .summary-value {
    font-size: 1.8rem;
  }
  .month-badge {
    margin-left: 0;
  }
}
</style>

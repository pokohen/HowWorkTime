<script setup>
import { ref, computed } from 'vue'
import { 월소정근로일수조회, 남은근무일수조회 } from '../utils/근무시간'
import { 월별공휴일조회 } from '../utils/공휴일'
import { 시분파싱, 시분변환 } from '../utils/시간포맷'
import 달성현황 from './달성현황.vue'
import 공휴일목록 from './공휴일목록.vue'
import 다음달미리보기 from './다음달미리보기.vue'

const 오늘 = new Date()
const 현재연도 = 오늘.getFullYear()
const 현재월 = 오늘.getMonth() + 1

const 선택연도 = ref(현재연도)
const 선택월 = ref(현재월)
const 고정연장시간 = ref('10:00')
const 입력근무시간 = ref('')

const 하루근무분 = 8 * 60

function 입력근무정규화() {
  const 결과 = 시분파싱(입력근무시간.value)
  if (!결과.유효) return
  입력근무시간.value = 결과.비어있음 ? '' : 시분변환(결과.분)
}

function 고정연장정규화() {
  const 결과 = 시분파싱(고정연장시간.value)
  if (!결과.유효) return
  고정연장시간.value = 시분변환(Math.max(0, 결과.분))
}

const 입력결과 = computed(() => 시분파싱(입력근무시간.value))
const 고정연장결과 = computed(() => 시분파싱(고정연장시간.value))
const 입력분 = computed(() => Math.max(0, 입력결과.value.분))
const 고정연장분 = computed(() => Math.max(0, 고정연장결과.value.분))
const 입력유효 = computed(() => 입력결과.value.유효)
const 고정연장유효 = computed(() => 고정연장결과.value.유효)

const 연도목록 = computed(() => {
  const 목록 = []
  for (let 연도 = 현재연도 - 1; 연도 <= 현재연도 + 2; 연도++) {
    목록.push(연도)
  }
  return 목록
})

const 월목록 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const 소정근로일 = computed(() =>
  월소정근로일수조회(선택연도.value, 선택월.value),
)
const 의무근로분 = computed(() => 소정근로일.value * 하루근무분)
const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
const 남은근무일 = computed(() =>
  남은근무일수조회(선택연도.value, 선택월.value),
)
const 경과근무일 = computed(() => 소정근로일.value - 남은근무일.value)
const 남은의무분 = computed(() =>
  Math.max(0, 의무근로분.value - 입력분.value),
)
const 남은최대분 = computed(() =>
  Math.max(0, 최대근로분.value - 입력분.value),
)
const 의무달성일평균분 = computed(() => {
  if (남은근무일.value === 0) return 0
  return Math.round(남은의무분.value / 남은근무일.value)
})
const 최대달성일평균분 = computed(() => {
  if (남은근무일.value === 0) return 0
  return Math.round(남은최대분.value / 남은근무일.value)
})
const 달성률 = computed(() => {
  if (의무근로분.value === 0) return 0
  return Math.min(100, Math.round((입력분.value / 의무근로분.value) * 100))
})
const 초과분 = computed(() =>
  Math.max(0, 입력분.value - 의무근로분.value),
)
const 의무달성여부 = computed(() => 입력분.value >= 의무근로분.value)
const 이달공휴일 = computed(() =>
  월별공휴일조회(선택연도.value, 선택월.value),
)

// 다음 달
const 다음달 = computed(() => {
  const 월 = 선택월.value === 12 ? 1 : 선택월.value + 1
  const 연도 = 선택월.value === 12 ? 선택연도.value + 1 : 선택연도.value
  return { 연도, 월 }
})
const 다음달표시 = computed(
  () => `${다음달.value.연도}년 ${다음달.value.월}월`,
)
const 다음달소정근로일 = computed(() =>
  월소정근로일수조회(다음달.value.연도, 다음달.value.월),
)
const 다음달의무근로분 = computed(
  () => 다음달소정근로일.value * 하루근무분,
)
const 다음달최대근로분 = computed(
  () => 다음달의무근로분.value + 고정연장분.value,
)
const 다음달공휴일 = computed(() =>
  월별공휴일조회(다음달.value.연도, 다음달.value.월),
)

const 진행바색상 = computed(() => {
  if (달성률.value >= 100) return '#10b981'
  if (달성률.value >= 70) return '#f59e0b'
  return '#3b82f6'
})

const 선택월표시 = computed(
  () => `${선택연도.value}년 ${선택월.value}월`,
)

const 지난달여부 = computed(() => {
  const 선택 = new Date(선택연도.value, 선택월.value - 1, 1)
  const 이번달 = new Date(현재연도, 현재월 - 1, 1)
  return 선택 < 이번달
})

const 이번달여부 = computed(
  () => 선택연도.value === 현재연도 && 선택월.value === 현재월,
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
          <label for="연도선택">연도</label>
          <select id="연도선택" v-model="선택연도">
            <option v-for="연도 in 연도목록" :key="연도" :value="연도">{{ 연도 }}년</option>
          </select>
        </div>
        <div class="select-group">
          <label for="월선택">월</label>
          <select id="월선택" v-model="선택월">
            <option v-for="월 in 월목록" :key="월" :value="월">{{ 월 }}월</option>
          </select>
        </div>
        <div class="month-badge">
          <span>{{ 선택월표시 }}</span>
          <span v-if="이번달여부" class="badge current">이번 달</span>
          <span v-else-if="지난달여부" class="badge past">지난 달</span>
          <span v-else class="badge future">다음 달</span>
        </div>
      </div>
    </section>

    <!-- 근무일 요약 -->
    <section class="summary-grid" aria-live="polite">
      <div class="summary-card blue">
        <div class="summary-icon">📅</div>
        <div class="summary-label">이달 근무일 <span class="label-aside">(소정 근로일)</span></div>
        <div class="summary-value">{{ 소정근로일 }}<span class="unit">일</span></div>
        <div class="summary-sub">주말·공휴일 제외</div>
      </div>
      <div class="summary-card green">
        <div class="summary-icon">✅</div>
        <div class="summary-label">의무 근로시간</div>
        <div class="summary-value">{{ 시분변환(의무근로분) }}</div>
        <div class="summary-sub">8:00 × {{ 소정근로일 }}일</div>
      </div>
      <div class="summary-card purple">
        <div class="summary-icon">⏰</div>
        <div class="summary-label">최대 근로시간</div>
        <div class="summary-value">{{ 시분변환(최대근로분) }}</div>
        <div class="summary-sub">8:00 × {{ 소정근로일 }}일 + {{ 시분변환(고정연장분) }}</div>
      </div>
    </section>

    <!-- 입력 설정 -->
    <section class="card input-section">
      <h2 class="section-title">⚙️ 근무 설정</h2>
      <div class="input-grid">
        <div class="input-group">
          <label for="고정연장">월 고정 연장근무 (시:분)</label>
          <div class="input-with-unit">
            <input
              id="고정연장"
              v-model="고정연장시간"
              @blur="고정연장정규화"
              :class="{ error: !고정연장유효 }"
              :aria-invalid="!고정연장유효"
              type="text"
              inputmode="numeric"
              placeholder="10:00"
              pattern="[0-9:]*"
            />
          </div>
          <p v-if="!고정연장유효" class="input-error">
            ⚠ 형식이 올바르지 않습니다. 예: <code>10:00</code> 또는 <code>1000</code>
          </p>
          <p v-else class="input-hint">
            <strong>형식</strong>: <code>10:00</code>, <code>7:30</code>
            <span class="hint-extra">(콜론 없이 <code>1000</code>도 가능)</span>
          </p>
        </div>
        <div class="input-group">
          <label for="근무입력">현재까지 근무시간 (시:분)</label>
          <div class="input-with-unit">
            <input
              id="근무입력"
              v-model="입력근무시간"
              @blur="입력근무정규화"
              :class="{ error: !입력유효 }"
              :aria-invalid="!입력유효"
              type="text"
              inputmode="numeric"
              placeholder="0:00"
              pattern="[0-9:]*"
            />
          </div>
          <p v-if="!입력유효" class="input-error">
            ⚠ 형식이 올바르지 않습니다. 예: <code>23:30</code> 또는 <code>2330</code>
          </p>
          <p v-else class="input-hint">
            <strong>형식</strong>: <code>23:30</code>, <code>137:30</code>
            <span class="hint-extra">(콜론 없이 <code>2330</code>도 가능)</span>
          </p>
        </div>
      </div>
    </section>

    <!-- 진행 상황 -->
    <component
      :is="달성현황"
      :입력분="입력분"
      :의무근로분="의무근로분"
      :초과분="초과분"
      :의무달성여부="의무달성여부"
      :경과근무일="경과근무일"
      :소정근로일="소정근로일"
      :달성률="달성률"
      :진행바색상="진행바색상"
    />

    <!-- 결과 -->
    <section class="card result-section" aria-live="polite">
      <h2 class="section-title">📋 남은 근무 계획</h2>

      <div v-if="지난달여부" class="notice past-notice">
        ℹ️ 지난 달입니다. 이번 달을 선택하면 남은 근무일 계산이 가능합니다.
      </div>

      <div v-else-if="입력분 === 0" class="empty-banner">
        💡 위에서 <strong>현재까지 근무시간</strong>을 입력하면 남은 시간과 일평균 목표가 계산됩니다.
      </div>

      <div v-if="!지난달여부 && 남은근무일 > 0 && 입력분 > 0" class="avg-section">
        <h3>일평균 목표 근무시간</h3>
        <div class="avg-grid">
          <div class="avg-card avg-mandatory">
            <div class="avg-label">의무 달성 일평균</div>
            <div class="avg-value">{{ 시분변환(의무달성일평균분) }}</div>
            <div class="avg-sub">{{ 남은근무일 }}일 동안 매일</div>
          </div>
          <div class="avg-card avg-max">
            <div class="avg-label">최대 달성 일평균</div>
            <div class="avg-value">{{ 시분변환(최대달성일평균분) }}</div>
            <div class="avg-sub">{{ 남은근무일 }}일 동안 매일</div>
          </div>
        </div>
      </div>

      <div
        v-if="!지난달여부 && 남은근무일 > 0 && 입력분 > 0"
        class="section-divider"
        aria-hidden="true"
      ></div>

      <div v-if="!지난달여부" class="result-grid">
        <div class="result-item">
          <div class="result-label">남은 근무일</div>
          <div class="result-value highlight-blue">
            {{ 남은근무일 }}<span class="unit">일</span>
          </div>
          <div class="result-sub">오늘 제외 · 내일부터</div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 의무 근무시간</div>
          <div class="result-value highlight-green">
            <template v-if="입력분 > 0">{{ 시분변환(남은의무분) }}</template>
            <span v-else class="placeholder-dash">—</span>
          </div>
          <div v-if="입력분 > 0" class="result-sub">
            의무 {{ 시분변환(의무근로분) }} − 누적 {{ 시분변환(입력분) }}
          </div>
          <div v-else class="result-sub">의무 {{ 시분변환(의무근로분) }}</div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 최대 근무시간</div>
          <div class="result-value highlight-purple">
            <template v-if="입력분 > 0">{{ 시분변환(남은최대분) }}</template>
            <span v-else class="placeholder-dash">—</span>
          </div>
          <div v-if="입력분 > 0" class="result-sub">
            최대 {{ 시분변환(최대근로분) }} − 누적 {{ 시분변환(입력분) }}
          </div>
          <div v-else class="result-sub">최대 {{ 시분변환(최대근로분) }}</div>
        </div>
      </div>

      <div v-if="!지난달여부 && 남은근무일 === 0" class="notice">
        🎊 남은 근무일이 없습니다!
      </div>
    </section>

    <!-- 공휴일 목록 -->
    <component :is="공휴일목록" :선택월표시="선택월표시" :이달공휴일="이달공휴일" />

    <!-- 다음 달 미리보기 -->
    <component
      :is="다음달미리보기"
      :다음달표시="다음달표시"
      :다음달소정근로일="다음달소정근로일"
      :다음달의무근로분="다음달의무근로분"
      :다음달최대근로분="다음달최대근로분"
      :다음달공휴일="다음달공휴일"
    />
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

/* Label aside */
.label-aside {
  font-weight: 400;
  color: #94a3b8;
  font-size: 0.78rem;
  margin-left: 4px;
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
.input-with-unit input.error {
  border-color: #ef4444;
  background: #fef2f2;
}
.input-with-unit input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
.input-hint {
  font-size: 0.82rem;
  color: #475569;
  margin: 0;
}
.input-hint code {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: #0f172a;
}
.input-hint .hint-extra {
  color: #94a3b8;
  margin-left: 6px;
}
.input-error {
  font-size: 0.82rem;
  color: #b91c1c;
  margin: 0;
  font-weight: 500;
}
.input-error code {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: #991b1b;
}

/* Result section */
.empty-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 0.92rem;
  color: #1e40af;
  line-height: 1.5;
}
.empty-banner strong {
  font-weight: 700;
}
.section-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 24px 0;
}
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
.placeholder-dash {
  color: #cbd5e1;
  font-weight: 600;
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
  .label-aside {
    color: #64748b;
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
    color: #cbd5e1;
  }
  .summary-value {
    color: #f1f5f9;
  }
  .summary-sub {
    color: #cbd5e1;
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
  .input-with-unit input.error {
    border-color: #ef4444;
    background: #450a0a;
  }
  .input-hint {
    color: #cbd5e1;
  }
  .input-hint code {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }
  .input-hint .hint-extra {
    color: #94a3b8;
  }
  .input-error {
    color: #fca5a5;
  }
  .input-error code {
    background: #450a0a;
    border-color: #7f1d1d;
    color: #fecaca;
  }
  .empty-banner {
    background: #172554;
    border-color: #1e3a8a;
    color: #bfdbfe;
  }
  .section-divider {
    background: #334155;
  }
  .result-item {
    background: #0f172a;
    border-color: #334155;
  }
  .result-label {
    color: #94a3b8;
  }
  .placeholder-dash {
    color: #475569;
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

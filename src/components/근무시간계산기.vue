<script setup>
import { ref, computed } from 'vue'
import { 월소정근로일수조회, 남은근무일수조회 } from '../utils/근무시간'
import { 월별공휴일조회, 공휴일이름조회 } from '../utils/공휴일'

const 오늘 = new Date()
const 현재연도 = 오늘.getFullYear()
const 현재월 = 오늘.getMonth() + 1

const 선택연도 = ref(현재연도)
const 선택월 = ref(현재월)
const 고정연장시간 = ref('10:00')
const 입력근무시간 = ref('')

const 하루근무분 = 8 * 60

function 시분파싱(문자열) {
  if (문자열 == null) return 0
  const 정리 = String(문자열).trim()
  if (!정리) return 0
  const 매칭 = 정리.match(/^(-?\d+)(?::(\d{1,2}))?$/)
  if (!매칭) return 0
  const 시 = parseInt(매칭[1], 10)
  const 분 = parseInt(매칭[2] ?? '0', 10)
  if (분 >= 60) return 시 * 60
  return 시 < 0 ? 시 * 60 - 분 : 시 * 60 + 분
}

function 시분변환(전체분) {
  if (!Number.isFinite(전체분)) return '0:00'
  const 정수분 = Math.round(전체분)
  const 부호 = 정수분 < 0 ? '-' : ''
  const 절대분 = Math.abs(정수분)
  const 시 = Math.floor(절대분 / 60)
  const 분 = 절대분 % 60
  return `${부호}${시}:${String(분).padStart(2, '0')}`
}

function 입력근무정규화() {
  const 분 = 시분파싱(입력근무시간.value)
  입력근무시간.value = 분 > 0 ? 시분변환(분) : ''
}

function 고정연장정규화() {
  const 분 = Math.max(0, 시분파싱(고정연장시간.value))
  고정연장시간.value = 시분변환(분)
}

const 입력분 = computed(() => Math.max(0, 시분파싱(입력근무시간.value)))
const 고정연장분 = computed(() => Math.max(0, 시분파싱(고정연장시간.value)))

const 연도목록 = computed(() => {
  const 목록 = []
  for (let 연도 = 현재연도 - 1; 연도 <= 현재연도 + 2; 연도++) {
    목록.push(연도)
  }
  return 목록
})

const 월목록 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// 소정 근로일
const 소정근로일 = computed(() =>
  월소정근로일수조회(선택연도.value, 선택월.value),
)

// 의무 근로시간 (분)
const 의무근로분 = computed(() => 소정근로일.value * 하루근무분)

// 최대 근로시간 (분)
const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)

// 남은 근무일 (오늘 포함)
const 남은근무일 = computed(() =>
  남은근무일수조회(선택연도.value, 선택월.value),
)

// 경과 근무일
const 경과근무일 = computed(() => 소정근로일.value - 남은근무일.value)

// 남은 의무 / 최대 (분)
const 남은의무분 = computed(() =>
  Math.max(0, 의무근로분.value - 입력분.value),
)
const 남은최대분 = computed(() =>
  Math.max(0, 최대근로분.value - 입력분.value),
)

// 일평균 (분)
const 의무달성일평균분 = computed(() => {
  if (남은근무일.value === 0) return 0
  return Math.round(남은의무분.value / 남은근무일.value)
})
const 최대달성일평균분 = computed(() => {
  if (남은근무일.value === 0) return 0
  return Math.round(남은최대분.value / 남은근무일.value)
})

// 달성률 (의무 기준)
const 달성률 = computed(() => {
  if (의무근로분.value === 0) return 0
  return Math.min(100, Math.round((입력분.value / 의무근로분.value) * 100))
})

// 초과 근무 (분)
const 초과분 = computed(() =>
  Math.max(0, 입력분.value - 의무근로분.value),
)

// 이미 의무 달성 여부
const 의무달성여부 = computed(() => 입력분.value >= 의무근로분.value)

// 공휴일 목록 (선택 월)
const 이달공휴일 = computed(() =>
  월별공휴일조회(선택연도.value, 선택월.value),
)

// 다음 달 정보
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

// 프로그레스 바 색상
const 진행바색상 = computed(() => {
  if (달성률.value >= 100) return '#10b981'
  if (달성률.value >= 70) return '#f59e0b'
  return '#3b82f6'
})

// 선택 월 표시
const 선택월표시 = computed(
  () => `${선택연도.value}년 ${선택월.value}월`,
)

// 날짜 포맷
function 날짜포맷(날짜문자열) {
  const [, 월, 일] = 날짜문자열.split('-')
  return `${parseInt(월)}월 ${parseInt(일)}일`
}

// 요일 반환
function 요일가져오기(날짜문자열) {
  const 요일목록 = ['일', '월', '화', '수', '목', '금', '토']
  const 날짜 = new Date(날짜문자열)
  return 요일목록[날짜.getDay()]
}

// 과거 월 여부
const 지난달여부 = computed(() => {
  const 선택 = new Date(선택연도.value, 선택월.value - 1, 1)
  const 이번달 = new Date(현재연도, 현재월 - 1, 1)
  return 선택 < 이번달
})

// 현재 월 여부
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
          <label>연도</label>
          <select v-model="선택연도">
            <option v-for="연도 in 연도목록" :key="연도" :value="연도">{{ 연도 }}년</option>
          </select>
        </div>
        <div class="select-group">
          <label>월</label>
          <select v-model="선택월">
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
    <section class="summary-grid">
      <div class="summary-card blue">
        <div class="summary-icon">📅</div>
        <div class="summary-label">소정 근로일</div>
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
        <div class="summary-icon">🚀</div>
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
              type="text"
              inputmode="numeric"
              placeholder="10:00"
              pattern="[0-9:]*"
            />
          </div>
          <p class="input-hint">예: 10:00, 7:30 — 최대 근로시간 계산에 포함됩니다</p>
        </div>
        <div class="input-group">
          <label for="근무입력">현재까지 근무시간 (시:분)</label>
          <div class="input-with-unit">
            <input
              id="근무입력"
              v-model="입력근무시간"
              @blur="입력근무정규화"
              type="text"
              inputmode="numeric"
              placeholder="0:00"
              pattern="[0-9:]*"
            />
          </div>
          <p class="input-hint">예: 23:30 — 오늘까지 실제로 근무한 총 시간</p>
        </div>
      </div>
    </section>

    <!-- 진행 상황 -->
    <section class="card progress-section" v-if="입력분 > 0">
      <h2 class="section-title">📊 달성 현황</h2>
      <div class="progress-info">
        <span>{{ 시분변환(입력분) }} / {{ 시분변환(의무근로분) }}</span>
        <span class="achievement-rate" :style="{ color: 진행바색상 }">{{ 달성률 }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: 달성률 + '%', backgroundColor: 진행바색상 }"
        ></div>
      </div>
      <div class="progress-tags">
        <span v-if="의무달성여부" class="tag success">🎉 의무시간 달성!</span>
        <span v-if="초과분 > 0" class="tag overtime">추가 {{ 시분변환(초과분) }} 근무</span>
        <span class="tag info">경과 근무일: {{ 경과근무일 }}일 / {{ 소정근로일 }}일</span>
      </div>
    </section>

    <!-- 결과 -->
    <section class="card result-section">
      <h2 class="section-title">📋 남은 근무 계획</h2>

      <div v-if="지난달여부" class="notice past-notice">
        ℹ️ 지난 달입니다. 이번 달을 선택하면 남은 근무일 계산이 가능합니다.
      </div>

      <div class="result-grid">
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
            {{ 시분변환(남은의무분) }}
          </div>
          <div v-if="입력분 > 0" class="result-sub">
            의무 {{ 시분변환(의무근로분) }} − 누적 {{ 시분변환(입력분) }}
          </div>
          <div v-else class="result-sub muted">
            현재 근무시간을 입력하세요
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 최대 근무시간</div>
          <div class="result-value highlight-purple">
            {{ 시분변환(남은최대분) }}
          </div>
          <div v-if="입력분 > 0" class="result-sub">
            최대 {{ 시분변환(최대근로분) }} − 누적 {{ 시분변환(입력분) }}
          </div>
          <div v-else class="result-sub muted">
            현재 근무시간을 입력하세요
          </div>
        </div>
      </div>

      <div v-if="남은근무일 > 0" class="avg-section">
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
      <div v-else-if="!지난달여부" class="notice">
        🎊 남은 근무일이 없습니다!
      </div>
    </section>

    <!-- 공휴일 목록 -->
    <section class="card holiday-section" v-if="이달공휴일.length > 0">
      <h2 class="section-title">🗓 {{ 선택월표시 }} 공휴일</h2>
      <ul class="holiday-list">
        <li v-for="항목 in 이달공휴일" :key="항목" class="holiday-item">
          <span class="holiday-date">{{ 날짜포맷(항목) }} ({{ 요일가져오기(항목) }})</span>
          <span class="holiday-name">{{ 공휴일이름조회(항목) }}</span>
        </li>
      </ul>
    </section>
    <section class="card holiday-section" v-else>
      <h2 class="section-title">🗓 {{ 선택월표시 }} 공휴일</h2>
      <p class="no-holiday">이 달에는 공휴일이 없습니다.</p>
    </section>

    <!-- 다음 달 미리보기 -->
    <section class="card next-month-section">
      <h2 class="section-title">🔮 {{ 다음달표시 }} 미리보기</h2>
      <div class="next-summary-grid">
        <div class="next-summary-item">
          <div class="next-label">소정 근로일</div>
          <div class="next-value">{{ 다음달소정근로일 }}<span class="unit">일</span></div>
        </div>
        <div class="next-summary-item">
          <div class="next-label">의무 근로시간</div>
          <div class="next-value">{{ 시분변환(다음달의무근로분) }}</div>
        </div>
        <div class="next-summary-item">
          <div class="next-label">최대 근로시간</div>
          <div class="next-value">{{ 시분변환(다음달최대근로분) }}</div>
        </div>
      </div>
      <div class="next-holiday-block">
        <h3 class="next-subtitle">공휴일</h3>
        <ul v-if="다음달공휴일.length > 0" class="holiday-list">
          <li v-for="항목 in 다음달공휴일" :key="항목" class="holiday-item">
            <span class="holiday-date">{{ 날짜포맷(항목) }} ({{ 요일가져오기(항목) }})</span>
            <span class="holiday-name">{{ 공휴일이름조회(항목) }}</span>
          </li>
        </ul>
        <p v-else class="no-holiday">다음 달에는 공휴일이 없습니다.</p>
      </div>
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
.result-sub.muted {
  font-style: italic;
  color: #cbd5e1;
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

/* Next month preview */
.next-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.next-summary-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}
.next-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 6px;
}
.next-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}
.next-value .unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  margin-left: 2px;
}
.next-subtitle {
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 10px;
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
  .result-sub.muted {
    color: #64748b;
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
  .next-summary-item {
    background: #0f172a;
    border-color: #334155;
  }
  .next-label {
    color: #94a3b8;
  }
  .next-value {
    color: #f1f5f9;
  }
  .next-subtitle {
    color: #cbd5e1;
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
  .next-summary-grid {
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

<script setup>
import { 시분변환 } from '../utils/timeFormat'

const 선택연도 = defineModel('선택연도')
const 선택월 = defineModel('선택월')
const 입사한달여부 = defineModel('입사한달여부')
const 입사일 = defineModel('입사일')

defineProps({
  연도목록: Array,
  월목록: Array,
  선택월표시: String,
  이번달여부: Boolean,
  지난달여부: Boolean,
  일목록: Array,
  유효입사일: Number,
  공휴일있음: Boolean,
  소정근로일: Number,
  의무근로분: Number,
  최대근로분: Number,
  고정연장분: Number,
})
</script>

<template>
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
      <label class="join-checkbox selector-join">
        <input type="checkbox" v-model="입사한달여부" />
        <span>이 달에 입사했어요</span>
      </label>
      <div v-if="입사한달여부" class="join-date">
        <label for="입사일" class="join-date-label">입사일</label>
        <select id="입사일" v-model.number="입사일" class="join-date-select">
          <option v-for="일 in 일목록" :key="일" :value="일">{{ 일 }}일</option>
        </select>
      </div>
      <div class="month-badge">
        <span>{{ 선택월표시 }}</span>
        <span v-if="이번달여부" class="badge current">이번 달</span>
        <span v-else-if="지난달여부" class="badge past">지난 달</span>
        <span v-else class="badge future">다음 달</span>
      </div>
    </div>
    <p v-if="입사한달여부" class="input-hint join-hint-row">
      <strong>{{ 유효입사일 }}일</strong>부터 월말까지 근무일로 계산
      <span class="hint-extra">(입사일도 포함)</span>
    </p>
  </section>

  <!-- 공휴일 데이터 부재 알림 -->
  <div v-if="!공휴일있음" class="warn-notice" role="alert">
    ⚠ {{ 선택연도 }}년 공휴일 데이터가 없습니다. 근무일 계산에서 공휴일이 평일로 간주되어 부정확할 수 있습니다.
  </div>

  <!-- 근무일 요약 -->
  <section class="summary-grid" aria-live="polite">
    <div class="summary-card blue">
      <div class="summary-head">
        <span class="summary-icon">📅</span>
        <span class="summary-label">이달 근무일 <span class="label-aside">(소정 근로일)</span></span>
      </div>
      <div class="summary-value">{{ 소정근로일 }}<span class="unit">일</span></div>
      <div class="summary-sub">
        <template v-if="입사한달여부">{{ 유효입사일 }}일부터 · 주말·공휴일 제외</template>
        <template v-else>주말·공휴일 제외</template>
      </div>
    </div>
    <div class="summary-card green">
      <div class="summary-head">
        <span class="summary-icon">✅</span>
        <span class="summary-label">의무 근로시간</span>
      </div>
      <div class="summary-value">{{ 시분변환(의무근로분) }}</div>
      <div class="summary-sub">8:00 × {{ 소정근로일 }}일</div>
    </div>
    <div class="summary-card purple">
      <div class="summary-head">
        <span class="summary-icon">⏰</span>
        <span class="summary-label">최대 근로시간</span>
      </div>
      <div class="summary-value">{{ 시분변환(최대근로분) }}</div>
      <div class="summary-sub">8:00 × {{ 소정근로일 }}일 + {{ 시분변환(고정연장분) }}</div>
    </div>
  </section>
</template>

<style scoped>
.label-aside {
  font-weight: 400;
  color: #94a3b8;
  font-size: 0.78rem;
  margin-left: 4px;
}

/* 입사 안내 문구를 연도·월 행 아래 한 줄로 */
.join-hint-row {
  margin: 10px 0 0;
  font-size: 0.76rem;
  color: #64748b;
}

/* Month selector — 컴팩트하게 */
.month-selector {
  padding: 16px 20px;
}
.selector-row {
  display: flex;
  align-items: flex-end;
  gap: 8px 14px;
  flex-wrap: wrap;
}
/* 연도·월과 같은 줄에 놓이는 입사 체크박스는 셀렉트 하단선에 정렬 */
.selector-join {
  align-self: flex-end;
  height: 34px;
  font-size: 0.82rem;
}
.join-date-label {
  font-size: 0.8rem;
}
.join-date-select {
  height: 34px;
  font-size: 0.85rem;
}
.select-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.select-group label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.select-group select {
  padding: 7px 30px 7px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #0f172a;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.select-group select:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.month-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}
.badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 9px;
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
  padding: 16px 18px;
  text-align: left;
  border: 1px solid transparent;
}
.summary-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
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
  font-size: 1.05rem;
  line-height: 1;
  flex-shrink: 0;
}
.summary-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
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

/* Warn notice */
.warn-notice {
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  font-size: 0.88rem;
  color: #92400e;
  margin-bottom: 20px;
  line-height: 1.5;
}

/* Dark mode */
.theme-dark .label-aside { color: #6e7681; }
.theme-dark .select-group label { color: #8b949e; }
.theme-dark .select-group select {
  background-color: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.theme-dark .month-badge { color: #f0f6fc; }
.theme-dark .summary-card.blue {
  background: #0d1f3a;
  border-color: #1f3a68;
}
.theme-dark .summary-card.green {
  background: #0a2e1c;
  border-color: #155f3a;
}
.theme-dark .summary-card.purple {
  background: #1d1638;
  border-color: #3d2c63;
}
.theme-dark .summary-label { color: #c9d1d9; }
.theme-dark .summary-value { color: #f0f6fc; }
.theme-dark .summary-sub { color: #c9d1d9; }
.theme-dark .warn-notice {
  background: #2d1f06;
  border-color: #4a3a08;
  color: #fbbf24;
}

/* Responsive */
@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .summary-value {
    font-size: 1.8rem;
  }
  .selector-row {
    gap: 12px;
  }
  .month-badge {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
    order: 99;
  }
}
</style>

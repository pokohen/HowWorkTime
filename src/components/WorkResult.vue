<script setup>
import { computed } from 'vue'
import { 시분변환 } from '../utils/timeFormat'

const props = defineProps({
  지난달여부: Boolean,
  반영분: Number,
  달성률: Number,
  의무달성여부: Boolean,
  의무근로분: Number,
  의무대비차: Number,
  최대근로분: Number,
  최대대비차: Number,
  남은근무일: Number,
  재택일수: Number,
  연차일수환산: Number,
  출근남은일: Number,
  남은의무분: Number,
  입력분: Number,
  오늘예상분: Number,
  남은최대분: Number,
  의무일평균분: Number,
  최대일평균분: Number,
  마일리지분: Number,
  남은정규분: Number,
})

// 남은 의무: 마일리지 = 남은정규분 − 남은의무 이므로 남은의무 = 남은정규분 − 마일리지분
const 남은의무합 = computed(() => props.남은정규분 - props.마일리지분)
</script>

<template>
  <section class="card result-section" aria-live="polite">
    <h2 class="section-title">📋 {{ 지난달여부 ? '지난 달 결과 요약' : '남은 근무 계획' }}</h2>

    <div v-if="지난달여부" class="notice past-notice">
      ℹ️ 지난 달입니다. 입력한 누적 시간으로 의무·최대 대비 결과만 표시합니다.
    </div>

    <div v-if="지난달여부 && 반영분 === 0" class="empty-banner">
      💡 위에서 해당 달의 <strong>실제 근무시간</strong>을 입력하면 의무·최대 달성 결과를 확인할 수 있습니다.
    </div>

    <div v-if="지난달여부 && 반영분 > 0" class="result-grid">
      <div class="result-item">
        <div class="result-label">실제 근무시간</div>
        <div class="result-value highlight-blue">{{ 시분변환(반영분) }}</div>
        <div class="result-sub">달성률 {{ 달성률 }}%</div>
      </div>
      <div class="result-item">
        <div class="result-label">의무 대비</div>
        <div class="result-value" :class="의무달성여부 ? 'highlight-green' : 'highlight-red'">
          {{ 의무달성여부 ? '+' : '−' }}{{ 시분변환(의무대비차) }}
        </div>
        <div class="result-sub">
          <template v-if="의무달성여부">의무 {{ 시분변환(의무근로분) }} 초과 달성</template>
          <template v-else>의무 {{ 시분변환(의무근로분) }} 미달</template>
        </div>
      </div>
      <div class="result-item">
        <div class="result-label">최대 대비</div>
        <div class="result-value highlight-purple">
          {{ 반영분 >= 최대근로분 ? '+' : '−' }}{{ 시분변환(최대대비차) }}
        </div>
        <div class="result-sub">최대 {{ 시분변환(최대근로분) }}</div>
      </div>
    </div>

    <div v-if="!지난달여부 && 반영분 === 0" class="empty-banner">
      💡 위에서 <strong>현재까지 근무시간</strong>을 입력하면 남은 시간과 일평균 목표가 계산됩니다.
    </div>

    <div v-if="!지난달여부" class="result-grid">
      <div class="result-item">
        <div class="result-label">남은 근무일</div>
        <div class="result-value highlight-blue">
          {{ 남은근무일 }}<span class="unit">일</span>
        </div>
        <div class="result-sub">
          <template v-if="재택일수 > 0 || 연차일수환산 > 0">
            출근 {{ 출근남은일 }}일<template v-if="재택일수 > 0"> · 재택 {{ 재택일수 }}일</template><template v-if="연차일수환산 > 0"> · 연차 {{ 연차일수환산 }}일</template> · 오늘 제외
          </template>
          <template v-else>오늘 제외 · 내일부터</template>
        </div>
      </div>
      <div class="result-item">
        <div class="result-label">남은 의무 근무시간</div>
        <div class="result-value highlight-green">
          <template v-if="반영분 > 0">{{ 시분변환(남은의무분) }}</template>
          <span v-else class="placeholder-dash">—</span>
        </div>
        <div v-if="반영분 > 0" class="result-sub">
          의무 {{ 시분변환(의무근로분) }} − 누적 {{ 시분변환(입력분) }}<template v-if="오늘예상분 > 0"> − 오늘 {{ 시분변환(오늘예상분) }}</template>
        </div>
        <div v-else class="result-sub">의무 {{ 시분변환(의무근로분) }}</div>
      </div>
      <div class="result-item">
        <div class="result-label">남은 최대 근무시간</div>
        <div class="result-value highlight-purple">
          <template v-if="반영분 > 0">{{ 시분변환(남은최대분) }}</template>
          <span v-else class="placeholder-dash">—</span>
        </div>
        <div v-if="반영분 > 0" class="result-sub">
          최대 {{ 시분변환(최대근로분) }} − 누적 {{ 시분변환(입력분) }}<template v-if="오늘예상분 > 0"> − 오늘 {{ 시분변환(오늘예상분) }}</template>
        </div>
        <div v-else class="result-sub">최대 {{ 시분변환(최대근로분) }}</div>
      </div>
    </div>

    <div v-if="!지난달여부 && 출근남은일 > 0 && 반영분 > 0" class="avg-section">
      <h3 class="avg-title">일평균 목표 근무시간</h3>
      <p v-if="재택일수 > 0 || 연차일수환산 > 0" class="avg-note">
        <template v-if="재택일수 > 0">재택 {{ 재택일수 }}일</template><template v-if="재택일수 > 0 && 연차일수환산 > 0"> · </template><template v-if="연차일수환산 > 0">연차 {{ 연차일수환산 }}일</template>(8시간 자동 인정)을 제외한 <strong>출근 {{ 출근남은일 }}일</strong> 기준입니다.
      </p>
      <div class="avg-grid has-mileage">
        <div
          class="avg-card avg-card--mileage"
          :class="마일리지분 >= 0 ? 'is-plus' : 'is-minus'"
        >
          <span class="avg-tag avg-tag--mileage">마일리지</span>
          <div class="avg-value">
            {{ 마일리지분 >= 0 ? '+' : '−' }}{{ 시분변환(Math.abs(마일리지분)) }}
          </div>
          <div class="avg-sub">정규시간 대비 {{ 마일리지분 >= 0 ? '초과' : '부족' }}</div>
        </div>
        <div class="avg-card">
          <span class="avg-tag tag-mandatory">의무</span>
          <div class="avg-value">{{ 시분변환(의무일평균분) }}</div>
          <div class="avg-sub">출근 {{ 출근남은일 }}일 동안 매일</div>
        </div>
        <div class="avg-card">
          <span class="avg-tag tag-max">최대</span>
          <div class="avg-value">{{ 시분변환(최대일평균분) }}</div>
          <div class="avg-sub">출근 {{ 출근남은일 }}일 동안 매일</div>
        </div>
      </div>
      <div class="mileage-calc-line">
        <div class="mileage-calc-line-row">
          출근 {{ 출근남은일 }}일 × 8h = <b>정규 {{ 시분변환(남은정규분) }}</b>
        </div>
        <div class="mileage-calc-line-row">
          정규 {{ 시분변환(남은정규분) }} − 남은 의무 {{ 시분변환(남은의무합) }} =
          <strong :class="마일리지분 >= 0 ? 'is-plus' : 'is-minus'">{{ 마일리지분 >= 0 ? '+' : '−' }}{{ 시분변환(Math.abs(마일리지분)) }}</strong>
        </div>
      </div>
    </div>

    <div v-if="!지난달여부 && 남은근무일 === 0" class="notice">
      🎊 남은 근무일이 없습니다!
    </div>
    <div
      v-else-if="!지난달여부 && 출근남은일 === 0 && (재택일수 > 0 || 연차일수환산 > 0)"
      class="notice"
    >
      🏠 남은 근무일 {{ 남은근무일 }}일이 모두 재택·연차입니다. 출근일이 없어 일평균 목표를 표시하지 않습니다.
    </div>
  </section>
</template>

<style scoped>
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
.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.result-item {
  background: #f9fafb;
  border-radius: 14px;
  padding: 18px 16px;
  text-align: left;
  border: 1px solid #f0f1f3;
}
.result-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #8b95a1;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}
.result-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #191f28;
  line-height: 1.1;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.result-value .unit {
  font-size: 0.85rem;
  font-weight: 500;
  margin-left: 2px;
  color: #4e5968;
}
.highlight-blue {
  color: #3182f6;
}
.highlight-green {
  color: #06c755;
}
.highlight-purple {
  color: #6e3eff;
}
.highlight-red {
  color: #f04452;
}
.result-sub {
  font-size: 0.74rem;
  color: #8b95a1;
  line-height: 1.4;
}
.placeholder-dash {
  color: #d1d6db;
  font-weight: 600;
}

/* Mileage card (left of daily-average cards) */
.avg-card--mileage.is-plus {
  background: #edfaf3;
  border-color: #bdeccf;
}
.avg-card--mileage.is-minus {
  background: #fdeef0;
  border-color: #f8cace;
}
.avg-tag--mileage {
  background: #eef1f4;
  color: #4e5968;
}
.avg-card--mileage.is-plus .avg-tag--mileage {
  background: #06c755;
  color: #fff;
}
.avg-card--mileage.is-minus .avg-tag--mileage {
  background: #f04452;
  color: #fff;
}
.avg-card--mileage.is-plus .avg-value {
  color: #06873e;
}
.avg-card--mileage.is-minus .avg-value {
  color: #d63a46;
}

/* Mileage calc line (below grid) */
.mileage-calc-line {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.76rem;
  line-height: 1.5;
  color: #8b95a1;
  margin: 12px 0 0;
  font-variant-numeric: tabular-nums;
}
.mileage-calc-line-row b {
  font-weight: 700;
  color: #4e5968;
}
.mileage-calc-line strong {
  font-weight: 800;
}
.mileage-calc-line strong.is-plus {
  color: #06873e;
}
.mileage-calc-line strong.is-minus {
  color: #d63a46;
}

/* Average section */
.avg-section {
  margin-top: 4px;
  padding-top: 20px;
  border-top: 1px solid #f0f1f3;
}
.avg-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: #4e5968;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.avg-note {
  font-size: 0.8rem;
  color: #64748b;
  margin: -4px 0 12px;
  line-height: 1.5;
}
.avg-note strong {
  color: #3182f6;
  font-weight: 700;
}
.avg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.avg-grid.has-mileage {
  grid-template-columns: repeat(3, 1fr);
}
.avg-card {
  background: #f9fafb;
  border: 1px solid #f0f1f3;
  border-radius: 14px;
  padding: 18px 16px;
  text-align: left;
}
.avg-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}
.tag-mandatory {
  background: #e6f9f0;
  color: #06873e;
}
.tag-max {
  background: #efe9ff;
  color: #5b2bd6;
}
.avg-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #191f28;
  line-height: 1.1;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}
.avg-value .unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: #4e5968;
  margin-left: 2px;
}
.avg-sub {
  font-size: 0.74rem;
  color: #8b95a1;
  line-height: 1.4;
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
.theme-dark .empty-banner {
  background: #0d1f3a;
  border-color: #1f3a68;
  color: #79b8ff;
}
.theme-dark .result-item {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .result-label { color: #8b949e; }
.theme-dark .result-value { color: #f0f6fc; }
.theme-dark .result-value .unit { color: #c9d1d9; }
.theme-dark .result-sub { color: #8b949e; }
.theme-dark .placeholder-dash { color: #484f58; }
.theme-dark .avg-card--mileage.is-plus {
  background: #0a2e1c;
  border-color: #17512f;
}
.theme-dark .avg-card--mileage.is-minus {
  background: #3a1518;
  border-color: #5e2329;
}
.theme-dark .avg-tag--mileage { background: #21262d; color: #adb6c0; }
.theme-dark .avg-card--mileage.is-plus .avg-tag--mileage { background: #2ea043; color: #fff; }
.theme-dark .avg-card--mileage.is-minus .avg-tag--mileage { background: #da3633; color: #fff; }
.theme-dark .avg-card--mileage.is-plus .avg-value { color: #56d364; }
.theme-dark .avg-card--mileage.is-minus .avg-value { color: #ff7b72; }
.theme-dark .mileage-calc-line { color: #7d8590; }
.theme-dark .mileage-calc-line-row b { color: #adb6c0; }
.theme-dark .mileage-calc-line strong.is-plus { color: #56d364; }
.theme-dark .mileage-calc-line strong.is-minus { color: #ff7b72; }
.theme-dark .avg-section { border-top-color: #21262d; }
.theme-dark .avg-title { color: #c9d1d9; }
.theme-dark .avg-note { color: #8b949e; }
.theme-dark .avg-note strong { color: #58a6ff; }
.theme-dark .avg-card {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .avg-value { color: #f0f6fc; }
.theme-dark .avg-sub { color: #8b949e; }
.theme-dark .tag-mandatory {
  background: #0a2e1c;
  color: #56d364;
}
.theme-dark .tag-max {
  background: #1d1638;
  color: #c4b5fd;
}
.theme-dark .highlight-blue { color: #58a6ff; }
.theme-dark .highlight-green { color: #56d364; }
.theme-dark .highlight-purple { color: #d2a8ff; }
.theme-dark .highlight-red { color: #ff7b72; }
.theme-dark .notice {
  background: #0d1117;
  border-color: #21262d;
  color: #8b949e;
}

/* Responsive */
@media (max-width: 640px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
  .avg-grid,
  .avg-grid.has-mileage {
    grid-template-columns: 1fr;
  }
}
</style>

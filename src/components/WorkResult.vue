<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useMonth } from '../composables/useMonth'
import { useWorkInput } from '../composables/useWorkInput'
import { useRemoteWork } from '../composables/useRemoteWork'
import { useLeave } from '../composables/useLeave'
import { useWorkResult } from '../composables/useWorkResult'
import CardSection from './common/CardSection.vue'
import StatCard from './common/StatCard.vue'

const { 지난달여부, 의무근로분, 남은근무일 } = useMonth()
const { 입력분, 최대근로분 } = useWorkInput()
const { 재택일수 } = useRemoteWork()
const { 연차일수환산 } = useLeave()
const {
  반영분, 오늘반영분, 달성률, 의무달성여부, 의무대비차, 최대대비차,
  출근남은일, 남은의무분, 남은최대분, 의무일평균분, 최대일평균분,
  남은정규분, 남은의무원값, 마일리지분,
} = useWorkResult()

const 부호 = (n) => (n >= 0 ? '+' : '−')
</script>

<template>
  <CardSection :제목="`📋 ${지난달여부 ? '지난 달 결과 요약' : '남은 근무 계획'}`" aria-live="polite">
    <!-- ── 지난 달 ── -->
    <template v-if="지난달여부">
      <div class="notice past-notice">
        ℹ️ 지난 달입니다. 입력한 누적 시간으로 의무·최대 대비 결과만 표시합니다.
      </div>

      <div v-if="반영분 === 0" class="empty-banner">
        💡 위에서 해당 달의 <strong>실제 근무시간</strong>을 입력하면 의무·최대 달성 결과를 확인할 수 있습니다.
      </div>

      <div v-else class="result-grid">
        <StatCard 라벨="실제 근무시간" 강조="blue">
          {{ 시분변환(반영분) }}
          <template #부제>달성률 {{ 달성률 }}%</template>
        </StatCard>
        <StatCard 라벨="의무 대비" :강조="의무달성여부 ? 'green' : 'red'">
          {{ 부호(반영분 - 의무근로분) }}{{ 시분변환(의무대비차) }}
          <template #부제>의무 {{ 시분변환(의무근로분) }} {{ 의무달성여부 ? '초과 달성' : '미달' }}</template>
        </StatCard>
        <StatCard 라벨="최대 대비" 강조="purple">
          {{ 부호(반영분 - 최대근로분) }}{{ 시분변환(최대대비차) }}
          <template #부제>최대 {{ 시분변환(최대근로분) }}</template>
        </StatCard>
      </div>
    </template>

    <!-- ── 이번 달 이후 ── -->
    <template v-else>
      <div v-if="반영분 === 0" class="empty-banner">
        💡 위에서 <strong>현재까지 근무시간</strong>을 입력하면 남은 시간과 일평균 목표가 계산됩니다.
      </div>

      <div class="result-grid">
        <StatCard 라벨="남은 근무일" 강조="blue">
          {{ 남은근무일 }}<span class="unit">일</span>
          <template #부제>
            <template v-if="재택일수 > 0 || 연차일수환산 > 0">
              출근 {{ 출근남은일 }}일<template v-if="재택일수 > 0"> · 재택 {{ 재택일수 }}일</template><template v-if="연차일수환산 > 0"> · 연차 {{ 연차일수환산 }}일</template> · 오늘 제외
            </template>
            <template v-else>오늘 제외 · 내일부터</template>
          </template>
        </StatCard>
        <StatCard 라벨="남은 의무 근무시간" 강조="green">
          <template v-if="반영분 > 0">{{ 시분변환(남은의무분) }}</template>
          <span v-else class="placeholder-dash">—</span>
          <template #부제>
            의무 {{ 시분변환(의무근로분) }}<template v-if="반영분 > 0"> − 누적 {{ 시분변환(입력분) }}<template v-if="오늘반영분 > 0"> − 오늘 {{ 시분변환(오늘반영분) }}</template></template>
          </template>
        </StatCard>
        <StatCard 라벨="남은 최대 근무시간" 강조="purple">
          <template v-if="반영분 > 0">{{ 시분변환(남은최대분) }}</template>
          <span v-else class="placeholder-dash">—</span>
          <template #부제>
            최대 {{ 시분변환(최대근로분) }}<template v-if="반영분 > 0"> − 누적 {{ 시분변환(입력분) }}<template v-if="오늘반영분 > 0"> − 오늘 {{ 시분변환(오늘반영분) }}</template></template>
          </template>
        </StatCard>
      </div>

      <div v-if="출근남은일 > 0 && 반영분 > 0" class="avg-section">
        <h3 class="avg-title">일평균 목표 근무시간</h3>
        <p v-if="재택일수 > 0 || 연차일수환산 > 0" class="avg-note">
          <template v-if="재택일수 > 0">재택 {{ 재택일수 }}일</template><template v-if="재택일수 > 0 && 연차일수환산 > 0"> · </template><template v-if="연차일수환산 > 0">연차 {{ 연차일수환산 }}일</template>(8시간 자동 인정)을 제외한 <strong>출근 {{ 출근남은일 }}일</strong> 기준입니다.
        </p>
        <div class="result-grid">
          <StatCard
            라벨="마일리지"
            라벨필
            class="mileage-card"
            :class="마일리지분 >= 0 ? 'is-plus' : 'is-minus'"
          >
            {{ 부호(마일리지분) }}{{ 시분변환(Math.abs(마일리지분)) }}
            <template #부제>정규시간 대비 {{ 마일리지분 >= 0 ? '초과' : '부족' }}</template>
          </StatCard>
          <StatCard 라벨="의무" 라벨필 라벨클래스="pill-mandatory">
            {{ 시분변환(의무일평균분) }}
            <template #부제>출근 {{ 출근남은일 }}일 동안 매일</template>
          </StatCard>
          <StatCard 라벨="최대" 라벨필 라벨클래스="pill-max">
            {{ 시분변환(최대일평균분) }}
            <template #부제>출근 {{ 출근남은일 }}일 동안 매일</template>
          </StatCard>
        </div>
        <div class="mileage-calc">
          <div>출근 {{ 출근남은일 }}일 × 8h = <b>정규 {{ 시분변환(남은정규분) }}</b></div>
          <div>
            정규 {{ 시분변환(남은정규분) }} − 남은 의무 {{ 시분변환(남은의무원값) }} =
            <strong :class="마일리지분 >= 0 ? 'is-plus' : 'is-minus'">{{ 부호(마일리지분) }}{{ 시분변환(Math.abs(마일리지분)) }}</strong>
          </div>
        </div>
      </div>

      <div v-if="남은근무일 === 0" class="notice">🎊 남은 근무일이 없습니다!</div>
      <div v-else-if="출근남은일 === 0 && (재택일수 > 0 || 연차일수환산 > 0)" class="notice">
        🏠 남은 근무일 {{ 남은근무일 }}일이 모두 재택·연차입니다. 출근일이 없어 일평균 목표를 표시하지 않습니다.
      </div>
    </template>
  </CardSection>
</template>

<style scoped>
.empty-banner {
  background: var(--tint-blue-bg);
  border: 1px solid var(--tint-blue-border);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 0.92rem;
  color: var(--tint-blue-text);
  line-height: 1.5;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.placeholder-dash {
  color: var(--switch-off);
  font-weight: 600;
}

/* 일평균 섹션 */
.avg-section {
  margin-top: 4px;
  padding-top: 20px;
  border-top: 1px solid var(--hairline);
}
.avg-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-soft);
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.avg-note {
  font-size: 0.8rem;
  color: var(--label);
  margin: -4px 0 12px;
  line-height: 1.5;
}
.avg-note strong {
  color: var(--accent-blue);
  font-weight: 700;
}
:deep(.pill-mandatory) { background: var(--tint-green-bg);  color: var(--tint-green-text); }
:deep(.pill-max)       { background: var(--tint-purple-bg); color: var(--tint-purple-text); }

/* 마일리지 카드: 부호에 따라 카드 전체 톤이 바뀐다 */
.mileage-card :deep(.stat-label) { background: var(--btn-bg); color: var(--text-soft); }
.mileage-card.is-plus  { background: var(--tint-green-bg); border-color: var(--tint-green-border); }
.mileage-card.is-minus { background: var(--tint-red-bg);   border-color: var(--tint-red-border); }
.mileage-card.is-plus  :deep(.stat-label) { background: var(--accent-green); color: #fff; }
.mileage-card.is-minus :deep(.stat-label) { background: var(--accent-red);   color: #fff; }
.mileage-card.is-plus  :deep(.stat-value) { color: var(--accent-green-deep); }
.mileage-card.is-minus :deep(.stat-value) { color: var(--accent-red-deep); }

.mileage-calc {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--label);
  margin: 12px 0 0;
  font-variant-numeric: tabular-nums;
}
.mileage-calc b {
  font-weight: 700;
  color: var(--text-soft);
}
.mileage-calc strong { font-weight: 800; }
.mileage-calc strong.is-plus  { color: var(--accent-green-deep); }
.mileage-calc strong.is-minus { color: var(--accent-red-deep); }

.notice {
  padding: 14px 18px;
  background: var(--surface-soft);
  border-radius: 10px;
  font-size: 0.9rem;
  color: var(--text-soft);
  border: 1px solid var(--card-border);
}
.past-notice {
  margin-bottom: 20px;
}

@media (max-width: 640px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>

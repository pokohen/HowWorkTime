<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useMonth } from '../composables/useMonth'
import { useWorkInput } from '../composables/useWorkInput'
import { useLeave } from '../composables/useLeave'
import { useWorkResult } from '../composables/useWorkResult'
import CardSection from './common/CardSection.vue'
import TimeField from './common/TimeField.vue'
import RemoteWorkSettings from './RemoteWorkSettings.vue'
import LeaveSettings from './LeaveSettings.vue'
import TodayWorkInput from './TodayWorkInput.vue'

const { 지난달여부, 이번달여부, 오늘포함여부 } = useMonth()
const { 고정연장시간, 입력근무시간, 누적갱신필요, 입력분 } = useWorkInput()
const { 연차분 } = useLeave()
const { 반영분, 오늘반영분 } = useWorkResult()

/** 날짜 변경 안내는 이번 달의 누적 시간을 고쳤을 때만 내린다 (다른 달을 고치는 것은 무관) */
function 누적수정됨() {
  if (이번달여부.value) 누적갱신필요.value = false
}
</script>

<template>
  <CardSection 제목="⚙️ 근무 설정">
    <div v-if="반영분 > 0" class="reflected-summary" aria-live="polite">
      <span class="reflected-label">총 반영 시간</span>
      <span class="reflected-value">{{ 시분변환(반영분) }}</span>
      <span class="reflected-formula">
        누적 {{ 시분변환(입력분) }}<template v-if="연차분 > 0"> (연차 {{ 시분변환(연차분) }} 포함)</template><template v-if="오늘반영분 > 0"> + 오늘 {{ 시분변환(오늘반영분) }}</template>
      </span>
    </div>

    <p v-if="누적갱신필요 && 이번달여부 && 입력분 > 0" class="stale-notice" role="status">
      <span>📅 날짜가 바뀌었습니다. ‘현재까지 근무시간’이 어제까지 반영됐는지 확인해 주세요.</span>
      <button type="button" class="stale-close" aria-label="안내 닫기" @click="누적갱신필요 = false">✕</button>
    </p>

    <div class="input-grid">
      <TimeField
        id="고정연장"
        v-model="고정연장시간"
        라벨="월 고정 연장근무 (시:분)"
        placeholder="10:00"
        :예시="['10:00', '7:30']"
        빈값="0:00"
      />
      <TimeField
        id="근무입력"
        v-model="입력근무시간"
        @update:model-value="누적수정됨"
        라벨="현재까지 근무시간 (시:분)"
        :예시="['23:30', '137:30']"
      />

      <RemoteWorkSettings v-if="!지난달여부" class="full-row" />
      <LeaveSettings v-if="!지난달여부" class="full-row" />
      <TodayWorkInput v-if="오늘포함여부" class="full-row" />
    </div>
  </CardSection>
</template>

<style scoped>
.reflected-summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 12px 16px;
  margin-bottom: 18px;
  background: var(--tint-blue-bg);
  border: 1px solid var(--tint-blue-border);
  border-radius: 10px;
}
.reflected-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--tint-blue-text);
}
.reflected-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--tint-blue-text);
}
.reflected-formula {
  font-size: 0.78rem;
  color: var(--label);
  margin-left: auto;
}
.stale-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 16px;
  padding: 10px 14px;
  font-size: 0.85rem;
  color: var(--tint-amber-text);
  background: var(--tint-amber-bg);
  border: 1px solid var(--tint-amber-border);
  border-radius: 10px;
}
.stale-close {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.stale-close:hover {
  background: var(--tint-amber-border);
}
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.full-row {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .input-grid {
    grid-template-columns: 1fr;
  }
}
</style>

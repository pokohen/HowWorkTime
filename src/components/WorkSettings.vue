<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useMonth } from '../composables/useMonth'
import { useWorkInput } from '../composables/useWorkInput'
import { useTodayWork } from '../composables/useTodayWork'
import { useLeave } from '../composables/useLeave'
import { useWorkResult } from '../composables/useWorkResult'
import CardSection from './common/CardSection.vue'
import TimeField from './common/TimeField.vue'
import RemoteWorkSettings from './RemoteWorkSettings.vue'
import LeaveSettings from './LeaveSettings.vue'
import TodayWorkInput from './TodayWorkInput.vue'

const { 지난달여부 } = useMonth()
const { 고정연장시간, 입력근무시간, 입력분 } = useWorkInput()
const { 오늘예상분 } = useTodayWork()
const { 연차분 } = useLeave()
const { 반영분 } = useWorkResult()
</script>

<template>
  <CardSection 제목="⚙️ 근무 설정">
    <div v-if="반영분 > 0" class="reflected-summary" aria-live="polite">
      <span class="reflected-label">총 반영 시간</span>
      <span class="reflected-value">{{ 시분변환(반영분) }}</span>
      <span class="reflected-formula">
        누적 {{ 시분변환(입력분) }}<template v-if="연차분 > 0"> (연차 {{ 시분변환(연차분) }} 포함)</template><template v-if="오늘예상분 > 0"> + 오늘 {{ 시분변환(오늘예상분) }}</template>
      </span>
    </div>

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
        라벨="현재까지 근무시간 (시:분)"
        :예시="['23:30', '137:30']"
      />

      <RemoteWorkSettings v-if="!지난달여부" class="full-row" />
      <LeaveSettings class="full-row" />
      <TodayWorkInput class="full-row" />
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
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
}
.reflected-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e40af;
}
.reflected-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1d4ed8;
}
.reflected-formula {
  font-size: 0.78rem;
  color: var(--label);
  margin-left: auto;
}
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.full-row {
  grid-column: 1 / -1;
}

.theme-dark .reflected-summary {
  background: #0d1f3a;
  border-color: #1f3a68;
}
.theme-dark .reflected-label { color: #79b8ff; }
.theme-dark .reflected-value { color: #c9d1ff; }

@media (max-width: 640px) {
  .input-grid {
    grid-template-columns: 1fr;
  }
}
</style>

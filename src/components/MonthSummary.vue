<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { 하루근무분 } from '../constants'
import { useMonth } from '../composables/useMonth'
import { useWorkInput } from '../composables/useWorkInput'
import StatCard from './common/StatCard.vue'

const { 입사한달여부, 유효입사일, 소정근로일, 의무근로분 } = useMonth()
const { 최대근로분, 고정연장분 } = useWorkInput()
</script>

<template>
  <section class="summary-grid" aria-live="polite">
    <StatCard 라벨="이달 근무일" 아이콘="📅" 배경="blue" 크기="lg">
      <template #라벨보조><span class="label-aside">(소정 근로일)</span></template>
      {{ 소정근로일 }}<span class="unit">일</span>
      <template #부제>
        <template v-if="입사한달여부">{{ 유효입사일 }}일부터 · </template>주말·공휴일 제외
      </template>
    </StatCard>
    <StatCard 라벨="의무 근로시간" 아이콘="✅" 배경="green" 크기="lg">
      {{ 시분변환(의무근로분) }}
      <template #부제>{{ 시분변환(하루근무분) }} × {{ 소정근로일 }}일</template>
    </StatCard>
    <StatCard 라벨="최대 근로시간" 아이콘="⏰" 배경="purple" 크기="lg">
      {{ 시분변환(최대근로분) }}
      <template #부제>{{ 시분변환(하루근무분) }} × {{ 소정근로일 }}일 + {{ 시분변환(고정연장분) }}</template>
    </StatCard>
  </section>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.label-aside {
  font-weight: 400;
  color: var(--hint);
  font-size: 0.78rem;
  margin-left: 4px;
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

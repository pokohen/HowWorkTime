<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useMonth } from '../composables/useMonth'
import { useWorkInput } from '../composables/useWorkInput'
import CardSection from './common/CardSection.vue'
import StatCard from './common/StatCard.vue'
import HolidayItems from './common/HolidayItems.vue'

const { 다음달표시, 다음달근로일, 다음달의무분, 다음달공휴일, 다음달공휴일있음 } = useMonth()
const { 다음달최대분 } = useWorkInput()
</script>

<template>
  <CardSection :제목="`🔮 ${다음달표시} 미리보기`">
    <div class="next-grid">
      <StatCard 라벨="근무일">{{ 다음달근로일 }}<span class="unit">일</span></StatCard>
      <StatCard 라벨="의무 근로시간">{{ 시분변환(다음달의무분) }}</StatCard>
      <StatCard 라벨="최대 근로시간">{{ 시분변환(다음달최대분) }}</StatCard>
    </div>
    <h3 class="next-subtitle">공휴일</h3>
    <p v-if="!다음달공휴일있음" class="next-warn">⚠ 이 연도의 공휴일 데이터가 아직 없어 근무일이 실제보다 많게 계산됩니다.</p>
    <HolidayItems v-else :공휴일들="다음달공휴일" 빈안내="다음 달에는 공휴일이 없습니다." />
  </CardSection>
</template>

<style scoped>
.next-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.next-warn {
  margin: 0;
  font-size: 0.82rem;
  color: var(--tint-amber-text);
  background: var(--tint-amber-bg);
  border: 1px solid var(--tint-amber-border);
  border-radius: 10px;
  padding: 10px 14px;
}
.next-subtitle {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-soft);
  margin: 0 0 10px;
}
@media (max-width: 640px) {
  .next-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import { 시분변환 } from '../utils/timeFormat'
import { useMonth } from '../composables/useMonth'
import { useWorkInput } from '../composables/useWorkInput'
import { useWorkResult } from '../composables/useWorkResult'
import CardSection from './common/CardSection.vue'

const { 의무근로분, 경과근무일, 소정근로일 } = useMonth()
const { 입력분 } = useWorkInput()
const { 반영분, 초과분, 의무달성여부, 달성률, 진행바색상 } = useWorkResult()
</script>

<template>
  <CardSection 제목="📊 달성 현황" aria-live="polite">
    <div class="progress-info">
      <span>{{ 시분변환(반영분) }} / {{ 시분변환(의무근로분) }}</span>
      <span class="achievement-rate" :style="{ color: 진행바색상 }">{{ 달성률 }}%</span>
    </div>
    <div
      class="progress-bar"
      role="progressbar"
      :aria-valuenow="달성률"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`의무 근로시간 달성률 ${달성률}%`"
    >
      <div class="progress-fill" :style="{ width: 달성률 + '%', backgroundColor: 진행바색상 }" />
    </div>
    <div class="progress-tags">
      <span v-if="입력분 === 0" class="tag info">아직 현재까지 근무시간을 입력하지 않았습니다</span>
      <template v-if="반영분 > 0">
        <span v-if="의무달성여부" class="tag success">🎉 의무시간 달성!</span>
        <span v-if="초과분 > 0" class="tag overtime">추가 {{ 시분변환(초과분) }} 근무</span>
        <span class="tag info">경과 근무일: {{ 경과근무일 }}일 / {{ 소정근로일 }}일</span>
      </template>
    </div>
  </CardSection>
</template>

<style scoped>
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--label);
}
.achievement-rate {
  font-size: 1.1rem;
  font-weight: 700;
}
.progress-bar {
  height: 12px;
  background: var(--surface-muted);
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
.tag.success  { background: var(--tint-green-bg); color: var(--tint-green-text); }
.tag.overtime { background: var(--tint-amber-bg); color: var(--tint-amber-text); }
.tag.info     { background: var(--surface-muted); color: var(--label); }
</style>

<script setup>
import { 시분변환 } from '../utils/시간포맷'

defineProps({
  입력분: { type: Number, required: true },
  의무근로분: { type: Number, required: true },
  초과분: { type: Number, required: true },
  의무달성여부: { type: Boolean, required: true },
  경과근무일: { type: Number, required: true },
  소정근로일: { type: Number, required: true },
  달성률: { type: Number, required: true },
  진행바색상: { type: String, required: true },
})
</script>

<template>
  <section class="card progress-section" aria-live="polite">
    <h2 class="section-title">📊 달성 현황</h2>
    <div class="progress-info">
      <span>{{ 시분변환(입력분) }} / {{ 시분변환(의무근로분) }}</span>
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
      <div
        class="progress-fill"
        :style="{ width: 달성률 + '%', backgroundColor: 진행바색상 }"
      ></div>
    </div>
    <div class="progress-tags">
      <span v-if="입력분 === 0" class="tag info">아직 근무시간을 입력하지 않았습니다</span>
      <template v-else>
        <span v-if="의무달성여부" class="tag success">🎉 의무시간 달성!</span>
        <span v-if="초과분 > 0" class="tag overtime">추가 {{ 시분변환(초과분) }} 근무</span>
        <span class="tag info">경과 근무일: {{ 경과근무일 }}일 / {{ 소정근로일 }}일</span>
      </template>
    </div>
  </section>
</template>

<style scoped>
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

.theme-dark .progress-info {
  color: #8b949e;
}
.theme-dark .progress-bar {
  background: #21262d;
}
.theme-dark .tag.info {
  background: #21262d;
  color: #8b949e;
}
.theme-dark .tag.success {
  background: #0a2e1c;
  color: #56d364;
}
.theme-dark .tag.overtime {
  background: #2a1f04;
  color: #fcd34d;
}
</style>

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
.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 20px;
}
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

@media (prefers-color-scheme: dark) {
  .card {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  .section-title {
    color: #cbd5e1;
  }
  .progress-info {
    color: #94a3b8;
  }
  .progress-bar {
    background: #334155;
  }
  .tag.info {
    background: #334155;
    color: #94a3b8;
  }
}
</style>

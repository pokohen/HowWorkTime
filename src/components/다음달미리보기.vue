<script setup>
import { 공휴일이름조회 } from '../utils/공휴일'
import { 날짜포맷, 시분변환, 요일가져오기 } from '../utils/시간포맷'

defineProps({
  다음달표시: { type: String, required: true },
  다음달소정근로일: { type: Number, required: true },
  다음달의무근로분: { type: Number, required: true },
  다음달최대근로분: { type: Number, required: true },
  다음달공휴일: { type: Array, required: true },
})
</script>

<template>
  <section class="card next-month-section">
    <h2 class="section-title">🔮 {{ 다음달표시 }} 미리보기</h2>
    <div class="next-summary-grid">
      <div class="next-summary-item">
        <div class="next-label">근무일</div>
        <div class="next-value">{{ 다음달소정근로일 }}<span class="unit">일</span></div>
      </div>
      <div class="next-summary-item">
        <div class="next-label">의무 근로시간</div>
        <div class="next-value">{{ 시분변환(다음달의무근로분) }}</div>
      </div>
      <div class="next-summary-item">
        <div class="next-label">최대 근로시간</div>
        <div class="next-value">{{ 시분변환(다음달최대근로분) }}</div>
      </div>
    </div>
    <div class="next-holiday-block">
      <h3 class="next-subtitle">공휴일</h3>
      <ul v-if="다음달공휴일.length > 0" class="holiday-list">
        <li v-for="항목 in 다음달공휴일" :key="항목" class="holiday-item">
          <span class="holiday-date">{{ 날짜포맷(항목) }} ({{ 요일가져오기(항목) }})</span>
          <span class="holiday-name">{{ 공휴일이름조회(항목) }}</span>
        </li>
      </ul>
      <p v-else class="no-holiday">다음 달에는 공휴일이 없습니다.</p>
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
.next-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.next-summary-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}
.next-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 6px;
}
.next-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}
.next-value .unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  margin-left: 2px;
}
.next-subtitle {
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 10px;
}
.holiday-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.holiday-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fefce8;
  border-radius: 10px;
  border: 1px solid #fde68a;
}
.holiday-date {
  font-size: 0.88rem;
  font-weight: 600;
  color: #78350f;
}
.holiday-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #92400e;
  background: #fef3c7;
  padding: 2px 10px;
  border-radius: 20px;
}
.no-holiday {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  padding: 8px 0;
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
  .next-summary-item {
    background: #0f172a;
    border-color: #334155;
  }
  .next-label {
    color: #94a3b8;
  }
  .next-value {
    color: #f1f5f9;
  }
  .next-subtitle {
    color: #cbd5e1;
  }
  .holiday-item {
    background: #292524;
    border-color: #78350f;
  }
  .holiday-date {
    color: #fde68a;
  }
  .holiday-name {
    background: #451a03;
    color: #fbbf24;
  }
  .no-holiday {
    color: #64748b;
  }
}

@media (max-width: 640px) {
  .next-summary-grid {
    grid-template-columns: 1fr;
  }
  .holiday-item {
    padding: 10px 12px;
  }
  .holiday-date {
    font-size: 0.85rem;
  }
  .holiday-name {
    font-size: 0.8rem;
  }
}
</style>

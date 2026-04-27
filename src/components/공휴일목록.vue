<script setup>
import { 공휴일이름조회 } from '../utils/공휴일'
import { 날짜포맷, 요일가져오기 } from '../utils/시간포맷'

defineProps({
  선택월표시: { type: String, required: true },
  이달공휴일: { type: Array, required: true },
})
</script>

<template>
  <section class="card holiday-section">
    <h2 class="section-title">🗓 {{ 선택월표시 }} 공휴일</h2>
    <ul v-if="이달공휴일.length > 0" class="holiday-list">
      <li v-for="항목 in 이달공휴일" :key="항목" class="holiday-item">
        <span class="holiday-date">{{ 날짜포맷(항목) }} ({{ 요일가져오기(항목) }})</span>
        <span class="holiday-name">{{ 공휴일이름조회(항목) }}</span>
      </li>
    </ul>
    <p v-else class="no-holiday">이 달에는 공휴일이 없습니다.</p>
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
.no-holiday {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  padding: 8px 0;
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

@media (prefers-color-scheme: dark) {
  .card {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  .section-title {
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

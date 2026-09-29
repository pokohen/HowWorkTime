<script setup>
import { 공휴일이름 } from '../../utils/holidays'
import { 날짜포맷, 요일명 } from '../../utils/timeFormat'

// "YYYY-MM-DD" 배열을 받아 공휴일 목록으로 표시
defineProps({
  날짜들: { type: Array, required: true },
  빈안내: { type: String, default: '공휴일이 없습니다.' },
})
</script>

<template>
  <ul v-if="날짜들.length > 0" class="holiday-list">
    <li v-for="날짜 in 날짜들" :key="날짜" class="holiday-item">
      <span class="holiday-date">{{ 날짜포맷(날짜) }} ({{ 요일명(날짜) }})</span>
      <span class="holiday-name">{{ 공휴일이름(날짜) }}</span>
    </li>
  </ul>
  <p v-else class="no-holiday">{{ 빈안내 }}</p>
</template>

<style scoped>
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
  padding: 12px 14px;
  background: var(--holiday-bg);
  border-radius: 12px;
  border: 1px solid var(--holiday-border);
}
.holiday-date {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--holiday-date);
}
.holiday-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--holiday-name);
  background: var(--holiday-name-bg);
  padding: 3px 10px;
  border-radius: 999px;
}
.no-holiday {
  color: var(--hint);
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
  padding: 8px 0;
}
@media (max-width: 640px) {
  .holiday-item { padding: 10px 12px; }
  .holiday-date { font-size: 0.85rem; }
  .holiday-name { font-size: 0.8rem; }
}
</style>

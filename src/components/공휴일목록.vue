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


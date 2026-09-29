<script setup>
import { useMonth } from '../composables/useMonth'
import CardSection from './common/CardSection.vue'
import HolidayItems from './common/HolidayItems.vue'

const { 선택월표시, 이달공휴일 } = useMonth()
</script>

<template>
  <CardSection :제목="`🗓 ${선택월표시} 공휴일`">
    <HolidayItems :공휴일들="이달공휴일" 빈안내="이 달에는 공휴일이 없습니다." />
  </CardSection>
</template>

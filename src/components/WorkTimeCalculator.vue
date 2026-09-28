<script setup>
import { watchEffect } from 'vue'
import { useMonth } from '../composables/useMonth'
import AppHeader from './AppHeader.vue'
import ThemeToggle from './ThemeToggle.vue'
import MonthSelector from './MonthSelector.vue'
import MonthSummary from './MonthSummary.vue'
import WorkSettings from './WorkSettings.vue'
import ProgressStatus from './ProgressStatus.vue'
import WorkResult from './WorkResult.vue'
import HolidayList from './HolidayList.vue'
import NextMonthPreview from './NextMonthPreview.vue'

const { 선택월표시 } = useMonth()

watchEffect(() => {
  document.title = `${선택월표시.value} 근무시간 계산기`
})
</script>

<template>
  <div class="calculator">
    <AppHeader />
    <ThemeToggle />
    <MonthSelector />
    <MonthSummary />
    <WorkSettings />
    <ProgressStatus />
    <WorkResult />
    <HolidayList />
    <NextMonthPreview />
  </div>
</template>

<style scoped>
.calculator {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  color: var(--text);
}
</style>

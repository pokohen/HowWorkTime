<script setup>
import { watchEffect } from 'vue'
import { useMonth } from './worktime/composables/useMonth'
import ThemeToggle from './shared/components/ThemeToggle.vue'
import AppHeader from './worktime/components/AppHeader.vue'
import MonthSelector from './worktime/components/MonthSelector.vue'
import MonthSummary from './worktime/components/MonthSummary.vue'
import WorkSettings from './worktime/components/WorkSettings.vue'
import ProgressStatus from './worktime/components/ProgressStatus.vue'
import WorkResult from './worktime/components/WorkResult.vue'
import HolidayList from './worktime/components/HolidayList.vue'
import NextMonthPreview from './worktime/components/NextMonthPreview.vue'
import AssistantFab from './assistant/components/AssistantFab.vue'
import AssistantModal from './assistant/components/AssistantModal.vue'
import AssistantToast from './assistant/components/AssistantToast.vue'

// 레이아웃 루트. 근무시간 계산기 카드들을 세로로 쌓고, 쉬는 날 플래너(FAB·모달·알림)를 띄운다
const { 선택월표시 } = useMonth()

watchEffect(() => {
  document.title = `${선택월표시.value} 근무시간 계산기`
})
</script>

<template>
  <div class="calculator">
    <AppHeader />
    <ThemeToggle />
    <AssistantFab />
    <AssistantModal />
    <AssistantToast />
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

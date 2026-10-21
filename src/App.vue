<script setup>
import { ref, watch, watchEffect, defineAsyncComponent } from 'vue'
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
import AssistantToast from './assistant/components/AssistantToast.vue'
import { useAssistant } from './assistant/composables/useAssistant'

// 레이아웃 루트. 근무시간 계산기 카드들을 세로로 쌓고, 쉬는 날 플래너(FAB·모달·알림)를 띄운다
const { 선택월표시 } = useMonth()

// 플래너 모달(마크다운 해석기 포함)은 처음 열 때 불러온다. 근무시간만 보는 사람은 내려받지 않는다
const AssistantModal = defineAsyncComponent(() => import('./assistant/components/AssistantModal.vue'))
const { 열림: 플래너열림 } = useAssistant()
const 모달불러옴 = ref(플래너열림.value)
watch(플래너열림, (값) => { if (값) 모달불러옴.value = true })

watchEffect(() => {
  document.title = `${선택월표시.value} 근무시간 계산기`
})
</script>

<template>
  <div class="calculator">
    <AppHeader />
    <ThemeToggle />
    <AssistantFab />
    <AssistantModal v-if="모달불러옴" />
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

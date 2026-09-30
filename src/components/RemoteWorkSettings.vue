<script setup>
import { useMonth } from '../composables/useMonth'
import { useRemoteWork } from '../composables/useRemoteWork'
import ToggleSection from './common/ToggleSection.vue'
import { 재택요일명, 하루근무분 } from '../constants'
import { 시분변환 } from '../utils/timeFormat'

const { 남은재택가능일 } = useMonth()
const { 재택근무여부, 재택선택일수, 재택일수 } = useRemoteWork()
</script>

<template>
  <ToggleSection
    v-model="재택근무여부"
    :제목="`🏠 ${재택요일명} 재택근무`"
    :비활성="남은재택가능일 === 0"
    인라인
  >
    <label for="재택일수" class="field-label">재택 일수</label>
    <select id="재택일수" v-model.number="재택선택일수" class="select-field">
      <option v-for="n in 남은재택가능일 + 1" :key="n - 1" :value="n - 1">{{ n - 1 }}일</option>
    </select>
    <span class="setting-hint">
      남은 {{ 재택요일명 }} <strong>{{ 남은재택가능일 }}일</strong> 중 <strong>{{ 재택일수 }}일</strong> 반영 · 하루 {{ 시분변환(하루근무분) }} 인정분은 위 ‘현재까지 근무시간’에 포함해 입력
    </span>

    <template v-if="남은재택가능일 === 0" #힌트>
      남은 {{ 재택요일명 }}이 없어 재택근무를 신청할 수 없습니다.
    </template>
  </ToggleSection>
</template>

<style scoped>
.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
}
</style>

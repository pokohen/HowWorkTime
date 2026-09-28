<script setup>
import { useMonth } from '../composables/useMonth'
import { useRemoteWork } from '../composables/useRemoteWork'
import ToggleSection from './common/ToggleSection.vue'

const { 남은금요일 } = useMonth()
const { 재택근무여부, 재택근무일수, 재택일수 } = useRemoteWork()
</script>

<template>
  <ToggleSection
    v-model="재택근무여부"
    제목="🏠 금요일 재택근무"
    :비활성="남은금요일 === 0"
    인라인
  >
    <label for="재택일수" class="field-label">재택 일수</label>
    <select id="재택일수" v-model.number="재택근무일수" class="select-field">
      <option v-for="n in 남은금요일 + 1" :key="n - 1" :value="n - 1">{{ n - 1 }}일</option>
    </select>
    <span class="setting-hint">
      남은 금요일 <strong>{{ 남은금요일 }}일</strong> 중 <strong>{{ 재택일수 }}일</strong> 반영 · 8시간 자동 인정
    </span>

    <template v-if="남은금요일 === 0" #힌트>
      남은 금요일이 없어 재택근무를 신청할 수 없습니다.
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

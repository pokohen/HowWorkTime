<script setup>
const 재택근무여부 = defineModel('재택근무여부')
const 재택근무일수 = defineModel('재택근무일수')

defineProps({
  남은금요일: Number,
  재택일수: Number,
})
</script>

<template>
  <div class="input-today setting-row">
    <label class="setting-head" :class="{ disabled: 남은금요일 === 0 }">
      <span class="setting-title">🏠 금요일 재택근무</span>
      <span class="switch">
        <input type="checkbox" class="switch-input" v-model="재택근무여부" :disabled="남은금요일 === 0" />
        <span class="switch-track"><span class="switch-thumb"></span></span>
      </span>
    </label>
    <div v-if="재택근무여부 && 남은금요일 > 0" class="setting-body setting-body--inline">
      <label for="재택일수" class="join-date-label">재택 일수</label>
      <select id="재택일수" v-model.number="재택근무일수" class="join-date-select">
        <option v-for="n in (남은금요일 + 1)" :key="n - 1" :value="n - 1">{{ n - 1 }}일</option>
      </select>
      <span class="setting-hint">남은 금요일 <strong>{{ 남은금요일 }}일</strong> 중 <strong>{{ 재택일수 }}일</strong> 반영 · 8시간 자동 인정</span>
    </div>
    <p v-else-if="남은금요일 === 0" class="setting-hint">남은 금요일이 없어 재택근무를 신청할 수 없습니다.</p>
  </div>
</template>

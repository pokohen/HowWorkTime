<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { 시각파싱, 시각조립, 지금시각 } from '../../utils/timeFormat'
import { useTheme } from '../../composables/useTheme'

// "HH:MM" 문자열을 v-model 로 주고받는 시각 선택 필드. '지금' 버튼으로 현재 시각을 넣는다.
const 시각 = defineModel({ type: String, default: '' })

defineProps({
  라벨: { type: String, required: true },
  placeholder: String,
})

const { 테마 } = useTheme()
const 다크모드 = computed(() => 테마.value === 'dark')

// VueDatePicker 는 { hours, minutes } 객체를 쓰므로 문자열과 상호 변환
const 시각객체 = computed({
  get: () => {
    if (!시각.value) return null
    const 분합 = 시각파싱(시각.value) ?? 9 * 60
    return { hours: Math.floor(분합 / 60), minutes: 분합 % 60, seconds: 0 }
  },
  set: (값) => {
    시각.value = 값 ? 시각조립(값.hours, 값.minutes) : ''
  },
})
</script>

<template>
  <div class="clock-field">
    <label>{{ 라벨 }}</label>
    <div class="clock-row">
      <VueDatePicker
        v-model="시각객체"
        time-picker
        :is-24="true"
        auto-apply
        :clearable="false"
        :minutes-increment="5"
        :minutes-grid-increment="5"
        :dark="다크모드"
        :placeholder="placeholder"
        class="dp-wrap"
      />
      <button type="button" class="now-btn" title="현재 시각으로" @click="시각 = 지금시각()">📍 지금</button>
    </div>
  </div>
</template>

<style scoped>
.clock-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.clock-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--label);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.clock-row {
  display: flex;
  gap: 6px;
}
.dp-wrap {
  flex: 1;
  min-width: 0;
}
.dp-wrap :deep(.dp__input) {
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  padding-left: 36px;
}
.dp-wrap :deep(.dp__input:focus),
.dp-wrap :deep(.dp__input_focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.now-btn {
  appearance: none;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 0 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.now-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.theme-dark .dp-wrap :deep(.dp__input) {
  background: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
}
.theme-dark .now-btn {
  background: #161b22;
  border-color: #21262d;
  color: #c9d1d9;
}
.theme-dark .now-btn:hover {
  background: #0a2e1c;
  border-color: #2ea44f;
  color: #56d364;
}
</style>

<script setup>
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { 시각파싱, 시각조립, 지금시각 } from '../../utils/timeFormat'
import { useTheme } from '../../composables/useTheme'

// "HH:MM" 문자열을 v-model 로 주고받는 시각 선택 필드. '지금' 버튼으로 현재 시각을 넣는다.
const 시각 = defineModel({ type: String, default: '' })

defineProps({
  id: { type: String, required: true },
  라벨: { type: String, required: true },
  placeholder: String,
})

const { 다크모드 } = useTheme()

// VueDatePicker 는 { hours, minutes } 객체를 쓰므로 문자열과 상호 변환
const 시각객체 = computed({
  get: () => {
    const 분합 = 시각파싱(시각.value)
    if (분합 === null) return null
    return { hours: Math.floor(분합 / 60), minutes: 분합 % 60, seconds: 0 }
  },
  set: (값) => {
    시각.value = 값 ? 시각조립(값.hours, 값.minutes) : ''
  },
})
</script>

<template>
  <div class="clock-field">
    <label class="field-caption" :for="id">{{ 라벨 }}</label>
    <div class="clock-row">
      <VueDatePicker
        v-model="시각객체"
        :input-attrs="{ id, clearable: false }"
        :aria-labels="{ input: 라벨 }"
        :time-config="{ is24: true, minutesIncrement: 5, minutesGridIncrement: 5 }"
        time-picker
        auto-apply
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
  border: 1.5px solid var(--input-border);
  background: var(--input-bg);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--input-text);
  padding-left: 36px;
}
.dp-wrap :deep(.dp__input:focus),
.dp-wrap :deep(.dp__input_focus) {
  border-color: var(--focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.now-btn {
  appearance: none;
  border: 1.5px solid var(--input-border);
  background: var(--elevated);
  border-radius: 10px;
  padding: 0 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.now-btn:hover {
  background: var(--tint-green-bg);
  border-color: var(--tint-green-border);
  color: var(--tint-green-text);
}
</style>

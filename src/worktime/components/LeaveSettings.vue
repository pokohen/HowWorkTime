<script setup>
import { ref, computed, watch } from 'vue'
import { 시분변환 } from '../../shared/utils/timeFormat'
import { 연차단위 } from '../../shared/constants'
import { useLeave } from '../composables/useLeave'
import { useMonth } from '../composables/useMonth'
import { 남은연차분만들기, 남은연차분해, 남은연차문장, 입력숫자 } from '../utils/leaveBalance'
import ToggleSection from '../../shared/components/ToggleSection.vue'

const { 연차여부, 연차분, 연차예산분, 연차잔여분, 연차일수환산, 연차초과여부, 연차항목, 연차증감, 남은연차분 } = useLeave()
const { 선택연도 } = useMonth()

// 남은 연차는 "7일 4시간"처럼 시간까지 오므로 일·시간 두 칸으로 받고 분으로 합쳐 둔다.
const 남은연차 = computed(() => 남은연차분해(남은연차분.value))
const 남은연차요약 = computed(() => {
  const 분 = 남은연차분.value
  if (분 == null) return ''
  const 시간 = 분 / 60
  return `= ${Number.isInteger(시간) ? 시간 : 시간.toFixed(1)}시간 · 반차 ${Math.floor(분 / 연차단위.반차)}번`
})
// 입력 칸은 지역 값에 묶고, 바뀌면 분으로 합쳐 저장한 뒤 정리된 값으로 두 칸을 되돌린다 (0.2시간 → 0 → 빈칸)
const 일칸 = ref('')
const 시간칸 = ref('')
function 칸채우기({ 일, 시간 }) {
  일칸.value = 일 == null ? '' : String(일) // 적어 둔 0일은 0 으로 보여야 '모름'과 구분된다
  시간칸.value = 시간 ? String(시간) : ''
}
watch(남은연차, 칸채우기, { immediate: true })
/**
 * 잘못 적은 칸(음수·글자·"7,5" 등). 그 칸은 저장하지 않고 적은 글을 그대로 둔 채 오류로 표시한다.
 * (칸을 type="text" 로 둔 이유: number 입력은 "7e" 같은 잘못된 글을 빈 값으로 보고해 구분할 수 없다)
 */
const 잘못된칸 = ref({ 일: false, 시간: false })
const 잘못됨 = (글) => String(글).trim() !== '' && 입력숫자(글) == null
/** 두 칸 중 하나가 바뀌면 둘을 합쳐 다시 저장한다. 둘 다 비우면 '모름'. 잘못 적은 칸이 있으면 저장하지 않는다 */
function 남은연차입력() {
  잘못된칸.value = { 일: 잘못됨(일칸.value), 시간: 잘못됨(시간칸.value) }
  if (잘못된칸.value.일 || 잘못된칸.value.시간) return
  남은연차분.value = 남은연차분만들기(일칸.value, 시간칸.value)
  칸채우기(남은연차.value) // 저장값이 전과 같으면 watch 가 안 돌므로 직접 정리한다
}
</script>

<template>
  <ToggleSection
    v-model="연차여부"
    제목="🌴 연차 / 반차"
    :비활성="연차예산분 === 0"
    비활성안내="현재까지 근무시간을 먼저 입력하세요"
  >
    <div class="annual-steppers">
      <div
        v-for="항목 in 연차항목"
        :key="항목.키"
        class="annual-stepper"
        :class="{ filled: 항목.값 > 0 }"
      >
        <span class="annual-stepper-name">{{ 항목.키 }}</span>
        <span class="annual-stepper-hour">{{ 항목.시간 }}</span>
        <div class="annual-stepper-ctrl">
          <button
            type="button"
            class="annual-btn"
            :disabled="항목.값 <= 0"
            :aria-label="`${항목.키} 줄이기`"
            @click="연차증감(항목.키, -1)"
          >−</button>
          <span class="annual-count">{{ 항목.값 }}</span>
          <button
            type="button"
            class="annual-btn"
            :disabled="!항목.증가가능"
            :aria-label="`${항목.키} 늘리기`"
            @click="연차증감(항목.키, 1)"
          >+</button>
        </div>
      </div>
    </div>

    <template #힌트>
      <template v-if="연차예산분 === 0">현재까지 근무시간을 먼저 입력하면 그 안에서 연차를 지정할 수 있어요.</template>
      <template v-else-if="연차초과여부">
        ⚠ 지정한 연차가 근무시간 한도를 넘어 <strong>{{ 시분변환(연차분) }}</strong>만 반영됩니다 · 출근일 −{{ 연차일수환산 }}일
      </template>
      <template v-else-if="연차여부">
        <template v-if="연차분 > 0">지정 <strong>{{ 시분변환(연차분) }}</strong> · 출근일 −{{ 연차일수환산 }}일 · </template>남은 한도 {{ 시분변환(연차잔여분) }} / {{ 시분변환(연차예산분) }}
      </template>
      <template v-else>연차·반차를 지정하면 그만큼 출근일이 줄어요 <span class="hint-extra">· 연차 −1일 · 반차 −0.5일 · 반반차 −0.25일</span></template>
    </template>

    <template #추가>
      <div class="remaining-row">
        <label class="remaining-label" for="remaining-leave-days">{{ 선택연도 }}년 남은 연차</label>
        <div class="remaining-field" role="group" aria-label="남은 연차 (일과 시간)">
          <input
            id="remaining-leave-days"
            v-model="일칸"
            class="remaining-input"
            :class="{ error: 잘못된칸.일 }"
            :aria-invalid="잘못된칸.일"
            aria-describedby="remaining-leave-hint"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="0"
            aria-label="남은 연차 일"
            @change="남은연차입력"
          />
          <span class="remaining-unit">일</span>
          <input
            v-model="시간칸"
            class="remaining-input remaining-input--hours"
            :class="{ error: 잘못된칸.시간 }"
            :aria-invalid="잘못된칸.시간"
            aria-describedby="remaining-leave-hint"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0"
            aria-label="남은 연차 시간"
            @change="남은연차입력"
          />
          <span class="remaining-unit">시간</span>
        </div>
        <span id="remaining-leave-hint" class="remaining-hint" :class="{ 'remaining-hint--error': 잘못된칸.일 || 잘못된칸.시간 }">
          <template v-if="잘못된칸.일 || 잘못된칸.시간">⚠ 숫자로 적어 주세요 (예: 7일 4시간, 0.5시간). 고치기 전까지는 저장하지 않아요</template>
          <template v-else-if="남은연차분 == null">적어 두면 쉬는 날 플래너가 남은 연차를 알고 제안해요 · 반차 4시간, 반반차 2시간</template>
          <template v-else><strong>{{ 남은연차문장(남은연차분) }}</strong> {{ 남은연차요약 }} · 플래너가 참고해요</template>
        </span>
      </div>
    </template>
  </ToggleSection>
</template>

<style scoped>
.annual-steppers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.annual-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  background: var(--surface-soft);
  border-radius: 10px;
  transition: background 0.15s;
}
.annual-stepper.filled {
  background: var(--tint-blue-bg);
}
.annual-stepper-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text);
}
.annual-stepper-hour {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--tint-blue-text);
  background: var(--tint-blue-border);
  padding: 2px 5px;
  border-radius: 5px;
  letter-spacing: 0.01em;
}
.annual-stepper-ctrl {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.annual-btn {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  border: none;
  background: var(--btn-bg);
  color: var(--text-soft);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, transform 0.08s;
}
.annual-btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
  color: var(--text);
}
.annual-btn:active:not(:disabled) {
  transform: scale(0.92);
}
.annual-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.annual-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.annual-count {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text);
  min-width: 1.4ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.remaining-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}
.remaining-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text);
}
.remaining-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.remaining-input {
  width: 76px;
  height: 34px;
  padding: 0 10px;
  border: 1.5px solid var(--input-border);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--input-text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.remaining-input--hours { width: 66px; }
.remaining-input::placeholder { color: var(--hint); font-weight: 500; }
.remaining-input:hover { border-color: var(--input-border-hover); }
.remaining-input:focus-visible {
  outline: none;
  border-color: var(--focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.remaining-unit {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-soft);
}
.remaining-hint {
  flex: 1 1 100%;
  font-size: 0.78rem;
  color: var(--label);
  line-height: 1.5;
}
.remaining-hint strong { color: var(--text-soft); font-weight: 700; }
.remaining-hint--error { color: var(--tint-red-text); }
.remaining-input.error { border-color: var(--tint-red-text); }
@media (min-width: 560px) {
  .remaining-hint { flex: 1 1 auto; }
}
</style>

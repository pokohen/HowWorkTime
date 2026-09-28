<script setup>
import { 시분파싱, 시분변환 } from '../utils/timeFormat'
import RemoteWorkSettings from './RemoteWorkSettings.vue'
import LeaveSettings from './LeaveSettings.vue'
import TodayWorkInput from './TodayWorkInput.vue'

// 직접 사용하는 모델
const 고정연장시간 = defineModel('고정연장시간')
const 입력근무시간 = defineModel('입력근무시간')
// 자식으로 전달하는 모델
const 재택근무여부 = defineModel('재택근무여부')
const 재택근무일수 = defineModel('재택근무일수')
const 연차여부 = defineModel('연차여부')
const 연차일수 = defineModel('연차일수')
const 반차수 = defineModel('반차수')
const 반반차수 = defineModel('반반차수')
const 오늘재택근무 = defineModel('오늘재택근무')
const 오늘입력모드 = defineModel('오늘입력모드')
const 출근시각 = defineModel('출근시각')
const 퇴근시각 = defineModel('퇴근시각')
const 휴게수동분 = defineModel('휴게수동분')
const 휴게자동 = defineModel('휴게자동')
const 오늘예상시간 = defineModel('오늘예상시간')

defineProps({
  // 요약·입력에서 직접 사용
  반영분: Number,
  입력분: Number,
  연차분: Number,
  오늘예상분: Number,
  고정연장유효: Boolean,
  입력유효: Boolean,
  지난달여부: Boolean,
  // 자식으로 전달
  남은금요일: Number,
  재택일수: Number,
  연차예산분: Number,
  연차잔여분: Number,
  연차일수환산: Number,
  오늘금요일여부: Boolean,
  다크모드: Boolean,
  오늘예상유효: Boolean,
  자정넘김여부: Boolean,
  총체류분: Number,
  휴게분: Number,
})

function 입력근무정규화() {
  const 결과 = 시분파싱(입력근무시간.value)
  if (!결과.유효) return
  입력근무시간.value = 결과.비어있음 ? '' : 시분변환(결과.분)
}
function 고정연장정규화() {
  const 결과 = 시분파싱(고정연장시간.value)
  if (!결과.유효) return
  고정연장시간.value = 시분변환(Math.max(0, 결과.분))
}
</script>

<template>
  <!-- 입력 설정 -->
  <section class="card input-section">
    <h2 class="section-title">⚙️ 근무 설정</h2>
    <div v-if="반영분 > 0" class="reflected-summary" aria-live="polite">
      <span class="reflected-label">총 반영 시간</span>
      <span class="reflected-value">{{ 시분변환(반영분) }}</span>
      <span class="reflected-formula">
        누적 {{ 시분변환(입력분) }}<template v-if="연차분 > 0"> (연차 {{ 시분변환(연차분) }} 포함)</template><template v-if="오늘예상분 > 0"> + 오늘 {{ 시분변환(오늘예상분) }}</template>
      </span>
    </div>
    <div class="input-grid">
      <div class="input-group">
        <label for="고정연장">월 고정 연장근무 (시:분)</label>
        <div class="input-with-unit">
          <input
            id="고정연장"
            v-model="고정연장시간"
            @blur="고정연장정규화"
            :class="{ error: !고정연장유효 }"
            :aria-invalid="!고정연장유효"
            type="text"
            inputmode="numeric"
            placeholder="10:00"
            pattern="[0-9:]*"
          />
        </div>
        <p v-if="!고정연장유효" class="input-error">
          ⚠ 형식이 올바르지 않습니다. 예: <code>10:00</code> 또는 <code>1000</code>
        </p>
        <p v-else class="input-hint">
          <strong>형식</strong>: <code>10:00</code>, <code>7:30</code>
          <span class="hint-extra">(콜론 없이 <code>1000</code>도 가능)</span>
        </p>
      </div>
      <div class="input-group">
        <label for="근무입력">현재까지 근무시간 (시:분)</label>
        <div class="input-with-unit">
          <input
            id="근무입력"
            v-model="입력근무시간"
            @blur="입력근무정규화"
            :class="{ error: !입력유효 }"
            :aria-invalid="!입력유효"
            type="text"
            inputmode="numeric"
            placeholder="0:00"
            pattern="[0-9:]*"
          />
        </div>
        <p v-if="!입력유효" class="input-error">
          ⚠ 형식이 올바르지 않습니다. 예: <code>23:30</code> 또는 <code>2330</code>
        </p>
        <p v-else class="input-hint">
          <strong>형식</strong>: <code>23:30</code>, <code>137:30</code>
          <span class="hint-extra">(콜론 없이 <code>2330</code>도 가능)</span>
        </p>
      </div>

      <RemoteWorkSettings
        v-if="!지난달여부"
        v-model:재택근무여부="재택근무여부"
        v-model:재택근무일수="재택근무일수"
        :남은금요일="남은금요일"
        :재택일수="재택일수"
      />

      <LeaveSettings
      v-model:연차여부="연차여부"
        v-model:연차일수="연차일수"
        v-model:반차수="반차수"
        v-model:반반차수="반반차수"
        :연차분="연차분"
        :연차예산분="연차예산분"
        :연차잔여분="연차잔여분"
        :연차일수환산="연차일수환산"
      />

      <TodayWorkInput
      v-model:오늘재택근무="오늘재택근무"
        v-model:오늘입력모드="오늘입력모드"
        v-model:출근시각="출근시각"
        v-model:퇴근시각="퇴근시각"
        v-model:휴게수동분="휴게수동분"
        v-model:휴게자동="휴게자동"
        v-model:오늘예상시간="오늘예상시간"
        :오늘금요일여부="오늘금요일여부"
        :다크모드="다크모드"
        :오늘예상유효="오늘예상유효"
        :자정넘김여부="자정넘김여부"
        :총체류분="총체류분"
        :휴게분="휴게분"
        :오늘예상분="오늘예상분"
      />
    </div>
  </section>
</template>

<style scoped>
.reflected-summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 12px 16px;
  margin-bottom: 18px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
}
.reflected-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e40af;
}
.reflected-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1d4ed8;
}
.reflected-formula {
  font-size: 0.78rem;
  color: #64748b;
  margin-left: auto;
}
.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Dark mode */
.theme-dark .reflected-summary {
  background: #0d1f3a;
  border-color: #1f3a68;
}
.theme-dark .reflected-label { color: #79b8ff; }
.theme-dark .reflected-value { color: #c9d1ff; }
.theme-dark .reflected-formula { color: #8b949e; }

/* Responsive */
@media (max-width: 640px) {
  .input-grid {
    grid-template-columns: 1fr;
  }
}
</style>

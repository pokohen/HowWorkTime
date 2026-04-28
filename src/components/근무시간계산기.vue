<script setup>
import { ref, computed, watchEffect } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { 월소정근로일수조회, 남은근무일수조회 } from '../utils/근무시간'
import { 월별공휴일조회, 공휴일데이터존재여부 } from '../utils/공휴일'
import { 시분파싱, 시분변환 } from '../utils/시간포맷'
import { 테마사용 } from '../composables/테마'
import 달성현황 from './달성현황.vue'
import 공휴일목록 from './공휴일목록.vue'
import 다음달미리보기 from './다음달미리보기.vue'

const { 테마, 토글: 테마토글 } = 테마사용()
const 다크모드 = computed(() => 테마.value === 'dark')

const 오늘 = new Date()
const 현재연도 = 오늘.getFullYear()
const 현재월 = 오늘.getMonth() + 1

const 선택연도 = ref(현재연도)
const 선택월 = ref(현재월)
const 고정연장시간 = ref('10:00')
const 입력근무시간 = ref('')
const 오늘예상시간 = ref('0:00')
const 오늘입력모드 = ref('출퇴근')
const 출근시각 = ref('09:00')
const 퇴근시각 = ref('18:00')
const 휴게자동 = ref(true)
const 휴게수동분 = ref(60)

function 시각분리(시각) {
  const 매칭 = String(시각 ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!매칭) return { 시: 9, 분: 0 }
  return { 시: Number(매칭[1]), 분: Number(매칭[2]) }
}
function 시각조립(시, 분) {
  return `${String(시).padStart(2, '0')}:${String(분).padStart(2, '0')}`
}
function 시각객체(시각) {
  if (!시각) return null
  const { 시, 분 } = 시각분리(시각)
  return { hours: 시, minutes: 분, seconds: 0 }
}
const 출근객체 = computed({
  get: () => 시각객체(출근시각.value),
  set: (값) => { 출근시각.value = 값 ? 시각조립(값.hours, 값.minutes) : '' },
})
const 퇴근객체 = computed({
  get: () => 시각객체(퇴근시각.value),
  set: (값) => { 퇴근시각.value = 값 ? 시각조립(값.hours, 값.minutes) : '' },
})
const 입사한달여부 = ref(false)
const 입사일 = ref(오늘.getDate())

const 하루근무분 = 8 * 60

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

function 오늘예상정규화() {
  const 결과 = 시분파싱(오늘예상시간.value)
  if (!결과.유효) return
  오늘예상시간.value = 결과.비어있음 ? '0:00' : 시분변환(Math.max(0, 결과.분))
}

function 지금시각() {
  const 지금 = new Date()
  const 시 = String(지금.getHours()).padStart(2, '0')
  const 분 = String(지금.getMinutes()).padStart(2, '0')
  return `${시}:${분}`
}
function 출근지금() { 출근시각.value = 지금시각() }
function 퇴근지금() { 퇴근시각.value = 지금시각() }

const 입력결과 = computed(() => 시분파싱(입력근무시간.value))
const 고정연장결과 = computed(() => 시분파싱(고정연장시간.value))
const 오늘예상결과 = computed(() => 시분파싱(오늘예상시간.value))
const 입력분 = computed(() => Math.max(0, 입력결과.value.분))
const 고정연장분 = computed(() => Math.max(0, 고정연장결과.value.분))
const 입력유효 = computed(() => 입력결과.value.유효)
const 고정연장유효 = computed(() => 고정연장결과.value.유효)
const 오늘예상유효 = computed(() => 오늘예상결과.value.유효)

// 출퇴근 자동 계산
function 시각문자열을분으로(문자열) {
  const 매칭 = String(문자열 ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!매칭) return null
  const 시 = Number(매칭[1])
  const 분 = Number(매칭[2])
  if (시 < 0 || 시 > 23 || 분 < 0 || 분 > 59) return null
  return 시 * 60 + 분
}
const 출근분 = computed(() => 시각문자열을분으로(출근시각.value))
const 퇴근분 = computed(() => 시각문자열을분으로(퇴근시각.value))
const 출퇴근유효 = computed(
  () => 출근분.value !== null && 퇴근분.value !== null,
)
const 자정넘김여부 = computed(() => {
  if (!출퇴근유효.value) return false
  return 퇴근분.value < 출근분.value
})
const 총체류분 = computed(() => {
  if (!출퇴근유효.value) return 0
  let 차 = 퇴근분.value - 출근분.value
  if (차 < 0) 차 += 24 * 60
  return Math.max(0, 차)
})
const 휴게자동분 = computed(() => {
  const 체류 = 총체류분.value
  if (체류 > 8 * 60) return 60
  if (체류 > 4 * 60) return 30
  return 0
})
const 휴게분 = computed(() => {
  if (!출퇴근유효.value) return 0
  return 휴게자동.value ? 휴게자동분.value : Math.max(0, Number(휴게수동분.value) || 0)
})
const 출퇴근근무분 = computed(() => {
  if (!출퇴근유효.value) return 0
  return Math.max(0, 총체류분.value - 휴게분.value)
})

const 오늘예상분 = computed(() => {
  if (오늘입력모드.value === '출퇴근') return 출퇴근근무분.value
  return Math.max(0, 오늘예상결과.value.분)
})
const 반영분 = computed(() => 입력분.value + 오늘예상분.value)

const 연도목록 = computed(() => {
  const 목록 = []
  for (let 연도 = 현재연도 - 1; 연도 <= 현재연도 + 2; 연도++) {
    목록.push(연도)
  }
  return 목록
})

const 월목록 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const 월말일 = computed(() =>
  new Date(선택연도.value, 선택월.value, 0).getDate(),
)
const 일목록 = computed(() => {
  const 목록 = []
  for (let 일 = 1; 일 <= 월말일.value; 일++) 목록.push(일)
  return 목록
})
const 유효입사일 = computed(() => {
  if (!입사한달여부.value) return 1
  return Math.max(1, Math.min(월말일.value, Number(입사일.value) || 1))
})
const 소정근로일 = computed(() =>
  월소정근로일수조회(선택연도.value, 선택월.value, 유효입사일.value),
)
const 의무근로분 = computed(() => 소정근로일.value * 하루근무분)
const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
const 남은근무일 = computed(() =>
  남은근무일수조회(선택연도.value, 선택월.value, 유효입사일.value),
)
const 경과근무일 = computed(() => 소정근로일.value - 남은근무일.value)
const 남은의무분 = computed(() =>
  Math.max(0, 의무근로분.value - 반영분.value),
)
const 남은최대분 = computed(() =>
  Math.max(0, 최대근로분.value - 반영분.value),
)
const 의무달성일평균분 = computed(() => {
  if (남은근무일.value === 0) return 0
  return Math.round(남은의무분.value / 남은근무일.value)
})
const 최대달성일평균분 = computed(() => {
  if (남은근무일.value === 0) return 0
  return Math.round(남은최대분.value / 남은근무일.value)
})
const 달성률 = computed(() => {
  if (의무근로분.value === 0) return 0
  return Math.min(100, Math.round((반영분.value / 의무근로분.value) * 100))
})
const 초과분 = computed(() =>
  Math.max(0, 반영분.value - 의무근로분.value),
)
const 의무달성여부 = computed(() => 반영분.value >= 의무근로분.value)
const 의무대비차 = computed(() =>
  Math.abs(반영분.value - 의무근로분.value),
)
const 최대대비차 = computed(() =>
  Math.abs(반영분.value - 최대근로분.value),
)
const 이달공휴일 = computed(() =>
  월별공휴일조회(선택연도.value, 선택월.value),
)
const 공휴일데이터있음 = computed(() => 공휴일데이터존재여부(선택연도.value))

// 다음 달
const 다음달 = computed(() => {
  const 월 = 선택월.value === 12 ? 1 : 선택월.value + 1
  const 연도 = 선택월.value === 12 ? 선택연도.value + 1 : 선택연도.value
  return { 연도, 월 }
})
const 다음달표시 = computed(
  () => `${다음달.value.연도}년 ${다음달.value.월}월`,
)
const 다음달소정근로일 = computed(() =>
  월소정근로일수조회(다음달.value.연도, 다음달.value.월),
)
const 다음달의무근로분 = computed(
  () => 다음달소정근로일.value * 하루근무분,
)
const 다음달최대근로분 = computed(
  () => 다음달의무근로분.value + 고정연장분.value,
)
const 다음달공휴일 = computed(() =>
  월별공휴일조회(다음달.value.연도, 다음달.value.월),
)

const 진행바색상 = computed(() => {
  if (달성률.value >= 100) return '#10b981'
  if (달성률.value >= 70) return '#f59e0b'
  return '#3b82f6'
})

const 선택월표시 = computed(
  () => `${선택연도.value}년 ${선택월.value}월`,
)

const 지난달여부 = computed(() => {
  const 선택 = new Date(선택연도.value, 선택월.value - 1, 1)
  const 이번달 = new Date(현재연도, 현재월 - 1, 1)
  return 선택 < 이번달
})

const 이번달여부 = computed(
  () => 선택연도.value === 현재연도 && 선택월.value === 현재월,
)

watchEffect(() => {
  document.title = `${선택월표시.value} 근무시간 계산기`
})

watchEffect(() => {
  if (!입사한달여부.value) return
  const 기본 = 이번달여부.value ? 오늘.getDate() : 1
  if (입사일.value < 1 || 입사일.value > 월말일.value) {
    입사일.value = Math.min(월말일.value, 기본)
  }
})
</script>

<template>
  <div class="calculator">
    <header class="calc-header">
      <h1>⏱ 근무시간 계산기</h1>
      <p class="subtitle">소정근로일 기준 의무·최대 근로시간과 일평균 목표를 확인하세요</p>
    </header>

    <button
      type="button"
      class="theme-fab"
      :aria-label="다크모드 ? '라이트 모드로 전환' : '다크 모드로 전환'"
      :title="다크모드 ? '라이트 모드로' : '다크 모드로'"
      @click="테마토글"
    >
      <span class="theme-fab-icon">{{ 다크모드 ? '☀️' : '🌙' }}</span>
    </button>

    <!-- 월 선택 -->
    <section class="card month-selector">
      <div class="selector-row">
        <div class="select-group">
          <label for="연도선택">연도</label>
          <select id="연도선택" v-model="선택연도">
            <option v-for="연도 in 연도목록" :key="연도" :value="연도">{{ 연도 }}년</option>
          </select>
        </div>
        <div class="select-group">
          <label for="월선택">월</label>
          <select id="월선택" v-model="선택월">
            <option v-for="월 in 월목록" :key="월" :value="월">{{ 월 }}월</option>
          </select>
        </div>
        <div class="month-badge">
          <span>{{ 선택월표시 }}</span>
          <span v-if="이번달여부" class="badge current">이번 달</span>
          <span v-else-if="지난달여부" class="badge past">지난 달</span>
          <span v-else class="badge future">다음 달</span>
        </div>
      </div>
      <div class="join-inline">
        <label class="join-checkbox">
          <input type="checkbox" v-model="입사한달여부" />
          <span>이 달에 입사했어요</span>
        </label>
        <div v-if="입사한달여부" class="join-date">
          <label for="입사일" class="join-date-label">입사일</label>
          <select id="입사일" v-model.number="입사일" class="join-date-select">
            <option v-for="일 in 일목록" :key="일" :value="일">{{ 일 }}일</option>
          </select>
        </div>
        <p v-if="입사한달여부" class="input-hint join-hint">
          <strong>{{ 유효입사일 }}일</strong>부터 월말까지 근무일로 계산
          <span class="hint-extra">(입사일도 포함)</span>
        </p>
      </div>
    </section>

    <!-- 공휴일 데이터 부재 알림 -->
    <div v-if="!공휴일데이터있음" class="warn-notice" role="alert">
      ⚠ {{ 선택연도 }}년 공휴일 데이터가 없습니다. 근무일 계산에서 공휴일이 평일로 간주되어 부정확할 수 있습니다.
    </div>

    <!-- 근무일 요약 -->
    <section class="summary-grid" aria-live="polite">
      <div class="summary-card blue">
        <div class="summary-icon">📅</div>
        <div class="summary-label">이달 근무일 <span class="label-aside">(소정 근로일)</span></div>
        <div class="summary-value">{{ 소정근로일 }}<span class="unit">일</span></div>
        <div class="summary-sub">
          <template v-if="입사한달여부">{{ 유효입사일 }}일부터 · 주말·공휴일 제외</template>
          <template v-else>주말·공휴일 제외</template>
        </div>
      </div>
      <div class="summary-card green">
        <div class="summary-icon">✅</div>
        <div class="summary-label">의무 근로시간</div>
        <div class="summary-value">{{ 시분변환(의무근로분) }}</div>
        <div class="summary-sub">8:00 × {{ 소정근로일 }}일</div>
      </div>
      <div class="summary-card purple">
        <div class="summary-icon">⏰</div>
        <div class="summary-label">최대 근로시간</div>
        <div class="summary-value">{{ 시분변환(최대근로분) }}</div>
        <div class="summary-sub">8:00 × {{ 소정근로일 }}일 + {{ 시분변환(고정연장분) }}</div>
      </div>
    </section>

    <!-- 입력 설정 -->
    <section class="card input-section">
      <h2 class="section-title">⚙️ 근무 설정</h2>
      <div v-if="반영분 > 0" class="reflected-summary" aria-live="polite">
        <span class="reflected-label">총 반영 시간</span>
        <span class="reflected-value">{{ 시분변환(반영분) }}</span>
        <span class="reflected-formula">
          누적 {{ 시분변환(입력분) }}<template v-if="오늘예상분 > 0"> + 오늘 {{ 시분변환(오늘예상분) }}</template>
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
        <div class="input-group input-today">
          <div class="today-header">
            <label>오늘 예상 근무시간</label>
            <div class="mode-switch" role="tablist" aria-label="입력 방식">
              <button
                type="button"
                role="tab"
                :aria-selected="오늘입력모드 === '출퇴근'"
                :class="{ active: 오늘입력모드 === '출퇴근' }"
                @click="오늘입력모드 = '출퇴근'"
              >출·퇴근으로 계산</button>
              <button
                type="button"
                role="tab"
                :aria-selected="오늘입력모드 === '직접'"
                :class="{ active: 오늘입력모드 === '직접' }"
                @click="오늘입력모드 = '직접'"
              >직접 입력</button>
            </div>
          </div>

          <template v-if="오늘입력모드 === '출퇴근'">
            <div class="commute-grid">
              <div class="commute-field">
                <label>출근</label>
                <div class="time-input-wrap">
                  <VueDatePicker
                    v-model="출근객체"
                    time-picker
                    :is-24="true"
                    auto-apply
                    :clearable="false"
                    :minutes-increment="5"
                    :minutes-grid-increment="5"
                    :dark="다크모드"
                    placeholder="출근 시각"
                    class="dp-wrap"
                  />
                  <button type="button" class="now-btn" @click="출근지금" title="현재 시각으로">📍 지금</button>
                </div>
              </div>
              <div class="commute-field">
                <label>퇴근 예상</label>
                <div class="time-input-wrap">
                  <VueDatePicker
                    v-model="퇴근객체"
                    time-picker
                    :is-24="true"
                    auto-apply
                    :clearable="false"
                    :minutes-increment="5"
                    :minutes-grid-increment="5"
                    :dark="다크모드"
                    placeholder="퇴근 시각"
                    class="dp-wrap"
                  />
                  <button type="button" class="now-btn" @click="퇴근지금" title="현재 시각으로">📍 지금</button>
                </div>
              </div>
              <div class="commute-field commute-break">
                <label for="휴게수동">휴게시간</label>
                <div class="break-row">
                  <select
                    id="휴게수동"
                    v-model.number="휴게수동분"
                    :disabled="휴게자동"
                    class="break-select"
                  >
                    <option :value="0">0분</option>
                    <option :value="30">30분</option>
                    <option :value="45">45분</option>
                    <option :value="60">1시간</option>
                    <option :value="90">1시간 30분</option>
                    <option :value="120">2시간</option>
                  </select>
                  <label class="auto-toggle">
                    <input type="checkbox" v-model="휴게자동" />
                    <span>자동</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="commute-result" :class="{ midnight: 자정넘김여부 }" aria-live="polite">
              <span class="result-tag">오늘 예상</span>
              <span class="result-time">{{ 시분변환(오늘예상분) }}</span>
              <span class="result-formula">
                체류 {{ 시분변환(총체류분) }} − 휴게 {{ 시분변환(휴게분) }}
                <template v-if="휴게자동">(자동)</template>
              </span>
              <span v-if="자정넘김여부" class="midnight-badge" title="퇴근이 출근보다 빠르거나 같음">
                🌙 자정 넘김
              </span>
            </div>
          </template>

          <template v-else>
            <div class="input-with-unit">
              <input
                id="오늘예상"
                v-model="오늘예상시간"
                @blur="오늘예상정규화"
                :class="{ error: !오늘예상유효 }"
                :aria-invalid="!오늘예상유효"
                type="text"
                inputmode="numeric"
                placeholder="0:00"
                pattern="[0-9:]*"
              />
            </div>
            <p v-if="!오늘예상유효" class="input-error">
              ⚠ 형식이 올바르지 않습니다. 예: <code>8:00</code> 또는 <code>800</code>
            </p>
            <p v-else class="input-hint">
              오늘 추가로 일할 시간 · <strong>현재까지에 더해</strong> 합산
              <span class="hint-extra">(기본 <code>0:00</code>)</span>
            </p>
          </template>
        </div>
      </div>
    </section>

    <!-- 진행 상황 -->
    <component
      :is="달성현황"
      :입력분="반영분"
      :의무근로분="의무근로분"
      :초과분="초과분"
      :의무달성여부="의무달성여부"
      :경과근무일="경과근무일"
      :소정근로일="소정근로일"
      :달성률="달성률"
      :진행바색상="진행바색상"
    />

    <!-- 결과 -->
    <section class="card result-section" aria-live="polite">
      <h2 class="section-title">📋 {{ 지난달여부 ? '지난 달 결과 요약' : '남은 근무 계획' }}</h2>

      <div v-if="지난달여부" class="notice past-notice">
        ℹ️ 지난 달입니다. 입력한 누적 시간으로 의무·최대 대비 결과만 표시합니다.
      </div>

      <div v-if="지난달여부 && 반영분 === 0" class="empty-banner">
        💡 위에서 해당 달의 <strong>실제 근무시간</strong>을 입력하면 의무·최대 달성 결과를 확인할 수 있습니다.
      </div>

      <div v-if="지난달여부 && 반영분 > 0" class="result-grid">
        <div class="result-item">
          <div class="result-label">실제 근무시간</div>
          <div class="result-value highlight-blue">{{ 시분변환(반영분) }}</div>
          <div class="result-sub">달성률 {{ 달성률 }}%</div>
        </div>
        <div class="result-item">
          <div class="result-label">의무 대비</div>
          <div class="result-value" :class="의무달성여부 ? 'highlight-green' : 'highlight-red'">
            {{ 의무달성여부 ? '+' : '−' }}{{ 시분변환(의무대비차) }}
          </div>
          <div class="result-sub">
            <template v-if="의무달성여부">의무 {{ 시분변환(의무근로분) }} 초과 달성</template>
            <template v-else>의무 {{ 시분변환(의무근로분) }} 미달</template>
          </div>
        </div>
        <div class="result-item">
          <div class="result-label">최대 대비</div>
          <div class="result-value highlight-purple">
            {{ 반영분 >= 최대근로분 ? '+' : '−' }}{{ 시분변환(최대대비차) }}
          </div>
          <div class="result-sub">최대 {{ 시분변환(최대근로분) }}</div>
        </div>
      </div>

      <div v-if="!지난달여부 && 반영분 === 0" class="empty-banner">
        💡 위에서 <strong>현재까지 근무시간</strong>을 입력하면 남은 시간과 일평균 목표가 계산됩니다.
      </div>

      <div v-if="!지난달여부" class="result-grid">
        <div class="result-item">
          <div class="result-label">남은 근무일</div>
          <div class="result-value highlight-blue">
            {{ 남은근무일 }}<span class="unit">일</span>
          </div>
          <div class="result-sub">오늘 제외 · 내일부터</div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 의무 근무시간</div>
          <div class="result-value highlight-green">
            <template v-if="반영분 > 0">{{ 시분변환(남은의무분) }}</template>
            <span v-else class="placeholder-dash">—</span>
          </div>
          <div v-if="반영분 > 0" class="result-sub">
            의무 {{ 시분변환(의무근로분) }} − 누적 {{ 시분변환(입력분) }}<template v-if="오늘예상분 > 0"> − 오늘 {{ 시분변환(오늘예상분) }}</template>
          </div>
          <div v-else class="result-sub">의무 {{ 시분변환(의무근로분) }}</div>
        </div>
        <div class="result-item">
          <div class="result-label">남은 최대 근무시간</div>
          <div class="result-value highlight-purple">
            <template v-if="반영분 > 0">{{ 시분변환(남은최대분) }}</template>
            <span v-else class="placeholder-dash">—</span>
          </div>
          <div v-if="반영분 > 0" class="result-sub">
            최대 {{ 시분변환(최대근로분) }} − 누적 {{ 시분변환(입력분) }}<template v-if="오늘예상분 > 0"> − 오늘 {{ 시분변환(오늘예상분) }}</template>
          </div>
          <div v-else class="result-sub">최대 {{ 시분변환(최대근로분) }}</div>
        </div>
      </div>

      <div v-if="!지난달여부 && 남은근무일 > 0 && 반영분 > 0" class="avg-section">
        <h3 class="avg-title">일평균 목표 근무시간</h3>
        <div class="avg-grid">
          <div class="avg-card">
            <span class="avg-tag tag-mandatory">의무</span>
            <div class="avg-value">{{ 시분변환(의무달성일평균분) }}</div>
            <div class="avg-sub">{{ 남은근무일 }}일 동안 매일</div>
          </div>
          <div class="avg-card">
            <span class="avg-tag tag-max">최대</span>
            <div class="avg-value">{{ 시분변환(최대달성일평균분) }}</div>
            <div class="avg-sub">{{ 남은근무일 }}일 동안 매일</div>
          </div>
        </div>
      </div>

      <div v-if="!지난달여부 && 남은근무일 === 0" class="notice">
        🎊 남은 근무일이 없습니다!
      </div>
    </section>

    <!-- 공휴일 목록 -->
    <component :is="공휴일목록" :선택월표시="선택월표시" :이달공휴일="이달공휴일" />

    <!-- 다음 달 미리보기 -->
    <component
      :is="다음달미리보기"
      :다음달표시="다음달표시"
      :다음달소정근로일="다음달소정근로일"
      :다음달의무근로분="다음달의무근로분"
      :다음달최대근로분="다음달최대근로분"
      :다음달공휴일="다음달공휴일"
    />
  </div>
</template>

<style scoped>
.calculator {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  font-family: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif;
  color: #1e293b;
}

/* Header */
.calc-header {
  text-align: center;
  margin-bottom: 32px;
}
.calc-header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 6px;
  color: #191f28;
  letter-spacing: -0.03em;
}
.subtitle {
  color: #8b95a1;
  font-size: 0.9rem;
  margin: 0;
}

/* Theme toggle FAB */
.theme-fab {
  position: fixed;
  right: 20px;
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 50;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #ebedf0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 1.35rem;
  color: #4e5968;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12), 0 2px 4px rgba(15, 23, 42, 0.06);
  transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
}
.theme-fab:hover {
  background: #f7f8fa;
  border-color: #d1d6db;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.15), 0 3px 6px rgba(15, 23, 42, 0.08);
}
.theme-fab:active {
  transform: translateY(0) scale(0.95);
}
.theme-fab:focus-visible {
  outline: none;
  border-color: #06c755;
  box-shadow: 0 0 0 3px rgba(6, 199, 85, 0.22), 0 6px 20px rgba(15, 23, 42, 0.12);
}
.theme-fab-icon {
  display: inline-block;
  line-height: 1;
}

/* Label aside */
.label-aside {
  font-weight: 400;
  color: #94a3b8;
  font-size: 0.78rem;
  margin-left: 4px;
}

/* Month selector */
.selector-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.select-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.select-group select {
  padding: 10px 36px 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 500;
  color: #0f172a;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.select-group select:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.join-group {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.join-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  cursor: pointer;
  text-transform: none;
  letter-spacing: normal;
  user-select: none;
  transition: background 0.15s, border-color 0.15s;
}
.join-checkbox:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.join-checkbox:has(input:checked) {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.join-checkbox input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
  cursor: pointer;
  margin: 0;
}
.join-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 10px;
  column-gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e2e8f0;
}
.join-date {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.join-date-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}
.join-date-select {
  height: 36px;
  padding: 0 32px 0 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.join-date-select:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.join-hint {
  margin: 0;
  flex-basis: 100%;
  font-size: 0.8rem;
  color: #64748b;
}
.month-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}
.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}
.badge.current {
  background: #dbeafe;
  color: #1d4ed8;
}
.badge.past {
  background: #f1f5f9;
  color: #64748b;
}
.badge.future {
  background: #fef3c7;
  color: #92400e;
}

/* Summary grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.summary-card {
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid transparent;
}
.summary-card.blue {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.summary-card.green {
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.summary-card.purple {
  background: #faf5ff;
  border-color: #e9d5ff;
}
.summary-icon {
  font-size: 1.75rem;
  margin-bottom: 8px;
}
.summary-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.summary-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 6px;
}
.summary-value .unit {
  font-size: 1rem;
  font-weight: 500;
  margin-left: 2px;
  color: #64748b;
}
.summary-sub {
  font-size: 0.78rem;
  color: #94a3b8;
}

/* Input section */
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
  gap: 20px;
}
.input-today {
  grid-column: 1 / -1;
}
.today-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.mode-switch {
  display: inline-flex;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}
.mode-switch button {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mode-switch button:hover {
  color: #334155;
}
.mode-switch button.active {
  background: #fff;
  color: #1d4ed8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
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
.commute-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.commute-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.commute-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.time-input-wrap {
  display: flex;
  gap: 6px;
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
.break-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.break-select {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 32px 0 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.break-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.break-select:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.auto-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.auto-toggle input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: #3b82f6;
  cursor: pointer;
  margin: 0;
}
.commute-result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
  margin-top: 12px;
  padding: 12px 16px;
  background: #e6f9f0;
  border: 1px solid #b7e8c8;
  border-radius: 12px;
}
.commute-result .result-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: #06873e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.commute-result .result-time {
  font-size: 1.15rem;
  font-weight: 800;
  color: #04632d;
  letter-spacing: -0.02em;
}
.commute-result .result-formula {
  font-size: 0.78rem;
  color: #4b5563;
  margin-left: auto;
}
.commute-result.midnight {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.midnight-badge {
  flex-basis: 100%;
  font-size: 0.78rem;
  color: #4338ca;
  font-weight: 600;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-group label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}
.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-unit input {
  width: 100%;
  padding: 12px 44px 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-with-unit input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
}
.input-with-unit input.error {
  border-color: #ef4444;
  background: #fef2f2;
}
.input-with-unit input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
.input-hint {
  font-size: 0.82rem;
  color: #475569;
  margin: 0;
}
.input-hint code {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: #0f172a;
}
.input-hint .hint-extra {
  color: #94a3b8;
  margin-left: 6px;
}
.input-error {
  font-size: 0.82rem;
  color: #b91c1c;
  margin: 0;
  font-weight: 500;
}
.input-error code {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: #991b1b;
}

/* Result section */
.empty-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 20px;
  font-size: 0.92rem;
  color: #1e40af;
  line-height: 1.5;
}
.empty-banner strong {
  font-weight: 700;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.result-item {
  background: #f9fafb;
  border-radius: 14px;
  padding: 18px 16px;
  text-align: left;
  border: 1px solid #f0f1f3;
}
.result-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #8b95a1;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}
.result-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #191f28;
  line-height: 1.1;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.result-value .unit {
  font-size: 0.85rem;
  font-weight: 500;
  margin-left: 2px;
  color: #4e5968;
}
.highlight-blue {
  color: #3182f6;
}
.highlight-green {
  color: #06c755;
}
.highlight-purple {
  color: #6e3eff;
}
.highlight-red {
  color: #f04452;
}
.result-sub {
  font-size: 0.74rem;
  color: #8b95a1;
  line-height: 1.4;
}
.placeholder-dash {
  color: #d1d6db;
  font-weight: 600;
}

/* Average section */
.avg-section {
  margin-top: 4px;
  padding-top: 20px;
  border-top: 1px solid #f0f1f3;
}
.avg-title {
  font-size: 0.86rem;
  font-weight: 700;
  color: #4e5968;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}
.avg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.avg-card {
  background: #f9fafb;
  border: 1px solid #f0f1f3;
  border-radius: 14px;
  padding: 18px 16px;
  text-align: left;
}
.avg-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}
.tag-mandatory {
  background: #e6f9f0;
  color: #06873e;
}
.tag-max {
  background: #efe9ff;
  color: #5b2bd6;
}
.avg-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #191f28;
  line-height: 1.1;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}
.avg-value .unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: #4e5968;
  margin-left: 2px;
}
.avg-sub {
  font-size: 0.74rem;
  color: #8b95a1;
  line-height: 1.4;
}

/* Notice */
.notice {
  padding: 14px 18px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #475569;
  border: 1px solid #e2e8f0;
}
.past-notice {
  margin-bottom: 20px;
}
.warn-notice {
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  font-size: 0.88rem;
  color: #92400e;
  margin-bottom: 20px;
  line-height: 1.5;
}

/* Dark mode (theme-dark class) */
.theme-dark .calculator { color: #c9d1d9; }
.theme-dark .calc-header h1 { color: #f0f6fc; }
.theme-dark .subtitle { color: #8b949e; }
.theme-dark .theme-fab {
  background: #161b22;
  border-color: #21262d;
  color: #f0f6fc;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), 0 2px 4px rgba(0, 0, 0, 0.3);
}
.theme-dark .theme-fab:hover {
  background: #21262d;
  border-color: #30363d;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55), 0 3px 6px rgba(0, 0, 0, 0.35);
}
.theme-dark .label-aside { color: #6e7681; }
.theme-dark .select-group label { color: #8b949e; }
.theme-dark .select-group select {
  background-color: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.theme-dark .join-checkbox {
  color: #c9d1d9;
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .join-checkbox:hover {
  background: #161b22;
  border-color: #30363d;
}
.theme-dark .join-checkbox:has(input:checked) {
  background: #0a2e1c;
  border-color: #2ea44f;
  color: #56d364;
}
.theme-dark .join-inline { border-top-color: #21262d; }
.theme-dark .join-date-label { color: #c9d1d9; }
.theme-dark .join-date-select {
  background-color: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.theme-dark .month-badge { color: #f0f6fc; }
.theme-dark .summary-card.blue {
  background: #0d1f3a;
  border-color: #1f3a68;
}
.theme-dark .summary-card.green {
  background: #0a2e1c;
  border-color: #155f3a;
}
.theme-dark .summary-card.purple {
  background: #1d1638;
  border-color: #3d2c63;
}
.theme-dark .summary-label { color: #c9d1d9; }
.theme-dark .summary-value { color: #f0f6fc; }
.theme-dark .summary-sub { color: #c9d1d9; }
.theme-dark .input-group label { color: #c9d1d9; }
.theme-dark .input-with-unit input {
  background: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
}
.theme-dark .input-with-unit input:focus { background: #0d1117; }
.theme-dark .input-with-unit input.error {
  border-color: #f85149;
  background: #2d0f0f;
}
.theme-dark .input-hint { color: #c9d1d9; }
.theme-dark .input-hint code {
  background: #161b22;
  border-color: #21262d;
  color: #f0f6fc;
}
.theme-dark .input-hint .hint-extra { color: #8b949e; }
.theme-dark .input-error { color: #ff7b72; }
.theme-dark .input-error code {
  background: #2d0f0f;
  border-color: #6e1414;
  color: #ffa198;
}
.theme-dark .empty-banner {
  background: #0d1f3a;
  border-color: #1f3a68;
  color: #79b8ff;
}
.theme-dark .mode-switch {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .mode-switch button { color: #8b949e; }
.theme-dark .mode-switch button.active {
  background: #161b22;
  color: #56d364;
}
.theme-dark .commute-field label { color: #8b949e; }
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
.theme-dark .break-select {
  background-color: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.theme-dark .auto-toggle { color: #c9d1d9; }
.theme-dark .commute-result {
  background: #0a2e1c;
  border-color: #155f3a;
}
.theme-dark .commute-result .result-tag { color: #56d364; }
.theme-dark .commute-result .result-time { color: #f0f6fc; }
.theme-dark .commute-result .result-formula { color: #c9d1d9; }
.theme-dark .commute-result.midnight {
  background: #161335;
  border-color: #3730a3;
}
.theme-dark .midnight-badge { color: #a5b4fc; }
.theme-dark .reflected-summary {
  background: #0d1f3a;
  border-color: #1f3a68;
}
.theme-dark .reflected-label { color: #79b8ff; }
.theme-dark .reflected-value { color: #c9d1ff; }
.theme-dark .reflected-formula { color: #8b949e; }
.theme-dark .result-item {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .result-label { color: #8b949e; }
.theme-dark .result-value { color: #f0f6fc; }
.theme-dark .result-value .unit { color: #c9d1d9; }
.theme-dark .result-sub { color: #8b949e; }
.theme-dark .placeholder-dash { color: #484f58; }
.theme-dark .avg-section { border-top-color: #21262d; }
.theme-dark .avg-title { color: #c9d1d9; }
.theme-dark .avg-card {
  background: #0d1117;
  border-color: #21262d;
}
.theme-dark .avg-value { color: #f0f6fc; }
.theme-dark .avg-sub { color: #8b949e; }
.theme-dark .tag-mandatory {
  background: #0a2e1c;
  color: #56d364;
}
.theme-dark .tag-max {
  background: #1d1638;
  color: #c4b5fd;
}
.theme-dark .highlight-blue { color: #58a6ff; }
.theme-dark .highlight-green { color: #56d364; }
.theme-dark .highlight-purple { color: #d2a8ff; }
.theme-dark .highlight-red { color: #ff7b72; }
.theme-dark .notice {
  background: #0d1117;
  border-color: #21262d;
  color: #8b949e;
}
.theme-dark .warn-notice {
  background: #2d1f06;
  border-color: #4a3a08;
  color: #fbbf24;
}

/* Responsive */
@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .result-grid {
    grid-template-columns: 1fr;
  }
  .input-grid {
    grid-template-columns: 1fr;
  }
  .commute-grid {
    grid-template-columns: 1fr;
  }
  .commute-result .result-formula {
    margin-left: 0;
    flex-basis: 100%;
  }
  .avg-grid {
    grid-template-columns: 1fr;
  }
  .calc-header h1 {
    font-size: 1.5rem;
  }
  .summary-value {
    font-size: 1.8rem;
  }
  .selector-row {
    gap: 12px;
  }
  .month-badge {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
    order: 99;
  }
}
</style>

<script setup>
import { ref, computed, watch, watchEffect } from 'vue'
import { 소정근로일수, 남은근무일수, 남은금요일수, 급여일조회 } from '../utils/workDays'
import { 월공휴일, 공휴일데이터여부 } from '../utils/holidays'
import { 시분파싱 } from '../utils/timeFormat'
import { 테마사용 } from '../composables/useTheme'
import ProgressStatus from './ProgressStatus.vue'
import HolidayList from './HolidayList.vue'
import NextMonthPreview from './NextMonthPreview.vue'
import MonthSettings from './MonthSettings.vue'
import WorkSettings from './WorkSettings.vue'
import WorkResult from './WorkResult.vue'

const { 테마, 토글: 테마토글 } = 테마사용()
const 다크모드 = computed(() => 테마.value === 'dark')

// TODO: 테스트용 금요일 강제 고정 — 배포 전 `const 오늘 = new Date()`로 되돌릴 것
const 오늘 = new Date()
const 현재연도 = 오늘.getFullYear()
const 현재월 = 오늘.getMonth() + 1

const 요일이름 = ['일', '월', '화', '수', '목', '금', '토']
const 오늘요일 = 오늘.getDay()
const 오늘금요일여부 = 오늘요일 === 5
const 오늘표시 = `${현재연도}년 ${현재월}월 ${오늘.getDate()}일 ${요일이름[오늘요일]}요일`
const 재택안내 =
  오늘요일 === 5 ? '오늘은 재택근무' :
  오늘요일 === 4 ? '내일은 재택근무' : ''

// 이번 주(일~토)에 월급날이 포함되는지 확인
const 급여일 = 급여일조회(현재연도, 현재월)
const 주시작 = new Date(현재연도, 오늘.getMonth(), 오늘.getDate() - 오늘요일)
const 주끝 = new Date(주시작)
주끝.setDate(주끝.getDate() + 6)
const 급여주여부 = 급여일 >= 주시작 && 급여일 <= 주끝

const 선택연도 = ref(현재연도)
const 선택월 = ref(현재월)
const 고정연장시간 = ref('10:00')
const 입력근무시간 = ref('')
const 오늘예상시간 = ref('0:00')
const 오늘입력모드 = ref('출퇴근')
const 오늘재택근무 = ref(false)
const 출근시각 = ref('09:00')
const 퇴근시각 = ref('18:00')
const 휴게자동 = ref(true)
const 휴게수동분 = ref(60)

const 입사한달여부 = ref(false)
const 입사일 = ref(오늘.getDate())
const 재택근무여부 = ref(false)
const 재택근무일수 = ref(0)
const 연차여부 = ref(false)
const 연차일수 = ref(0)
const 반차수 = ref(0)
const 반반차수 = ref(0)

const 하루근무분 = 8 * 60

const 입력결과 = computed(() => 시분파싱(입력근무시간.value))
const 고정연장결과 = computed(() => 시분파싱(고정연장시간.value))
const 오늘예상결과 = computed(() => 시분파싱(오늘예상시간.value))
const 입력분 = computed(() => Math.max(0, 입력결과.value.분))
const 고정연장분 = computed(() => Math.max(0, 고정연장결과.value.분))
const 입력유효 = computed(() => 입력결과.value.유효)
const 고정연장유효 = computed(() => 고정연장결과.value.유효)
const 오늘예상유효 = computed(() => 오늘예상결과.value.유효)

// 출퇴근 자동 계산
function 시각을분으로(문자열) {
  const 매칭 = String(문자열 ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!매칭) return null
  const 시 = Number(매칭[1])
  const 분 = Number(매칭[2])
  if (시 < 0 || 시 > 23 || 분 < 0 || 분 > 59) return null
  return 시 * 60 + 분
}
const 출근분 = computed(() => 시각을분으로(출근시각.value))
const 퇴근분 = computed(() => 시각을분으로(퇴근시각.value))
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
  if (체류 > 5 * 60) return 60
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
  // 오늘이 재택근무일이면 누적 근무시간에 이미 반영되므로 오늘 시간은 0으로 계산(중복 방지)
  if (오늘재택근무.value) return 0
  if (오늘입력모드.value === '출퇴근') return 출퇴근근무분.value
  return Math.max(0, 오늘예상결과.value.분)
})
// 재택 토글: 켜면 직접 입력값을 백업하고 0으로 리셋, 끄면 이전 값 복원
const 오늘예상백업 = ref('')
watch(오늘재택근무, (켜짐) => {
  if (켜짐) {
    오늘예상백업.value = 오늘예상시간.value
    오늘예상시간.value = '0:00'
  } else {
    오늘예상시간.value = 오늘예상백업.value || '0:00'
  }
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
  소정근로일수(선택연도.value, 선택월.value, 유효입사일.value),
)
const 의무근로분 = computed(() => 소정근로일.value * 하루근무분)
const 최대근로분 = computed(() => 의무근로분.value + 고정연장분.value)
const 남은근무일 = computed(() =>
  남은근무일수(선택연도.value, 선택월.value, 유효입사일.value),
)
const 경과근무일 = computed(() => 소정근로일.value - 남은근무일.value)

// 재택근무: 남은 금요일 중 신청 일수만큼은 8시간이 자동 인정되므로
// 일평균 목표 계산에서 제외하고 '출근일'만 분모로 사용한다.
const 남은금요일 = computed(() =>
  남은금요일수(선택연도.value, 선택월.value, 유효입사일.value),
)
const 재택일수 = computed(() => {
  if (!재택근무여부.value) return 0
  return Math.max(0, Math.min(남은금요일.value, Number(재택근무일수.value) || 0))
})
// 연차: 연차(8h)·반차(4h)·반반차(2h)는 '현재까지 근무시간'에 이미 포함된 시간이다.
// 따라서 반영분에 다시 더하지 않고(중복 방지), '현재까지 근무시간'을 한도로 둔다.
// 대신 사용한 만큼 환산 일수(연차 1d·반차 0.5d·반반차 0.25d)를 출근 남은일에서 제외한다.
const 연차분요청 = computed(() =>
  (Number(연차일수.value) || 0) * 480 +
  (Number(반차수.value) || 0) * 240 +
  (Number(반반차수.value) || 0) * 120,
)
const 연차예산분 = computed(() => 입력분.value) // 현재까지 근무시간 = 연차 상한
const 연차잔여분 = computed(() => Math.max(0, 연차예산분.value - 연차분요청.value))
const 연차분 = computed(() =>
  연차여부.value ? Math.min(연차분요청.value, 연차예산분.value) : 0,
)
const 연차일수환산 = computed(() => 연차분.value / 480)
const 연차초과여부 = computed(
  () => 연차여부.value && 연차분요청.value > 연차예산분.value,
)
const 출근남은일 = computed(() =>
  Math.max(0, 남은근무일.value - 재택일수.value - 연차일수환산.value),
)

// 재택근무를 처음 켜면 남은 금요일 전체를 기본 선택
watch(재택근무여부, (켜짐) => {
  if (켜짐 && 재택근무일수.value === 0) {
    재택근무일수.value = 남은금요일.value
  }
})
// 월/입사일 변경 등으로 남은 금요일이 줄면 선택값을 자동 보정
watchEffect(() => {
  if (재택근무일수.value > 남은금요일.value) {
    재택근무일수.value = 남은금요일.value
  }
})
// '현재까지 근무시간'이 줄면 연차 합계가 한도를 넘지 않도록 반반차→반차→연차 순으로 보정
watchEffect(() => {
  const 예산 = 연차예산분.value
  let 연 = Number(연차일수.value) || 0
  let 반 = Number(반차수.value) || 0
  let 반반 = Number(반반차수.value) || 0
  let 합 = 연 * 480 + 반 * 240 + 반반 * 120
  while (합 > 예산 && 반반 > 0) { 반반--; 합 -= 120 }
  while (합 > 예산 && 반 > 0) { 반--; 합 -= 240 }
  while (합 > 예산 && 연 > 0) { 연--; 합 -= 480 }
  if (연 !== 연차일수.value) 연차일수.value = 연
  if (반 !== 반차수.value) 반차수.value = 반
  if (반반 !== 반반차수.value) 반반차수.value = 반반
})
const 남은의무분 = computed(() =>
  Math.max(0, 의무근로분.value - 반영분.value),
)
const 남은최대분 = computed(() =>
  Math.max(0, 최대근로분.value - 반영분.value),
)
// 재택·연차일의 8시간은 사용자가 '현재까지 근무시간'에 포함시키므로 반영분에 이미 반영돼 있다.
// 따라서 남은 의무(의무 − 반영)에서 재택·연차 시간을 다시 빼지 않는다(이중 차감 방지).
// 재택·연차는 유연근무가 불가능한 날이므로, 남은 의무를 '출근 가능일' 수로만 분배한다.
const 의무일평균분 = computed(() => {
  if (출근남은일.value === 0) return 0
  return Math.round(남은의무분.value / 출근남은일.value)
})
const 최대일평균분 = computed(() => {
  if (출근남은일.value === 0) return 0
  return Math.round(남은최대분.value / 출근남은일.value)
})
// 근무 마일리지(출근일 기준): 출근 정규시간 − 남은 의무
// 출근 정규시간 = 출근남은일 × 8시간
// = 남은 출근일을 매일 8시간씩 채웠을 때 의무 대비 초과(+)/부족(−) 시간
const 남은정규분 = computed(() => 출근남은일.value * 하루근무분)
const 마일리지분 = computed(
  () => 남은정규분.value - (의무근로분.value - 반영분.value),
)
const 달성률 = computed(() => {
  if (의무근로분.value === 0) return 0
  return Math.min(100, Math.floor((반영분.value / 의무근로분.value) * 100))
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
  월공휴일(선택연도.value, 선택월.value),
)
const 공휴일있음 = computed(() => 공휴일데이터여부(선택연도.value))

// 다음 달
const 다음달 = computed(() => {
  const 월 = 선택월.value === 12 ? 1 : 선택월.value + 1
  const 연도 = 선택월.value === 12 ? 선택연도.value + 1 : 선택연도.value
  return { 연도, 월 }
})
const 다음달표시 = computed(
  () => `${다음달.value.연도}년 ${다음달.value.월}월`,
)
const 다음달근로일 = computed(() =>
  소정근로일수(다음달.value.연도, 다음달.value.월),
)
const 다음달의무분 = computed(
  () => 다음달근로일.value * 하루근무분,
)
const 다음달최대분 = computed(
  () => 다음달의무분.value + 고정연장분.value,
)
const 다음달공휴일 = computed(() =>
  월공휴일(다음달.value.연도, 다음달.value.월),
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
      <div class="today-chip">
        <span class="chip" :class="급여주여부 ? 'chip--pay' : 'chip--date'">
          <span class="chip-ico">{{ 급여주여부 ? '💸' : '📆' }}</span>
          <span class="chip-txt">{{ 오늘표시 }}</span>
        </span>
        <span v-if="재택안내" class="chip chip--wfh">
          <span class="chip-ico">🏠</span>
          <span class="chip-txt">{{ 재택안내 }}</span>
        </span>
      </div>
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

    <!-- 월 선택 + 근무일 요약 -->
    <MonthSettings
      v-model:선택연도="선택연도"
      v-model:선택월="선택월"
      v-model:입사한달여부="입사한달여부"
      v-model:입사일="입사일"
      :연도목록="연도목록"
      :월목록="월목록"
      :선택월표시="선택월표시"
      :이번달여부="이번달여부"
      :지난달여부="지난달여부"
      :일목록="일목록"
      :유효입사일="유효입사일"
      :공휴일있음="공휴일있음"
      :소정근로일="소정근로일"
      :의무근로분="의무근로분"
      :최대근로분="최대근로분"
      :고정연장분="고정연장분"
    />

    <!-- 입력 설정 -->
    <WorkSettings
      v-model:고정연장시간="고정연장시간"
      v-model:입력근무시간="입력근무시간"
      v-model:재택근무여부="재택근무여부"
      v-model:재택근무일수="재택근무일수"
      v-model:연차여부="연차여부"
      v-model:연차일수="연차일수"
      v-model:반차수="반차수"
      v-model:반반차수="반반차수"
      v-model:오늘재택근무="오늘재택근무"
      v-model:오늘입력모드="오늘입력모드"
      v-model:출근시각="출근시각"
      v-model:퇴근시각="퇴근시각"
      v-model:휴게수동분="휴게수동분"
      v-model:휴게자동="휴게자동"
      v-model:오늘예상시간="오늘예상시간"
      :반영분="반영분"
      :입력분="입력분"
      :연차분="연차분"
      :오늘예상분="오늘예상분"
      :남은금요일="남은금요일"
      :재택일수="재택일수"
      :연차예산분="연차예산분"
      :연차잔여분="연차잔여분"
      :연차일수환산="연차일수환산"
      :오늘금요일여부="오늘금요일여부"
      :다크모드="다크모드"
      :고정연장유효="고정연장유효"
      :입력유효="입력유효"
      :오늘예상유효="오늘예상유효"
      :자정넘김여부="자정넘김여부"
      :총체류분="총체류분"
      :휴게분="휴게분"
      :지난달여부="지난달여부"
    />

    <!-- 진행 상황 -->
    <ProgressStatus
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
    <WorkResult
      :지난달여부="지난달여부"
      :반영분="반영분"
      :달성률="달성률"
      :의무달성여부="의무달성여부"
      :의무근로분="의무근로분"
      :의무대비차="의무대비차"
      :최대근로분="최대근로분"
      :최대대비차="최대대비차"
      :남은근무일="남은근무일"
      :재택일수="재택일수"
      :연차일수환산="연차일수환산"
      :출근남은일="출근남은일"
      :남은의무분="남은의무분"
      :입력분="입력분"
      :오늘예상분="오늘예상분"
      :남은최대분="남은최대분"
      :의무일평균분="의무일평균분"
      :최대일평균분="최대일평균분"
      :마일리지분="마일리지분"
      :남은정규분="남은정규분"
    />

    <!-- 공휴일 목록 -->
    <HolidayList :선택월표시="선택월표시" :이달공휴일="이달공휴일" />

    <!-- 다음 달 미리보기 -->
    <NextMonthPreview
      :다음달표시="다음달표시"
      :다음달근로일="다음달근로일"
      :다음달의무분="다음달의무분"
      :다음달최대분="다음달최대분"
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
.today-chip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  animation: chip-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.today-chip .chip:nth-child(2) {
  animation-delay: 0.09s;
}
.chip-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.74rem;
  line-height: 1;
}
.chip-ico,
.chip-txt {
  position: relative;
  z-index: 1;
}
@keyframes chip-in {
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: translateY(0); }
}
.chip--date {
  background: #f4f6f8;
  border-color: #e6e9ee;
  color: #3f4b5b;
}
.chip--date .chip-ico {
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1);
}
.chip--wfh {
  background: #eef4ff;
  border-color: #cfe0ff;
  color: #1d4ed8;
}
.chip--wfh .chip-ico {
  background: #fff;
  box-shadow: 0 1px 2px rgba(29, 78, 216, 0.14);
}
.chip--pay {
  background: linear-gradient(135deg, #fdeaa6 0%, #f6c945 52%, #efb429 100%);
  border-color: #e0a100;
  color: #6a4905;
  box-shadow:
    0 4px 16px rgba(239, 180, 41, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.chip--pay .chip-ico {
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 2px rgba(120, 80, 0, 0.22);
}
.chip--pay::before {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 42%;
  height: 100%;
  z-index: 2;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: skewX(-20deg);
  animation: chip-shine 5s ease-in-out 1.2s infinite;
}
@keyframes chip-shine {
  0% { left: -60%; }
  16% { left: 135%; }
  100% { left: 135%; }
}
@media (prefers-reduced-motion: reduce) {
  .chip { animation: none; }
  .chip--pay::before { animation: none; opacity: 0; }
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

/* Dark mode (theme-dark class) */
.theme-dark .calculator { color: #c9d1d9; }
.theme-dark .calc-header h1 { color: #f0f6fc; }
.theme-dark .subtitle { color: #8b949e; }
.theme-dark .chip--date {
  background: #1a212b;
  border-color: #2b333f;
  color: #c9d1d9;
}
.theme-dark .chip--date .chip-ico {
  background: #0d1117;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}
.theme-dark .chip--wfh {
  background: #122440;
  border-color: #27477e;
  color: #8cc2ff;
}
.theme-dark .chip--wfh .chip-ico {
  background: #0d1117;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}
.theme-dark .chip--pay {
  background: linear-gradient(135deg, #6a4d0a 0%, #9a7615 52%, #c2961c 100%);
  border-color: #d3a525;
  color: #fff2c4;
  box-shadow:
    0 4px 18px rgba(194, 150, 28, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
.theme-dark .chip--pay .chip-ico {
  background: rgba(255, 255, 255, 0.18);
  box-shadow: none;
}
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

/* Responsive */
@media (max-width: 640px) {
  .calc-header h1 {
    font-size: 1.5rem;
  }
}
</style>

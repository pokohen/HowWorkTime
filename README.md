# 근무시간 계산기 (HowWorkTime)

한국 공휴일을 반영해 이번 달 소정근로일과 의무·최대 근로시간을 계산하고,
남은 출근일 동안 하루 평균 얼마나 일해야 하는지 알려주는 개인용 웹앱입니다.

배포: https://pokohen.github.io/HowWorkTime/

## 기능

- 연도·월 선택, 입사일 반영 (그 달 중간 입사 시)
- 소정근로일 = 주말·공휴일 제외 평일. 의무 = 8h × 근로일, 최대 = 의무 + 고정 연장근무
- 현재까지 누적 근무시간 + 오늘 예상 근무시간(출퇴근 시각 / 직접 입력 / 금요일 재택)
- 금요일 재택근무, 연차·반차·반반차를 반영한 남은 출근일과 일평균 목표
- 근무 마일리지 (남은 출근일을 8h씩 채웠을 때 의무 대비 초과/부족)
- 다음 달 미리보기, 급여일 주간 표시, 다크 모드

## 개발

```sh
pnpm install
pnpm dev
pnpm build
pnpm test
```

공휴일 데이터는 공공데이터포털 특일 정보 API에서 가져옵니다.
`DATA_GO_KR_KEY` 환경변수를 설정한 뒤 실행하면 `src/data/holidays.json`이 갱신됩니다.

```sh
DATA_GO_KR_KEY=... pnpm prefetch:holidays
```

GitHub Actions(`.github/workflows/deploy.yml`)가 main 푸시와 매일 새벽 스케줄로
공휴일 데이터를 갱신하고 GitHub Pages에 배포합니다.

## 구조

```
src/
  constants.js            하루근무분, 연차단위, 급여기준일
  utils/
    holidays.js           공휴일 조회
    workDays.js           소정근로일·남은근무일·급여일 계산
    timeFormat.js         "h:mm" 파싱/포맷, 시각 파싱
  composables/            도메인별 상태 (모듈 단위 싱글턴)
    useToday.js           오늘 날짜, 급여주 여부
    useMonth.js           선택 월, 근로일, 공휴일, 다음 달
    useWorkInput.js       고정 연장, 누적 근무시간
    useTodayWork.js       오늘 예상 근무시간 (출퇴근/직접/재택)
    useRemoteWork.js      금요일 재택
    useLeave.js           연차·반차·반반차
    useWorkResult.js      반영분, 달성률, 남은 시간, 일평균, 마일리지
    useTheme.js           다크 모드
  components/
    common/               CardSection, StatCard, ToggleSection, TimeField, ClockField, HolidayItems
    WorkTimeCalculator    레이아웃 루트
    AppHeader, ThemeToggle, MonthSelector, MonthSummary, WorkSettings,
    RemoteWorkSettings, LeaveSettings, TodayWorkInput,
    ProgressStatus, WorkResult, HolidayList, NextMonthPreview
```

테스트는 `tests/`에 있으며 순수 함수인 `utils/`를 대상으로 합니다. 공휴일은 `tests/fixtures/holidays.json`(2026년 스냅샷)에 고정되어 실데이터 갱신과 무관합니다. CI에서 빌드 전에 실행됩니다.

네이밍 규칙: 파일·컴포넌트·composable 이름은 영어, 변수·함수·prop 이름은 한글.

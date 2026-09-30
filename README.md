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

Node 22.9 이상이 필요합니다 (`--env-file-if-exists` 사용). Volta 를 쓰면 자동으로 맞춰집니다.

```sh
pnpm install
pnpm dev
pnpm build
pnpm test
```

공휴일 데이터는 공공데이터포털 특일 정보 API에서 가져옵니다.
`.env.local`에 `DATA_GO_KR_KEY`를 넣거나 환경변수로 주고 실행하면 `src/data/holidays.json`이 갱신됩니다.
API가 실패했거나 기존보다 크게 적게 응답한 연도는 기존 데이터를 유지합니다.

```sh
pnpm prefetch:holidays            # .env.local 을 자동으로 읽음
DATA_GO_KR_KEY=... pnpm prefetch:holidays
```

GitHub Actions(`.github/workflows/deploy.yml`)가 main 푸시 때마다 배포하고, 매일 새벽 스케줄로 공휴일 데이터를 확인해
커밋된 데이터와 달라졌을 때만 다시 배포하고, 달라진 데이터는 `github-actions[bot]`이 저장소에 되커밋합니다
(로컬에서는 `git pull`로 받으세요). 갱신에 실패하면 커밋된 데이터로 배포합니다.

## 구조

```
src/
  constants.js            하루근무분, 연차단위, 급여기준일
  utils/
    holidays.js           공휴일 조회
    workDays.js           소정근로일·남은근무일·급여일 계산
    timeFormat.js         "h:mm" 파싱/포맷, 시각 파싱
  composables/            도메인별 상태 (모듈 단위 싱글턴)
    moduleState.js        effectScope 로 묶은 싱글턴 + HMR 정리
    monthScoped.js        선택 월마다 따로 보관되는 상태 (누적 시간·연차·재택·입사일)
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

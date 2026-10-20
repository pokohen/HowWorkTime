# 근무시간 계산기 (HowWorkTime)

한국 공휴일을 반영해 이번 달 소정근로일과 의무·최대 근로시간을 계산하고,
남은 출근일 동안 하루 평균 얼마나 일해야 하는지 알려주는 개인용 웹앱입니다.

배포: https://pokohen.github.io/HowWorkTime/

## 기능

- 연도·월 선택, 입사일 반영 (그 달 중간 입사 시)
- 소정근로일 = 주말·공휴일 제외 평일. 의무 = 8h × 근로일, 최대 = 의무 + 고정 연장근무
- 현재까지 누적 근무시간 + 오늘 예상 근무시간(출퇴근 시각 / 직접 입력 / 금요일 재택)
- 금요일 재택근무, 연차·반차·반반차를 반영한 남은 출근일과 일평균 목표
- 올해 남은 연차를 적어 두면 쉬는 날 플래너가 그 안에서 제안
- 근무 마일리지 (남은 출근일을 8h씩 채웠을 때 의무 대비 초과/부족)
- 다음 달 미리보기, 급여일 주간 표시, 다크 모드
- 쉬는 날 플래너 (별 버튼): 휴가·주말·여행 계획을 AI와 탭별로 대화. 이번 달 공휴일·연휴·남은 출근일을 알고 답한다

## 쉬는 날 플래너 (AI)

서버 없이 동작하는 정적 사이트라 **API 키는 사용자가 직접 발급받아 앱 안 ⚙ 설정에 넣습니다.**
키와 대화 기록은 그 브라우저의 localStorage 에만 저장되고, 요청은 브라우저에서 제공자 API 로 바로 갑니다.
제공자는 Anthropic(Claude) · OpenAI(GPT) · Google(Gemini) 중 고르고, 모델 ID 는 자유 입력입니다.

- 로컬 개발 중에만 `.env.local` 의 `VITE_*_API_KEY` 를 기본 키로 씁니다 (`import.meta.env.DEV` 분기, 빌드에는 안 들어감).
- **GitHub Secrets 에 AI 키를 넣지 마세요.** 정적 번들에 키가 박혀 사이트 방문자 누구나 꺼내 쓸 수 있습니다.

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

기능별로 나눈다. `shared` 는 어느 기능에도 속하지 않는 공용이고, `worktime`(근무시간 계산기)과 `assistant`(쉬는 날 플래너)는 각자 components·composables·utils 를 가진다. `assistant` 는 `worktime` 의 상태를 읽어 프롬프트에 넣지만 반대 방향 의존은 없다. 두 기능을 한 화면에 올리는 것은 `App.vue` 의 몫이다.

```
src/
  main.js · App.vue · style.css      진입점, 레이아웃 루트, 전역 스타일·테마 토큰
  data/holidays.json                 공휴일 데이터 (CI 가 갱신)
  shared/
    constants.js            하루근무분, 연차단위, 급여기준일, 업무일시작시, 저장 키
    utils/
      storage.js            localStorage 안전 읽기/쓰기 (막힌 환경 보호)
      timeFormat.js         "h:mm" 파싱/포맷, 시각 파싱
      clipboard.js          클립보드 복사 (구형 환경 대체 경로)
    composables/
      moduleState.js        effectScope 로 묶은 싱글턴 + HMR 정리 (쓰는 모듈은 끝에 import.meta.hot.accept 한 줄)
      monthScoped.js        선택 월마다 따로 보관되는 상태
      useTheme.js           다크 모드
    components/             CardSection, StatCard, ToggleSection, CheckBox, TimeField, ClockField, ThemeToggle
  worktime/
    utils/
      holidays.js           공휴일 조회
      workDays.js           소정근로일·남은근무일·급여일 계산
      leaveBalance.js       남은 연차 일·시간 ↔ 분 변환, 저장 형식
    composables/            도메인별 상태 (모듈 단위 싱글턴)
      useToday.js           오늘(업무일, 새벽 6시 기준) 날짜, 급여주 여부
      useMonth.js           선택 월, 근로일, 공휴일, 다음 달
      useWorkInput.js       고정 연장, 누적 근무시간
      useTodayWork.js       오늘 예상 근무시간 (출퇴근/직접/재택)
      useRemoteWork.js      금요일 재택
      useLeave.js           연차·반차·반반차, 연도별 남은 연차(localStorage)
      useWorkResult.js      반영분, 달성률, 남은 시간, 일평균, 마일리지
    components/
      AppHeader, MonthSelector, MonthSummary, WorkSettings, RemoteWorkSettings, LeaveSettings,
      TodayWorkInput, ProgressStatus, WorkResult, HolidayList, HolidayItems, NextMonthPreview
  assistant/
    ai/
      providers.js          제공자 목록 (기본 모델, 키 발급 주소)
      client.js             제공자별 구현을 동적 로드해 대화 요청, 오류 정리
      anthropic.js          Claude (공식 SDK, 브라우저 직접 호출)
      openai.js / gemini.js fetch + SSE 스트리밍
      sse.js / errors.js    SSE 파서, 어시스턴트오류
    utils/
      assistantContext.js   연휴·징검다리 탐지, AI 시스템 프롬프트 (순수 함수)
      assistantStorage.js   대화·설정 직렬화/복원
      miniMarkdown.js       응답용 가벼운 마크다운 → HTML / 공유용 일반 텍스트
    composables/
      useAssistantSettings.js 제공자·모델·API 키
      useAssistant.js       모달·탭·메시지·전송·알림
    components/
      AssistantFab, AssistantToast, AssistantModal(머리·열닫기·스크롤) → AssistantTabs, AssistantEmptyState,
      AssistantMessage(말풍선·복사·재시도), AssistantComposer(입력·전송), AssistantSettings
```

테스트는 `tests/`에 있으며 각 기능의 `utils/`(순수 함수: 근무일·연휴 탐지·저장 직렬화·마크다운 등)와 composable 초기화를 대상으로 합니다. 공휴일은 `tests/fixtures/holidays.json`(2026년 스냅샷)에 고정되어 실데이터 갱신과 무관합니다. CI에서 빌드 전에 실행됩니다.

네이밍 규칙: 파일·컴포넌트·composable 이름은 영어, 변수·함수·prop 이름은 한글.

/** 하루 소정 근로시간(분) */
export const 하루근무분 = 8 * 60

/** 연차 종류별 인정 시간(분) */
export const 연차단위 = { 연차: 480, 반차: 240, 반반차: 120 }

/** 급여 기준일. 주말·공휴일이면 직전 평일로 앞당긴다. */
export const 급여기준일 = 25

export const 요일이름 = ['일', '월', '화', '수', '목', '금', '토']

/** 재택근무 요일 (getDay 기준, 5 = 금요일) */
export const 재택요일 = 5
/** 화면에 쓰는 재택 요일 이름 (예: '금요일') */
export const 재택요일명 = `${요일이름[재택요일]}요일`

/** 업무일이 바뀌는 시각(시). 이 시각 전까지는 전날 업무일로 본다 (새벽 퇴근 대비) */
export const 업무일시작시 = 6

/** 하루에 입력할 수 있는 최대 근무시간(분) */
export const 하루최대분 = 24 * 60

/** 테마 localStorage 키. 값은 vite.config.js 의 define 에서 오며 index.html 의 %THEME_KEY% 에도 같은 값이 들어간다. */
export const 테마저장키 = import.meta.env.THEME_KEY

/** 쉬는 날 플래너(AI 대화) 저장 키. 대화 기록과 제공자 설정(모델·API 키)을 따로 둔다 */
export const 어시스턴트저장키 = 'how-work-time:assistant'
/** 응답을 받는 동안 쥐는 Web Lock 이름의 접두사. `${접두사}${대화id}` */
export const 어시스턴트잠금접두사 = 'how-work-time:assistant-receiving:'
export const 어시스턴트설정키 = 'how-work-time:assistant-settings'
/** 연도별 남은 연차. 해마다 다른 값이라 'YYYY' 키로 보관한다 */
export const 남은연차저장키 = 'how-work-time:remaining-leave'

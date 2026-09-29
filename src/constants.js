/** 하루 소정 근로시간(분) */
export const 하루근무분 = 8 * 60

/** 연차 종류별 인정 시간(분) */
export const 연차단위 = { 연차: 480, 반차: 240, 반반차: 120 }

/** 급여 기준일. 주말·공휴일이면 직전 평일로 앞당긴다. */
export const 급여기준일 = 25

export const 요일이름 = ['일', '월', '화', '수', '목', '금', '토']

/** 테마 localStorage 키. vite.config.js 가 index.html 의 %THEME_KEY% 에도 주입한다. */
export const 테마저장키 = 'how-work-time:theme'

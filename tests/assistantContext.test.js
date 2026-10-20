import { describe, it, expect } from 'vitest'
import { 연휴찾기, 시스템프롬프트 } from '../src/utils/assistantContext'

// 공휴일은 tests/setup.js 가 2026년 픽스처로 고정한다
describe('연휴찾기', () => {
  it('설날처럼 주말과 이어지는 공휴일을 한 구간으로 묶는다', () => {
    const 연휴 = 연휴찾기(2026, 2)
    const 설날 = 연휴.find((구간) => 구간.공휴일.includes('설날'))
    expect(설날).toBeDefined()
    // 2/14(토) 2/15(일) 2/16~18(설날) = 5일
    expect(설날.시작).toBe('2026-02-14')
    expect(설날.끝).toBe('2026-02-18')
    expect(설날.일수).toBe(5)
    expect(설날.징검다리).toEqual([])
  })

  it('연휴 사이에 낀 평일 하루는 징검다리로 표시한다', () => {
    const 연휴 = 연휴찾기(2026, 5)
    // 5/1(금 노동절) 5/2(토) 5/3(일) [5/4 월] 5/5(화 어린이날)
    const 어린이날 = 연휴.find((구간) => 구간.공휴일.includes('어린이날'))
    expect(어린이날).toBeDefined()
    expect(어린이날.시작).toBe('2026-05-01')
    expect(어린이날.끝).toBe('2026-05-05')
    expect(어린이날.징검다리).toEqual(['2026-05-04'])
    expect(어린이날.일수).toBe(5)
  })

  it('달 경계에 걸친 연휴도 양쪽 달에서 보인다', () => {
    // 2/28(토) 3/1(일 삼일절) 3/2(월 대체공휴일)
    const 삼일절2월 = 연휴찾기(2026, 2).find((구간) => 구간.공휴일.includes('삼일절'))
    const 삼일절3월 = 연휴찾기(2026, 3).find((구간) => 구간.공휴일.includes('삼일절'))
    expect(삼일절2월?.시작).toBe('2026-02-28')
    expect(삼일절3월?.끝).toBe('2026-03-02')
    expect(삼일절3월.일수).toBe(3)
  })

  it('평범한 주말(2일)은 연휴로 치지 않는다', () => {
    for (const 구간 of 연휴찾기(2026, 11)) {
      expect(구간.일수).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('시스템프롬프트', () => {
  const 기본 = {
    오늘표시: '2026년 2월 10일 화요일',
    이번달표시: '2026년 2월',
    다음달표시: '2026년 3월',
    이번달공휴일: [{ 날짜: '2026-02-16', 이름: '설날' }],
    다음달공휴일: [],
    연휴: 연휴찾기(2026, 2),
    남은근무일: 10,
    출근남은일: 8,
    연차일수: 1,
    재택안내: '내일은 재택근무',
    급여주여부: false,
  }

  it('앱이 아는 날짜·공휴일·연휴·근무일 정보를 담는다', () => {
    const 글 = 시스템프롬프트(기본)
    expect(글).toContain('2026년 2월 10일 화요일')
    expect(글).toContain('2월 16일(월) 설날')
    expect(글).toContain('2026년 3월 공휴일: 없음')
    expect(글).toContain('남은 근무일 10일')
    expect(글).toContain('출근 예정 8일')
    expect(글).toContain('연차 1일')
    expect(글).toContain('내일은 재택근무')
    expect(글).toMatch(/2월 14일\(토\)~2월 18일\(수\) 5일/)
  })

  it('연휴가 없으면 없음으로, 급여주면 표시한다', () => {
    const 글 = 시스템프롬프트({ ...기본, 연휴: [], 급여주여부: true, 연차일수: 0, 재택안내: '' })
    expect(글).toContain('- 없음')
    expect(글).toContain('(이번 주 급여일)')
    expect(글).not.toContain('이미 지정한 연차')
  })

  it('남은 연차를 적어 두면 알려 주고, 모르면 물어보라는 예시에 남겨 둔다', () => {
    const 모름 = 시스템프롬프트({ ...기본, 남은연차: null })
    expect(모름).not.toContain('올해 남은 연차')
    expect(모름).toContain('남은 연차 총량')
    const 앎 = 시스템프롬프트({ ...기본, 남은연차: '7일 4시간' })
    expect(앎).toContain('올해 남은 연차: 7일 4시간')
    expect(앎).not.toContain('남은 연차 총량')
  })
})

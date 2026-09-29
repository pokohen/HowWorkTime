import { describe, it, expect } from 'vitest'
import { 연도공휴일, 공휴일데이터여부, 월공휴일 } from '../src/utils/holidays'

describe('holidays', () => {
  it('연도별 공휴일 셋', () => {
    const 셋 = 연도공휴일(2026)
    expect(셋.has('2026-01-01')).toBe(true)
    expect(셋.has('2026-09-25')).toBe(true)
  })
  it('데이터가 없는 연도', () => {
    expect(공휴일데이터여부(2026)).toBe(true)
    expect(공휴일데이터여부(1999)).toBe(false)
    expect(연도공휴일(1999).size).toBe(0)
  })
  it('테스트는 실데이터가 아니라 2026년 픽스처를 본다', () => {
    // 실데이터에는 2025년이 있지만 픽스처에는 없다. 이 단언이 깨지면 setup.js 의 mock 이 풀린 것
    expect(공휴일데이터여부(2025)).toBe(false)
  })
  it('월별 공휴일은 날짜순 {날짜, 이름} 항목', () => {
    expect(월공휴일(2026, 9).map((h) => h.날짜)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26'])
    expect(월공휴일(2026, 1)[0]).toEqual({ 날짜: '2026-01-01', 이름: '신정' })
    expect(월공휴일(2026, 4)).toEqual([])
  })
})

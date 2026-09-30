import { describe, it, expect } from 'vitest'
import { 시분파싱, 시분변환, 시각파싱, 시각조립, 요일명, 날짜포맷 } from '../src/utils/timeFormat'

describe('시분파싱', () => {
  it.each([
    ['23:30', 1410],
    ['23', 1380],
    ['230', 150],
    ['2330', 1410],
    ['13730', 8250],
    ['  7:05 ', 425],
  ])('%s → %i분', (입력, 기대) => {
    expect(시분파싱(입력)).toEqual({ 분: 기대, 유효: true, 비어있음: false })
  })

  it('빈 값은 유효하지만 비어있음으로 표시', () => {
    expect(시분파싱('')).toEqual({ 분: 0, 유효: true, 비어있음: true })
    expect(시분파싱(null)).toEqual({ 분: 0, 유효: true, 비어있음: true })
  })

  it.each(['2:60', 'abc', '123456', '12:345', '1:2:3', '-5:00', '-030'])('%s 는 무효', (입력) => {
    expect(시분파싱(입력).유효).toBe(false)
  })
})

describe('시분변환', () => {
  it.each([
    [0, '0:00'],
    [90, '1:30'],
    [8250, '137:30'],
    [-300, '-5:00'],
    [59.6, '1:00'],
  ])('%i분 → %s', (분, 기대) => {
    expect(시분변환(분)).toBe(기대)
  })
  it('숫자가 아니면 0:00', () => {
    expect(시분변환(NaN)).toBe('0:00')
  })
})

describe('시각파싱 / 시각조립', () => {
  it('HH:MM 을 분으로', () => {
    expect(시각파싱('09:05')).toBe(545)
    expect(시각파싱('0:00')).toBe(0)
    expect(시각파싱('23:59')).toBe(1439)
  })
  it('범위를 벗어나거나 형식이 틀리면 null', () => {
    expect(시각파싱('24:00')).toBeNull()
    expect(시각파싱('9:60')).toBeNull()
    expect(시각파싱('900')).toBeNull()
    expect(시각파싱(undefined)).toBeNull()
  })
  it('시각조립은 두 자리로 채운다', () => {
    expect(시각조립(9, 5)).toBe('09:05')
  })
})

describe('요일명 / 날짜포맷', () => {
  it('로컬 날짜 기준 요일', () => {
    expect(요일명('2026-09-28')).toBe('월')
    expect(요일명('2026-10-03')).toBe('토')
  })
  it('M월 D일 포맷', () => {
    expect(날짜포맷('2026-09-05')).toBe('9월 5일')
  })
})

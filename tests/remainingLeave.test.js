// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { 남은연차분만들기, 남은연차분해, 남은연차문장, 남은연차복원, 남은연차직렬화 } from '../src/worktime/utils/leaveBalance'
import { 남은연차저장키 } from '../src/shared/constants'

describe('남은연차분만들기', () => {
  it('일·시간을 분으로 합치고 30분 단위로 다듬는다', () => {
    expect(남은연차분만들기('7', '4')).toBe(7 * 480 + 240)
    expect(남은연차분만들기('12', '')).toBe(12 * 480)
    expect(남은연차분만들기('', '2.5')).toBe(150)
    expect(남은연차분만들기(0, 1.3)).toBe(90)
    expect(남은연차분만들기(' 1,0 ', 0)).toBe(10 * 480)
  })
  it('시간이 8 을 넘으면 일로 올라가고, 범위를 벗어나면 잘라낸다', () => {
    expect(남은연차분해(남은연차분만들기(7, 12))).toEqual({ 일: 8, 시간: 4 })
    expect(남은연차분만들기(-3, -1)).toBe(0)
    expect(남은연차분만들기(9999, 0)).toBe(365 * 480)
  })
  it('둘 다 비었거나 숫자가 아니면 null', () => {
    expect(남은연차분만들기('', '')).toBeNull()
    expect(남은연차분만들기(null, undefined)).toBeNull()
    expect(남은연차분만들기('열둘', 'abc')).toBeNull()
  })
})

describe('남은연차분해 · 남은연차문장', () => {
  it('분을 일·시간으로 나누고 읽기 좋게 쓴다', () => {
    expect(남은연차분해(7 * 480 + 240)).toEqual({ 일: 7, 시간: 4 })
    expect(남은연차분해(null)).toEqual({ 일: null, 시간: null })
    expect(남은연차문장(7 * 480 + 240)).toBe('7일 4시간')
    expect(남은연차문장(12 * 480)).toBe('12일')
    expect(남은연차문장(150)).toBe('2.5시간')
    expect(남은연차문장(0)).toBe('0일')
    expect(남은연차문장(null)).toBe('')
  })
})

describe('남은연차복원 · 직렬화', () => {
  it('{ 분 } 형식을 읽고, 초기 버전의 일수 숫자는 분으로 올려 읽는다', () => {
    expect(남은연차복원('{"2026":{"분":3600},"2025":7.5,"abc":1,"2024":"x","2023":{"분":"bad"}}')).toEqual({ 2026: 3600, 2025: 3600 })
    expect(남은연차복원('not json')).toEqual({})
    expect(남은연차복원('[1,2]')).toEqual({})
    expect(남은연차복원(null)).toEqual({})
  })
  it('직렬화 → 복원이 왕복한다', () => {
    const 표 = { 2026: 3600, 2027: 480 }
    expect(남은연차복원(남은연차직렬화(표))).toEqual(표)
  })
})

describe('useLeave 남은연차분', () => {
  beforeEach(() => localStorage.clear())

  it('선택 연도별로 보관하고 localStorage 에 저장한다', async () => {
    const { useLeave } = await import('../src/worktime/composables/useLeave')
    const { useMonth } = await import('../src/worktime/composables/useMonth')
    const { 남은연차분 } = useLeave()
    const { 선택연도 } = useMonth()
    const 올해 = 선택연도.value

    expect(남은연차분.value).toBeNull()
    남은연차분.value = 남은연차분만들기(7, 4)
    expect(남은연차분.value).toBe(3600)
    expect(JSON.parse(localStorage.getItem(남은연차저장키))).toEqual({ [올해]: { 분: 3600 } })

    선택연도.value = 올해 + 1
    expect(남은연차분.value).toBeNull()
    선택연도.value = 올해
    expect(남은연차분.value).toBe(3600)

    남은연차분.value = null
    expect(남은연차분.value).toBeNull()
    expect(JSON.parse(localStorage.getItem(남은연차저장키))).toEqual({})
  })
})

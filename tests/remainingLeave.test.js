// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { 남은연차정리, 남은연차복원 } from '../src/composables/useLeave'
import { 남은연차저장키 } from '../src/constants'

describe('남은연차정리', () => {
  it('반반차(0.25) 단위로 다듬고 범위를 벗어나면 잘라낸다', () => {
    expect(남은연차정리('12')).toBe(12)
    expect(남은연차정리(7.3)).toBe(7.25)
    expect(남은연차정리('-3')).toBe(0)
    expect(남은연차정리(999)).toBe(365)
  })
  it('비었거나 숫자가 아니면 null', () => {
    expect(남은연차정리('')).toBeNull()
    expect(남은연차정리(null)).toBeNull()
    expect(남은연차정리('열둘')).toBeNull()
  })
})

describe('남은연차복원', () => {
  it('연도 키만 받아들이고 깨진 값은 버린다', () => {
    expect(남은연차복원('{"2026":12,"2025":"3.5","abc":1,"2024":"x"}')).toEqual({ 2026: 12, 2025: 3.5 })
    expect(남은연차복원('not json')).toEqual({})
    expect(남은연차복원('[1,2]')).toEqual({})
    expect(남은연차복원(null)).toEqual({})
  })
})

describe('useLeave 남은연차', () => {
  beforeEach(() => localStorage.clear())

  it('선택 연도별로 보관하고 localStorage 에 저장한다', async () => {
    const { useLeave } = await import('../src/composables/useLeave')
    const { useMonth } = await import('../src/composables/useMonth')
    const { 남은연차 } = useLeave()
    const { 선택연도 } = useMonth()
    const 올해 = 선택연도.value

    expect(남은연차.value).toBeNull()
    남은연차.value = '10'
    expect(남은연차.value).toBe(10)
    expect(JSON.parse(localStorage.getItem(남은연차저장키))).toEqual({ [올해]: 10 })

    선택연도.value = 올해 + 1
    expect(남은연차.value).toBeNull()
    선택연도.value = 올해
    expect(남은연차.value).toBe(10)

    남은연차.value = ''
    expect(남은연차.value).toBeNull()
    expect(JSON.parse(localStorage.getItem(남은연차저장키))).toEqual({})
  })
})

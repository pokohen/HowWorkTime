import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 잠시표시상태 } from '../src/shared/composables/useTimedFlag'

describe('잠시표시상태', () => {
  let 정리 = []
  const 정리등록 = (fn) => 정리.push(fn)
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { 정리.forEach((fn) => fn()); 정리 = []; vi.useRealTimers() })

  it('정한 시간 동안 켜졌다가 꼭 그때 꺼진다 (끌 때 꺼질때를 한 번 부른다)', () => {
    const 꺼질때 = vi.fn()
    const 표시 = 잠시표시상태(정리등록, 12_000, { 꺼질때 })
    표시.켜기()
    vi.advanceTimersByTime(11_999)
    expect(표시.값.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(표시.값.value).toBe(false)
    expect(꺼질때).toHaveBeenCalledTimes(1)
  })

  it('다시 켜면 시간을 새로 세고, 정리하면 타이머를 지운다', () => {
    const 표시 = 잠시표시상태(정리등록, 1_000)
    표시.켜기()
    vi.advanceTimersByTime(800)
    표시.켜기()
    vi.advanceTimersByTime(800)
    expect(표시.값.value).toBe(true)
    정리.forEach((fn) => fn())
    vi.advanceTimersByTime(10_000)
    expect(표시.값.value).toBe(true) // 정리 뒤에는 타이머가 돌지 않는다
  })
})

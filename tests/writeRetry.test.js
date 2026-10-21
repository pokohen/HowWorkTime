// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 쓰기재시도 } from '../src/shared/composables/useWriteRetry'

const 키 = 'how-work-time:시험'
const 이벤트 = (값) => window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage, ...값 }))

describe('쓰기재시도', () => {
  let 정리 = []
  const 정리등록 = (fn) => 정리.push(fn)
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear() })
  afterEach(() => { 정리.forEach((fn) => fn()); 정리 = []; vi.useRealTimers() })

  it('공간이 생기면 바로, 이 키가 늘면 실패 뒤 간격 끝에 한 번 (미룬 것은 공간이 생기면 앞당긴다)', async () => {
    const 다시쓰기 = vi.fn()
    const r = 쓰기재시도(정리등록, { 키, 쓸것있음: () => true, 다시쓰기, 떠날때다시쓰기: false })
    r.실패함()
    r.이키이벤트(new StorageEvent('storage', { key: 키, oldValue: null, newValue: 'x' })) // 늘림: 간격 끝으로 미룸
    await vi.advanceTimersByTimeAsync(1_000)
    expect(다시쓰기).not.toHaveBeenCalled()
    이벤트({ key: '다른', oldValue: 'xx', newValue: null }) // 지움: 앞당겨 바로
    await vi.advanceTimersByTimeAsync(0)
    expect(다시쓰기).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(다시쓰기).toHaveBeenCalledTimes(1) // 미뤘던 것은 앞당겨졌으므로 또 하지 않는다
  })

  it('늦게 닿은 이 키의 줄임 이벤트(지금 저장소 값과 다름)는 공간이 생긴 것으로 믿지 않는다', async () => {
    const 다시쓰기 = vi.fn()
    const r = 쓰기재시도(정리등록, { 키, 쓸것있음: () => true, 다시쓰기, 떠날때다시쓰기: false })
    r.실패함()
    localStorage.setItem(키, 'x'.repeat(100)) // 그 뒤 다시 늘었다
    r.이키이벤트(new StorageEvent('storage', { key: 키, oldValue: 'x'.repeat(50), newValue: 'x' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(다시쓰기).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5_000) // 늘림처럼 간격 뒤에는 한다
    expect(다시쓰기).toHaveBeenCalledTimes(1)
  })

  it('이 키 이벤트는 직접 받지 않고(모듈이 합친 뒤 넘긴다), 다른 키는 늘리기만 하면 하지 않는다', async () => {
    const 다시쓰기 = vi.fn()
    쓰기재시도(정리등록, { 키, 쓸것있음: () => true, 다시쓰기, 떠날때다시쓰기: false })
    이벤트({ key: 키, oldValue: 'xx', newValue: null }) // 이 키: 모듈이 넘겨야 한다
    이벤트({ key: '다른', oldValue: 'x', newValue: 'xx' }) // 다른 키 늘림
    await vi.advanceTimersByTimeAsync(10_000)
    expect(다시쓰기).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { 모듈상태 } from '../src/shared/composables/moduleState'

describe('모듈상태', () => {
  it('정리 하나가 예외를 내도 나머지 정리는 모두 하고, 두 번 정리하지 않는다', () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      let 정리 = null
      const 가짜hot = { dispose: (fn) => { 정리 = fn } }
      const 뒤 = vi.fn()
      모듈상태(가짜hot, (정리등록) => {
        정리등록(() => { throw new Error('저장 실패') })
        정리등록(뒤)
        return {}
      })
      정리()
      정리()
      expect(뒤).toHaveBeenCalledTimes(1)
      expect(오류).toHaveBeenCalledWith('[모듈상태] 정리 중 예외', expect.any(Error))
    } finally {
      오류.mockRestore()
    }
  })
})

// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

// Web Locks 가 없는 환경(happy-dom)에서는 다른 창이 받는 중인지 알 수 없으므로, 저장본의 '받는중' 답은 곧 중단됨이 된다
describe('다른 창이 받는 중인 답 — Web Locks 없음', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('시작할 때 받는중 답은 중단됨이 되어 다시 시도할 수 있다', async () => {
    const 지금 = Date.now()
    localStorage.setItem('how-work-time:assistant', JSON.stringify({
      버전: 1, 활성탭ID: 'x', 삭제기록: {},
      탭목록: [{ id: 'x', 제목: 't', 생성시각: 지금, 수정시각: 지금, 메시지: [
        { id: 'u', 역할: 'user', 내용: 'q', 시각: 지금 },
        { id: 'a', 역할: 'assistant', 내용: '', 시각: 지금, 받는중: true },
      ] }],
    }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    const 마지막 = a.탭목록.value[0].메시지.at(-1)
    expect(마지막.중단됨).toBe(true)
    expect(마지막.다른창받는중).toBeUndefined()
    expect(a.활성탭다른창받는중.value).toBe(false)
  })
})

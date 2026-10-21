// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'

const 저장키 = 'how-work-time:assistant'
const 잠금 = (id) => `how-work-time:assistant-receiving:${id}`

function 받는중저장(수정시각, 마지막 = { id: 'a', 역할: 'assistant', 내용: '', 시각: 수정시각, 받는중: true }) {
  localStorage.setItem(저장키, JSON.stringify({
    버전: 1, 활성탭ID: 'x', 삭제기록: {},
    탭목록: [{ id: 'x', 제목: 't', 생성시각: 수정시각, 수정시각, 메시지: [{ id: 'u', 역할: 'user', 내용: 'q', 시각: 수정시각 }, 마지막] }],
  }))
}

/** 한 창 안에서 쓰는 최소한의 배타적 Web Locks 흉내 */
function 가짜잠금관리자() {
  const 쥔것 = new Set()
  const 줄 = new Map()
  const 넘기기 = (이름) => {
    if (쥔것.has(이름)) return
    const 다음 = 줄.get(이름)?.shift()
    if (!다음) return
    쥔것.add(이름)
    Promise.resolve().then(() => 다음.cb({ name: 이름, mode: 'exclusive' })).then(
      (값) => { 쥔것.delete(이름); 다음.resolve(값); 넘기기(이름) },
      (오류) => { 쥔것.delete(이름); 다음.reject(오류); 넘기기(이름) },
    )
  }
  return {
    request(이름, 옵션, cb) {
      if (typeof 옵션 === 'function') { cb = 옵션; 옵션 = {} }
      if (옵션.ifAvailable && (쥔것.has(이름) || 줄.get(이름)?.length)) {
        return Promise.resolve().then(() => cb(null))
      }
      return new Promise((resolve, reject) => {
        const 항목 = { cb, resolve, reject }
        if (!줄.has(이름)) 줄.set(이름, [])
        줄.get(이름).push(항목)
        옵션.signal?.addEventListener('abort', () => {
          const 목록 = 줄.get(이름)
          const i = 목록.indexOf(항목)
          if (i !== -1) { 목록.splice(i, 1); reject(Object.assign(new Error('aborted'), { name: 'AbortError' })) }
        })
        넘기기(이름)
      })
    },
  }
}

describe('다른 창이 받는 중인 답', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('Web Locks 가 없으면 마지막 변경 뒤 2분까지는 받는 중, 그 뒤엔 중단됨', async () => {
    받는중저장(Date.now())
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    expect(a.탭목록.value[0].메시지.at(-1).다른창받는중).toBe(true)
    expect(a.활성탭다른창받는중.value).toBe(true)
    await vi.advanceTimersByTimeAsync(2 * 60_000 + 2_000)
    const 마지막 = a.탭목록.value[0].메시지.at(-1)
    expect(마지막.중단됨).toBe(true)
    expect(a.활성탭다른창받는중.value).toBe(false)
  })

  it('잠금이 풀리면 받던 창의 완성본을 반영한다 (중단됨으로 만들지 않는다)', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    let 놓기
    잠금들.request(잠금('x'), () => new Promise((r) => { 놓기 = r }))
    await Promise.resolve()
    받는중저장(Date.now())
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    expect(a.탭목록.value[0].메시지.at(-1).다른창받는중).toBe(true)
    // 받던 창: 최종 저장 뒤 잠금을 놓는다
    받는중저장(Date.now() + 10, { id: 'a', 역할: 'assistant', 내용: '완성된 답', 시각: Date.now() })
    놓기()
    await vi.advanceTimersByTimeAsync(3_500)
    const 마지막 = a.탭목록.value[0].메시지.at(-1)
    expect(마지막.내용).toBe('완성된 답')
    expect(마지막.중단됨).toBeUndefined()
  })

  it('최종 저장 없이 잠금이 풀리면(창이 죽음) 잠깐 기다린 뒤 중단됨, 수정시각은 그대로', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    let 놓기
    잠금들.request(잠금('x'), () => new Promise((r) => { 놓기 = r }))
    await Promise.resolve()
    const 시각 = Date.now()
    받는중저장(시각)
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    놓기()
    await vi.advanceTimersByTimeAsync(500)
    expect(a.탭목록.value[0].메시지.at(-1).다른창받는중).toBe(true) // 저장 도착을 기다리는 중
    await vi.advanceTimersByTimeAsync(3_000)
    expect(a.탭목록.value[0].메시지.at(-1).중단됨).toBe(true)
    expect(a.탭목록.value[0].수정시각).toBe(시각) // 늦게 온 완성본이 이길 수 있게
  })

  it('다른 창이 잠금을 쥔 대화에는 보내지 않고, 대화도 바꾸지 않는다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    let 놓기
    잠금들.request(잠금('x'), () => new Promise((r) => { 놓기 = r }))
    await Promise.resolve()
    const 시각 = Date.now()
    // 이 창이 저장본을 읽을 때는 아직 다른 창의 '받는 중' 저장이 닿지 않았다
    localStorage.setItem(저장키, JSON.stringify({
      버전: 1, 활성탭ID: 'x', 삭제기록: {},
      탭목록: [{ id: 'x', 제목: 't', 생성시각: 시각, 수정시각: 시각, 메시지: [] }],
    }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    const 보냄 = a.전송('안녕')
    await vi.advanceTimersByTimeAsync(1_500) // 받는 중이라는 저장이 없어 잠깐 기다려 본 뒤 포기한다
    expect(await 보냄).toBe(false)
    expect(a.탭목록.value[0].메시지).toHaveLength(0)
    expect(a.전송중.value).toBe(false)
    놓기()
  })

  it('잠금이 없으면 받는 창이 주기적으로 수정시각을 갱신해 저장한다', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: undefined, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({
      대화요청: ({ 신호 }) => new Promise((_, 실패) => {
        신호.addEventListener('abort', () => 실패(Object.assign(new Error('aborted'), { name: 'AbortError' })))
      }),
    }))
    localStorage.setItem('how-work-time:assistant-settings', JSON.stringify({ 제공자: 'anthropic', 키: { anthropic: 'test-key' } }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 끝 = a.전송('긴 질문')
    await vi.advanceTimersByTimeAsync(0)
    const 처음 = JSON.parse(localStorage.getItem(저장키)).탭목록[0].수정시각
    await vi.advanceTimersByTimeAsync(31_000)
    const 나중 = JSON.parse(localStorage.getItem(저장키)).탭목록[0].수정시각
    expect(나중).toBeGreaterThan(처음)
    a.중단()
    await 끝
    vi.doUnmock('../src/assistant/ai/client')
  })

  it('잠금이 비어 있으면 보내고, 받는 동안은 다른 요청이 잠금을 바로 얻지 못한다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({
      대화요청: ({ 신호 }) => new Promise((_, 실패) => {
        신호.addEventListener('abort', () => 실패(Object.assign(new Error('aborted'), { name: 'AbortError' })))
      }),
    }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 탭ID = a.활성탭.value.id
    const 끝 = a.전송('질문')
    await vi.advanceTimersByTimeAsync(0)
    expect(a.활성탭응답중.value).toBe(true)
    expect(a.활성탭.value.메시지.map((m) => m.역할)).toEqual(['user', 'assistant'])
    const 남이얻음 = await 잠금들.request(잠금(탭ID), { ifAvailable: true }, (l) => Boolean(l))
    expect(남이얻음).toBe(false)
    a.중단()
    expect(await 끝).toBe(true)
    expect(a.전송중.value).toBe(false)
    expect(await 잠금들.request(잠금(탭ID), { ifAvailable: true }, (l) => Boolean(l))).toBe(true) // 끝나면 놓는다
    vi.doUnmock('../src/assistant/ai/client')
  })

  it('다른 창의 지켜보기가 잠깐 쥔 잠금은 잠깐 기다렸다 얻는다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({ 대화요청: async ({ 조각 }) => { 조각('답'); return {} } }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    let 놓기
    잠금들.request(잠금(a.활성탭.value.id), () => new Promise((r) => { 놓기 = r }))
    await Promise.resolve()
    const 끝 = a.전송('질문')
    await vi.advanceTimersByTimeAsync(100)
    놓기()
    await vi.advanceTimersByTimeAsync(100)
    expect(await 끝).toBe(true)
    expect(a.활성탭.value.메시지.at(-1).내용).toBe('답')
    vi.doUnmock('../src/assistant/ai/client')
  })

  it('잠금 없이 받는 중이라는 표시는 저장본을 거쳐 남고, 잠금을 쓰는 창도 수정시각으로 판단한다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    const 시각 = Date.now()
    받는중저장(시각, { id: 'a', 역할: 'assistant', 내용: '', 시각, 받는중: true, 잠금없이: true })
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    await vi.advanceTimersByTimeAsync(10_000) // 잠금은 비어 있지만 중단됨으로 만들지 않는다
    expect(a.탭목록.value[0].메시지.at(-1).다른창받는중).toBe(true)
    expect(a.탭목록.value[0].메시지.at(-1).잠금없이).toBe(true)
    await vi.advanceTimersByTimeAsync(2 * 60_000)
    expect(a.탭목록.value[0].메시지.at(-1).중단됨).toBe(true)
  })
})

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

  it('잠금으로 지켜보던 중 잠금없이 표시가 늦게 닿으면 수정시각으로 판단을 바꾼다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    받는중저장(Date.now())
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    // 받는 창의 다음 저장에서야 표시가 닿는다 (저장 도착을 기다리는 사이)
    받는중저장(Date.now() + 5, { id: 'a', 역할: 'assistant', 내용: '중간', 시각: Date.now(), 받는중: true, 잠금없이: true })
    await vi.advanceTimersByTimeAsync(4_000)
    const 마지막 = a.탭목록.value[0].메시지.at(-1)
    expect(마지막.중단됨).toBeUndefined()
    expect(마지막.다른창받는중).toBe(true)
  })

  it('잠금을 기다려 얻으면 저장본을 다시 읽고 그 위에 이어 쓴다 (다른 창의 질문·답을 지우지 않는다)', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({ 대화요청: async ({ 조각 }) => { 조각('내 답'); return {} } }))
    const 시각 = Date.now()
    localStorage.setItem(저장키, JSON.stringify({
      버전: 1, 활성탭ID: 'x', 삭제기록: {},
      탭목록: [{ id: 'x', 제목: 't', 생성시각: 시각, 수정시각: 시각, 메시지: [] }],
    }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    let 놓기
    잠금들.request(잠금('x'), () => new Promise((r) => { 놓기 = r }))
    await Promise.resolve()
    const 끝 = a.전송('내 질문')
    await vi.advanceTimersByTimeAsync(100)
    // 다른 창: 이 창에 '받는 중' 저장이 닿기 전에 짧은 답을 끝내고 저장한 뒤 놓는다
    받는중저장(시각 + 50, { id: 'b', 역할: 'assistant', 내용: '남의 답', 시각: 시각 + 50 })
    놓기()
    expect(await 끝).toBe(true)
    expect(a.활성탭.value.메시지.map((m) => m.내용)).toEqual(['q', '남의 답', '내 질문', '내 답'])
    vi.doUnmock('../src/assistant/ai/client')
  })

  it('예전 생존 신호 키는 오래된 것만 지운다 (옛 판 창이 아직 쓰는 신호는 남긴다)', async () => {
    localStorage.setItem('how-work-time:assistant-live:old', String(Date.now() - 10 * 60_000))
    localStorage.setItem('how-work-time:assistant-live:fresh', String(Date.now()))
    localStorage.setItem('how-work-time:assistant-live', JSON.stringify({ y: Date.now() - 10 * 60_000 }))
    await import('../src/assistant/composables/useAssistant').then((m) => m.useAssistant())
    expect(localStorage.getItem('how-work-time:assistant-live:old')).toBeNull()
    expect(localStorage.getItem('how-work-time:assistant-live')).toBeNull()
    expect(localStorage.getItem('how-work-time:assistant-live:fresh')).not.toBeNull()
  })

  it('예전 판 창이 살아 있는 신호를 남긴 대화는 잠금이 비어도 중단됨으로 만들지 않는다', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: 가짜잠금관리자(), onLine: true })
    받는중저장(Date.now() - 10 * 60_000)
    localStorage.setItem('how-work-time:assistant-live:x', String(Date.now()))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(a.탭목록.value[0].메시지.at(-1).다른창받는중).toBe(true)
    localStorage.removeItem('how-work-time:assistant-live:x') // 예전 판 창이 끝나 신호를 지웠다
    await vi.advanceTimersByTimeAsync(20_000)
    expect(a.탭목록.value[0].메시지.at(-1).중단됨).toBe(true)
  })

  it('예전 판 신호가 끝나면 잠금으로 다시 확인한다 (새 판 창이 잠금을 쥐고 받는 중이면 중단됨으로 만들지 않는다)', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    let 놓기
    잠금들.request(잠금('x'), () => new Promise((r) => { 놓기 = r }))
    await Promise.resolve()
    받는중저장(Date.now())
    localStorage.setItem('how-work-time:assistant-live', JSON.stringify({ x: Date.now() })) // 가장 옛 판의 한 키 형식 (15초 유효)
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    localStorage.removeItem('how-work-time:assistant-live')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(a.탭목록.value[0].메시지.at(-1).다른창받는중).toBe(true) // 잠금이 쥐여 있다
    놓기()
    await vi.advanceTimersByTimeAsync(4_000)
    expect(a.탭목록.value[0].메시지.at(-1).중단됨).toBe(true)
  })

  it('미래 시각의 예전 신호는 죽은 것으로 보고 지운다', async () => {
    localStorage.setItem('how-work-time:assistant-live:f', String(Date.now() + 60 * 60_000))
    await import('../src/assistant/composables/useAssistant').then((m) => m.useAssistant())
    expect(localStorage.getItem('how-work-time:assistant-live:f')).toBeNull()
  })

  it('한 키 형식의 예전 신호는 15초가 지나면 죽은 것으로 본다', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: 가짜잠금관리자(), onLine: true })
    받는중저장(Date.now())
    localStorage.setItem('how-work-time:assistant-live', JSON.stringify({ x: Date.now() - 20_000 }))
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    await nextTick()
    await vi.advanceTimersByTimeAsync(4_000)
    expect(a.탭목록.value[0].메시지.at(-1).중단됨).toBe(true)
    expect(localStorage.getItem('how-work-time:assistant-live')).toBeNull()
  })

  it('합칠 수 없는 저장본 위에는 바로 쓰지 않고(따로 알림), 거듭 실패하면 덮어쓰며, 보내기는 잠금을 놓친 채 끝나지 않는다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({ 대화요청: async ({ 조각 }) => { 조각('답'); return {} } }))
    const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
    vi.doMock('../src/assistant/utils/assistantStorage', () => ({
      ...저장모듈,
      대화합치기: () => { throw new Error('합치기 실패') },
    }))
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      받는중저장(Date.now() + 1, { id: 'z', 역할: 'assistant', 내용: '남의 것', 시각: Date.now() })
      const 남의저장본 = localStorage.getItem(저장키)
      const 탭ID = a.활성탭.value.id
      expect(await a.전송('질문')).toBe(true)
      expect(a.활성탭.value.메시지.at(-1).내용).toBe('답')
      expect(localStorage.getItem(저장키)).toBe(남의저장본) // 다른 창의 저장을 바로 덮지 않았다
      expect(a.합치기실패.value).toBe(true)
      await vi.advanceTimersByTimeAsync(20_000) // 같은 저장본으로 거듭 실패하면 이 창의 상태를 쓴다
      expect(JSON.parse(localStorage.getItem(저장키)).탭목록.some((t) => t.id === 탭ID)).toBe(true)
      expect(a.합치기실패.value).toBe(false)
      expect(await 잠금들.request(잠금(탭ID), { ifAvailable: true }, (l) => Boolean(l))).toBe(true) // 쓴 뒤 잠금을 놓았다
    } finally {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
      vi.doUnmock('../src/assistant/ai/client')
    }
  })

  it('합치기로 저장을 미루다 저장본이 사라지면 경고를 거두고, 떠날 때는 미루지 않고 쓴다', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: 가짜잠금관리자(), onLine: true })
    const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
    vi.doMock('../src/assistant/utils/assistantStorage', () => ({
      ...저장모듈,
      대화합치기: () => { throw new Error('합치기 실패') },
    }))
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      받는중저장(Date.now() + 1, { id: 'z', 역할: 'assistant', 내용: '남의 것', 시각: Date.now() })
      a.탭삭제(a.활성탭.value.id) // 저장을 부르는 변경
      await vi.advanceTimersByTimeAsync(1_000)
      expect(a.합치기실패.value).toBe(true)
      localStorage.removeItem(저장키) // 다른 창의 저장본이 사라졌다
      await vi.advanceTimersByTimeAsync(6_000)
      expect(a.합치기실패.value).toBe(false)
      expect(localStorage.getItem(저장키)).not.toBeNull()
      // 다시 합칠 수 없는 저장본: 떠날 때(pagehide)는 미루지 않고 쓴다
      받는중저장(Date.now() + 2, { id: 'y', 역할: 'assistant', 내용: '또 남의 것', 시각: Date.now() })
      const 남의저장본 = localStorage.getItem(저장키)
      a.탭삭제(a.활성탭.value.id)
      window.dispatchEvent(new Event('pagehide'))
      expect(localStorage.getItem(저장키)).not.toBe(남의저장본)
    } finally {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
    }
  })

  it('미루던 중 다른 창의 저장을 합치면 경고와 미룸 시각을 지운다 (다음 실패는 처음부터 센다)', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: 가짜잠금관리자(), onLine: true })
    const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
    let 실패 = true
    vi.doMock('../src/assistant/utils/assistantStorage', () => ({
      ...저장모듈,
      대화합치기: (...인자) => { if (실패) throw new Error('합치기 실패'); return 저장모듈.대화합치기(...인자) },
    }))
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    const 저장이벤트 = (값) => window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 값 }))
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      받는중저장(Date.now() + 1, { id: 'z', 역할: 'assistant', 내용: '남의 것', 시각: Date.now() })
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(14_000)
      expect(a.합치기실패.value).toBe(true)
      실패 = false
      받는중저장(Date.now() + 2, { id: 'w', 역할: 'assistant', 내용: '합칠 수 있는 것', 시각: Date.now() })
      저장이벤트(localStorage.getItem(저장키))
      expect(a.합치기실패.value).toBe(false)
      // 곧바로 새 실패: 미룸 시각을 처음부터 세므로 바로 덮어쓰지 않는다
      실패 = true
      받는중저장(Date.now() + 3, { id: 'v', 역할: 'assistant', 내용: '또 실패', 시각: Date.now() })
      const 남의저장본 = localStorage.getItem(저장키)
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(6_000)
      expect(localStorage.getItem(저장키)).toBe(남의저장본)
      expect(a.합치기실패.value).toBe(true)
    } finally {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
    }
  })

  it('끝난 답의 저장이 미뤄지면 실제로 쓸 때까지 잠금을 쥔다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({ 대화요청: async ({ 조각 }) => { 조각('답'); return {} } }))
    const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
    vi.doMock('../src/assistant/utils/assistantStorage', () => ({
      ...저장모듈,
      대화합치기: () => { throw new Error('합치기 실패') },
    }))
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      받는중저장(Date.now() + 1, { id: 'z', 역할: 'assistant', 내용: '남의 것', 시각: Date.now() })
      const 탭ID = a.활성탭.value.id
      expect(await a.전송('질문')).toBe(true)
      const 비었나 = () => 잠금들.request(잠금(탭ID), { ifAvailable: true }, (l) => Boolean(l))
      expect(await 비었나()).toBe(false) // 아직 쓰지 못해 쥐고 있다
      await vi.advanceTimersByTimeAsync(20_000) // 한도가 지나 덮어쓰면 놓는다
      expect(await 비었나()).toBe(true)
    } finally {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
      vi.doUnmock('../src/assistant/ai/client')
    }
  })
})

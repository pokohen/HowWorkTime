// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { 다른창저장감시 } from '../src/shared/utils/storage'
import { 모듈상태모두정리 } from '../src/shared/composables/moduleState'

const 저장키 = 'how-work-time:assistant'
const 잠금 = (id) => `how-work-time:assistant-receiving:${id}`

function 받는중저장(수정시각, 마지막 = { id: 'a', 역할: 'assistant', 내용: '', 시각: 수정시각, 받는중: true }) {
  localStorage.setItem(저장키, JSON.stringify({
    버전: 1, 활성탭ID: 'x', 삭제기록: {},
    탭목록: [{ id: 'x', 제목: 't', 생성시각: 수정시각, 수정시각, 메시지: [{ id: 'u', 역할: 'user', 내용: 'q', 시각: 수정시각 }, 마지막] }],
  }))
}

/**
 * 대화합치기를 감싸 실패를 켜고 끌 수 있게 한다 (콘솔 오류는 숨긴다). 모듈을 불러오기 전에 부르고, 끝나면 정리()
 * @returns {Promise<{ 실패: boolean, 시도: number, 오류: import('vitest').MockInstance, 정리: () => void }>}
 */
async function 합치기실패모킹() {
  const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
  const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
  const 상태 = {
    실패: false,
    시도: 0,
    오류, // 숨긴 console.error (기록을 확인할 때)
    정리() {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
    },
  }
  vi.doMock('../src/assistant/utils/assistantStorage', () => ({
    ...저장모듈,
    대화합치기: (...인자) => {
      상태.시도++
      if (상태.실패) throw new Error('합치기 실패')
      return 저장모듈.대화합치기(...인자)
    },
  }))
  return 상태
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
    모듈상태모두정리() // 앞 테스트의 useAssistant 가 남긴 storage 리스너·타이머를 걷어 낸다
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

  it('합칠 수 없는 저장본은 기록하고 이 창의 상태를 쓰며, 보내기는 잠금을 놓친 채 끝나지 않는다', async () => {
    const 잠금들 = 가짜잠금관리자()
    vi.stubGlobal('navigator', { ...navigator, locks: 잠금들, onLine: true })
    vi.doMock('../src/assistant/ai/client', () => ({ 대화요청: async ({ 조각 }) => { 조각('답'); return {} } }))
    const 합치기 = await 합치기실패모킹()
    합치기.실패 = true
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      받는중저장(Date.now() + 1, { id: 'z', 역할: 'assistant', 내용: '남의 것', 시각: Date.now() })
      const 탭ID = a.활성탭.value.id
      expect(await a.전송('질문')).toBe(true)
      expect(a.활성탭.value.메시지.at(-1).내용).toBe('답')
      expect(await 잠금들.request(잠금(탭ID), { ifAvailable: true }, (l) => Boolean(l))).toBe(true) // 잠금을 놓았다
      expect(JSON.parse(localStorage.getItem(저장키)).탭목록.some((t) => t.id === 탭ID)).toBe(true) // 저장했다
      expect(합치기.오류).toHaveBeenCalledWith('[플래너] 다른 창의 저장본을 합치지 못함', expect.any(Error)) // 실패는 기록·안내한다
      expect(a.전체합치기실패.value).toBe(true)
    } finally {
      합치기.정리()
      vi.doUnmock('../src/assistant/ai/client')
    }
  })

  it('창을 떠날(pagehide) 때 예약된 저장을 바로 쓴다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 지운ID = a.활성탭.value.id
    a.탭삭제(지운ID) // 저장을 예약하는 변경 (아직 쓰지 않았다)
    localStorage.clear()
    window.dispatchEvent(new Event('pagehide'))
    const 저장본 = JSON.parse(localStorage.getItem(저장키))
    expect(저장본.탭목록.map((t) => t.id)).toContain(a.활성탭.value.id) // 이 창의 상태를 썼다
    expect(저장본.삭제기록[지운ID]).toBeGreaterThan(0)
  })

  it('일부 대화만 합치지 못하면 나머지는 합치고, 그런 합치기마다 잠시 안내하며(깨끗한 합치기로 일찍 거두지 않음), 기록은 새 실패만', async () => {
    const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
    let 실패대화 = ['x']
    vi.doMock('../src/assistant/utils/assistantStorage', () => ({
      ...저장모듈,
      대화합치기: (...인자) => ({ ...저장모듈.대화합치기(...인자), 합치지못함: 실패대화.map((id) => ({ id, 예외: new Error('메시지 모양'), 서명: 서명값 })) }),
    }))
    let 서명값 = '1'
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    const 기록수 = () => 오류.mock.calls.filter((c) => String(c[0]).includes('메시지를 합치지 못해')).length
    const 남의저장 = (n) => {
      const 시각 = Date.now() + n
      localStorage.setItem(저장키, JSON.stringify({
        버전: 1, 활성탭ID: 'x', 삭제기록: {},
        탭목록: [
          { id: 'x', 제목: 'x', 생성시각: 1, 수정시각: 시각, 메시지: [{ id: `qx${n}`, 역할: 'user', 내용: 'q', 시각 }] },
          { id: `y${n}`, 제목: 'y', 생성시각: 2, 수정시각: 시각, 메시지: [{ id: `qy${n}`, 역할: 'user', 내용: 'q', 시각 }] },
        ],
      }))
    }
    const 저장이벤트 = (n) => {
      남의저장(n)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: localStorage.getItem(저장키) }))
    }
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      저장이벤트(1)
      expect(a.일부합치기실패.value).toBe(true)
      expect(a.탭목록.value.some((t) => t.id === 'y1')).toBe(true) // 다른 대화는 합쳤다
      실패대화 = []
      저장이벤트(2) // 깨끗한 합치기: 이미 일어난 손실이므로 안내를 일찍 거두지 않는다
      expect(a.일부합치기실패.value).toBe(true)
      await vi.advanceTimersByTimeAsync(13_000)
      expect(a.일부합치기실패.value).toBe(false)
      실패대화 = ['x']
      저장이벤트(3) // 회복 뒤 또 실패: 다시 기록·안내
      expect(기록수()).toBe(2)
      await vi.advanceTimersByTimeAsync(13_000)
      저장이벤트(4) // 같은 대화·같은 서명(새로 잃은 것 없음): 다시 알리지 않는다
      expect(a.일부합치기실패.value).toBe(false)
      서명값 = '2'
      저장이벤트(5) // 같은 대화라도 어느 쪽이 바뀌었다(서명이 다름): 다시 알린다, 기록은 되풀이하지 않는다
      expect(a.일부합치기실패.value).toBe(true)
      expect(기록수()).toBe(2)
      실패대화 = ['없는대화'] // 목록에 없는 대화의 실패는 알리지 않는다
      await vi.advanceTimersByTimeAsync(13_000)
      저장이벤트(6)
      expect(a.일부합치기실패.value).toBe(false)
      실패대화 = ['x']
      남의저장(7) // 이벤트 없이 저장소만 바뀜: 이 창의 저장이 합치다 찾은 실패도 알린다
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(a.일부합치기실패.value).toBe(true)
    } finally {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
    }
  })

  it('깨진 값·비어 있는 저장본은 합칠 것이 없는 것으로 건너뛴다 (기록만, 안내 없음)', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    const 이벤트 = (값) => {
      localStorage.setItem(저장키, 값) // 다른 창이 쓴 값 (감시는 지금 저장소 값을 읽는다)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 값 }))
    }
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      이벤트('{"이상한":1}')
      이벤트('{"버전":1,"탭목록":[]}')
      expect(a.전체합치기실패.value).toBe(false)
      expect(오류).toHaveBeenCalledWith('[플래너] 복원할 수 없는 값은 건너뜀')
    } finally {
      오류.mockRestore()
    }
  })

  it('새 형식의 저장본은 합치지도 덮지도 않고 안내하며, 사용자가 고르면 이 창의 대화로 덮어쓴다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 새판 = '{"버전":2,"대화들":[]}'
    localStorage.setItem(저장키, 새판)
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 새판 }))
    expect(a.새판감지.value).toBe(true)
    expect(a.전체합치기실패.value).toBe(false)
    a.탭삭제(a.활성탭.value.id) // 저장을 부르는 변경
    await vi.advanceTimersByTimeAsync(1_000)
    expect(localStorage.getItem(저장키)).toBe(새판) // 덮지 않았다
    // 확인한 뒤 저장본이 다른 새 형식 값으로 바뀌었으면(이벤트가 아직 안 닿음) 덮지 않는다
    a.덮어쓰기확인시작()
    expect(a.덮어쓰기확인중.value).toBe(true)
    localStorage.setItem(저장키, '{"버전":3}')
    a.이창으로덮어쓰기()
    expect(a.저장본바뀜.value).toBe(true)
    expect(localStorage.getItem(저장키)).toBe('{"버전":3}')
    a.덮어쓰기확인시작() // 다시 확인하면(이번엔 바뀐 값) 덮는다
    a.이창으로덮어쓰기()
    expect(a.새판감지.value).toBe(false)
    expect(JSON.parse(localStorage.getItem(저장키)).버전).toBe(1)
  })

  it('확인한 뒤 저장본이 읽을 수 있는 값으로 바뀌었으면 덮지 않고 합친 뒤 쓴다 (다른 창의 대화를 잃지 않는다)', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    localStorage.setItem(저장키, '{"버전":2}')
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: '{"버전":2}' }))
    a.덮어쓰기확인시작()
    받는중저장(Date.now(), { id: 'n', 역할: 'assistant', 내용: '남의 답', 시각: Date.now() }) // 이벤트는 아직 안 닿음
    a.이창으로덮어쓰기()
    expect(a.새판감지.value).toBe(false)
    expect(JSON.parse(localStorage.getItem(저장키)).탭목록.some((t) => t.id === 'x')).toBe(true) // 남의 대화를 합쳐 지켰다
  })

  it('확인한 덮어쓰기의 쓰기가 실패하면 막기를 되돌려 나중 저장이 묻지 않고 덮지 않는다', async () => {
    localStorage.setItem(저장키, '{"버전":2}')
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    a.덮어쓰기확인시작()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    try {
      a.이창으로덮어쓰기()
    } finally {
      쓰기.mockRestore()
    }
    expect(a.저장실패.value).toBe(true)
    expect(a.새판감지.value).toBe(true)
    expect(a.덮어쓰기실패.value).toBe('공간')
    a.탭삭제(a.활성탭.value.id) // 공간이 생긴 뒤의 보통 저장
    await vi.advanceTimersByTimeAsync(1_000)
    expect(localStorage.getItem(저장키)).toBe('{"버전":2}')
  })

  it('막혀 있던 동안의 변경은 막기가 풀리면 저장된다 (풀림이 저장을 예약)', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    localStorage.setItem(저장키, '{"버전":2}')
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: '{"버전":2}' }))
    const 지운ID = a.활성탭.value.id
    a.탭삭제(지운ID) // 막혀 있어 저장되지 않는다
    await vi.advanceTimersByTimeAsync(1_000)
    expect(localStorage.getItem(저장키)).toBe('{"버전":2}')
    localStorage.removeItem(저장키) // 다른 창이 지움 → 막기가 풀린다
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: null }))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
  })

  it('덮어쓰기 저장 중 예외가 나도 막기를 되돌리고 덮어쓰기 실패로 알린다', async () => {
    localStorage.setItem(저장키, '{"버전":2}')
    const 저장모듈 = await import('../src/assistant/utils/assistantStorage')
    vi.doMock('../src/assistant/utils/assistantStorage', () => ({
      ...저장모듈,
      직렬화: () => { throw new Error('직렬화 실패') },
    }))
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      a.덮어쓰기확인시작()
      a.이창으로덮어쓰기()
      expect(a.새판감지.value).toBe(true)
      expect(a.덮어쓰기실패.value).toBe('오류')
      expect(localStorage.getItem(저장키)).toBe('{"버전":2}')
    } finally {
      오류.mockRestore()
      vi.doUnmock('../src/assistant/utils/assistantStorage')
    }
  })

  it('막히지 않았어도 저장에 실패해 있었으면 다른 창이 이 키를 쓸 때(늘려도) 다시 해 본다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 지운ID = a.활성탭.value.id
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    a.탭삭제(지운ID)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(a.저장실패.value).toBe(true)
    쓰기.mockRestore()
    await vi.advanceTimersByTimeAsync(5_000) // 실패 뒤 이벤트 재시도 간격
    받는중저장(Date.now(), { id: 'k', 역할: 'assistant', 내용: '남의 답', 시각: Date.now() }) // 다른 창이 대화를 줄여 공간을 비우고 씀
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: null, newValue: localStorage.getItem(저장키), storageArea: localStorage })) // 늘림: 그래도 그 창이 썼으니 공간이 있다
    await vi.advanceTimersByTimeAsync(1_000)
    expect(a.저장실패.value).toBe(false)
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
  })

  it('저장 공간이 계속 가득 차 있어도 저장이 스스로를 쉬지 않고 되풀이하지 않는다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    try {
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(1_000)
      a.새탭추가()
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(1_000)
      const 횟수 = 쓰기.mock.calls.length
      await vi.advanceTimersByTimeAsync(10_000) // 바깥 일이 없으면 더 쓰지 않는다
      expect(쓰기.mock.calls.length).toBe(횟수)
    } finally {
      쓰기.mockRestore()
    }
  })

  it('쓰지 못한 변경은 다른 창이 다른 키를 지우면(공간이 생김) 다시 쓰고, 늘리기만 하면 다시 쓰지 않는다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    const 지운ID = a.활성탭.value.id
    a.탭삭제(지운ID)
    await vi.advanceTimersByTimeAsync(1_000)
    쓰기.mockRestore()
    await vi.advanceTimersByTimeAsync(5_000) // 실패 뒤 이벤트 재시도 간격
    window.dispatchEvent(new StorageEvent('storage', { key: 'how-work-time:다른키', oldValue: 'x', newValue: 'xx', storageArea: localStorage }))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(localStorage.getItem(저장키)).toBeNull() // 늘리기만 했다: 다시 쓰지 않는다
    window.dispatchEvent(new StorageEvent('storage', { key: 'how-work-time:다른키', oldValue: 'x'.repeat(100), newValue: null, storageArea: localStorage }))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
  })

  it('쓰지 못한 변경은 다른 창이 저장소를 비우면 다시 쓰고, 떠날 때(pagehide)도 다시 써 본다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    let 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    const 지운ID = a.활성탭.value.id
    a.탭삭제(지운ID)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(a.저장실패.value).toBe(true)
    쓰기.mockRestore()
    await vi.advanceTimersByTimeAsync(5_000) // 실패 뒤 이벤트 재시도 간격
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage })) // 다른 창이 통째로 비움
    await vi.advanceTimersByTimeAsync(1_000)
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
    // 다시 실패한 뒤 떠날 때
    쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    const 또지운ID = a.활성탭.value.id
    a.새탭추가()
    a.탭삭제(또지운ID)
    await vi.advanceTimersByTimeAsync(1_000)
    쓰기.mockRestore()
    window.dispatchEvent(new Event('pagehide'))
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[또지운ID]).toBeGreaterThan(0)
  })

  it('막혀 있던 창도 떠날 때 저장소를 다시 읽어, 놓친 이벤트로 막기가 이미 풀렸으면 남은 변경을 쓴다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    localStorage.setItem(저장키, '{"버전":2}')
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: '{"버전":2}' }))
    const 지운ID = a.활성탭.value.id
    a.탭삭제(지운ID)
    await vi.advanceTimersByTimeAsync(1_000) // 막혀 있어 쓰지 못함
    localStorage.removeItem(저장키) // 다른 창이 지웠지만 이벤트를 놓침
    window.dispatchEvent(new Event('pagehide'))
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
  })

  it('쓰기에 실패한 뒤 다른 창의 잦은 저장 이벤트로는 간격을 두고 다시 써 본다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    try {
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(1_000)
      const 처음 = 쓰기.mock.calls.length
      for (let i = 0; i < 5; i++) { // 다른 창이 답을 받으며 400ms 마다 이 키를 씀(늘림)
        window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: null, newValue: 'x', storageArea: localStorage }))
        await vi.advanceTimersByTimeAsync(400)
      }
      expect(쓰기.mock.calls.length - 처음).toBe(0) // 간격 안: 미뤄 둔다
      await vi.advanceTimersByTimeAsync(5_000)
      expect(쓰기.mock.calls.length - 처음).toBe(1) // 간격이 끝나면 한 번 다시 써 본다 (버리지 않는다)
    } finally {
      쓰기.mockRestore()
    }
  })

  it('쓰기에 실패한 직후라도 다른 창이 이 키를 줄이면(공간이 생김) 간격 없이 바로 다시 쓴다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    const 지운ID = a.활성탭.value.id
    a.탭삭제(지운ID)
    await vi.advanceTimersByTimeAsync(500)
    쓰기.mockRestore()
    const 줄인값 = JSON.stringify({ 버전: 1, 활성탭ID: 'k', 삭제기록: {}, 탭목록: [{ id: 'k', 제목: '', 생성시각: 1, 수정시각: 1, 메시지: [{ id: 'q', 역할: 'user', 내용: 'q', 시각: 1 }] }] })
    localStorage.setItem(저장키, 줄인값)
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: 'x'.repeat(5_000), newValue: 줄인값, storageArea: localStorage }))
    await vi.advanceTimersByTimeAsync(500)
    expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
  })

  it('(정한 정책) 합치지 못한 다른 창의 저장은 공간이 생긴 이벤트로 덮지 않고, 플래너를 닫는 등 사용자의 다음 일 때 보통 저장이 쓴다', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
      const 지운ID = a.활성탭.value.id
      a.탭삭제(지운ID)
      await vi.advanceTimersByTimeAsync(1_000)
      쓰기.mockRestore()
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'u', 역할: 'assistant', 내용: '합칠 수 없는 남의 것', 시각: Date.now() })
      const 남의값 = localStorage.getItem(저장키)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: 'x'.repeat(10_000), newValue: 남의값, storageArea: localStorage }))
      await vi.advanceTimersByTimeAsync(10_000) // 간격이 지나도
      expect(localStorage.getItem(저장키)).toBe(남의값) // 재시도는 그 위에 쓰지 않는다
      a.열기()
      await vi.advanceTimersByTimeAsync(0)
      a.닫기() // 사용자가 플래너를 닫으면 보통 저장(즉시저장)이 쓴다
      await vi.advanceTimersByTimeAsync(1_000)
      expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
    } finally {
      합치기.정리()
    }
  })

  it('이 창의 저장이 덮기로 한 합치지 못한 값이면, 그 쓰기가 실패해도 공간이 생길 때 재시도가 이어 쓴다', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'u', 역할: 'assistant', 내용: '합칠 수 없는 남의 것', 시각: Date.now() }) // 이벤트는 아직 닿지 않음
      const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
      const 지운ID = a.활성탭.value.id
      a.탭삭제(지운ID) // 저장이 합치지 못한 값을 만나고도 덮기로 하지만 가득 차 실패
      await vi.advanceTimersByTimeAsync(1_000)
      쓰기.mockRestore()
      localStorage.setItem('다른키', 'x')
      window.dispatchEvent(new StorageEvent('storage', { key: '다른키', oldValue: 'x'.repeat(5_000), newValue: 'x', storageArea: localStorage }))
      await vi.advanceTimersByTimeAsync(500)
      expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
    } finally {
      localStorage.removeItem('다른키')
      합치기.정리()
    }
  })

  it('재시도 타이머가 돌 때 이벤트가 아직 닿지 않은 합치지 못한 값이 저장소에 있으면 그 위에 쓰지 않는다', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(1_000)
      쓰기.mockRestore()
      // 다른 창이 이 키를 늘림 (합칠 수 있는 값, 받는 중 답 없음) → 간격 뒤 재시도 예약
      받는중저장(Date.now() + 1, { id: 'a2', 역할: 'assistant', 내용: '합칠 수 있는 것', 시각: Date.now() })
      const 늘린값 = localStorage.getItem(저장키)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: 'x', newValue: 늘린값, storageArea: localStorage }))
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'a3', 역할: 'assistant', 내용: '합칠 수 없는 남의 것', 시각: Date.now() }) // 이벤트는 아직
      const 남의값 = localStorage.getItem(저장키)
      합치기.시도 = 0
      await vi.advanceTimersByTimeAsync(10_000)
      expect(합치기.시도).toBeGreaterThan(0) // 재시도가 돌아 막 읽은 값을 합쳐 보았다
      expect(localStorage.getItem(저장키)).toBe(남의값) // 그래도 덮지 않았다
      expect(a.저장실패.value).toBe(true) // 아직 쓰지 못했다는 안내는 남긴다
    } finally {
      합치기.정리()
    }
  })

  it('한 번 합치지 못한 값도 이 창의 상태가 바뀌면 저장 전에 다시 합쳐 본다 (같은 값이라고 건너뛰지 않는다)', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'a3', 역할: 'assistant', 내용: '남의 답', 시각: Date.now() })
      const 남의값 = localStorage.getItem(저장키)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 남의값, storageArea: localStorage }))
      합치기.실패 = false // 이 창의 상태가 바뀌어 이제는 합칠 수 있다
      a.새탭추가()
      a.탭삭제(a.활성탭.value.id)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(JSON.parse(localStorage.getItem(저장키)).탭목록.some((탭) => 탭.id === 'x')).toBe(true) // 남의 대화를 지우지 않았다
    } finally {
      합치기.정리()
    }
  })

  it('재시도가 합치지 못한 값 때문에 쓰지 않을 때 사용자의 변경으로 예약된 저장은 거두지 않는다', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
      a.탭삭제(a.활성탭.value.id) // 쓰지 못함 → 쓸것남음
      await vi.advanceTimersByTimeAsync(1_000)
      쓰기.mockRestore()
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'a3', 역할: 'assistant', 내용: '남의 답', 시각: Date.now() }) // 이벤트는 아직
      localStorage.setItem('다른키', 'x')
      const 지운ID = a.활성탭.value.id
      a.탭삭제(지운ID) // 사용자의 변경 → 저장 예약
      // 다른 키가 줄어 공간이 생김 → 재시도가 예약된 저장보다 먼저 돈다 (합치지 못한 값이라 쓰지 않음)
      window.dispatchEvent(new StorageEvent('storage', { key: '다른키', oldValue: 'x'.repeat(5_000), newValue: 'x', storageArea: localStorage }))
      await vi.advanceTimersByTimeAsync(1_000)
      expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0) // 예약된 저장은 그대로 써졌다
    } finally {
      localStorage.removeItem('다른키')
      합치기.정리()
    }
  })

  it('같은 합치지 못한 값으로 거듭 실패해도 기록·안내는 한 번만', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'a3', 역할: 'assistant', 내용: '남의 답', 시각: Date.now() })
      const 남의값 = localStorage.getItem(저장키)
      합치기.오류.mockClear()
      const 알림 = () => window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 남의값, storageArea: localStorage }))
      알림()
      // 안내 시간 안에서 거듭 와도 안내를 다시 켜지 않는다 (켜면 시간이 처음부터 다시 간다)
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(3_000)
        알림()
      }
      expect(합치기.오류.mock.calls.filter(([글]) => 글 === '[플래너] 다른 창의 저장본을 합치지 못함')).toHaveLength(1)
      expect(a.전체합치기실패.value).toBe(true)
      await vi.advanceTimersByTimeAsync(3_500) // 첫 안내에서 12.5초
      expect(a.전체합치기실패.value).toBe(false)
    } finally {
      합치기.정리()
    }
  })

  it('합치지 못한 값이 합칠 수 있는 값으로 바뀌면 재시도가 다시 돈다', async () => {
    const 합치기 = await 합치기실패모킹()
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
      const 지운ID = a.활성탭.value.id
      a.탭삭제(지운ID)
      await vi.advanceTimersByTimeAsync(1_000)
      쓰기.mockRestore()
      합치기.실패 = true
      받는중저장(Date.now() + 5, { id: 'u', 역할: 'assistant', 내용: '합칠 수 없는 남의 것', 시각: Date.now() })
      const 남의값 = localStorage.getItem(저장키)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: 'x'.repeat(10_000), newValue: 남의값, storageArea: localStorage }))
      await vi.advanceTimersByTimeAsync(1_000)
      expect(localStorage.getItem(저장키)).toBe(남의값) // 막힘
      합치기.실패 = false
      받는중저장(Date.now() + 10, { id: 'u', 역할: 'assistant', 내용: '이제 합칠 수 있는 것', 시각: Date.now() })
      const 고친값 = localStorage.getItem(저장키)
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, oldValue: 남의값 + 'xxxx', newValue: 고친값, storageArea: localStorage }))
      await vi.advanceTimersByTimeAsync(1_000)
      expect(JSON.parse(localStorage.getItem(저장키)).삭제기록[지운ID]).toBeGreaterThan(0)
    } finally {
      합치기.정리()
    }
  })

  it('확인하지 않았으면(확인한 값 없음) 새 형식 저장본을 덮지 않는다', async () => {
    localStorage.setItem(저장키, '{"버전":2}')
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    a.이창으로덮어쓰기() // 확인 없음
    expect(localStorage.getItem(저장키)).toBe('{"버전":2}')
    expect(a.저장본바뀜.value).toBe(false)
    // 확인은 10초 뒤, 막기가 풀리면 거둔다 (입력창과 무관하게)
    a.덮어쓰기확인시작()
    await vi.advanceTimersByTimeAsync(11_000)
    expect(a.덮어쓰기확인중.value).toBe(false)
    a.이창으로덮어쓰기()
    expect(localStorage.getItem(저장키)).toBe('{"버전":2}')
    a.덮어쓰기확인시작()
    localStorage.removeItem(저장키)
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: null }))
    expect(a.덮어쓰기확인중.value).toBe(false)
  })

  it('시작할 때 새 형식의 저장본이면 바로 안내하고 덮지 않는다', async () => {
    localStorage.setItem(저장키, '{"버전":9}')
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    expect(a.새판감지.value).toBe(true)
    a.새탭추가()
    a.탭삭제(a.활성탭.value.id)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(localStorage.getItem(저장키)).toBe('{"버전":9}')
  })

  it('새 형식 저장본이 사라지거나 읽을 수 있는 값이 되면 안내가 저절로 풀리고, 그동안은 보내지 않는다', async () => {
    const { useAssistant } = await import('../src/assistant/composables/useAssistant')
    const a = useAssistant()
    const 새판 = '{"버전":2}'
    localStorage.setItem(저장키, 새판)
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 새판 }))
    expect(a.새판감지.value).toBe(true)
    expect(await a.전송('질문')).toBe(false) // 저장할 수 없으니 보내지 않는다
    expect(a.덮어쓸대화있음.value).toBe(false) // 빈 창: 버튼은 '지우고 새로 시작' 문구로 내민다
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null })) // 다른 창이 저장소를 통째로 비움
    expect(a.새판감지.value).toBe(false)
    // 같은 새 형식 값이 다시 오면 (캐시가 풀렸으므로) 다시 막는다
    localStorage.setItem(저장키, 새판)
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: 새판 }))
    expect(a.새판감지.value).toBe(true)
    // 읽을 수 있는 값이 오면 풀린다
    받는중저장(Date.now(), { id: 'k', 역할: 'assistant', 내용: '답', 시각: Date.now() })
    window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: localStorage.getItem(저장키) }))
    expect(a.새판감지.value).toBe(false)
  })

  it('새 형식 막기 중 다른 까닭으로 합치기에 실패하면 막기를 푼다 (새 형식 값이 이제 없으므로)', async () => {
    const 합치기 = await 합치기실패모킹()
    합치기.실패 = true
    try {
      const { useAssistant } = await import('../src/assistant/composables/useAssistant')
      const a = useAssistant()
      localStorage.setItem(저장키, '{"버전":2}')
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: '{"버전":2}' }))
      expect(a.새판감지.value).toBe(true)
      받는중저장(Date.now())
      window.dispatchEvent(new StorageEvent('storage', { key: 저장키, newValue: localStorage.getItem(저장키) }))
      expect(a.새판감지.value).toBe(false)
      expect(a.전체합치기실패.value).toBe(true)
    } finally {
      합치기.정리()
    }
  })
})

describe('다른창저장감시', () => {
  it('그 키의 변경과 localStorage 통째 비움을 알리고, sessionStorage 비움은 무시한다', () => {
    const 받은 = []
    const 해제 = 다른창저장감시('k', (값) => 받은.push(값))
    localStorage.setItem('k', 'v')
    window.dispatchEvent(new StorageEvent('storage', { key: 'k', newValue: 'v', storageArea: localStorage }))
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: sessionStorage }))
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage })) // 지금 값을 다시 읽어 알린다
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'x', storageArea: localStorage }))
    해제()
    localStorage.removeItem('k')
    expect(받은).toEqual(['v', 'v'])
  })
})

describe('설정 감시', () => {
  afterEach(() => { 모듈상태모두정리(); localStorage.clear() })
  it('다른 창이 설정을 지우면(통째 비움 포함) 이 창도 기본 설정으로 돌아가 지운 키가 되살아나지 않는다', async () => {
    vi.resetModules()
    localStorage.setItem('how-work-time:assistant-settings', JSON.stringify({ 버전: 1, 제공자: 'anthropic', 키: { anthropic: 'sk-test' } }))
    const { useAssistantSettings } = await import('../src/assistant/composables/useAssistantSettings')
    const s = useAssistantSettings()
    expect(s.현재키.value).toBe('sk-test')
    localStorage.clear() // 다른 창이 비웠다
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))
    expect(s.현재키.value).toBe('')
    await nextTick()
    expect(localStorage.getItem('how-work-time:assistant-settings')).toBeNull() // 지운 값을 곧바로 다시 쓰지 않는다
  })

  it('이벤트가 닿기 전에 이 창이 다시 썼으면 늦게 닿은 이벤트 값이 아니라 지금 저장소 값으로 판단한다', async () => {
    vi.resetModules()
    const 키 = 'how-work-time:assistant-settings'
    localStorage.setItem(키, JSON.stringify({ 버전: 1, 제공자: 'anthropic', 키: { anthropic: 'sk-test' } }))
    const { useAssistantSettings } = await import('../src/assistant/composables/useAssistantSettings')
    const s = useAssistantSettings()
    // 늦게 닿은 지움(키 하나) 이벤트: 저장소엔 이미 이 창의 값이 있다
    window.dispatchEvent(new StorageEvent('storage', { key: 키, newValue: null, storageArea: localStorage }))
    await nextTick()
    expect(s.현재키.value).toBe('sk-test')
    // 늦게 닿은 옛 값 이벤트: 지금 저장소 값(이 창의 새 수정)을 따른다
    s.모델.value = '새-모델'
    await nextTick()
    window.dispatchEvent(new StorageEvent('storage', { key: 키, newValue: JSON.stringify({ 버전: 1, 제공자: 'anthropic', 모델: { anthropic: '옛-모델' } }), storageArea: localStorage }))
    await nextTick()
    expect(s.모델.value).toBe('새-모델')
  })

  it('다른 창이 설정을 지우면 이 창이 저장하지 못한 필드도 버리고 기본으로 (다음 수정 때 지운 키가 되살아나지 않게)', async () => {
    vi.resetModules()
    const { useAssistantSettings } = await import('../src/assistant/composables/useAssistantSettings')
    const s = useAssistantSettings()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') }) // 저장 실패
    try {
      s.저장된키.value = 'sk-새키'
      await nextTick()
      expect(s.설정저장실패.value).toBe(true)
    } finally {
      쓰기.mockRestore()
    }
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))
    await nextTick()
    expect(s.현재키.value).toBe('')
    expect(s.설정저장실패.value).toBe(true) // 버려진 수정을 다시 입력해야 함을 알린다
    s.모델.value = '다른-모델' // 다음 수정: 지운 키가 함께 저장되지 않는다
    await nextTick()
    expect(JSON.parse(localStorage.getItem('how-work-time:assistant-settings')).키.anthropic).toBe('')
  })

  it('쓰지 못한 설정은 다른 창이 다른 키를 지워 공간이 생기면 다시 쓴다', async () => {
    vi.resetModules()
    const { useAssistantSettings } = await import('../src/assistant/composables/useAssistantSettings')
    const s = useAssistantSettings()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    s.저장된키.value = 'sk-다시'
    await nextTick()
    expect(s.설정저장실패.value).toBe(true)
    쓰기.mockRestore()
    window.dispatchEvent(new StorageEvent('storage', { key: 'how-work-time:다른키', oldValue: 'xxxx', newValue: null, storageArea: localStorage }))
    await new Promise((r) => setTimeout(r, 10)) // 공간이 생겼다: 간격 없이 다음 틈에 다시 쓴다
    expect(s.설정저장실패.value).toBe(false)
    expect(JSON.parse(localStorage.getItem('how-work-time:assistant-settings')).키.anthropic).toBe('sk-다시')
  })

  it('다른 창이 설정을 지운 뒤에는 공간이 생겨도 기본 설정을 다시 쓰지 않고 실패 안내를 남긴다', async () => {
    vi.resetModules()
    const { useAssistantSettings } = await import('../src/assistant/composables/useAssistantSettings')
    const s = useAssistantSettings()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    s.저장된키.value = 'sk-지울것'
    await nextTick()
    쓰기.mockRestore()
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))
    await nextTick()
    window.dispatchEvent(new StorageEvent('storage', { key: 'how-work-time:다른키', oldValue: 'xxxx', newValue: null, storageArea: localStorage }))
    await new Promise((r) => setTimeout(r, 10)) // 재시도가 돌 틈을 준다
    expect(localStorage.getItem('how-work-time:assistant-settings')).toBeNull()
    expect(s.설정저장실패.value).toBe(true)
  })

  it('쓰지 못한 설정은 다른 창이 설정 키를 줄여도(공간이 생김) 합친 뒤 다시 쓴다', async () => {
    vi.resetModules()
    const 키 = 'how-work-time:assistant-settings'
    const { useAssistantSettings } = await import('../src/assistant/composables/useAssistantSettings')
    const s = useAssistantSettings()
    const 쓰기 = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('가득 참') })
    s.저장된키.value = 'sk-줄임'
    await nextTick()
    쓰기.mockRestore()
    const 남의값 = JSON.stringify({ 버전: 1, 제공자: 'anthropic' })
    localStorage.setItem(키, 남의값)
    window.dispatchEvent(new StorageEvent('storage', { key: 키, oldValue: 'x'.repeat(500), newValue: 남의값, storageArea: localStorage }))
    await new Promise((r) => setTimeout(r, 10))
    expect(JSON.parse(localStorage.getItem(키)).키.anthropic).toBe('sk-줄임')
    expect(s.설정저장실패.value).toBe(false)
  })
})


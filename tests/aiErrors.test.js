import { describe, it, expect } from 'vitest'
import { 어시스턴트오류, 오류정리, 스트림오류 } from '../src/assistant/ai/errors'
import { SSE이벤트 } from '../src/assistant/ai/sse'

describe('오류정리', () => {
  it('fetch 네트워크 TypeError 만 연결 실패로 보고, 일반 TypeError 는 원문을 남긴다', () => {
    expect(오류정리(new TypeError('Failed to fetch')).종류).toBe('network')
    expect(오류정리(new TypeError('Load failed')).종류).toBe('network')
    const 버그 = 오류정리(new TypeError("Cannot read properties of undefined (reading 'content')"))
    expect(버그.종류).toBe('unknown')
    expect(버그.message).toContain('Cannot read properties')
  })
  it('status 가 있으면 코드로 종류를 가린다', () => {
    expect(오류정리(Object.assign(new Error('x'), { status: 401 })).종류).toBe('auth')
    expect(오류정리(Object.assign(new Error('x'), { status: 429 })).종류).toBe('rate')
    expect(오류정리(Object.assign(new Error('x'), { status: 503 })).종류).toBe('server')
  })
  it('종류만 있고 메시지가 빈 어시스턴트오류는 안내 문구를 채운다', () => {
    const 정리 = 오류정리(new 어시스턴트오류('network', ''))
    expect(정리.message).toContain('연결에 실패')
  })
})

describe('스트림오류', () => {
  it('본문의 code·status 로 종류를 가리고, 없으면 server', () => {
    expect(스트림오류({ code: 429, message: 'quota' }).종류).toBe('rate')
    expect(스트림오류({ status: 403, message: 'revoked' }).종류).toBe('auth')
    expect(스트림오류({ message: 'boom' }).종류).toBe('server')
    expect(스트림오류({ message: 'boom', code: 418 }).message).toContain('boom')
  })
})

describe('SSE이벤트', () => {
  function 응답만들기(청크들) {
    const 바이트들 = 청크들.map((c) => (c instanceof Uint8Array ? c : new TextEncoder().encode(c)))
    const body = new ReadableStream({
      start(ctrl) { for (const b of 바이트들) ctrl.enqueue(b); ctrl.close() },
    })
    return { body }
  }
  async function 모으기(응답) {
    const 결과 = []
    for await (const ev of SSE이벤트(응답)) 결과.push(ev)
    return 결과
  }

  it('빈 줄로 나뉜 이벤트를 모으고, 여러 data 줄은 줄바꿈으로 잇는다', async () => {
    const 결과 = await 모으기(응답만들기(['event: a\ndata: 1\ndata: 2\n\n', ': 주석\ndata: 3\n\n']))
    expect(결과).toEqual([{ event: 'a', data: '1\n2' }, { event: 'message', data: '3' }])
  })

  it('청크가 한글 글자 중간에서 끊기고 빈 줄 없이 끝나도 마지막 글자를 잃지 않는다', async () => {
    const 전체 = new TextEncoder().encode('data: 안녕')
    const 앞 = 전체.slice(0, 전체.length - 1) // '녕'의 마지막 바이트를 다음 청크로
    const 뒤 = 전체.slice(전체.length - 1)
    const 결과 = await 모으기(응답만들기([앞, 뒤]))
    expect(결과).toEqual([{ event: 'message', data: '안녕' }])
  })

  it('소비자가 중간에 끊으면 스트림을 취소한다', async () => {
    let 취소됨 = false
    const body = new ReadableStream({
      start(ctrl) { ctrl.enqueue(new TextEncoder().encode('data: 1\n\ndata: 2\n\n')) },
      cancel() { 취소됨 = true },
    })
    for await (const ev of SSE이벤트({ body })) { if (ev.data === '1') break }
    expect(취소됨).toBe(true)
  })
})

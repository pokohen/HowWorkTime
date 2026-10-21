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
    expect(오류정리(Object.assign(new Error('400 Your credit balance is too low to access the Anthropic API'), { status: 400 })).종류).toBe('quota')
    // SDK 오류의 구조화된 type 이 문구보다 먼저
    expect(오류정리(Object.assign(new Error('400 bad'), { status: 400, error: { type: 'error', error: { type: 'authentication_error', message: 'x' } } })).종류).toBe('auth')
  })
  it('메시지를 비우면 생성자가 종류에 맞는 안내 문구를 채운다', () => {
    expect(new 어시스턴트오류('network', '').message).toContain('연결에 실패')
    expect(new 어시스턴트오류('quota').message).toContain('결제')
    expect(new 어시스턴트오류('request', '직접 쓴 문구').message).toBe('직접 쓴 문구')
  })
  it('동적 import 청크 로드 실패는 새 버전 안내로 (브라우저별 문구)', () => {
    for (const 글 of ['Failed to fetch dynamically imported module: https://x/sdk-abc.js', 'Importing a module script failed.', 'error loading dynamically imported module']) {
      expect(오류정리(new TypeError(글)).종류).toBe('stale')
    }
  })
  it('프로토타입 키 같은 오류 코드는 종류로 새지 않는다', () => {
    expect(스트림오류({ code: 'constructor', message: 'x' }).종류).toBe('server')
  })
})

describe('스트림오류', () => {
  it('본문의 code·status 로 종류를 가리고, 없으면 server', () => {
    expect(스트림오류({ code: 429, message: 'quota' }).종류).toBe('rate')
    expect(스트림오류({ status: 403, message: 'revoked' }).종류).toBe('auth')
    expect(스트림오류({ message: 'boom' }).종류).toBe('server')
    expect(스트림오류({ message: 'Rate limit reached', code: 'rate_limit_exceeded' }).종류).toBe('rate')
    expect(스트림오류({ message: 'too long', code: 'context_length_exceeded' }).message).toContain('too long')
    expect(스트림오류({ message: 'API key not valid', code: null }).종류).toBe('auth')
    // Gemini 꼴: 숫자 code + 문자 status
    expect(스트림오류({ code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota' }).종류).toBe('rate')
    expect(스트림오류({ code: 403, status: 'PERMISSION_DENIED', message: 'x' }).종류).toBe('auth')
    expect(스트림오류({ status: 'UNAVAILABLE', message: 'x' }).종류).toBe('server')
    // Gemini 의 details[].reason 은 문구가 바뀌어도 남는다
    expect(스트림오류({ code: 400, status: 'INVALID_ARGUMENT', message: 'The provided credential is not valid', details: [{ reason: 'API_KEY_INVALID' }] }).종류).toBe('auth')
    // OpenAI 는 code 가 null 이고 type 만 있는 경우가 많다
    expect(스트림오류({ type: 'invalid_request_error', code: null, message: 'bad' }).종류).toBe('request')
    expect(스트림오류({ type: 'authentication_error', message: 'x' }).종류).toBe('auth')
    // 429 라도 insufficient_quota 는 기다려도 안 풀린다
    expect(스트림오류({ code: 'insufficient_quota', status: 429, message: 'quota' }).종류).toBe('quota')
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

describe('오류정리 — Anthropic SDK', () => {
  it('스트림 도중 온 오류(status 없음)도 본문 type 으로 분류한다', () => {
    const 과부하 = Object.assign(new Error('{"type":"error","error":{"type":"overloaded_error"}}'), { error: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } })
    expect(오류정리(과부하).종류).toBe('server')
    const 한도 = Object.assign(new Error('x'), { error: { type: 'error', error: { type: 'rate_limit_error', message: 'x' } } })
    expect(오류정리(한도).종류).toBe('rate')
  })
})

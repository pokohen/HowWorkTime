/**
 * text/event-stream 응답을 이벤트 단위로 읽는다.
 * OpenAI · Gemini 처럼 공식 브라우저 SDK 없이 fetch 로 스트리밍하는 제공자에 쓴다.
 * 이벤트는 빈 줄로 구분되고, 한 이벤트의 data 줄이 여러 개면 줄바꿈으로 이어 붙인다.
 *
 * @param {Response} 응답
 * @returns {AsyncGenerator<{ event: string, data: string }>}
 */
export async function* SSE이벤트(응답) {
  if (!응답.body) return
  const 리더 = 응답.body.getReader()
  const 디코더 = new TextDecoder()
  let 버퍼 = ''

  try {
    while (true) {
      const { value, done } = await 리더.read()
      if (done) break
      버퍼 += 디코더.decode(value, { stream: true })

      // 완결된 이벤트(빈 줄까지)만 꺼내고 나머지는 다음 청크와 합친다
      let 경계
      while ((경계 = 버퍼.search(/\r?\n\r?\n/)) !== -1) {
        const 블록 = 버퍼.slice(0, 경계)
        버퍼 = 버퍼.slice(경계).replace(/^\r?\n\r?\n/, '')
        const 이벤트 = 블록파싱(블록)
        if (이벤트) yield 이벤트
      }
    }
    // 스트림이 빈 줄 없이 끝났을 때 남은 블록
    const 마지막 = 블록파싱(버퍼)
    if (마지막) yield 마지막
  } finally {
    리더.releaseLock()
  }
}

function 블록파싱(블록) {
  let event = 'message'
  const data = []
  for (const 줄 of 블록.split(/\r?\n/)) {
    if (!줄 || 줄.startsWith(':')) continue
    const 콜론 = 줄.indexOf(':')
    const 필드 = 콜론 === -1 ? 줄 : 줄.slice(0, 콜론)
    const 값 = 콜론 === -1 ? '' : 줄.slice(콜론 + 1).replace(/^ /, '')
    if (필드 === 'event') event = 값
    else if (필드 === 'data') data.push(값)
  }
  if (data.length === 0) return null
  return { event, data: data.join('\n') }
}

import { SSE이벤트 } from './sse'
import { 응답오류, 어시스턴트오류, 스트림오류 } from './errors'

/**
 * Gemini generateContent API 를 fetch 로 스트리밍한다 (alt=sse, 브라우저 CORS 허용).
 * 역할 이름이 다르다: assistant → model.
 *
 * @param {{ 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<{ 텍스트: string, 잘림: boolean }>}
 */
export async function 대화요청({ 키, 모델, 시스템, 메시지, 신호, 조각 }) {
  // 모델 목록 API 와 AI Studio 는 'models/gemini-…' 꼴로 이름을 보여 준다. 그대로 붙여 넣어도 되게 접두사를 뗀다
  const 모델이름 = 모델.replace(/^models\//, '')
  const 주소 = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(모델이름)}:streamGenerateContent?alt=sse`
  const 응답 = await fetch(주소, {
    method: 'POST',
    signal: 신호,
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': 키,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 시스템 }] },
      contents: 메시지.map((m) => ({
        role: m.역할 === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.내용 }],
      })),
    }),
  })
  if (!응답.ok) throw await 응답오류(응답)

  let 전체 = ''
  let 잘림 = false
  for await (const { data } of SSE이벤트(응답)) {
    let 본문
    try { 본문 = JSON.parse(data) } catch { continue }
    // 200 으로 열린 스트림 안에서도 오류·차단이 올 수 있다. 조용히 빈 답으로 끝내지 않는다
    if (본문?.error) throw 스트림오류(본문.error)
    const 차단이유 = 본문?.promptFeedback?.blockReason
    if (차단이유) throw new 어시스턴트오류('request', `모델이 이 요청을 거부했어요 (${차단이유}). 질문을 바꿔서 다시 시도해 주세요.`)
    const 후보 = 본문?.candidates?.[0]
    for (const 부분 of 후보?.content?.parts ?? []) {
      if (typeof 부분.text === 'string' && 부분.text) {
        전체 += 부분.text
        조각(부분.text)
      }
    }
    // 마지막 조각에 글과 종료 이유가 같이 올 수 있어, 글을 먼저 흘린 뒤 이유를 본다
    const 종료이유 = 후보?.finishReason
    if (종료이유 === 'MAX_TOKENS') 잘림 = true
    else if (종료이유 && 종료이유 !== 'STOP') {
      throw new 어시스턴트오류('request', `모델이 답을 끝내지 못했어요 (${종료이유}). 질문을 바꿔서 다시 시도해 주세요.`)
    }
  }
  return { 텍스트: 전체, 잘림 }
}

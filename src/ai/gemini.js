import { SSE이벤트 } from './sse'
import { 응답오류 } from './errors'

/**
 * Gemini generateContent API 를 fetch 로 스트리밍한다 (alt=sse, 브라우저 CORS 허용).
 * 역할 이름이 다르다: assistant → model.
 *
 * @param {{ 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<string>}
 */
export async function 대화요청({ 키, 모델, 시스템, 메시지, 신호, 조각 }) {
  const 주소 = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(모델)}:streamGenerateContent?alt=sse`
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
  for await (const { data } of SSE이벤트(응답)) {
    let 본문
    try { 본문 = JSON.parse(data) } catch { continue }
    const 조각들 = 본문?.candidates?.[0]?.content?.parts ?? []
    for (const 부분 of 조각들) {
      if (typeof 부분.text === 'string' && 부분.text) {
        전체 += 부분.text
        조각(부분.text)
      }
    }
  }
  return 전체
}

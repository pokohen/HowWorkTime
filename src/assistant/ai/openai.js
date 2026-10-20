import { SSE이벤트 } from './sse'
import { 응답오류, 어시스턴트오류 } from './errors'

/**
 * OpenAI Chat Completions API 를 fetch 로 스트리밍한다 (브라우저 CORS 허용).
 * 추론 모델은 temperature 등을 거부하므로 모델·메시지·stream 만 보낸다.
 *
 * @param {{ 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<string>}
 */
export async function 대화요청({ 키, 모델, 시스템, 메시지, 신호, 조각 }) {
  const 응답 = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: 신호,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${키}`,
    },
    body: JSON.stringify({
      model: 모델,
      stream: true,
      messages: [
        { role: 'system', content: 시스템 },
        ...메시지.map((m) => ({ role: m.역할, content: m.내용 })),
      ],
    }),
  })
  if (!응답.ok) throw await 응답오류(응답)

  let 전체 = ''
  for await (const { data } of SSE이벤트(응답)) {
    if (data === '[DONE]') break
    let 본문
    try { 본문 = JSON.parse(data) } catch { continue }
    // 헤더가 나간 뒤 스트림 안에서 오는 오류(한도 초과, 서버 오류). 조용히 빈 답으로 끝내지 않는다
    if (본문?.error) throw new 어시스턴트오류('server', `요청이 거부됐어요: ${본문.error.message ?? '알 수 없는 오류'}`, 본문.error)
    const 텍스트 = 본문?.choices?.[0]?.delta?.content
    if (텍스트) {
      전체 += 텍스트
      조각(텍스트)
    }
  }
  return 전체
}

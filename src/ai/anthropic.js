import { 어시스턴트오류 } from './errors'

/**
 * Claude Messages API (공식 SDK). 브라우저에서 사용자 본인의 키로 직접 호출한다.
 * SDK 는 이 제공자를 처음 쓸 때만 내려받도록 동적으로 불러온다 (초기 번들 크기 유지).
 *
 * @param {{ 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<string>} 전체 응답 텍스트
 */
export async function 대화요청({ 키, 모델, 시스템, 메시지, 신호, 조각 }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({
    apiKey: 키,
    dangerouslyAllowBrowser: true, // 사용자 본인의 키를 본인 브라우저에서만 쓰는 구조 (서버 없음)
    maxRetries: 1,
  })

  const stream = client.messages.stream(
    {
      model: 모델,
      max_tokens: 16000,
      system: 시스템,
      messages: 메시지.map((m) => ({ role: m.역할, content: m.내용 })),
    },
    { signal: 신호 },
  )

  stream.on('text', 조각)
  const 최종 = await stream.finalMessage()

  if (최종.stop_reason === 'refusal') {
    throw new 어시스턴트오류('request', '모델이 이 요청에는 답하지 않았어요. 질문을 바꿔서 다시 시도해 주세요.')
  }
  return 최종.content
    .filter((블록) => 블록.type === 'text')
    .map((블록) => 블록.text)
    .join('')
}

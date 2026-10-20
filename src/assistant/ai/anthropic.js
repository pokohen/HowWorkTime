import { 어시스턴트오류 } from './errors'

/**
 * Claude Messages API (공식 SDK). 브라우저에서 사용자 본인의 키로 직접 호출한다.
 * SDK 는 이 제공자를 처음 쓸 때만 내려받도록 동적으로 불러온다 (초기 번들 크기 유지).
 *
 * @param {{ 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<{ 텍스트: string, 잘림: boolean }>} 전체 응답 텍스트와 출력 상한에 걸렸는지
 */
/** 기본 출력 상한. 모델 ID 가 자유 입력이라 상한이 더 낮은 모델이면 API 가 알려 준 상한으로 한 번 다시 시도한다 */
const 기본최대토큰 = 8192

/** 400 "max_tokens: 8192 > 4096, which is the maximum allowed …" 에서 모델의 상한을 읽는다. 없으면 null */
export function 최대토큰상한(메시지) {
  const 짝 = /max_tokens[^0-9]*\d+\s*>\s*(\d+)/i.exec(메시지 ?? '')
  return 짝 ? Number(짝[1]) : null
}

export async function 대화요청({ 키, 모델, 시스템, 메시지, 신호, 조각 }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({
    apiKey: 키,
    dangerouslyAllowBrowser: true, // 사용자 본인의 키를 본인 브라우저에서만 쓰는 구조 (서버 없음)
    maxRetries: 1,
  })
  const 요청 = (maxTokens) => client.messages.stream(
    {
      model: 모델,
      max_tokens: maxTokens,
      system: 시스템,
      messages: 메시지.map((m) => ({ role: m.역할, content: m.내용 })),
    },
    { signal: 신호 },
  )

  let 최종
  try {
    try {
      const stream = 요청(기본최대토큰)
      stream.on('text', 조각)
      최종 = await stream.finalMessage()
    } catch (예외) {
      // 400 "max_tokens: N > M …": 아직 글자가 나가기 전이라 API 가 말한 상한 M 으로 다시 보낼 수 있다
      const 상한 = 예외?.status === 400 ? 최대토큰상한(예외?.message) : null
      if (!상한 || 상한 >= 기본최대토큰) throw 예외
      const stream = 요청(상한)
      stream.on('text', 조각)
      최종 = await stream.finalMessage()
    }
  } catch (예외) {
    // SDK 오류 클래스는 name 이 'Error' 라 이름으로는 구분할 수 없다. 클래스로 가려 종류를 붙인다
    if (예외 instanceof Anthropic.APIUserAbortError) throw new 어시스턴트오류('abort', '응답을 중단했어요.', 예외)
    if (예외 instanceof Anthropic.APIConnectionError) throw new 어시스턴트오류('network', '', 예외)
    throw 예외
  }

  if (최종.stop_reason === 'refusal') {
    throw new 어시스턴트오류('request', '모델이 이 요청에는 답하지 않았어요. 질문을 바꿔서 다시 시도해 주세요.')
  }
  return {
    텍스트: 최종.content.filter((블록) => 블록.type === 'text').map((블록) => 블록.text).join(''),
    잘림: 최종.stop_reason === 'max_tokens',
  }
}

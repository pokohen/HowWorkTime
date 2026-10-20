import { 어시스턴트오류 } from './errors'

/**
 * 기본 출력 상한. 생각(thinking)이 켜진 모델은 생각 토큰도 여기에 포함되므로 넉넉히 잡는다 (스트리밍이라 커도 괜찮다).
 * 모델 ID 가 자유 입력이라 상한이 더 낮은 모델이면 Models API 가 알려 주는 값으로 줄인다.
 */
const 기본최대토큰 = 32_000
/** 모델별 출력 상한 캐시. 확정된 답(숫자, 또는 모르는 모델=null)만 기억한다. 일시 장애는 다음에 다시 묻는다 */
const 상한캐시 = new Map()

async function 모델상한(client, Anthropic, 모델, 신호) {
  if (상한캐시.has(모델)) return 상한캐시.get(모델)
  try {
    const 정보 = await client.models.retrieve(모델, undefined, { signal: 신호 }) // 2번째 인자는 params, 신호는 options
    const 상한 = typeof 정보?.max_tokens === 'number' ? 정보.max_tokens : null
    상한캐시.set(모델, 상한)
    return 상한
  } catch (예외) {
    if (예외 instanceof Anthropic.APIUserAbortError) throw 예외 // 사용자가 중단한 것은 그대로 올린다
    if (예외?.status === 404) 상한캐시.set(모델, null) // 모르는 모델. 기본값으로 보내고 API 의 판단에 맡긴다
    return null // 네트워크·5xx 는 기억하지 않는다
  }
}

/**
 * Claude Messages API (공식 SDK). 브라우저에서 사용자 본인의 키로 직접 호출한다.
 * SDK 는 이 제공자를 처음 쓸 때만 내려받도록 동적으로 불러온다 (초기 번들 크기 유지).
 *
 * @param {{ 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<{ 텍스트: string, 잘림: boolean }>} 전체 응답 텍스트와 출력 상한에 걸렸는지
 */
export async function 대화요청({ 키, 모델, 시스템, 메시지, 신호, 조각 }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({
    apiKey: 키,
    dangerouslyAllowBrowser: true, // 사용자 본인의 키를 본인 브라우저에서만 쓰는 구조 (서버 없음)
    maxRetries: 1,
  })
  let 최종
  try {
    const 상한 = await 모델상한(client, Anthropic, 모델, 신호)
    const maxTokens = 상한 ? Math.min(기본최대토큰, 상한) : 기본최대토큰
    const stream = client.messages.stream(
      {
        model: 모델,
        max_tokens: maxTokens,
        system: 시스템,
        messages: 메시지.map((m) => ({ role: m.역할, content: m.내용 })),
      },
      { signal: 신호 },
    )
    stream.on('text', 조각)
    최종 = await stream.finalMessage()
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

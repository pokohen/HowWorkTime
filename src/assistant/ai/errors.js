/**
 * 제공자별로 다른 오류를 화면에 보여줄 한 가지 모양으로 정리한다.
 * 종류: abort(사용자 중단) · auth(키 문제) · rate(한도) · request(요청 거부) · network(연결/CORS) · server · stale(새 버전 배포) · unknown
 */
export class 어시스턴트오류 extends Error {
  constructor(종류, 메시지, 원인) {
    super(메시지, 원인 ? { cause: 원인 } : undefined)
    this.name = '어시스턴트오류'
    this.종류 = 종류
  }
}

const 상태별메시지 = {
  auth: 'API 키가 올바르지 않거나 권한이 없어요. 설정에서 키를 확인해 주세요.',
  rate: '요청 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.',
  server: '제공자 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
  // OpenAI 는 키가 틀리면 401 응답에 CORS 헤더가 없어 브라우저에서는 연결 실패로만 보인다. 키 확인도 같이 안내한다
  network: '연결에 실패했어요. 네트워크 상태와 API 키가 맞는지 확인해 주세요. (키가 틀려도 이렇게 보일 수 있어요)',
}

/** HTTP 상태 코드 → 오류 종류 */
function 상태코드종류(status) {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate'
  if (status >= 500) return 'server'
  if (status >= 400) return 'request'
  return 'unknown'
}

/** 제공자가 문자열로 주는 오류 코드 (OpenAI 등) → 종류 */
const 문자코드종류 = {
  rate_limit_exceeded: 'rate',
  insufficient_quota: 'rate',
  invalid_api_key: 'auth',
  authentication_error: 'auth',
  permission_error: 'auth',
  context_length_exceeded: 'request',
  invalid_request_error: 'request',
  server_error: 'server',
  overloaded_error: 'server',
  // Gemini 의 status 문자열
  unauthenticated: 'auth',
  permission_denied: 'auth',
  resource_exhausted: 'rate',
  unavailable: 'server',
  internal: 'server',
  invalid_argument: 'request',
}

/**
 * 상태 코드·문자 코드·상세 문구를 모아 종류를 정한다. 세 입구(HTTP 실패, 스트림 안 오류, SDK 예외)가 같은 규칙을 쓴다.
 * @param {{ status?: unknown, code?: unknown, 상세?: string }} 단서
 */
function 종류추정({ status, code, 상세 = '' }) {
  // Gemini 는 { code: 429, status: 'RESOURCE_EXHAUSTED' }, OpenAI 는 { code: 'rate_limit_exceeded' } 꼴. 숫자가 있으면 숫자부터
  const 숫자 = [status, code].map(Number).find((n) => Number.isFinite(n) && n > 0)
  const 문자 = [code, status].map((v) => 문자코드종류[String(v ?? '').toLowerCase()]).find(Boolean)
  let 종류 = 숫자 ? 상태코드종류(숫자) : (문자 ?? 'unknown')
  // Gemini 는 잘못된 키를 400 으로 돌려준다 ("API key not valid"). 키 문제로 안내하는 편이 낫다
  if ((종류 === 'request' || 종류 === 'unknown') && /api key/i.test(상세)) 종류 = 'auth'
  return 종류
}

/** 종류에 맞는 안내 문구. 정해진 문구가 없으면 제공자의 상세 문구를 그대로 보여 준다 */
function 종류메시지(종류, 상세, 대안 = '요청이 거부됐어요') {
  return 상태별메시지[종류] ?? (상세 ? `${대안}: ${상세}` : `${대안}.`)
}

/**
 * fetch 응답이 실패일 때 본문의 메시지를 꺼내 오류를 만든다.
 * 제공자 응답은 { error: { message } } 꼴이 일반적이지만 아닐 수도 있어 느슨하게 읽는다.
 */
export async function 응답오류(응답) {
  let 상세 = ''
  let 코드
  try {
    const 본문 = await 응답.json()
    상세 = 본문?.error?.message ?? 본문?.message ?? ''
    코드 = 본문?.error?.code
  } catch { /* 본문이 JSON 이 아니면 상태 코드만으로 안내 */ }
  const 종류 = 종류추정({ status: 응답.status, code: 코드, 상세 })
  const 메시지 = 종류메시지(종류, 상세 || `HTTP ${응답.status}`)
  return new 어시스턴트오류(종류, 메시지, 상세 || undefined)
}

/**
 * 200 으로 열린 스트림 안에서 온 오류 페이로드({ error: { code|status, message } })를 어시스턴트오류로 바꾼다.
 * 숫자 코드(Gemini 429)와 문자 코드(OpenAI 'rate_limit_exceeded') 모두 가린다.
 */
export function 스트림오류(오류본문) {
  const 상세 = 오류본문?.message ?? ''
  let 종류 = 종류추정({ status: 오류본문?.status, code: 오류본문?.code, 상세 })
  if (종류 === 'unknown') 종류 = 'server' // 스트림이 열린 뒤의 정체 모를 오류는 제공자 쪽 문제로 안내
  return new 어시스턴트오류(종류, 종류메시지(종류, 상세), 오류본문)
}

/** 아무 예외든 어시스턴트오류로 바꾼다 (이미 어시스턴트오류면 그대로) */
export function 오류정리(예외) {
  if (예외 instanceof 어시스턴트오류) {
    if (!예외.message && 상태별메시지[예외.종류]) return new 어시스턴트오류(예외.종류, 상태별메시지[예외.종류], 예외.cause)
    return 예외
  }
  // fetch 의 AbortError. (Anthropic SDK 의 중단·연결 오류는 name 이 'Error' 라 anthropic.js 가 클래스로 가려 보낸다)
  if (예외?.name === 'AbortError') {
    return new 어시스턴트오류('abort', '응답을 중단했어요.', 예외)
  }
  // Anthropic SDK 의 APIError 계열(HTTP 오류)은 status 를 가진다
  if (typeof 예외?.status === 'number') {
    const 종류 = 종류추정({ status: 예외.status, 상세: 예외.message })
    return new 어시스턴트오류(종류, 종류메시지(종류, 예외.message), 예외)
  }
  // fetch 가 TypeError 를 던지는 경우: 오프라인, DNS, CORS 차단 등.
  // 메시지로 가려서 제공자 모듈 안의 일반 프로그래밍 오류(undefined 접근 등)가 '네트워크 문제'로 둔갑하지 않게 한다
  const 네트워크TypeError = 예외 instanceof TypeError && /fetch|network|load failed|connection/i.test(예외.message ?? '')
  if (네트워크TypeError) {
    return new 어시스턴트오류('network', 상태별메시지.network, 예외)
  }
  return new 어시스턴트오류('unknown', `알 수 없는 오류가 났어요: ${예외?.message ?? 예외}`, 예외)
}

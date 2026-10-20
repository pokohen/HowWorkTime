import { 제공자여부 } from './providers'
import { 어시스턴트오류, 오류정리 } from './errors'

// 제공자 모듈은 실제로 쓸 때만 불러온다 (Anthropic SDK 포함)
const 구현불러오기 = {
  anthropic: () => import('./anthropic'),
  openai: () => import('./openai'),
  gemini: () => import('./gemini'),
}

// 'network' 종류에 빈 메시지를 넣으면 오류정리가 안내 문구를 채운다
const 네트워크오류 = (원인) => 오류정리(new 어시스턴트오류('network', '', 원인))

/**
 * 제공자에 맞는 구현으로 대화를 요청한다. 모든 예외는 어시스턴트오류로 정리돼 던져진다.
 *
 * @param {{ 제공자: string, 키: string, 모델: string, 시스템: string, 메시지: Array<{ 역할: 'user'|'assistant', 내용: string }>, 신호?: AbortSignal, 조각: (텍스트: string) => void }} 옵션
 * @returns {Promise<{ 텍스트: string, 잘림: boolean }>} 전체 응답 텍스트와 출력 상한에 걸렸는지
 */
export async function 대화요청({ 제공자, 키, 모델, ...나머지 }) {
  if (!제공자여부(제공자)) throw new 어시스턴트오류('request', '지원하지 않는 제공자예요.')
  if (!키) throw new 어시스턴트오류('auth', 'API 키를 먼저 설정해 주세요.')
  if (!모델) throw new 어시스턴트오류('request', '모델을 먼저 설정해 주세요.')
  let 구현
  try {
    구현 = await 구현불러오기[제공자]()
  } catch (예외) {
    // 오프라인이면 청크를 못 받는 것뿐이다. 새로고침하라고 하면 멀쩡한 화면이 오류 페이지로 바뀐다
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw 네트워크오류(예외)
    // 새 버전이 배포되면 옛 번들의 청크 주소가 사라져 import 가 실패한다. 네트워크·키 문제가 아니라 새로고침이 답이다
    throw new 어시스턴트오류('stale', '앱이 새 버전으로 바뀌었어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.', 예외)
  }
  try {
    return await 구현.대화요청({ 키, 모델, ...나머지 })
  } catch (예외) {
    throw 오류정리(예외)
  }
}

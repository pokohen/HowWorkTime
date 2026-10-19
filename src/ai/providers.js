/**
 * 사용자가 고를 수 있는 AI 제공자 목록.
 * 키는 사용자가 직접 발급받아 설정에 넣고, 그 브라우저의 localStorage 에만 저장된다.
 * 모델 ID 는 자유 입력이라 목록은 추천 예시일 뿐이다 (새 모델이 나오면 그대로 입력하면 된다).
 */
export const 제공자목록 = {
  anthropic: {
    이름: 'Anthropic',
    모델가족: 'Claude',
    기본모델: 'claude-opus-5-5',
    모델예시: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
    키발급: 'https://console.anthropic.com/settings/keys',
    키형식: 'sk-ant-api…',
  },
  openai: {
    이름: 'OpenAI',
    모델가족: 'GPT',
    기본모델: 'gpt-5.1',
    모델예시: ['gpt-5.1', 'gpt-5-mini', 'gpt-4.1'],
    키발급: 'https://platform.openai.com/api-keys',
    키형식: 'sk-…',
  },
  gemini: {
    이름: 'Google',
    모델가족: 'Gemini',
    기본모델: 'gemini-2.5-flash',
    모델예시: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    키발급: 'https://aistudio.google.com/apikey',
    키형식: 'AIza…',
  },
}

export const 제공자ID목록 = Object.keys(제공자목록)
export const 기본제공자 = 'anthropic'

export function 제공자여부(값) {
  return typeof 값 === 'string' && Object.hasOwn(제공자목록, 값)
}

import { describe, it, expect } from 'vitest'
import {
  새탭, 제목추출, 직렬화, 복원, 메시지최대, 탭최대,
  기본설정, 설정직렬화, 설정복원, 저장소읽기, 저장소쓰기,
} from '../src/utils/assistantStorage'

function 메시지(역할, 내용, 추가 = {}) {
  return { id: `${역할}-${내용}`, 역할, 내용, 시각: 1, ...추가 }
}

describe('제목추출', () => {
  it('첫 줄을 공백 정리해 제한 길이로 자른다', () => {
    expect(제목추출('  다음 달   연휴에\n뭐 할까')).toBe('다음 달 연휴에')
    expect(제목추출('가나다라마바사아자차카타파하가나다라마바사', 10)).toBe('가나다라마바사아자차…')
    expect(제목추출('')).toBe('')
    expect(제목추출(null)).toBe('')
  })
})

describe('직렬화 → 복원', () => {
  it('탭·메시지·활성탭을 그대로 되살린다', () => {
    const 탭 = { ...새탭(100), 제목: '주말 계획', 메시지: [메시지('user', '안녕'), 메시지('assistant', '반가워요')] }
    const 복구 = 복원(직렬화({ 탭목록: [탭], 활성탭ID: 탭.id }))
    expect(복구.활성탭ID).toBe(탭.id)
    expect(복구.탭목록).toHaveLength(1)
    expect(복구.탭목록[0]).toMatchObject({ id: 탭.id, 제목: '주말 계획', 생성시각: 100 })
    expect(복구.탭목록[0].메시지.map((m) => [m.역할, m.내용])).toEqual([['user', '안녕'], ['assistant', '반가워요']])
  })

  it('진행 중 표시는 중단됨으로 저장하고, 내용도 오류도 없는 빈 응답은 버린다', () => {
    const 탭 = { ...새탭(), 메시지: [
      메시지('user', '질문'),
      메시지('assistant', '', { 진행중: true }),
      메시지('assistant', '', { 오류: '키 오류' }),
      메시지('assistant', '일부만', { 중단됨: true, 진행중: false }),
      메시지('assistant', '받는 중', { 진행중: true }),
    ] }
    const 저장 = JSON.parse(직렬화({ 탭목록: [탭], 활성탭ID: 탭.id }))
    expect(저장.탭목록[0].메시지).toHaveLength(4)
    expect(저장.탭목록[0].메시지.some((m) => '진행중' in m)).toBe(false)
    expect(저장.탭목록[0].메시지[1]).toMatchObject({ 오류: '키 오류' })
    expect(저장.탭목록[0].메시지[2]).toMatchObject({ 중단됨: true, 내용: '일부만' })
    expect(저장.탭목록[0].메시지[3]).toMatchObject({ 중단됨: true, 내용: '받는 중' })
  })

  it('상한을 넘는 오래된 메시지·탭은 잘라낸다', () => {
    const 탭 = { ...새탭(), 메시지: Array.from({ length: 메시지최대 + 5 }, (_, i) => 메시지('user', `m${i}`)) }
    const 탭들 = Array.from({ length: 탭최대 + 3 }, (_, i) => ({ ...새탭(), id: `t${i}`, 메시지: [메시지('user', 'x')] }))
    const 복구 = 복원(직렬화({ 탭목록: [탭, ...탭들], 활성탭ID: 탭.id }))
    expect(복구.탭목록).toHaveLength(탭최대)
    // 가장 오래된(앞쪽) 탭이 빠졌고, 사라진 활성탭 대신 마지막 탭이 활성이 된다
    expect(복구.탭목록.some((t) => t.id === 탭.id)).toBe(false)
    expect(복구.활성탭ID).toBe('t22')
    const 큰탭 = 복원(직렬화({ 탭목록: [탭], 활성탭ID: 탭.id })).탭목록[0]
    expect(큰탭.메시지).toHaveLength(메시지최대)
    expect(큰탭.메시지[0].내용).toBe('m5')
  })

  it('깨진 저장값은 null, 일부만 깨졌으면 나머지를 살린다', () => {
    expect(복원(null)).toBeNull()
    expect(복원('')).toBeNull()
    expect(복원('{not json')).toBeNull()
    expect(복원('{"탭목록": "x"}')).toBeNull()
    expect(복원('{"탭목록": []}')).toBeNull()
    const 복구 = 복원(JSON.stringify({
      탭목록: [
        { id: 'ok', 메시지: [{ 역할: 'user', 내용: '정상' }, { 역할: 'system', 내용: '이상' }, { 역할: 'assistant' }] },
        { id: 7, 메시지: [] },
        null,
      ],
      활성탭ID: 'ok',
    }))
    expect(복구.탭목록).toHaveLength(1)
    expect(복구.탭목록[0].메시지).toHaveLength(1)
    expect(복구.탭목록[0].메시지[0].id).toBeTypeOf('string')
  })
})

describe('설정', () => {
  it('기본 설정은 제공자별 기본 모델과 빈 키를 가진다', () => {
    const 설정 = 기본설정()
    expect(설정.제공자).toBe('anthropic')
    expect(설정.모델.anthropic).toBe('claude-opus-5-5')
    expect(설정.키.openai).toBe('')
  })

  it('저장된 설정을 기본값 위에 덧씌우고 모르는 값은 무시한다', () => {
    const 설정 = 설정복원(설정직렬화({
      제공자: 'gemini',
      모델: { gemini: ' gemini-2.5-pro ', anthropic: '', unknown: 'x' },
      키: { gemini: ' AIza-test ', openai: 123 },
    }))
    expect(설정.제공자).toBe('gemini')
    expect(설정.모델.gemini).toBe('gemini-2.5-pro')
    expect(설정.모델.anthropic).toBe('claude-opus-5-5') // 빈 문자열은 기본값 유지
    expect(설정.모델.unknown).toBeUndefined()
    expect(설정.키.gemini).toBe('AIza-test')
    expect(설정.키.openai).toBe('')
    expect(설정복원('{"제공자":"nope"}').제공자).toBe('anthropic')
    expect(설정복원('broken').제공자).toBe('anthropic')
  })
})

describe('저장소 보호', () => {
  it('저장소가 없거나 예외를 던져도 앱은 계속 간다', () => {
    const 터지는저장소 = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
    expect(저장소읽기('k', 터지는저장소)).toBeNull()
    expect(저장소쓰기('k', 'v', 터지는저장소)).toBe(false)
    expect(저장소읽기('k', undefined)).toBeNull()
    const 메모리 = new Map()
    const 정상 = { getItem: (k) => 메모리.get(k) ?? null, setItem: (k, v) => 메모리.set(k, v) }
    expect(저장소쓰기('k', 'v', 정상)).toBe(true)
    expect(저장소읽기('k', 정상)).toBe('v')
  })
})

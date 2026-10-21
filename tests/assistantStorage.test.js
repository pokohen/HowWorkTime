import { describe, it, expect, vi } from 'vitest'
import {
  새탭, 제목추출, 직렬화, 메시지최대, 탭최대,
  기본설정, 설정직렬화, 설정복원, 저장본읽기, 대화합치기, 메시지합치기, 설정합치기, 상한맞추기,
} from '../src/assistant/utils/assistantStorage'
import { 저장소읽기, 저장소쓰기 } from '../src/shared/utils/storage'

/** 저장본읽기로 되돌린 상태 (복원할 수 없으면 null) */
const 복원 = (문자열) => 저장본읽기(문자열).상태 ?? null

function 메시지(역할, 내용, 추가 = {}) {
  return { id: `${역할}-${내용}`, 역할, 내용, 시각: 1, ...추가 }
}

describe('제목추출', () => {
  it('첫 줄을 공백 정리해 제한 길이로 자른다', () => {
    expect(제목추출('  다음 달   연휴에\n뭐 할까')).toBe('다음 달 연휴에')
    expect(제목추출('가나다라마바사아자차카타파하가나다라마바사', 10)).toBe('가나다라마바사아자차…')
    // 보이는 글자 단위로 자른다: 이모지·가족 이모지·국기 가운데를 자르지 않는다
    expect(제목추출('🏖️🏖️🏖️ 여행', 2)).toBe('🏖️🏖️…')
    expect(제목추출('👨‍👩‍👧‍👦 가족여행', 2)).toBe('👨‍👩‍👧‍👦…')
    expect(제목추출('🇰🇷🇯🇵🇺🇸', 2)).toBe('🇰🇷🇯🇵…')
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

  it('진행 중 표시는 중단됨으로 저장하고, 아무 표시도 없는 빈 응답만 버린다', () => {
    const 탭 = { ...새탭(), 메시지: [
      메시지('user', '질문'),
      메시지('assistant', '', { 진행중: true }), // 첫 글자 전에 새로고침 → 중단됨으로 남겨 다시 시도할 수 있게
      메시지('assistant', ''),
      메시지('assistant', '', { 오류: '키 오류' }),
      메시지('assistant', '일부만', { 중단됨: true, 진행중: false }),
      메시지('assistant', '받는 중', { 진행중: true, 잘림: true }),
    ] }
    const 저장 = JSON.parse(직렬화({ 탭목록: [탭], 활성탭ID: 탭.id }))
    expect(저장.탭목록[0].메시지).toHaveLength(5)
    expect(저장.탭목록[0].메시지.some((m) => '진행중' in m)).toBe(false)
    // 받는 중이던 응답은 '받는중' 으로 저장하고, 복원하면 일단 다른 창이 받는 중으로 본다 (잠금 확인이 곧 가린다)
    expect(저장.탭목록[0].메시지[1]).toMatchObject({ 받는중: true, 내용: '' })
    expect(저장.탭목록[0].메시지[2]).toMatchObject({ 오류: '키 오류' })
    expect(저장.탭목록[0].메시지[3]).toMatchObject({ 중단됨: true, 내용: '일부만' })
    expect(저장.탭목록[0].메시지[4]).toMatchObject({ 받는중: true, 잘림: true, 내용: '받는 중' })
    const 다시연 = 복원(JSON.stringify(저장)).탭목록[0].메시지
    expect(다시연[1]).toMatchObject({ 다른창받는중: true })
    expect(다시연[3]).toMatchObject({ 중단됨: true })
    expect(다시연[4]).toMatchObject({ 다른창받는중: true, 잘림: true })
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

describe('여러 창 합치기', () => {
  const 탭 = (id, 수정시각, 내용 = id) => ({ id, 제목: id, 생성시각: 수정시각, 수정시각, 메시지: [메시지('user', 내용)] })

  it('받는중 답은 다른 창이 받는 중으로 복원한다 (다시 시도 대상이 아님)', () => {
    const 저장 = 직렬화({ 탭목록: [{ ...탭('a', Date.now()), 메시지: [메시지('user', 'q'), 메시지('assistant', '', { 진행중: true })] }], 활성탭ID: 'a' })
    const 받은 = 복원(저장).탭목록[0].메시지[1]
    expect(받은.다른창받는중).toBe(true)
    expect(받은.중단됨).toBeUndefined()
    // id 가 없거나 숫자인 옛 데이터도 받는중 표시를 잃지 않는다
    const 옛 = JSON.stringify({ 탭목록: [{ id: 'a', 메시지: [{ id: 7, 역할: 'assistant', 내용: '', 받는중: true }] }] })
    expect(복원(옛).탭목록[0].메시지[0].다른창받는중).toBe(true)
  })

  it('상한을 넘으면 받는 중인 대화는 지키고, 버린 대화는 삭제 기록에 남긴다', () => {
    const 내것 = { 탭목록: Array.from({ length: 20 }, (_, i) => 탭(`t${i}`, i + 1)) }
    const 남의것 = { 탭목록: [...내것.탭목록.slice(1), 탭('new', 100)], 삭제기록: { t0: 50 } }
    const 결과 = 대화합치기(내것, 남의것, { 고정ID: 't0', 지금: 200 })
    expect(결과.탭목록.map((t) => t.id)).toContain('t0')
    expect(결과.탭목록.map((t) => t.id)).toContain('new')
    expect(결과.탭목록).toHaveLength(20)
    expect(결과.삭제기록.t1).toBe(200) // 고정이 아닌 가장 오래된 것을 버리고 기록
  })

  it('상한에서 다른 창이 받는 중인 대화도 버리지 않는다', () => {
    const 목록 = Array.from({ length: 21 }, (_, i) => 탭(`t${i}`, i + 1))
    const 기록 = {}
    상한맞추기(목록, 기록, { 지킬ID: new Set(['t0']), 지금: 100 })
    expect(목록.map((t) => t.id)).toContain('t0')
    expect(목록).toHaveLength(20)
    expect(Object.keys(기록)).toEqual(['t1'])
  })

  it('대화 id 별로 더 최근 쪽을 쓰고, 한 창의 옛 목록이 다른 창의 새 대화를 지우지 않는다', () => {
    const 내것 = { 탭목록: [탭('a', 10, '내 a'), 탭('b', 5, '내 b')], 삭제기록: {} }
    const 남의것 = { 탭목록: [탭('a', 3, '남 a'), 탭('b', 9, '남 b'), 탭('c', 7)], 삭제기록: {} }
    const 결과 = 대화합치기(내것, 남의것)
    expect(결과.탭목록.map((t) => t.id)).toEqual(['c', 'b', 'a']) // 만든 순서대로
    // 더 최근 쪽을 바탕으로 하고, 진 쪽에만 있는 질문도 잃지 않는다 (질문은 지워지지 않는다)
    expect(결과.탭목록.find((t) => t.id === 'b').메시지.map((m) => m.내용).sort()).toEqual(['남 b', '내 b'])
    expect(결과.탭목록.find((t) => t.id === 'a').메시지.map((m) => m.내용).sort()).toEqual(['남 a', '내 a'])
    expect(결과.탭목록.find((t) => t.id === 'a')).toBe(내것.탭목록[0]) // 내가 이기면 내 객체 그대로
  })

  it('지운 대화는 되살아나지 않고, 지운 뒤 다시 바뀐 대화는 남는다', () => {
    const 내것 = { 탭목록: [], 삭제기록: { a: 10 } }
    const 남의것 = { 탭목록: [탭('a', 8), 탭('b', 12)], 삭제기록: { b: 11 } }
    expect(대화합치기(내것, 남의것, { 지금: 20 }).탭목록.map((t) => t.id)).toEqual(['b'])
  })

  it('이 창에서 받는 중인 대화는 늘 내 것', () => {
    const 내것 = { 탭목록: [탭('a', 1, '받는 중')] }
    const 남의것 = { 탭목록: [탭('a', 99, '옛')], 삭제기록: { a: 50 } }
    const 결과 = 대화합치기(내것, 남의것, { 고정ID: 'a' }).탭목록[0]
    expect(결과).toBe(내것.탭목록[0])
    expect(결과.메시지.map((m) => m.내용)).toContain('받는 중')
  })

  describe('메시지 단위 합치기', () => {
    const 질 = (id, 시각) => ({ id, 역할: 'user', 내용: id, 시각 })
    const 답 = (id, 시각, 더 = {}) => ({ id, 역할: 'assistant', 내용: id, 시각, ...더 })

    it('다른 쪽에만 있는 질문+답 묶음을 질문 시각 순서로 끼운다 (묶음은 갈라지지 않는다)', () => {
      const 기준 = [질('q', 1), 답('a', 2), 질('qA', 10), 답('aA', 30)]
      const 다른쪽 = [질('q', 1), 답('a', 2), 질('qB', 20), 답('aB', 25)]
      expect(메시지합치기(기준, 다른쪽).map((m) => m.id)).toEqual(['q', 'a', 'qA', 'aA', 'qB', 'aB'])
      const 먼저 = [질('q', 1), 답('a', 2), 질('qB', 5), 답('aB', 6)]
      expect(메시지합치기(기준, 먼저).map((m) => m.id)).toEqual(['q', 'a', 'qB', 'aB', 'qA', 'aA'])
    })

    it('질문은 늘 옮기고, 짝 없는 실패 답(다시 시도로 지운 답)은 옮기지 않는다', () => {
      const 기준 = [질('q', 1)]
      expect(메시지합치기(기준, [질('q', 1), 답('e', 2, { 내용: '', 오류: '실패' })])).toBe(기준)
      expect(메시지합치기(기준, [질('q', 1), 질('q2', 3)]).map((m) => m.id)).toEqual(['q', 'q2'])
      // 다른 창이 받는 중인 묶음은 기준에 받는 중인 답이 없으면 묶음째 맨 끝에 (받는 중 표시를 잃지 않게)
      expect(메시지합치기(기준, [질('q', 1), 질('q2', 3), 답('r', 4, { 다른창받는중: true })]).map((m) => m.id)).toEqual(['q', 'q2', 'r'])
      // 기준에도 받는 중인 답이 있으면 질문만 그 앞에
      const 받는기준 = [질('q', 1), 질('qA', 2), 답('rA', 3, { 진행중: true })]
      expect(메시지합치기(받는기준, [질('q', 1), 질('q2', 5), 답('r', 6, { 다른창받는중: true })]).map((m) => m.id)).toEqual(['q', 'q2', 'qA', 'rA'])
      // 옮긴 질문의 실패 답은 함께 (그 창의 대화)
      expect(메시지합치기(기준, [질('q', 1), 질('q2', 3), 답('e2', 4, { 내용: '', 오류: '실패' })]).map((m) => m.id)).toEqual(['q', 'q2', 'e2'])
    })

    it('기준의 받는 중인 답 뒤로는 끼우지 않는다 (받는 중인 답이 늘 마지막)', () => {
      const 기준 = [질('q', 1), 답('a', 2), 질('qA', 10), 답('aA', 11, { 내용: '', 다른창받는중: true })]
      const 다른쪽 = [질('q', 1), 답('a', 2), 질('qB', 20), 답('aB', 25)]
      expect(메시지합치기(기준, 다른쪽).map((m) => m.id)).toEqual(['q', 'a', 'qB', 'aB', 'qA', 'aA'])
    })

    it('다른 창의 다시 시도로 다 받은 답(새 id)은 기준의 실패 답을 바꾸고, 다 받은 답이 있으면 두지 않는다', () => {
      const 다른쪽 = [질('q', 1), 답('a2', 5)]
      expect(메시지합치기([질('q', 1), 답('e', 2, { 내용: '', 오류: '실패' })], 다른쪽).map((m) => m.id)).toEqual(['q', 'a2'])
      expect(메시지합치기([질('q', 1)], 다른쪽).map((m) => m.id)).toEqual(['q', 'a2'])
      const 이미 = [질('q', 1), 답('a1', 3)]
      expect(메시지합치기(이미, 다른쪽)).toBe(이미)
    })

    it('잘린시각보다 오래된 것만 잘린 옛 기록으로 보고 옮기지 않는다', () => {
      const 기준 = [질('q5', 50), 답('a5', 51)]
      const 다른쪽 = [질('옛q', 10), 답('옛a', 11), 질('q5', 50), 답('a5', 51)]
      expect(메시지합치기(기준, 다른쪽, { 잘린시각: 50 })).toBe(기준)
      // 잘린 적 없으면 공통 앞이 없어도, 시각 순서로 앞에 놓였던 다른 창의 질문도 잃지 않는다
      expect(메시지합치기(기준, 다른쪽).map((m) => m.id)).toEqual(['옛q', '옛a', 'q5', 'a5'])
      const 짧은 = [질('qA', 10), 답('aA', 11)]
      expect(메시지합치기(짧은, [질('qB', 5), 답('aB', 6)]).map((m) => m.id)).toEqual(['qB', 'aB', 'qA', 'aA'])
      // 경계와 같은 시각도 잘린 것으로, 공통 메시지 뒤의 메시지는 시각이 경계보다 작아도(시계가 되돌려짐) 옮긴다
      expect(메시지합치기(기준, [질('같은', 50), ...다른쪽.slice(2)], { 잘린시각: 50 })).toBe(기준)
      expect(메시지합치기(기준, [...다른쪽.slice(2), 질('뒤', 3)], { 잘린시각: 50 }).map((m) => m.id)).toContain('뒤')
    })

    it('잘린시각이 없는 예전 판 저장본: 기준이 상한 가까이 차 있으면 기준 첫 메시지 앞을 잘린 것으로 본다', () => {
      const 꽉찬 = Array.from({ length: 200 }, (_, i) => (i % 2 ? 답(`a${i}`, 100 + i) : 질(`q${i}`, 100 + i)))
      expect(메시지합치기(꽉찬, [질('옛q', 10), 답('옛a', 11), ...꽉찬])).toBe(꽉찬)
    })

    it('잘린시각은 잘라 낸 것 가운데 가장 늦은 시각 (합친 대화는 시각 순서가 아닐 수 있다)', () => {
      const 메시지 = [질('q1', 100), 답('a1', 500), ...Array.from({ length: 200 }, (_, i) => 질(`n${i}`, 200 + i))]
      const 저장본 = 복원(직렬화({ 탭목록: [{ id: 't', 제목: '', 생성시각: 1, 수정시각: 9, 메시지 }], 활성탭ID: 't' }))
      expect(저장본.탭목록[0].잘린시각).toBe(500)
    })

    it('메시지가 같아도 내 잘린시각이 더 크면 지킨다', () => {
      const 메시지 = [질('q', 300), 답('a', 301)]
      const 내탭 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 5, 잘린시각: 200, 메시지 }
      const 남탭 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 9, 메시지: [...메시지] }
      expect(대화합치기({ 탭목록: [내탭] }, { 탭목록: [남탭] }).탭목록[0].잘린시각).toBe(200)
    })

    it('저장 때 상한으로 자르면 잘린시각을 남기고, 합칠 때 그 경계를 지킨다', () => {
      const 많은 = Array.from({ length: 210 }, (_, i) => (i % 2 ? 답(`a${i}`, 100 + i) : 질(`q${i}`, 100 + i)))
      const 저장본 = 복원(직렬화({ 탭목록: [{ id: 't', 제목: '', 생성시각: 1, 수정시각: 9, 메시지: 많은 }], 활성탭ID: 't' }))
      expect(저장본.탭목록[0].잘린시각).toBe(109) // 잘라 낸 마지막 메시지의 시각
      expect(저장본.탭목록[0].메시지).toHaveLength(200)
      // 메모리에 더 긴 기록을 가진 창: 저장본(더 최근)이 이기면 잘린 앞부분을 되살리지 않는다
      const 내탭 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 5, 메시지: 많은 }
      const 결과 = 대화합치기({ 탭목록: [내탭] }, 저장본).탭목록[0]
      expect(결과.메시지).toHaveLength(200)
      expect(결과.잘린시각).toBe(109)
    })

    it('이음점의 답이 받는 중이어도 그 뒤로 끼우지 않는다 (받는 중인 답이 늘 마지막)', () => {
      const 기준 = [질('q', 1), 답('a_new', 5, { 내용: '', 진행중: true })]
      const 다른쪽 = [질('q', 1), 답('a_old', 2, { 내용: '', 오류: '실패' }), 질('qB', 3), 답('aB', 4)]
      // 받는 중인 묶음(q, a_new) 앞에 둔다. 시간 순서보다 '받는 중인 답이 마지막'을 앞세운 절충이다
      expect(메시지합치기(기준, 다른쪽).map((m) => m.id)).toEqual(['qB', 'aB', 'q', 'a_new'])
    })

    it('바꾼 답의 옛 id 를 다른 쪽에서 만나도 이음점을 잃지 않는다', () => {
      const 기준 = [질('q', 1), 답('e', 2, { 내용: '', 오류: '실패' })]
      const 다른쪽 = [질('q', 1), 답('a2', 3), 답('e', 2, { 내용: '', 오류: '실패' }), 질('q3', 0)]
      expect(메시지합치기(기준, 다른쪽).map((m) => m.id)).toEqual(['q', 'a2', 'q3'])
    })

    it('기준에서 다른 창이 받는 중이던 답은 다른 쪽의 다 받은 답으로 바꾸고, 입력은 바꾸지 않는다', () => {
      const 기준 = [질('q', 1), 답('a', 2, { 내용: '', 다른창받는중: true })]
      const 다른쪽 = [질('q', 1), 답('a', 2, { 내용: '완성' })]
      const 결과 = 메시지합치기(기준, 다른쪽)
      expect(결과.at(-1).내용).toBe('완성')
      expect(기준.at(-1).다른창받는중).toBe(true)
      // 이 창이 받는 중인 답(진행중)은 바꾸지 않는다
      const 내것 = [질('q', 1), 답('a', 2, { 내용: '받는 중', 진행중: true })]
      expect(메시지합치기(내것, 다른쪽)).toBe(내것)
    })

    it('한 대화의 메시지를 합치지 못해도 대화합치기는 실패하지 않고 그 대화만 더 최근 사본을 쓴다', () => {
      const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {})
      const 이상한 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 9, 메시지: [null] }
      const 내탭 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 5, 메시지: [질('q', 1)] }
      const 다른탭 = { id: 'u', 제목: '', 생성시각: 2, 수정시각: 5, 메시지: [질('q2', 1)] }
      const 결과 = 대화합치기({ 탭목록: [내탭, 다른탭] }, { 탭목록: [이상한, { ...다른탭, 메시지: [질('q2', 1), 답('a2', 2)] }] })
      expect(결과.탭목록.find((t) => t.id === 't').메시지).toEqual([null])
      expect(결과.탭목록.find((t) => t.id === 'u').메시지.map((m) => m.id)).toEqual(['q2', 'a2'])
      expect(결과.합치지못함.map((f) => f.id)).toEqual(['t']) // 부르는 쪽이 기록·안내할 수 있게
      오류.mockRestore()
    })

    it('대화합치기는 남의 사본을 바꾸지 않는다', () => {
      const 남탭 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 9, 메시지: [질('q', 1), 답('a', 2)] }
      const 내탭 = { id: 't', 제목: '', 생성시각: 1, 수정시각: 5, 메시지: [질('q', 1), 질('q2', 3), 답('a2', 4)] }
      const 결과 = 대화합치기({ 탭목록: [내탭] }, { 탭목록: [남탭] })
      expect(결과.탭목록[0].메시지.map((m) => m.id)).toEqual(['q', 'a', 'q2', 'a2'])
      expect(남탭.메시지.map((m) => m.id)).toEqual(['q', 'a'])
    })
  })

  it('저장본읽기: 정상·새판·깨짐·없음을 가린다 (비어 있는 저장본은 깨짐, 새 형식은 탭목록이 있어도 새판)', () => {
    expect(저장본읽기(null).종류).toBe('없음')
    expect(저장본읽기('{').종류).toBe('깨짐')
    expect(저장본읽기('{"버전":1,"탭목록":[]}').종류).toBe('깨짐')
    expect(저장본읽기('{"버전":2}').종류).toBe('새판')
    expect(저장본읽기('{"버전":2,"탭목록":[{"id":"a","메시지":[]}]}').종류).toBe('새판')
    expect(저장본읽기('{"버전":"9"}').종류).toBe('깨짐') // 정수가 아닌 버전은 새 형식으로 보지 않는다
    const 정상 = 저장본읽기(직렬화({ 탭목록: [탭('a', 1)], 활성탭ID: 'a' }))
    expect(정상.종류).toBe('정상')
    expect(정상.상태.탭목록[0].id).toBe('a')
  })

  it('설정은 이 창에서 안 바꾼 필드만 다른 창 값으로', () => {
    const 마지막 = 기본설정()
    const 내설정 = { ...기본설정(), 키: { ...기본설정().키, anthropic: '고치던 키' } }
    const 남의설정 = { ...기본설정(), 제공자: 'openai', 키: { ...기본설정().키, anthropic: '남의 키', openai: 'sk-남' } }
    const 결과 = 설정합치기(내설정, 마지막, 남의설정)
    expect(결과.제공자).toBe('openai')
    expect(결과.키.anthropic).toBe('고치던 키')
    expect(결과.키.openai).toBe('sk-남')
  })
})

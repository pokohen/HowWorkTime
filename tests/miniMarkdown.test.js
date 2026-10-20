import { describe, it, expect } from 'vitest'
import { 마크다운HTML, 마크다운텍스트, HTML이스케이프 } from '../src/assistant/utils/miniMarkdown'

describe('마크다운HTML', () => {
  it('HTML 을 먼저 이스케이프해 스크립트가 끼어들 수 없다', () => {
    expect(HTML이스케이프(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
    const html = 마크다운HTML('<script>alert(1)</script> **굵게**')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<strong>굵게</strong>')
  })

  it('숫자로 시작하는 문장은 번호 목록이 아니다 (1 로 시작하거나 이어질 때만 목록)', () => {
    expect(마크다운HTML('2026. 상반기에는 설 연휴가 가장 길어요')).toBe('<p>2026. 상반기에는 설 연휴가 가장 길어요</p>')
    expect(마크다운HTML('1. 하나\n2. 둘')).toBe('<ol><li>하나</li><li>둘</li></ol>')
    expect(마크다운HTML('3. 셋')).toBe('<p>3. 셋</p>')
    // 빈 줄로 띄운 번호 항목은 이어지는 목록으로, 번호가 다시 1 부터 매겨지지 않게 start 를 붙인다
    expect(마크다운HTML('1. 강릉\n\n2. 속초\n\n3. 여수')).toBe('<ol><li>강릉</li></ol><ol start="2"><li>속초</li></ol><ol start="3"><li>여수</li></ol>')
    expect(마크다운HTML('1. 하나\n\n문단\n\n2. 둘')).toBe('<ol><li>하나</li></ol><p>문단</p><p>2. 둘</p>')
    // 모델이 번호를 1 로만 써도 마크다운처럼 이어서 센다
    expect(마크다운HTML('1. 강릉\n\n1. 속초\n\n1. 여수')).toBe('<ol><li>강릉</li></ol><ol start="2"><li>속초</li></ol><ol start="3"><li>여수</li></ol>')
    expect(마크다운HTML('1. 하나\n2. 둘\n\n3. 셋')).toBe('<ol><li>하나</li><li>둘</li></ol><ol start="3"><li>셋</li></ol>')
  })

  it('구분선("---", "* * *")은 글머리가 아니라 수평선으로, 복사 텍스트에서는 빈 줄로', () => {
    expect(마크다운HTML('첫째 날\n\n* * *\n\n둘째 날')).toBe('<p>첫째 날</p><hr><p>둘째 날</p>')
    expect(마크다운HTML('---')).toBe('<hr>')
    expect(마크다운텍스트('첫째 날\n---\n둘째 날')).toBe('첫째 날\n\n둘째 날')
  })

  it('입력에 NUL 이 섞여 있어도 코드 자리표시와 충돌하지 않는다', () => {
    expect(마크다운HTML('a \u00001\u0000 `c`')).toBe('<p>a 1 <code>c</code></p>')
  })

  it('코드 스팬 안의 별표는 굵게로 바꾸지 않는다', () => {
    expect(마크다운HTML('`**/*.log` 패턴과 **강조**')).toBe('<p><code>**/*.log</code> 패턴과 <strong>강조</strong></p>')
    expect(마크다운텍스트('`**/*.log` 패턴과 **강조**')).toBe('**/*.log 패턴과 강조')
  })

  it('문단·줄바꿈·굵게·코드를 바꾼다', () => {
    expect(마크다운HTML('첫 줄\n둘째 줄\n\n새 문단')).toBe('<p>첫 줄<br>둘째 줄</p><p>새 문단</p>')
    expect(마크다운HTML('`코드` 와 **강조**')).toBe('<p><code>코드</code> 와 <strong>강조</strong></p>')
  })

  it('글머리·번호 목록과 제목을 바꾸고, 들여쓴 이어지는 줄은 항목에 붙인다', () => {
    const html = 마크다운HTML('## 추천\n- 첫째\n- 둘째\n  이어서\n\n1. 하나\n2. 둘\n본문')
    expect(html).toBe(
      '<h4>추천</h4>'
      + '<ul><li>첫째</li><li>둘째 이어서</li></ul>'
      + '<ol><li>하나</li><li>둘</li></ol><p>본문</p>',
    )
  })

  it('빈 입력과 CRLF 를 처리한다', () => {
    expect(마크다운HTML('')).toBe('')
    expect(마크다운HTML(null)).toBe('')
    expect(마크다운HTML('a\r\nb')).toBe('<p>a<br>b</p>')
  })
})

describe('마크다운텍스트', () => {
  it('기호를 걷어내 메신저에 붙여 넣기 좋은 일반 텍스트로 만든다', () => {
    const 입력 = '## 추천 일정\n\n- **첫째 날**: 강릉 `카페` 투어\n- 둘째 날\n\n\n1. 하나\n2. 둘\n'
    expect(마크다운텍스트(입력)).toBe('추천 일정\n\n• 첫째 날: 강릉 카페 투어\n• 둘째 날\n\n1. 하나\n2. 둘')
  })

  it('빈 입력은 빈 문자열', () => {
    expect(마크다운텍스트('')).toBe('')
    expect(마크다운텍스트(null)).toBe('')
  })
})

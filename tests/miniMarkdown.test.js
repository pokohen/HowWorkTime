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

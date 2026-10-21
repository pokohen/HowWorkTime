import { describe, it, expect } from 'vitest'
import { 마크다운HTML, 마크다운텍스트, HTML이스케이프 } from '../src/assistant/utils/miniMarkdown'

// 태그 사이 줄바꿈은 화면에 영향이 없으므로 걷어 내고 비교한다
const 화면 = (텍스트) => 마크다운HTML(텍스트).replace(/\n(?=<)|(?<=>)\n/g, '')
const 복사 = 마크다운텍스트

describe('마크다운HTML (화면)', () => {
  it('입력의 HTML 은 이스케이프하고, 위험한 링크는 링크로 만들지 않는다', () => {
    expect(HTML이스케이프(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
    const html = 화면('<script>alert(1)</script> **굵게** [x](javascript:alert(1)) [y](https://a.com)')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<strong>굵게</strong>')
    expect(html).not.toContain('href="javascript')
    expect(html).toContain('<a href="https://a.com" target="_blank" rel="noopener noreferrer">y</a>')
  })

  it('이미지는 불러오지 않는다', () => {
    expect(화면('![사진](https://a.com/x.png)')).not.toContain('<img')
  })

  it('문단·줄바꿈·굵게·코드·제목·구분선', () => {
    expect(화면('첫 줄\n둘째 줄\n\n새 문단')).toBe('<p>첫 줄<br>둘째 줄</p><p>새 문단</p>')
    expect(화면('## 추천')).toBe('<h4>추천</h4>')
    expect(화면('첫째 날\n\n* * *\n\n둘째 날')).toBe('<p>첫째 날</p><hr><p>둘째 날</p>')
    expect(화면('`**/*.log` 패턴과 **강조**')).toBe('<p><code>**/*.log</code> 패턴과 <strong>강조</strong></p>')
    expect(화면('a\r\nb')).toBe('<p>a<br>b</p>')
    expect(화면('')).toBe('')
    expect(화면(null)).toBe('')
  })

  it('연도로 시작하는 문장은 번호 목록이 아니다', () => {
    expect(화면('2026. 상반기에는 설 연휴가 가장 길어요')).toBe('<p>2026. 상반기에는 설 연휴가 가장 길어요</p>')
  })

  it('번호 목록: 빈 줄로 띄우거나 1 로만 적어도 이어서 센다', () => {
    expect(화면('1. 강릉\n\n1. 속초\n\n1. 여수')).toBe('<ol><li><p>강릉</p></li><li><p>속초</p></li><li><p>여수</p></li></ol>')
    expect(화면('1. 하나\n\n문단\n\n2. 둘')).toBe('<ol><li>하나</li></ol><p>문단</p><ol start="2"><li>둘</li></ol>')
  })

  it('하위 목록은 몇 단계든, 번호든 글머리든 제자리에 중첩된다', () => {
    expect(화면('1. 첫째 날\n   - 아침 산책\n   - 점심 회\n2. 둘째 날\n- 메모'))
      .toBe('<ol><li>첫째 날<ul><li>아침 산책</li><li>점심 회</li></ul></li><li>둘째 날</li></ol><ul><li>메모</li></ul>')
    expect(화면('1. 첫째 날\n   1. 아침\n   2. 점심\n2. 둘째 날')).toBe('<ol><li>첫째 날<ol><li>아침</li><li>점심</li></ol></li><li>둘째 날</li></ol>')
    expect(화면('1. a\n   - s1\n     - ss\n   - s2')).toBe('<ol><li>a<ul><li>s1<ul><li>ss</li></ul></li><li>s2</li></ul></li></ol>')
    // 탭으로 들여 써도 코드가 아니라 목록이다
    expect(화면('- a\n\t- b')).toBe('<ul><li>a<ul><li>b</li></ul></li></ul>')
  })

  it('하위 목록 뒤의 문장과 목록 안의 코드 블록은 항목 안 제자리에 남는다', () => {
    expect(화면('1. a\n   - s\n\n   계속')).toBe('<ol><li><p>a</p><ul><li>s</li></ul><p>계속</p></li></ol>')
    expect(화면('1. 예:\n   ```\n   foo\n   ```\n2. b\n\n끝')).toBe('<ol><li>예:<pre><code>foo</code></pre></li><li>b</li></ol><p>끝</p>')
  })

  it('코드 블록 안은 제목·목록·구분선 규칙을 적용하지 않는다', () => {
    const html = 마크다운HTML('설명\n```\n# 주석\n- x\n---\n```\n끝')
    expect(html).toContain('<pre><code># 주석\n- x\n---\n</code></pre>')
    expect(마크다운HTML('```\n<b>')).toContain('&lt;b&gt;')
  })
})

describe('마크다운텍스트 (복사)', () => {
  it('기호를 걷어내 메신저에 붙여 넣기 좋은 글로', () => {
    expect(복사('## 추천 일정\n\n- **첫째 날**: 강릉 `카페` 투어\n- 둘째 날\n\n\n1. 하나\n2. 둘\n'))
      .toBe('추천 일정\n\n• 첫째 날: 강릉 카페 투어\n• 둘째 날\n\n1. 하나\n2. 둘')
    expect(복사('`**/*.log` 패턴과 **강조**')).toBe('**/*.log 패턴과 강조')
    expect(복사('[지도](https://map.example)')).toBe('지도 (https://map.example)')
    expect(복사('첫째 날\n---\n\n둘째 날')).toBe('첫째 날\n\n둘째 날')
    expect(복사('')).toBe('')
    expect(복사(null)).toBe('')
  })

  it('번호는 화면과 같고, 하위 목록·이어지는 문단은 두 칸씩 들여 쓴다', () => {
    expect(복사('1. 강릉\n\n1. 속초\n\n1. 여수')).toBe('1. 강릉\n2. 속초\n3. 여수')
    expect(복사('1. 첫째 날\n   - 아침 산책\n   - 점심 회\n2. 둘째 날\n- 메모')).toBe('1. 첫째 날\n  • 아침 산책\n  • 점심 회\n2. 둘째 날\n\n• 메모')
    expect(복사('1. a\n   - s1\n     - ss\n   - s2')).toBe('1. a\n  • s1\n    • ss\n  • s2')
    expect(복사('- a\n\n  b')).toBe('• a\n\n  b') // 항목 안 두 문단은 빈 줄로 나뉜다
  })

  it('코드 블록은 글자 그대로', () => {
    expect(복사('설명\n```python\n# 주석\n- x\n---\n```\n끝')).toBe('설명\n\n# 주석\n- x\n---\n\n끝')
  })
})

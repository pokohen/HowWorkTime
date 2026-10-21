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
    // 빈 줄로 띄운 번호 항목은 한 목록으로 이어진다
    expect(마크다운HTML('1. 강릉\n\n2. 속초\n\n3. 여수')).toBe('<ol><li>강릉</li><li>속초</li><li>여수</li></ol>')
    // 설명 문단을 사이에 두고 바로 다음 번호가 오면 이어서 센다 (아무 번호나는 아니다)
    expect(마크다운HTML('1. 하나\n\n문단\n\n2. 둘')).toBe('<ol><li>하나</li></ol><p>문단</p><ol start="2"><li>둘</li></ol>')
    expect(마크다운HTML('1. a\n2. b\n\n설명 문단\n\n3. c')).toBe('<ol><li>a</li><li>b</li></ol><p>설명 문단</p><ol start="3"><li>c</li></ol>')
    expect(마크다운HTML('1. 하나\n\n문단\n\n5. 다섯')).toBe('<ol><li>하나</li></ol><p>문단</p><p>5. 다섯</p>')
    // 모델이 번호를 1 로만 써도 마크다운처럼 이어서 센다
    expect(마크다운HTML('1. 강릉\n\n1. 속초\n\n1. 여수')).toBe('<ol><li>강릉</li><li>속초</li><li>여수</li></ol>')
    expect(마크다운HTML('1. 하나\n2. 둘\n\n3. 셋')).toBe('<ol><li>하나</li><li>둘</li><li>셋</li></ol>')
    // 복사 텍스트도 화면과 같은 번호
    expect(마크다운텍스트('1. 강릉\n\n1. 속초\n\n1. 여수')).toBe('1. 강릉\n2. 속초\n3. 여수')
  })

  it('번호 항목 아래 들여쓴 글머리는 하위 목록이고, 그 뒤 번호는 이어진다', () => {
    const 입력 = '1. 첫째 날\n   - 아침 산책\n   - 점심 회\n2. 둘째 날\n- 메모'
    expect(마크다운HTML(입력)).toBe('<ol><li>첫째 날<ul><li>아침 산책</li><li>점심 회</li></ul></li><li>둘째 날</li></ol><ul><li>메모</li></ul>')
    expect(마크다운텍스트(입력)).toBe('1. 첫째 날\n  • 아침 산책\n  • 점심 회\n2. 둘째 날\n\n• 메모')
    // 들여쓰지 않은 글머리가 끼어도 다음 번호는 이어진다
    expect(마크다운HTML('1. 하나\n- 메모\n2. 둘')).toBe('<ol><li>하나</li></ol><ul><li>메모</li></ul><ol start="2"><li>둘</li></ol>')
  })

  it('빈 줄 뒤 들여쓴 설명·하위 글머리는 항목에 남고, 다음 번호도 이어진다', () => {
    const 설명 = '1. **강릉**\n\n   바다가 가깝다\n\n2. **속초**\n\n   설악산'
    expect(마크다운HTML(설명)).toBe('<ol><li><strong>강릉</strong><p>바다가 가깝다</p></li><li><strong>속초</strong><p>설악산</p></li></ol>')
    expect(마크다운텍스트(설명)).toBe('1. 강릉\n  바다가 가깝다\n2. 속초\n  설악산')
    const 하위 = '1. 첫째 날\n\n   - 아침 산책\n   - 점심 회\n\n2. 둘째 날'
    expect(마크다운HTML(하위)).toBe('<ol><li>첫째 날<ul><li>아침 산책</li><li>점심 회</li></ul></li><li>둘째 날</li></ol>')
  })

  it('들여쓴 번호 하위 목록은 부모 번호를 밀어내지 않는다', () => {
    const 입력 = '1. 첫째 날\n   1. 아침\n   2. 점심\n2. 둘째 날'
    expect(마크다운HTML(입력)).toBe('<ol><li>첫째 날<ol><li>아침</li><li>점심</li></ol></li><li>둘째 날</li></ol>')
    expect(마크다운텍스트(입력)).toBe('1. 첫째 날\n  1. 아침\n  2. 점심\n2. 둘째 날')
  })

  it('하위 목록 뒤에 이어지는 줄은 부모 항목에, 원래 순서대로 남는다', () => {
    expect(마크다운HTML('1. 첫째 날\n   - 아침 산책\n  오후는 자유 시간')).toBe('<ol><li>첫째 날<ul><li>아침 산책</li></ul><p>오후는 자유 시간</p></li></ol>')
    expect(마크다운텍스트('1. a\n   - s\n   계속')).toBe('1. a\n  • s\n  계속')
  })

  it('하위 목록은 몇 단계든 제자리에 중첩된다', () => {
    const 입력 = '1. a\n   - s1\n     - ss\n   - s2'
    expect(마크다운HTML(입력)).toBe('<ol><li>a<ul><li>s1<ul><li>ss</li></ul></li><li>s2</li></ul></li></ol>')
    expect(마크다운텍스트(입력)).toBe('1. a\n  • s1\n    • ss\n  • s2')
  })

  it('목록 안의 코드 블록·구분선도 항목에 남고 뒤 번호는 이어진다', () => {
    expect(마크다운HTML('1. a\n   ```\n   x\n   ```\n2. b')).toBe('<ol><li>a<pre><code>x</code></pre></li><li>b</li></ol>')
    expect(마크다운HTML('- a\n  ---\n- b')).toBe('<ul><li>a<hr></li><li>b</li></ul>')
  })

  it('글머리 목록 뒤 새 번호 목록은 1 부터 시작한다', () => {
    expect(마크다운HTML('1. 강릉\n2. 속초\n\n- 팁\n\n1. 수영복\n2. 선크림')).toBe('<ol><li>강릉</li><li>속초</li></ol><ul><li>팁</li></ul><ol><li>수영복</li><li>선크림</li></ol>')
  })

  it('복사 글에서 하위 글머리와 이어지는 줄의 들여쓰기를 지킨다', () => {
    expect(마크다운텍스트('- 강릉\n  - 경포대\n  - 안목해변')).toBe('• 강릉\n  • 경포대\n  • 안목해변')
    expect(마크다운텍스트('- 항목\n  설명 줄')).toBe('• 항목\n  설명 줄')
  })

  it('코드 블록 안은 제목·목록·구분선 규칙을 적용하지 않는다', () => {
    const 입력 = '설명\n```python\n# 주석\n- x\n---\n```\n끝'
    expect(마크다운HTML(입력)).toBe('<p>설명</p><pre><code># 주석\n- x\n---</code></pre><p>끝</p>')
    expect(마크다운텍스트(입력)).toBe('설명\n\n# 주석\n- x\n---\n\n끝')
    expect(마크다운HTML('```\n<b>')).toBe('<pre><code>&lt;b&gt;</code></pre>')
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

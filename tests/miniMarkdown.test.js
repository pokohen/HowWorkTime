import { describe, it, expect } from 'vitest'
import { 마크다운HTML, 마크다운텍스트 } from '../src/assistant/utils/miniMarkdown'

// 태그 사이·<br> 뒤 줄바꿈은 화면에 영향이 없으므로 걷어 내고 비교한다 (코드 블록 안의 줄바꿈은 남긴다)
// (코드 안의 '>' 는 &gt; 로 바뀌므로 '>\n' 은 늘 태그 끝이다)
const 화면 = (텍스트) => 마크다운HTML(텍스트)
  .replace(/>\n/g, '>')
  .replace(/\n(?=<(?!\/code>))/g, '')
  .replace(/\n$/, '')
const 복사 = 마크다운텍스트

describe('마크다운HTML (화면)', () => {
  it('입력의 HTML 은 이스케이프하고, 위험한 링크는 링크로 만들지 않는다', () => {
    const html = 화면('<script>alert(1)</script> **굵게** [x](javascript:alert(1)) [y](https://a.com)')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<strong>굵게</strong>')
    expect(html).not.toContain('href="javascript')
    expect(html).toContain('<a href="https://a.com" target="_blank" rel="noopener noreferrer">y</a>')
  })

  it('이미지는 불러오지 않고 설명을 링크로 보여 준다', () => {
    expect(화면('![지도](https://a.com/x.png)')).toBe('<p><a href="https://a.com/x.png" target="_blank" rel="noopener noreferrer">지도</a></p>')
    expect(복사('![지도](https://a.com/x.png)')).toBe('지도 (https://a.com/x.png)')
    // 링크 안의 이미지(배지 꼴)는 링크를 겹치지 않고 바깥 링크의 글이 된다
    expect(화면('[![지도](https://a.com/x.png)](https://b.com)')).toBe('<p><a href="https://b.com" target="_blank" rel="noopener noreferrer">지도</a></p>')
    expect(복사('[![지도](https://a.com/x.png)](https://b.com)')).toBe('지도 (https://b.com)')
    // 설명 안의 마크다운 기호는 벗긴다
    expect(화면('![**굵은** 설명](https://a.com/x.png)')).toContain('>굵은 설명</a>')
    expect(화면('![`코드` 설명](https://a.com/x.png)')).toContain('>코드 설명</a>') // 화면과 복사 글이 같은 설명
    expect(화면('![지도 [보기](https://x.com)](https://a.com/m.png)')).toContain('>지도 보기</a>') // 설명 안 링크 주소는 붙이지 않는다
    expect(복사('![지도 [보기](https://x.com)](https://a.com/m.png)')).toBe('지도 보기 (https://a.com/m.png)')
  })

  it('문단·줄바꿈·굵게·코드·제목·구분선', () => {
    expect(화면('첫 줄\n둘째 줄\n\n새 문단')).toBe('<p>첫 줄<br>둘째 줄</p><p>새 문단</p>')
    expect(화면('## 추천')).toBe('<h4>추천</h4>')
    expect(화면('첫째 날\n\n* * *\n\n둘째 날')).toBe('<p>첫째 날</p><hr><p>둘째 날</p>')
    // 글 줄 바로 아래 "---" 도 제목이 아니라 구분선이다
    expect(화면('첫째 날\n---\n\n둘째 날')).toBe('<p>첫째 날</p><hr><p>둘째 날</p>')
    expect(화면('`**/*.log` 패턴과 **강조**')).toBe('<p><code>**/*.log</code> 패턴과 <strong>강조</strong></p>')
    expect(화면('a\r\nb')).toBe('<p>a<br>b</p>')
    expect(화면('')).toBe('')
    expect(화면(null)).toBe('')
  })

  it('연도로 시작하는 줄의 연도는 사라지지 않는다', () => {
    // 연도·날짜로 시작하는 줄은 목록이 아니라 문단이다 (날짜가 계단식 목록으로 쪼개지지 않게)
    expect(화면('2026. 상반기에는 설 연휴가 가장 길어요')).toBe('<p>2026. 상반기에는 설 연휴가 가장 길어요</p>')
    expect(화면('2026. 1. 1. 신정은 휴일')).toBe('<p>2026. 1. 1. 신정은 휴일</p>')
    expect(복사('2026. 상반기에는 길고\n추석도 길어요')).toBe('2026. 상반기에는 길고\n추석도 길어요')
    expect(화면('2026.')).toBe('<p>2026.</p>')
    // 문단이 어디서 끝나는지는 원래 규칙 그대로: 목록·제목은 끊고, 탭 들여쓴 목록도 목록으로
    expect(화면('2026. 계획\n- 설\n## 끝')).toBe('<p>2026. 계획</p><ul><li>설</li></ul><h4>끝</h4>')
    expect(화면('2026. 계획\n\t- 설날')).toBe('<p>2026. 계획<br>- 설날</p>') // 일반 문단과 같이, 들여 쓴 줄은 이어지는 줄
    expect(화면('계획\n\t- 설날')).toBe('<p>계획<br>- 설날</p>')
    // 문단·목록 항목 안에 이어지는 연도 줄은 같은 문단으로 남는다 (글이 붙지 않는다)
    expect(화면('올해 휴일은\n2026. 1. 1. 신정')).toBe('<p>올해 휴일은<br>2026. 1. 1. 신정</p>')
    expect(화면('- 올해\n  2026. 상반기')).toBe('<ul><li>올해<br>2026. 상반기</li></ul>')
    // 목록 바로 뒤의 연도 줄은 표준의 다른 번호 줄처럼 목록을 끝내고, 그 자리에서 문단이 된다 (다시 매겨지지 않게)
    expect(화면('- 올해 휴일\n3. 신정')).toBe('<ul><li>올해 휴일</li></ul><ol start="3"><li>신정</li></ol>')
    expect(화면('- 올해 휴일\n2026. 1. 1. 신정')).toBe('<ul><li>올해 휴일</li></ul><p>2026. 1. 1. 신정</p>')
    expect(화면('1. 올해 휴일\n2026. 1. 1. 신정')).toBe('<ol><li>올해 휴일</li></ol><p>2026. 1. 1. 신정</p>')
    // 인용 뒤의 번호 줄은 표준대로 인용을 끝낸다 (일반 "3. …" 줄과 같다). 연도 줄은 그 자리에서 목록 대신 문단이 된다
    expect(화면('> 인용\n3. 셋')).toBe('<blockquote><p>인용</p></blockquote><ol start="3"><li>셋</li></ol>')
    expect(화면('> 인용\n2026. 연도')).toBe('<blockquote><p>인용</p></blockquote><p>2026. 연도</p>')
    // 네 자리 번호면 연도 범위와 무관하게 문단, 세 자리 이하는 보통 목록
    expect(화면('1592. 임진왜란')).toBe('<p>1592. 임진왜란</p>')
    expect(화면('1897. 10. 12. 대한제국 선포')).toBe('<p>1897. 10. 12. 대한제국 선포</p>')
    expect(화면('2200. 먼 미래')).toBe('<p>2200. 먼 미래</p>')
    expect(화면('98. a\n99. b\n100. c\n101. d')).toBe('<ol start="98"><li>a</li><li>b</li><li>c</li><li>d</li></ol>')
    expect(복사('98. a\n99. b\n100. c\n101. d')).toBe('98. a\n99. b\n100. c\n101. d')
    // 번호 목록 뒤의 연도 줄은 목록을 끝내고 문단이 되며, 그 뒤 번호는 적힌 번호로 다시 시작한다
    expect(화면('1. 예:\n\n2026. 상반기')).toBe('<ol><li>예:</li></ol><p>2026. 상반기</p>')
    expect(복사('1. a\n\n2026. b\n\n3. c')).toBe('1. a\n\n2026. b\n\n3. c')
    expect(복사('1. a\n1. b\n1. c\n\n2026. d')).toBe('1. a\n2. b\n3. c\n\n2026. d')
    expect(복사('1. 예:\n   ```\n   foo\n\n2026. 상반기')).toBe('1. 예:\n  foo\n\n2026. 상반기')
    // 코드 블록 안의 연도 줄은 손대지 않는다 (들여 쓴 울타리, 목록 표시와 같은 줄의 울타리, 더 들여 쓴 울타리 모두)
    expect(복사('  ```\nfoo\n2026. x\n  ```\n2026. 끝')).toBe('foo\n2026. x\n\n2026. 끝')
    expect(복사('- ```\n  2026. 코드\n  ```')).toBe('• 2026. 코드')
    expect(복사('1. 예:\n     ```\n   2026. 계획\n     ```')).toBe('1. 예:\n  2026. 계획')
    // 코드 블록 안은 건드리지 않고, 울타리 길이·글자가 다른 줄로는 코드 블록이 닫히지 않는다
    expect(복사('~~~\n```\n2026. 계획\n~~~\n2026. 끝')).toBe('```\n2026. 계획\n\n2026. 끝')
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
    expect(화면('1. 예:\n   ```\n   foo\n   ```\n2. b\n\n끝')).toBe('<ol><li>예:<pre><code>foo\n</code></pre></li><li>b</li></ol><p>끝</p>')
  })

  it('코드 블록 안은 제목·목록·구분선 규칙을 적용하지 않는다', () => {
    const html = 마크다운HTML('설명\n```\n# 주석\n- x\n---\n```\n끝')
    expect(html).toContain('<pre><code># 주석\n- x\n---\n</code></pre>')
    expect(마크다운HTML('```\n<b>')).toContain('&lt;b&gt;')
    expect(화면('```\na\nb\n```')).toBe('<pre><code>a\nb\n</code></pre>') // 코드 안 줄바꿈은 지킨다
  })
})

describe('마크다운텍스트 (복사)', () => {
  it('기호를 걷어내 메신저에 붙여 넣기 좋은 글로', () => {
    expect(복사('## 추천 일정\n\n- **첫째 날**: 강릉 `카페` 투어\n- 둘째 날\n\n\n1. 하나\n2. 둘\n'))
      .toBe('추천 일정\n\n• 첫째 날: 강릉 카페 투어\n• 둘째 날\n\n1. 하나\n2. 둘')
    expect(복사('`**/*.log` 패턴과 **강조**')).toBe('**/*.log 패턴과 강조')
    expect(복사('[지도](https://map.example)')).toBe('지도 (https://map.example)')
    // 글이 곧 주소면 다시 붙이지 않고, 한글 주소는 읽을 수 있게
    expect(복사('<https://map.example/강릉>')).toBe('https://map.example/강릉')
    expect(복사('<a@b.com>')).toBe('a@b.com')
    expect(복사('[강릉 지도](https://map.example/강릉)')).toBe('강릉 지도 (https://map.example/강릉)')
    // 공백 등 ASCII·공백류·방향 바꿈 글자는 풀지 않고, 섞여 있어도 한글은 한 글자씩 푼다
    expect(복사('[여기](https://a.com/a%20b?q=%EA%B0%95)')).toBe('여기 (https://a.com/a%20b?q=강)')
    expect(복사('[강릉 지도](https://a.com/%EA%B0%95%20%EB%A6%89)')).toBe('강릉 지도 (https://a.com/강%20릉)')
    expect(복사('[x](https://a.com/%E3%80%80%C2%A0%E2%80%AE)')).toBe('x (https://a.com/%E3%80%80%C2%A0%E2%80%AE)')
    // 오른쪽→왼쪽 문자는 풀지 않고, 잘린 바이트가 뒤의 멀쩡한 글자를 삼키지 않는다
    expect(복사('[x](https://a.com/%D7%90%D7%91?q=1)')).toBe('x (https://a.com/%D7%90%D7%91?q=1)')
    expect(복사('[x](https://a.com/%EA%B0%EB%A6%89)')).toBe('x (https://a.com/%EA%B0릉)')
    expect(복사('[x](https://a.com/%E3%85%A4b)')).toBe('x (https://a.com/%E3%85%A4b)') // 보이지 않는 한글 채움 문자
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

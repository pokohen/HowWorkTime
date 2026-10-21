import MarkdownIt from 'markdown-it'

/**
 * 모델 응답의 마크다운을 화면용 HTML 과 공유용 일반 텍스트로 바꾼다.
 * 해석은 CommonMark 구현(markdown-it)에 맡기고, 여기서는 화면에 맞춘 설정과 토큰 → 일반 텍스트 변환만 한다.
 * 같은 토큰에서 두 결과를 만들므로 목록 번호·중첩이 화면과 복사 글에서 늘 같다.
 *
 * 안전: html 을 끄면 입력의 HTML 은 전부 글자로 이스케이프되고, 링크는 javascript: 같은 주소를 거른다.
 * 그래서 v-html 에 넣어도 스크립트가 끼어들 수 없다.
 */
const md = new MarkdownIt({ html: false, linkify: false, breaks: true, typographer: false })
  // 외부 이미지를 불러오지 않고(사생활), 표는 쓰지 말라고 프롬프트에 적어 두었으므로 끈다.
  // 네 칸 들여쓴 줄을 코드로 보는 규칙도 끈다: 모델이 탭·깊은 들여쓰기로 목록을 쓰면 글이 코드 상자가 된다 (``` 코드는 그대로)
  .disable(['image', 'table', 'code'])

// 제목은 말풍선 안에서 한 단계 크기만 쓴다
md.renderer.rules.heading_open = () => '<h4>'
md.renderer.rules.heading_close = () => '</h4>'
// 링크는 새 탭에서, 이 페이지에 접근하지 못하게
const 기본링크 = md.renderer.rules.link_open ?? ((tokens, i, options, env, self) => self.renderToken(tokens, i, options))
md.renderer.rules.link_open = (tokens, i, options, env, self) => {
  tokens[i].attrSet('target', '_blank')
  tokens[i].attrSet('rel', 'noopener noreferrer')
  return 기본링크(tokens, i, options, env, self)
}

const 이스케이프표 = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function HTML이스케이프(텍스트) {
  return String(텍스트).replace(/[&<>"']/g, (c) => 이스케이프표[c])
}

/**
 * CommonMark 는 "2026. 상반기에는…" 을 2026 번부터 시작하는 번호 목록으로 읽는다.
 * 세 자리 이상 번호는 실제 목록일 일이 거의 없으므로 연도로 보고 점을 이스케이프한다 (코드 블록 안은 그대로).
 */
function 연도보호(텍스트) {
  let 코드안 = false
  return String(텍스트 ?? '')
    .split('\n')
    .map((줄) => {
      if (/^\s*(```|~~~)/.test(줄)) { 코드안 = !코드안; return 줄 }
      return 코드안 ? 줄 : 줄.replace(/^(\s*\d{3,})([.)])(\s)/, '$1\\$2$3')
    })
    .join('\n')
}

const 파싱 = (텍스트) => md.parse(연도보호(텍스트), {})

/**
 * @param {string} 텍스트
 * @returns {string} HTML
 */
export function 마크다운HTML(텍스트) {
  return md.renderer.render(파싱(텍스트), md.options, {})
}

/** 인라인 토큰 → 글. 굵게·기울임 기호는 벗기고, 링크는 글 뒤에 주소를 붙인다 */
function 인라인글(토큰들) {
  let 글 = ''
  let 링크주소 = null
  for (const 토큰 of 토큰들 ?? []) {
    switch (토큰.type) {
      case 'text': case 'code_inline': 글 += 토큰.content; break
      case 'softbreak': case 'hardbreak': 글 += '\n'; break
      case 'link_open': 링크주소 = 토큰.attrGet('href'); break
      case 'link_close': if (링크주소 && !글.endsWith(링크주소)) 글 += ` (${링크주소})`; 링크주소 = null; break
      default: break
    }
  }
  return 글
}

/**
 * 공유용 일반 텍스트. 마크다운 기호를 걷어내 메신저·메모에 붙여 넣어도 깔끔하게 보인다.
 * 제목은 그대로 한 줄, 글머리는 "• ", 번호 목록은 화면과 같은 번호로, 하위 목록과 이어지는 줄은 두 칸씩 들여 쓴다.
 * 구분선은 빈 줄, 코드 블록은 글자 그대로. 블록 사이에는 빈 줄을 두되 촘촘한 목록의 항목 사이는 붙인다.
 * @param {string} 텍스트
 * @returns {string}
 */
export function 마크다운텍스트(텍스트) {
  const 줄들 = []
  const 목록들 = [] // 열린 목록마다 { 번호: number|null } (글머리면 null)
  let 들여 = ''
  let 항목머리 = null // 다음에 쓸 첫 줄 앞에 붙일 "• " / "3. "
  let 블록끝 = false // 같은 그릇 안에서 블록이 하나 끝났는지. 다음 블록 앞에 빈 줄을 둔다

  const 빈줄 = () => { if (블록끝 && 줄들.length && 줄들[줄들.length - 1] !== '') 줄들.push('') }
  const 쓰기 = (글) => {
    for (const 줄 of 글.split('\n')) {
      if (항목머리 != null) { 줄들.push(항목머리 + 줄); 항목머리 = null } else 줄들.push(줄 ? 들여 + 줄 : '')
    }
  }
  const 남은머리쓰기 = () => { if (항목머리 != null) { 줄들.push(항목머리.trimEnd()); 항목머리 = null } }

  for (const 토큰 of 파싱(텍스트)) {
    switch (토큰.type) {
      case 'paragraph_open': if (!토큰.hidden) 빈줄(); break
      case 'paragraph_close': if (!토큰.hidden) 블록끝 = true; break
      case 'heading_open': 빈줄(); break
      case 'heading_close': 블록끝 = true; break
      case 'inline': 쓰기(인라인글(토큰.children)); break
      case 'fence': case 'code_block': 빈줄(); 쓰기(토큰.content.replace(/\n$/, '')); 블록끝 = true; break
      case 'hr': 블록끝 = true; break
      case 'bullet_list_open': case 'ordered_list_open':
        if (목록들.length === 0) 빈줄()
        남은머리쓰기() // 글 없이 하위 목록부터 시작한 항목
        목록들.push({ 번호: 토큰.type === 'ordered_list_open' ? Number(토큰.attrGet('start') ?? 1) : null })
        블록끝 = false
        break
      case 'bullet_list_close': case 'ordered_list_close':
        목록들.pop()
        if (목록들.length === 0) 블록끝 = true
        break
      case 'list_item_open': {
        const 목록 = 목록들[목록들.length - 1]
        항목머리 = 들여 + (목록.번호 == null ? '• ' : `${목록.번호++}. `)
        들여 += '  '
        블록끝 = false
        break
      }
      case 'list_item_close':
        남은머리쓰기() // 빈 항목
        들여 = 들여.slice(2)
        블록끝 = false
        break
      default: break
    }
  }
  return 줄들.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

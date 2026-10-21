import MarkdownIt from 'markdown-it'

/**
 * 모델 응답의 마크다운을 화면용 HTML 과 공유용 일반 텍스트로 바꾼다.
 * 해석은 CommonMark 구현(markdown-it)에 맡기고, 여기서는 화면에 맞춘 설정과 토큰 → 일반 텍스트 변환만 한다.
 * 같은 토큰에서 두 결과를 만들므로 목록 번호·중첩이 화면과 복사 글에서 늘 같다.
 *
 * 안전: html 을 끄면 입력의 HTML 은 전부 글자로 이스케이프되고, 링크·이미지 주소는 javascript: 같은 것을 거른다.
 * 그래서 v-html 에 넣어도 스크립트가 끼어들 수 없다.
 */
const md = new MarkdownIt({ html: false, linkify: false, breaks: true, typographer: false })
  // 표는 쓰지 말라고 프롬프트에 적어 두었으므로 끈다.
  // 네 칸 들여쓴 줄을 코드로 보는 규칙도 끈다: 모델이 탭·깊은 들여쓰기로 목록을 쓰면 글이 코드 상자가 된다 (``` 코드는 그대로).
  // 글 줄 바로 아래 "---" 를 그 줄의 제목으로 만드는 규칙(setext)도 끈다: 모델은 그 자리에 구분선을 뜻한다
  .disable(['table', 'code', 'lheading'])

// 연도·날짜로 시작하는 줄("2026. 상반기에는…", "2026. 1. 1. 신정")은 CommonMark 상 번호 목록(날짜면 계단식 중첩 목록)이 된다.
// 세 자리 이상 번호로 시작하는 줄은 실제 목록일 일이 거의 없으므로, 목록 규칙보다 먼저 도는 블록 규칙이 문단으로 가져간다.
// 열린 목록의 다음 항목 자리에 와도 이 규칙이 목록을 끝내므로(alt 에 list) 연도는 늘 글 그대로 남는다.
// 코드 블록 안은 펜스 규칙이 먼저 가져가므로 이 규칙이 닿지 않는다 (공개 API: ruler.before 와 블록 상태만 쓴다)
const 연도줄 = /^\d{3,}[.)](\s|$)/
/** 이 줄이 문단을 끊고 새 블록을 시작하는 줄인지 (빈 줄·글머리·1. 목록·제목·코드·구분선·인용) */
const 블록시작줄 = /^(\s*$|[-*+]\s|1[.)]\s|#{1,6}\s|```|~~~|([-*_])(\s*\2){2,}\s*$|>)/
md.block.ruler.before('list', '연도문단', (state, 시작줄, 끝줄, silent) => {
  if (state.sCount[시작줄] - state.blkIndent >= 4) return false
  const 줄글 = (줄) => state.src.slice(state.bMarks[줄] + state.tShift[줄], state.eMarks[줄])
  if (!연도줄.test(줄글(시작줄))) return false
  if (silent) return true
  let 다음줄 = 시작줄 + 1
  while (다음줄 < 끝줄 && state.sCount[다음줄] >= state.blkIndent && !블록시작줄.test(줄글(다음줄))) 다음줄++
  const 글 = state.getLines(시작줄, 다음줄, state.blkIndent, false).trim()
  const 여는 = state.push('paragraph_open', 'p', 1)
  여는.map = [시작줄, 다음줄]
  const 인라인 = state.push('inline', '', 0)
  인라인.content = 글
  인라인.map = [시작줄, 다음줄]
  인라인.children = []
  state.push('paragraph_close', 'p', -1)
  state.line = 다음줄
  return true
}, { alt: ['paragraph', 'reference', 'blockquote', 'list'] })

// 제목은 말풍선 안에서 한 단계 크기만 쓴다
md.renderer.rules.heading_open = () => '<h4>'
md.renderer.rules.heading_close = () => '</h4>'
/** 이미지 설명 글. 설명 안의 마크다운(**굵게** 등)은 기호를 벗긴 글로 */
const 이미지설명 = (토큰) => 인라인글(토큰.children, { 주소: false }) || '이미지' // 복사 글과 같은 글 (코드 글자는 남기고 주소는 붙이지 않는다)
/** 같은 인라인 안에서 이 토큰이 링크 안에 있는지 (링크 안의 이미지 = 배지 꼴) */
function 링크안(tokens, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (tokens[j].type === 'link_close') return false
    if (tokens[j].type === 'link_open') return true
  }
  return false
}
// 이미지는 불러오지 않고(사생활·추적) 설명을 보여 준다. 링크 밖이면 그림 주소로 가는 링크, 링크 안이면 바깥 링크의 글로만
md.renderer.rules.image = (tokens, i) => {
  const 설명 = md.utils.escapeHtml(이미지설명(tokens[i]))
  if (링크안(tokens, i)) return 설명
  return `<a href="${md.utils.escapeHtml(tokens[i].attrGet('src'))}" target="_blank" rel="noopener noreferrer">${설명}</a>`
}
// 링크는 새 탭에서, 이 페이지에 접근하지 못하게
const 기본링크 = md.renderer.rules.link_open ?? ((tokens, i, options, env, self) => self.renderToken(tokens, i, options))
md.renderer.rules.link_open = (tokens, i, options, env, self) => {
  tokens[i].attrSet('target', '_blank')
  tokens[i].attrSet('rel', 'noopener noreferrer')
  return 기본링크(tokens, i, options, env, self)
}

const 파싱 = (텍스트) => md.parse(String(텍스트 ?? ''), {})

/**
 * @param {string} 텍스트
 * @returns {string} HTML
 */
export function 마크다운HTML(텍스트) {
  return md.renderer.render(파싱(텍스트), md.options, {})
}

/** 주소에서 풀어 보여 줄 글자: 왼쪽에서 오른쪽으로 쓰는 문자(한글·한자·가나·라틴·키릴·그리스)와 숫자 */
const 읽는글자문자 = /^[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Nd}]$/u
/** 보이지 않는 글자(한글 채움 문자 U+3164 등)는 문자 범위에 들어 있어도 풀지 않는다 */
const 읽는글자 = { test: (글자) => 읽는글자문자.test(글자) && !/\p{Default_Ignorable_Code_Point}/u.test(글자) }

/**
 * 사람이 읽는 주소. 파서가 퍼센트 인코딩한 한글 같은 글자만 한 글자씩 되돌린다.
 * 공백·제어·방향 바꿈 글자(%20, %C2%A0, %E2%80%AE …)와 오른쪽→왼쪽 문자(히브리·아랍 …), ASCII 는 그대로 둔다:
 * 풀면 붙여 넣었을 때 주소가 끊기거나 뒤집혀 보인다
 */
function 읽는주소(주소) {
  return String(주소 ?? '').replace(/(?:%[0-9A-Fa-f]{2})+/g, (조각) => {
    const 바이트들 = 조각.match(/%[0-9A-Fa-f]{2}/g)
    let 결과 = ''
    for (let i = 0; i < 바이트들.length;) {
      const 값 = (k) => parseInt(바이트들[k].slice(1), 16)
      const 첫 = 값(i)
      const 기대길이 = 첫 >= 0xf8 ? 1 : 첫 >= 0xf0 ? 4 : 첫 >= 0xe0 ? 3 : 첫 >= 0xc0 ? 2 : 1 // UTF-8 한 글자의 바이트 수
      // 이어지는 바이트(10xxxxxx)가 모자라면 그 첫 바이트만 그대로 두고 다음 바이트부터 다시 본다 (뒤의 멀쩡한 글자를 삼키지 않게)
      let 길이 = 1
      while (길이 < 기대길이 && i + 길이 < 바이트들.length && (값(i + 길이) & 0xc0) === 0x80) 길이++
      const 묶음 = 바이트들.slice(i, i + 길이).join('')
      let 글자 = null
      if (길이 === 기대길이 && 길이 > 1) {
        try { 글자 = decodeURIComponent(묶음) } catch { /* 깨진 바이트는 그대로 */ }
      }
      결과 += 글자 && 읽는글자.test(글자) ? 글자 : 묶음
      i += 길이
    }
    return 결과
  })
}

/** 인라인 토큰 → 글. 굵게·기울임 기호는 벗기고, 링크·이미지는 글 뒤에 주소를 붙인다 (글이 곧 주소면 생략) */
function 인라인글(토큰들, { 주소 = true } = {}) {
  let 글 = ''
  let 링크 = null // { 주소, 글시작 }
  const 주소붙이기 = (설명, 주소값) => {
    if (!주소) return ''
    const 보일주소 = 읽는주소(주소값)
    const 같음 = 설명 === 보일주소 || `mailto:${설명}` === 보일주소
    return 같음 ? '' : ` (${보일주소})`
  }
  for (const 토큰 of 토큰들 ?? []) {
    switch (토큰.type) {
      case 'text': case 'code_inline': 글 += 토큰.content; break
      case 'softbreak': case 'hardbreak': 글 += '\n'; break
      case 'image': {
        const 설명 = 이미지설명(토큰) // 화면과 같은 설명 (안쪽 링크 주소는 붙이지 않는다)
        글 += 링크 ? 설명 : 설명 + 주소붙이기(설명, 토큰.attrGet('src')) // 링크 안의 이미지는 바깥 링크 주소만 붙인다
        break
      }
      case 'link_open': 링크 = { 주소: 토큰.attrGet('href'), 글시작: 글.length }; break
      case 'link_close':
        if (링크) 글 += 주소붙이기(글.slice(링크.글시작), 링크.주소)
        링크 = null
        break
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

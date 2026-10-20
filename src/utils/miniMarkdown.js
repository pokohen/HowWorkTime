/**
 * 모델 응답에 흔히 섞이는 아주 가벼운 마크다운만 HTML 로 바꾼다.
 * 지원: 제목(#), 글머리(-, *, 숫자.), **굵게**, `코드`, 줄바꿈. 그 외는 글자 그대로 보여 준다.
 * 입력을 먼저 전부 이스케이프하므로 v-html 에 넣어도 스크립트가 끼어들 수 없다.
 */
const 이스케이프표 = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function HTML이스케이프(텍스트) {
  return String(텍스트).replace(/[&<>"']/g, (c) => 이스케이프표[c])
}

function 인라인(텍스트) {
  return HTML이스케이프(텍스트)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
}

/**
 * @param {string} 텍스트
 * @returns {string} HTML
 */
export function 마크다운HTML(텍스트) {
  const 줄들 = String(텍스트 ?? '').replace(/\r\n?/g, '\n').split('\n')
  const 출력 = []
  let 목록 = null // { 태그: 'ul'|'ol', 항목: [] }
  let 문단 = []

  const 문단닫기 = () => {
    if (문단.length) {
      출력.push(`<p>${문단.map(인라인).join('<br>')}</p>`)
      문단 = []
    }
  }
  const 목록닫기 = () => {
    if (목록) {
      출력.push(`<${목록.태그}>${목록.항목.map((항목) => `<li>${인라인(항목)}</li>`).join('')}</${목록.태그}>`)
      목록 = null
    }
  }

  for (const 원줄 of 줄들) {
    const 줄 = 원줄.trimEnd()
    const 제목 = /^(#{1,6})\s+(.+)$/.exec(줄)
    const 글머리 = /^\s*[-*•]\s+(.+)$/.exec(줄)
    const 번호 = /^\s*\d+[.)]\s+(.+)$/.exec(줄)

    if (!줄.trim()) {
      문단닫기(); 목록닫기()
    } else if (제목) {
      문단닫기(); 목록닫기()
      출력.push(`<h4>${인라인(제목[2])}</h4>`)
    } else if (글머리 || 번호) {
      문단닫기()
      const 태그 = 글머리 ? 'ul' : 'ol'
      if (목록 && 목록.태그 !== 태그) 목록닫기()
      if (!목록) 목록 = { 태그, 항목: [] }
      목록.항목.push((글머리 ?? 번호)[1])
    } else if (목록 && /^\s/.test(줄)) {
      // 목록 항목 바로 아래 들여쓴 이어지는 줄은 마지막 항목에 붙인다
      목록.항목[목록.항목.length - 1] += ` ${줄.trim()}`
    } else {
      목록닫기()
      문단.push(줄)
    }
  }
  문단닫기(); 목록닫기()
  return 출력.join('')
}

/**
 * 공유용 일반 텍스트. 마크다운 기호를 걷어내 메신저·메모에 붙여 넣어도 깔끔하게 보인다.
 * 제목은 그대로 한 줄, 글머리는 "• ", 번호 목록은 그대로, 굵게·코드는 기호만 벗긴다.
 * @param {string} 텍스트
 * @returns {string}
 */
export function 마크다운텍스트(텍스트) {
  const 줄들 = String(텍스트 ?? '').replace(/\r\n?/g, '\n').split('\n')
  const 출력 = 줄들.map((원줄) => {
    const 줄 = 원줄.trimEnd()
    const 제목 = /^#{1,6}\s+(.+)$/.exec(줄)
    const 글머리 = /^(\s*)[-*•]\s+(.+)$/.exec(줄)
    let 결과
    if (제목) 결과 = 제목[1]
    else if (글머리) 결과 = `${글머리[1]}• ${글머리[2]}`
    else 결과 = 줄
    return 결과
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
  })
  // 연속 빈 줄은 하나로, 앞뒤 빈 줄은 제거
  return 출력.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * 모델 응답에 흔히 섞이는 아주 가벼운 마크다운만 HTML 로 바꾼다.
 * 지원: 제목(#), 글머리(-, *, 숫자.), **굵게**, `코드`, 줄바꿈. 그 외는 글자 그대로 보여 준다.
 * 입력을 먼저 전부 이스케이프하므로 v-html 에 넣어도 스크립트가 끼어들 수 없다.
 */
const 이스케이프표 = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function HTML이스케이프(텍스트) {
  return String(텍스트).replace(/[&<>"']/g, (c) => 이스케이프표[c])
}

/**
 * 코드 스팬 안의 기호(예: `**` 나 `*`)가 굵게 규칙에 걸리지 않도록, 코드를 먼저 떼어 두고 나머지만 바꾼 뒤 되돌린다.
 * @param {string} 텍스트
 * @param {(코드: string) => string} 코드변환
 * @param {(나머지: string) => string} 나머지변환
 */
function 코드보호(텍스트, 코드변환, 나머지변환) {
  const 코드들 = []
  const 자리 = 텍스트.replace(/`([^`\n]+)`/g, (_, 코드) => {
    코드들.push(코드변환(코드))
    return `\u0000${코드들.length - 1}\u0000`
  })
  return 나머지변환(자리).replace(/\u0000(\d+)\u0000/g, (_, i) => 코드들[Number(i)])
}

function 인라인(텍스트) {
  return 코드보호(
    HTML이스케이프(텍스트),
    (코드) => `<code>${코드}</code>`,
    (나머지) => 나머지.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>'),
  )
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
    // 번호 목록은 1 로 시작하거나 이미 열린 번호 목록에 이어질 때만. "2026. 상반기에는…" 같은 문장을 목록으로 오해하지 않게
    const 번호후보 = /^\s*(\d{1,2})[.)]\s+(.+)$/.exec(줄)
    const 번호 = 번호후보 && (번호후보[1] === '1' || 목록?.태그 === 'ol') ? 번호후보 : null

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
      목록.항목.push(글머리 ? 글머리[1] : 번호[2])
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
    return 코드보호(결과, (코드) => 코드, (나머지) => 나머지.replace(/\*\*([^*\n]+)\*\*/g, '$1'))
  })
  // 연속 빈 줄은 하나로, 앞뒤 빈 줄은 제거
  return 출력.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

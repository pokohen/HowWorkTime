/**
 * 텍스트를 클립보드에 복사한다. 성공하면 true.
 * 비보안 컨텍스트(http)나 오래된 WebView 는 navigator.clipboard 가 없어서 execCommand 로 대체한다.
 * @param {string} 텍스트
 * @returns {Promise<boolean>}
 */
export async function 클립보드복사(텍스트) {
  const 값 = String(텍스트 ?? '')
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(값)
      return true
    } catch {
      // 권한 거부 등. 아래 대체 경로로 넘어간다
    }
  }
  if (typeof document === 'undefined') return false
  const ta = document.createElement('textarea')
  ta.value = 값
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '0'
  ta.style.opacity = '0'
  // 열린 <dialog> 안에서 호출될 수 있으니 포커스를 받을 수 있는 가장 가까운 곳에 붙인다
  const 이전포커스 = document.activeElement
  const 부모 = 이전포커스?.closest?.('dialog[open]') ?? document.body
  부모.appendChild(ta)
  ta.focus()
  ta.select()
  let 성공 = false
  try {
    성공 = document.execCommand('copy')
  } catch {
    성공 = false
  }
  부모.removeChild(ta)
  // 임시 textarea 가 가져간 포커스를 돌려준다 (키보드 사용자가 모달 밖으로 튕기지 않게)
  if (이전포커스 && typeof 이전포커스.focus === 'function') 이전포커스.focus()
  return 성공
}

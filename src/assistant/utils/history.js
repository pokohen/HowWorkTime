/**
 * 모델에 보낼 이력. 실패·빈 응답은 빼고 같은 역할이 이어지면 합친 뒤, 최근 것만 남기고
 * 맨 앞이 user 가 되게 다듬는다 (Anthropic 은 첫 메시지가 user 가 아니면 거부한다).
 * @param {Array<{ 역할: 'user'|'assistant', 내용: string, 오류?: string }>} 메시지들
 * @param {number} 최대 - 남길 메시지 수 상한
 */
export function 이력만들기(메시지들, 최대 = Infinity) {
  const 결과 = []
  for (const m of 메시지들) {
    if (m.역할 === 'assistant' && (!m.내용 || m.오류)) continue
    if (!m.내용) continue
    const 마지막 = 결과[결과.length - 1]
    if (마지막 && 마지막.역할 === m.역할) 마지막.내용 += `\n\n${m.내용}`
    else 결과.push({ 역할: m.역할, 내용: m.내용 })
  }
  const 최근 = 결과.slice(-최대)
  while (최근.length && 최근[0].역할 !== 'user') 최근.shift()
  return 최근
}

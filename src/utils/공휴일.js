import 공휴일데이터 from '../data/공휴일.json'

const 연도별맵 = new Map(
  Object.entries(공휴일데이터).map(([연도, 항목들]) => [Number(연도), 항목들]),
)

export function 연도별공휴일조회(연도) {
  const 항목들 = 연도별맵.get(연도) ?? []
  return new Set(항목들.map((항목) => 항목.날짜))
}

export function 공휴일데이터존재여부(연도) {
  const 항목들 = 연도별맵.get(연도)
  return Array.isArray(항목들) && 항목들.length > 0
}

export function 월별공휴일조회(연도, 월) {
  const 항목들 = 연도별맵.get(연도) ?? []
  const 접두사 = `${연도}-${String(월).padStart(2, '0')}`
  return 항목들
    .filter((항목) => 항목.날짜.startsWith(접두사))
    .map((항목) => 항목.날짜)
}

export function 공휴일이름조회(날짜문자열) {
  const 연도 = Number(날짜문자열.slice(0, 4))
  const 항목들 = 연도별맵.get(연도) ?? []
  const 매칭 = 항목들.find((항목) => 항목.날짜 === 날짜문자열)
  return 매칭?.이름 ?? '공휴일'
}

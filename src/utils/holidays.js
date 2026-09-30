import 공휴일데이터 from '../data/holidays.json'
import { 두자리 } from './timeFormat'

/** 같은 날짜가 여러 줄이면(예: 어린이날·부처님오신날) 이름을 합쳐 한 항목으로 */
function 날짜별병합(항목들) {
  const 맵 = new Map()
  for (const { 날짜, 이름 } of 항목들) {
    const 기존 = 맵.get(날짜)
    맵.set(날짜, { 날짜, 이름: 기존 && !기존.이름.includes(이름) ? `${기존.이름} · ${이름}` : (기존?.이름 ?? 이름) })
  }
  return [...맵.values()]
}

const 연도별맵 = new Map(
  Object.entries(공휴일데이터).map(([연도, 항목들]) => [Number(연도), 날짜별병합(항목들)]),
)

const 연도별셋 = new Map()

/** 연도의 공휴일 날짜 Set. 데이터가 불변이므로 연도별로 한 번만 만든다 */
export function 연도공휴일(연도) {
  let 셋 = 연도별셋.get(연도)
  if (!셋) {
    const 항목들 = 연도별맵.get(연도) ?? []
    셋 = new Set(항목들.map((항목) => 항목.날짜))
    연도별셋.set(연도, 셋)
  }
  return 셋
}

export function 공휴일데이터여부(연도) {
  const 항목들 = 연도별맵.get(연도)
  return Array.isArray(항목들) && 항목들.length > 0
}

/** 해당 월의 공휴일 목록. 각 항목은 { 날짜: 'YYYY-MM-DD', 이름 } */
export function 월공휴일(연도, 월) {
  const 항목들 = 연도별맵.get(연도) ?? []
  const 접두사 = `${연도}-${두자리(월)}`
  return 항목들.filter((항목) => 항목.날짜.startsWith(접두사))
}

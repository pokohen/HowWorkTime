import 공휴일데이터 from '../data/holidays.json'
import { 두자리 } from './timeFormat'

const 연도별맵 = new Map(
  Object.entries(공휴일데이터).map(([연도, 항목들]) => [Number(연도), 항목들]),
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

export function 월공휴일(연도, 월) {
  const 항목들 = 연도별맵.get(연도) ?? []
  const 접두사 = `${연도}-${두자리(월)}`
  return 항목들
    .filter((항목) => 항목.날짜.startsWith(접두사))
    .map((항목) => 항목.날짜)
}

export function 공휴일이름(날짜문자열) {
  const 연도 = Number(날짜문자열.slice(0, 4))
  const 항목들 = 연도별맵.get(연도) ?? []
  const 매칭 = 항목들.find((항목) => 항목.날짜 === 날짜문자열)
  return 매칭?.이름 ?? '공휴일'
}

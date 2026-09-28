import { 급여일조회 } from '../utils/workDays'
import { 요일이름 } from '../constants'

// 앱이 열린 시점의 날짜 정보. 모듈 로드 시 한 번만 계산한다.
const 오늘 = new Date()
const 현재연도 = 오늘.getFullYear()
const 현재월 = 오늘.getMonth() + 1
const 오늘요일 = 오늘.getDay()
const 오늘금요일여부 = 오늘요일 === 5

const 오늘표시 = `${현재연도}년 ${현재월}월 ${오늘.getDate()}일 ${요일이름[오늘요일]}요일`
const 재택안내 =
  오늘요일 === 5 ? '오늘은 재택근무' :
  오늘요일 === 4 ? '내일은 재택근무' : ''

// 이번 주(일~토)에 급여일이 포함되는지
const 급여일 = 급여일조회(현재연도, 현재월)
const 주시작 = new Date(현재연도, 오늘.getMonth(), 오늘.getDate() - 오늘요일)
const 주끝 = new Date(주시작)
주끝.setDate(주끝.getDate() + 6)
const 급여주여부 = 급여일 >= 주시작 && 급여일 <= 주끝

export function useToday() {
  return { 오늘, 현재연도, 현재월, 오늘요일, 오늘금요일여부, 오늘표시, 재택안내, 급여주여부 }
}

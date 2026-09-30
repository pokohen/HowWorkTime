import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { 월별상태 } from '../src/composables/monthScoped'

describe('월별상태', () => {
  it('월마다 값을 따로 보관하고, 돌아오면 그대로 있다', () => {
    const 월키 = ref('2026-09')
    const 누적 = 월별상태(월키, '')

    누적.value = '100:00'
    월키.value = '2026-08'
    expect(누적.value).toBe('') // 다른 달은 기본값
    누적.value = '165:00'

    월키.value = '2026-09'
    expect(누적.value).toBe('100:00')
    월키.value = '2026-08'
    expect(누적.value).toBe('165:00')
  })

  it('기본값이 함수면 그 달에 맞춰 계산한다', () => {
    const 월키 = ref('2026-09')
    const 입사일 = 월별상태(월키, () => (월키.value === '2026-09' ? 30 : 1))
    expect(입사일.value).toBe(30)
    월키.value = '2026-10'
    expect(입사일.value).toBe(1)
    입사일.value = 15
    expect(입사일.value).toBe(15)
  })

  it('null·false·0 같은 기본값도 그대로 돌려준다', () => {
    const 월키 = ref('2026-09')
    expect(월별상태(월키, null).value).toBeNull()
    expect(월별상태(월키, false).value).toBe(false)
    expect(월별상태(월키, 0).value).toBe(0)
  })
})

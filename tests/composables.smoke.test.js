// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'

// 빌드는 선언 순서 오류(TDZ) 같은 런타임 예외를 잡지 못한다.
// 모든 composable 을 실제로 불러와 초기화가 끝까지 되는지 확인한다.
describe('composable 초기화', () => {
  it('모든 composable 이 예외 없이 로드되고 핵심 값을 돌려준다', async () => {
    const { useToday } = await import('../src/composables/useToday')
    const { useMonth } = await import('../src/composables/useMonth')
    const { useWorkInput } = await import('../src/composables/useWorkInput')
    const { useTodayWork } = await import('../src/composables/useTodayWork')
    const { useRemoteWork } = await import('../src/composables/useRemoteWork')
    const { useLeave } = await import('../src/composables/useLeave')
    const { useWorkResult } = await import('../src/composables/useWorkResult')
    const { useTheme } = await import('../src/composables/useTheme')

    expect(useToday().오늘.value).toBeInstanceOf(Date)
    expect(useMonth().소정근로일.value).toBeGreaterThanOrEqual(0)
    expect(useTodayWork().오늘예상분.value).toBeGreaterThanOrEqual(0)
    expect(useRemoteWork().재택일수.value).toBe(0)
    expect(useLeave().연차분.value).toBe(0)
    expect(['light', 'dark']).toContain(useTheme().테마.value)

    // 입력 → 결과까지 한 번 흘려 본다
    useWorkInput().입력근무시간.value = '40:00'
    const 결과 = useWorkResult()
    expect(결과.반영분.value).toBeGreaterThanOrEqual(40 * 60)
    expect(결과.달성률.value).toBeGreaterThanOrEqual(0)
  })
})

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { 클립보드복사 } from '../src/utils/clipboard'

describe('클립보드복사', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.execCommand = undefined
  })

  it('navigator.clipboard 가 있으면 그것으로 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await 클립보드복사('안녕')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('안녕')
  })

  it('clipboard API 가 실패하거나 없으면 execCommand 로 대체한다', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    document.execCommand = vi.fn(() => true)
    expect(await 클립보드복사('대체')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('둘 다 안 되면 false', async () => {
    vi.stubGlobal('navigator', {})
    document.execCommand = vi.fn(() => false)
    expect(await 클립보드복사('x')).toBe(false)
  })
})

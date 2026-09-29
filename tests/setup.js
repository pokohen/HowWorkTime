import { vi } from 'vitest'
import fixture from './fixtures/holidays.json'

// 실데이터(src/data/holidays.json)는 prefetch 스크립트가 주기적으로 덮어쓰므로
// 테스트는 2026년 스냅샷 픽스처에 고정한다.
vi.mock('../src/data/holidays.json', () => ({ default: fixture }))

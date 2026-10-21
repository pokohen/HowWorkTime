import { ref } from 'vue'

/**
 * 정해진 시간 동안 켜졌다 저절로 꺼지는 표시. 켤 때마다 시간을 새로 센다.
 * 타이머는 정리등록에 넘긴 정리 때 지운다 (모듈 상태는 HMR 정리, 컴포넌트는 onBeforeUnmount)
 * @param {(fn: () => void) => void} 정리등록
 * @param {number} 시간 켜져 있는 시간(ms)
 */
export function 잠시표시상태(정리등록, 시간) {
  const 값 = ref(false)
  let 타이머 = null
  정리등록(() => clearTimeout(타이머))
  return {
    값,
    켜기() {
      값.value = true
      clearTimeout(타이머)
      타이머 = setTimeout(() => { 값.value = false }, 시간)
    },
    끄기() {
      값.value = false
      clearTimeout(타이머)
    },
  }
}

<script setup>
import { computed } from 'vue'
import { 시분파싱, 시분변환 } from '../../utils/timeFormat'

// "h:mm" 근무시간 입력 필드. blur 시 정규화하고, 형식 오류를 표시한다.
const 값 = defineModel({ type: String, default: '' })

const props = defineProps({
  id: { type: String, required: true },
  라벨: String,
  placeholder: { type: String, default: '0:00' },
  /** 힌트에 보여줄 예시. 첫 번째가 오류 메시지의 예시로도 쓰인다 */
  예시: { type: Array, default: () => ['0:00'] },
  /** 비어 있을 때 정규화 결과 */
  빈값: { type: String, default: '' },
  /** 허용하는 최대 분. 넘으면 오류로 표시한다. 계산 쪽(composable)도 같은 값으로 시분파싱을 호출해야 한다 */
  최대분: { type: Number, default: Infinity },
})

const 결과 = computed(() => 시분파싱(값.value, { 최대분: props.최대분 }))
const 유효 = computed(() => 결과.value.유효)
const 콜론없는예시 = computed(() => props.예시[0].replace(':', ''))

function 정규화() {
  if (!유효.value) return
  값.value = 결과.value.비어있음 ? props.빈값 : 시분변환(결과.value.분)
}
</script>

<template>
  <div class="input-group">
    <label v-if="라벨" :for="id">{{ 라벨 }}</label>
    <div class="input-with-unit">
      <input
        :id="id"
        v-model="값"
        type="text"
        inputmode="numeric"
        pattern="[0-9:]*"
        :placeholder="placeholder"
        :class="{ error: !유효 }"
        :aria-invalid="!유효"
        @blur="정규화"
      />
    </div>
    <p v-if="!유효" class="input-error">
      <template v-if="결과.초과">⚠ 입력할 수 있는 범위를 넘었습니다.</template>
      <template v-else>⚠ 형식이 올바르지 않습니다.</template>
      예: <code>{{ 예시[0] }}</code> 또는 <code>{{ 콜론없는예시 }}</code>
    </p>
    <p v-else class="input-hint">
      <slot name="힌트">
        <strong>형식</strong>:
        <template v-for="(예, i) in 예시" :key="예"><template v-if="i > 0">, </template><code>{{ 예 }}</code></template>
        <span class="hint-extra">(콜론 없이 <code>{{ 콜론없는예시 }}</code>도 가능)</span>
      </slot>
    </p>
  </div>
</template>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-group > label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-soft);
}
.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-unit input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--input-border);
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--input-text);
  background: var(--input-bg);
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-with-unit input:focus {
  outline: none;
  border-color: var(--focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.input-with-unit input.error {
  border-color: var(--accent-red);
  background: var(--tint-red-bg);
}
.input-with-unit input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
.input-hint,
.input-error {
  font-size: 0.82rem;
  margin: 0;
}
.input-hint {
  color: var(--text-soft);
}
.input-error {
  color: var(--tint-red-text);
  font-weight: 500;
}
.input-hint :deep(code),
.input-error code {
  border: 1px solid;
  border-radius: 4px;
  padding: 1px 6px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.78rem;
}
.input-hint :deep(code) {
  background: var(--surface-muted);
  border-color: var(--input-border);
  color: var(--input-text);
}
.input-error code {
  background: var(--tint-red-bg);
  border-color: var(--tint-red-border);
  color: var(--tint-red-text);
}
.input-hint :deep(.hint-extra) {
  color: var(--hint);
  margin-left: 6px;
}
</style>

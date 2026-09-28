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
})

const 결과 = computed(() => 시분파싱(값.value))
const 유효 = computed(() => 결과.value.유효)
const 콜론없는예시 = computed(() => props.예시[0].replace(':', ''))

function 정규화() {
  if (!결과.value.유효) return
  값.value = 결과.value.비어있음 ? props.빈값 : 시분변환(Math.max(0, 결과.value.분))
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
      ⚠ 형식이 올바르지 않습니다. 예: <code>{{ 예시[0] }}</code> 또는 <code>{{ 콜론없는예시 }}</code>
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
  color: #374151;
}
.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}
.input-with-unit input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-with-unit input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  background: #fff;
}
.input-with-unit input.error {
  border-color: #ef4444;
  background: #fef2f2;
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
  color: #475569;
}
.input-error {
  color: #b91c1c;
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
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #0f172a;
}
.input-error code {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}
.input-hint :deep(.hint-extra) {
  color: #94a3b8;
  margin-left: 6px;
}

.theme-dark .input-group > label { color: #c9d1d9; }
.theme-dark .input-with-unit input {
  background: #0d1117;
  border-color: #21262d;
  color: #f0f6fc;
}
.theme-dark .input-with-unit input:focus { background: #0d1117; }
.theme-dark .input-with-unit input.error {
  border-color: #f85149;
  background: #2d0f0f;
}
.theme-dark .input-hint { color: #c9d1d9; }
.theme-dark .input-hint :deep(code) {
  background: #161b22;
  border-color: #21262d;
  color: #f0f6fc;
}
.theme-dark .input-hint :deep(.hint-extra) { color: #8b949e; }
.theme-dark .input-error { color: #ff7b72; }
.theme-dark .input-error code {
  background: #2d0f0f;
  border-color: #6e1414;
  color: #ffa198;
}
</style>

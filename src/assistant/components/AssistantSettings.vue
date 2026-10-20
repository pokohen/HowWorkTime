<script setup>
import { ref, computed } from 'vue'
import { 제공자목록, 제공자ID목록 } from '../ai/providers'
import { useAssistant } from '../composables/useAssistant'

const { 제공자, 제공자정보, 모델, 저장된키, 키있음, 개발용키사용중, 탭목록, 모든대화삭제, 설정초기화, 설정열림 } = useAssistant()

const 키보이기 = ref(false)
const 삭제확인중 = ref(false)
const 모델목록ID = 'assistant-model-options'
const 대화수 = computed(() => 탭목록.value.filter((탭) => 탭.메시지.length > 0).length)

function 모델예시선택(값) {
  모델.value = 값
}
function 모든대화삭제확정() {
  모든대화삭제()
  삭제확인중.value = false
}
</script>

<template>
  <div class="settings">
    <section class="settings-group">
      <h3 class="settings-title">AI 제공자</h3>
      <div class="provider-grid" role="radiogroup" aria-label="AI 제공자">
        <button
          v-for="id in 제공자ID목록"
          :key="id"
          type="button"
          role="radio"
          class="provider-btn"
          :class="{ active: 제공자 === id }"
          :aria-checked="제공자 === id"
          @click="제공자 = id"
        >
          <span class="provider-name">{{ 제공자목록[id].이름 }}</span>
          <span class="provider-family">{{ 제공자목록[id].모델가족 }}</span>
        </button>
      </div>
    </section>

    <section class="settings-group">
      <label class="settings-title" for="assistant-model">모델</label>
      <input
        id="assistant-model"
        v-model.lazy="모델"
        class="text-field"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :list="모델목록ID"
        :placeholder="제공자정보.기본모델"
      />
      <datalist :id="모델목록ID">
        <option v-for="예시 in 제공자정보.모델예시" :key="예시" :value="예시" />
      </datalist>
      <div class="chips">
        <button
          v-for="예시 in 제공자정보.모델예시"
          :key="예시"
          type="button"
          class="chip-btn"
          :class="{ active: 모델 === 예시 }"
          @click="모델예시선택(예시)"
        >{{ 예시 }}</button>
      </div>
      <p class="settings-hint">목록은 예시예요. 새 모델이 나오면 ID를 그대로 입력하면 돼요.</p>
    </section>

    <section class="settings-group">
      <label class="settings-title" for="assistant-key">API 키</label>
      <div class="key-row">
        <input
          id="assistant-key"
          v-model.lazy="저장된키"
          class="text-field"
          :type="키보이기 ? 'text' : 'password'"
          autocomplete="off"
          spellcheck="false"
          :placeholder="제공자정보.키형식"
        />
        <button type="button" class="ghost-btn" :aria-pressed="키보이기" @click="키보이기 = !키보이기">
          {{ 키보이기 ? '숨기기' : '보기' }}
        </button>
      </div>
      <p class="settings-hint">
        <template v-if="개발용키사용중">지금은 <code>.env.local</code>의 개발용 키를 쓰고 있어요. 여기에 넣으면 그 키가 우선해요.</template>
        <template v-else-if="키있음">✓ 키가 저장돼 있어요. 이 브라우저의 저장 공간에만 남고 서버로 전송되지 않아요.</template>
        <template v-else>
          <a :href="제공자정보.키발급" target="_blank" rel="noopener noreferrer">{{ 제공자정보.이름 }}에서 키 발급 ↗</a>
          · 키는 이 브라우저에만 저장되고, 요청은 사용자 브라우저에서 제공자로 바로 가요.
        </template>
      </p>
    </section>

    <section class="settings-group settings-group--danger">
      <h3 class="settings-title">데이터</h3>
      <div class="danger-row">
        <span class="danger-text">저장된 대화 {{ 대화수 }}개</span>
        <template v-if="삭제확인중">
          <button type="button" class="ghost-btn" @click="삭제확인중 = false">취소</button>
          <button type="button" class="danger-btn" @click="모든대화삭제확정">정말 삭제</button>
        </template>
        <button v-else type="button" class="ghost-btn ghost-btn--danger" :disabled="대화수 === 0" @click="삭제확인중 = true">
          모든 대화 삭제
        </button>
      </div>
      <div class="danger-row">
        <span class="danger-text">제공자·모델·키 설정</span>
        <button type="button" class="ghost-btn" @click="설정초기화">초기화</button>
      </div>
    </section>

    <!-- 설정은 바꾸는 즉시 저장되므로 '완료'는 대화 화면으로 돌아가기만 한다 -->
    <div class="settings-foot">
      <p class="settings-hint">바꾼 내용은 바로 저장돼요.</p>
      <button type="button" class="primary-btn" @click="설정열림 = false">완료 · 대화로 돌아가기</button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 18px 20px 24px;
}
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.settings-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--label);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.settings-hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--hint);
}
.settings-hint a {
  color: var(--accent-blue);
  font-weight: 600;
  text-decoration: none;
}
.settings-hint a:hover { text-decoration: underline; }
.settings-hint code {
  font-size: 0.78rem;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--surface-muted);
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.provider-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1.5px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.provider-btn:hover { border-color: var(--input-border-hover); }
.provider-btn.active {
  border-color: var(--accent-amber);
  background: var(--tint-amber-bg);
}
.provider-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.provider-name {
  font-size: 0.9rem;
  font-weight: 700;
}
.provider-family {
  font-size: 0.76rem;
  color: var(--label);
}

.text-field {
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid var(--input-border);
  border-radius: 10px;
  font: inherit;
  font-size: 0.92rem;
  color: var(--input-text);
  background: var(--input-bg);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.text-field:focus-visible {
  outline: none;
  border-color: var(--focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.key-row {
  display: flex;
  gap: 8px;
}
.key-row .text-field { flex: 1; min-width: 0; letter-spacing: 0.02em; }

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip-btn {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--input-border);
  background: var(--surface-soft);
  color: var(--text-soft);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.chip-btn:hover { background: var(--surface-muted); border-color: var(--input-border-hover); }
.chip-btn.active {
  background: var(--tint-amber-bg);
  border-color: var(--tint-amber-border);
  color: var(--tint-amber-text);
}

.ghost-btn,
.danger-btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--input-border);
  background: var(--btn-bg);
  color: var(--text-soft);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.ghost-btn:hover { background: var(--btn-bg-hover); }
.ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ghost-btn--danger { color: var(--accent-red); }
.danger-btn {
  background: var(--accent-red);
  border-color: var(--accent-red);
  color: #fff;
}
.danger-btn:hover { background: var(--accent-red-deep); }

.settings-group--danger {
  padding-top: 18px;
  border-top: 1px solid var(--hairline);
}
.danger-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.danger-text {
  margin-right: auto;
  font-size: 0.86rem;
  color: var(--text-soft);
}

.settings-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px -20px -24px;
  padding: 14px 20px calc(16px + env(safe-area-inset-bottom));
  background: var(--card-bg);
  border-top: 1px solid var(--hairline);
}
.settings-foot .settings-hint { text-align: center; }
.primary-btn {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.primary-btn:hover { opacity: 0.9; }
.primary-btn:active { transform: scale(0.99); }
.primary-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }

@media (max-width: 480px) {
  .provider-grid { grid-template-columns: 1fr; }
}
</style>

<script setup>
import { useMonth } from '../composables/useMonth'

const {
  선택연도, 선택월, 입사한달여부, 입사일,
  연도목록, 월목록, 일목록, 유효입사일,
  선택월표시, 이번달여부, 지난달여부, 공휴일누락연도,
} = useMonth()
</script>

<template>
  <section class="card month-selector">
    <div class="selector-row">
      <div class="select-group">
        <label for="연도선택" class="field-caption">연도</label>
        <select id="연도선택" v-model="선택연도" class="select-field select-field--sm">
          <option v-for="연도 in 연도목록" :key="연도" :value="연도">{{ 연도 }}년</option>
        </select>
      </div>
      <div class="select-group">
        <label for="월선택" class="field-caption">월</label>
        <select id="월선택" v-model="선택월" class="select-field select-field--sm">
          <option v-for="월 in 월목록" :key="월" :value="월">{{ 월 }}월</option>
        </select>
      </div>
      <label class="join-checkbox">
        <input type="checkbox" v-model="입사한달여부" />
        <span>이 달에 입사했어요</span>
      </label>
      <div v-if="입사한달여부" class="join-date">
        <label for="입사일" class="join-date-label">입사일</label>
        <select id="입사일" v-model.number="입사일" class="select-field select-field--sm">
          <option v-for="일 in 일목록" :key="일" :value="일">{{ 일 }}일</option>
        </select>
      </div>
      <div class="month-badge">
        <span>{{ 선택월표시 }}</span>
        <span v-if="이번달여부" class="badge current">이번 달</span>
        <span v-else-if="지난달여부" class="badge past">지난 달</span>
        <span v-else class="badge future">다음 달</span>
      </div>
    </div>
    <p v-if="입사한달여부" class="join-hint">
      <strong>{{ 유효입사일 }}일</strong>부터 월말까지 근무일로 계산
      <span class="hint-extra">(입사일도 포함)</span>
    </p>
  </section>

  <div v-if="공휴일누락연도.length > 0" class="warn-notice" role="alert">
    ⚠ {{ 공휴일누락연도.join('년, ') }}년 공휴일 데이터가 없습니다. 근무일 계산에서 공휴일이 평일로 간주되어 부정확할 수 있습니다.
  </div>
</template>

<style scoped>
.month-selector {
  padding: 16px 20px;
}
.selector-row {
  display: flex;
  align-items: flex-end;
  gap: 8px 14px;
  flex-wrap: wrap;
}
.select-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.join-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-end;
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-soft);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, border-color 0.15s;
}
.join-checkbox:hover {
  background: var(--surface-muted);
  border-color: var(--input-border-hover);
}
.join-checkbox:has(input:checked) {
  background: var(--tint-green-bg);
  border-color: var(--tint-green-border);
  color: var(--tint-green-text);
}
.join-checkbox input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--focus);
  cursor: pointer;
  margin: 0;
}
.join-date {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.join-date-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
}
.join-hint {
  margin: 10px 0 0;
  font-size: 0.76rem;
  color: var(--label);
}
.join-hint .hint-extra {
  color: var(--hint);
  margin-left: 6px;
}

.month-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}
.badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
}
.badge.current { background: var(--tint-blue-bg);  color: var(--tint-blue-text); }
.badge.past    { background: var(--surface-muted); color: var(--label); }
.badge.future  { background: var(--tint-amber-bg); color: var(--tint-amber-text); }

.warn-notice {
  padding: 12px 16px;
  background: var(--tint-amber-bg);
  border: 1px solid var(--tint-amber-border);
  border-radius: 10px;
  font-size: 0.88rem;
  color: var(--tint-amber-text);
  margin-bottom: 20px;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .selector-row {
    gap: 12px;
  }
  .month-badge {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
    order: 99;
  }
}
</style>

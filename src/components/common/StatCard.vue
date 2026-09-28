<script setup>
// 라벨 · 큰 값 · 부제 로 구성된 통계 카드.
//  배경: plain | blue | green | purple   (카드 배경 톤)
//  강조: none | blue | green | purple | red   (값 글자색)
//  크기: md | lg
//  라벨필: true면 라벨을 작은 필(pill)로 표시. 색은 라벨클래스로 지정
defineProps({
  라벨: { type: String, required: true },
  아이콘: String,
  배경: { type: String, default: 'plain' },
  강조: { type: String, default: 'none' },
  크기: { type: String, default: 'md' },
  라벨필: Boolean,
  라벨클래스: [String, Array, Object],
})
</script>

<template>
  <div class="stat-card" :class="[`bg-${배경}`, `size-${크기}`]">
    <div class="stat-head">
      <span v-if="아이콘" class="stat-icon">{{ 아이콘 }}</span>
      <span class="stat-label" :class="[{ pill: 라벨필 }, 라벨클래스]">
        {{ 라벨 }}<slot name="라벨보조" />
      </span>
    </div>
    <div class="stat-value" :class="`accent-${강조}`"><slot /></div>
    <div v-if="$slots.부제" class="stat-sub"><slot name="부제" /></div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--surface-soft);
  border: 1px solid var(--hairline);
  border-radius: 14px;
  padding: 18px 16px;
  text-align: left;
}
.stat-card.size-lg {
  border-radius: 16px;
  padding: 16px 18px;
}
.stat-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
}
.stat-icon {
  font-size: 1.05rem;
  line-height: 1;
  flex-shrink: 0;
}
.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--label);
  letter-spacing: -0.01em;
}
.size-lg .stat-label {
  font-size: 0.82rem;
}
.stat-label.pill {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.02em;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.size-lg .stat-value {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 6px;
}
.stat-value :deep(.unit) {
  font-size: 0.85rem;
  font-weight: 500;
  margin-left: 2px;
  color: var(--text-soft);
}
.size-lg .stat-value :deep(.unit) {
  font-size: 1rem;
}
.stat-sub {
  font-size: 0.74rem;
  color: var(--label);
  line-height: 1.4;
}
.size-lg .stat-sub {
  font-size: 0.78rem;
}

/* 배경 톤 */
.bg-blue   { background: #eff6ff; border-color: #bfdbfe; }
.bg-green  { background: #f0fdf4; border-color: #bbf7d0; }
.bg-purple { background: #faf5ff; border-color: #e9d5ff; }
.theme-dark .bg-blue   { background: #0d1f3a; border-color: #1f3a68; }
.theme-dark .bg-green  { background: #0a2e1c; border-color: #155f3a; }
.theme-dark .bg-purple { background: #1d1638; border-color: #3d2c63; }

/* 값 강조색 */
.accent-blue   { color: #3182f6; }
.accent-green  { color: #06c755; }
.accent-purple { color: #6e3eff; }
.accent-red    { color: #f04452; }
.theme-dark .accent-blue   { color: #58a6ff; }
.theme-dark .accent-green  { color: #56d364; }
.theme-dark .accent-purple { color: #d2a8ff; }
.theme-dark .accent-red    { color: #ff7b72; }

@media (max-width: 640px) {
  .size-lg .stat-value {
    font-size: 1.8rem;
  }
}
</style>

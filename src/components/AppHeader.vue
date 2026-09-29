<script setup>
import { useToday } from '../composables/useToday'

const { 오늘표시, 재택안내, 급여주여부 } = useToday()
</script>

<template>
  <header class="calc-header">
    <h1>⏱ 근무시간 계산기</h1>
    <p class="subtitle">소정근로일 기준 의무·최대 근로시간과 일평균 목표를 확인하세요</p>
    <div class="today-chip">
      <span class="chip" :class="급여주여부 ? 'chip--pay' : 'chip--date'">
        <span class="chip-ico">{{ 급여주여부 ? '💸' : '📆' }}</span>
        <span class="chip-txt">{{ 오늘표시 }}</span>
      </span>
      <span v-if="재택안내" class="chip chip--wfh">
        <span class="chip-ico">🏠</span>
        <span class="chip-txt">{{ 재택안내 }}</span>
      </span>
    </div>
  </header>
</template>

<style scoped>
.calc-header {
  text-align: center;
  margin-bottom: 32px;
}
.calc-header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 6px;
  color: var(--text);
  letter-spacing: -0.03em;
}
.subtitle {
  color: var(--label);
  font-size: 0.9rem;
  margin: 0;
}
.today-chip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  animation: chip-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.today-chip .chip:nth-child(2) {
  animation-delay: 0.09s;
}
.chip-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.74rem;
  line-height: 1;
  background: var(--elevated);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.chip-ico,
.chip-txt {
  position: relative;
  z-index: 1;
}
@keyframes chip-in {
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: translateY(0); }
}
.chip--date {
  background: var(--surface-muted);
  border-color: var(--input-border);
  color: var(--text-soft);
}
.chip--wfh {
  background: var(--tint-blue-bg);
  border-color: var(--tint-blue-border);
  color: var(--tint-blue-text);
}

/* 급여 주간 칩: 금색 그라데이션. 토큰 없이 라이트/다크 각각 지정 */
.chip--pay {
  background: linear-gradient(135deg, #fdeaa6 0%, #f6c945 52%, #efb429 100%);
  border-color: #e0a100;
  color: #6a4905;
  box-shadow:
    0 4px 16px rgba(239, 180, 41, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.chip--pay .chip-ico {
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 2px rgba(120, 80, 0, 0.22);
}
.chip--pay::before {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 42%;
  height: 100%;
  z-index: 2;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: skewX(-20deg);
  animation: chip-shine 5s ease-in-out 1.2s infinite;
}
@keyframes chip-shine {
  0% { left: -60%; }
  16% { left: 135%; }
  100% { left: 135%; }
}
.theme-dark .chip--pay {
  background: linear-gradient(135deg, #6a4d0a 0%, #9a7615 52%, #c2961c 100%);
  border-color: #d3a525;
  color: #fff2c4;
  box-shadow:
    0 4px 18px rgba(194, 150, 28, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
.theme-dark .chip--pay .chip-ico {
  background: rgba(255, 255, 255, 0.18);
  box-shadow: none;
}
@media (prefers-reduced-motion: reduce) {
  .chip { animation: none; }
  .chip--pay::before { animation: none; opacity: 0; }
}

@media (max-width: 640px) {
  .calc-header h1 {
    font-size: 1.5rem;
  }
}
</style>

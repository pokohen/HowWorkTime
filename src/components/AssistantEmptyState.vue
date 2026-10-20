<script setup>
// 빈 탭에서 보여 주는 시작 제안. 누르면 부모가 입력창에 채워 바로 보낼 수 있게 한다
const emit = defineEmits(['선택'])

const 시작제안 = [
  { 아이콘: '🌴', 제목: '휴가 추천', 문장: '이번 달이나 다음 달에 연차 하루 붙여서 쉬기 좋은 날이 있을까? 그때 뭐 하면 좋을지도 같이 추천해 줘.' },
  { 아이콘: '🎉', 제목: '주말 계획', 문장: '이번 주말에 할 만한 걸 몇 가지 추천해 줘. 집에서 쉬는 것 하나, 가볍게 나가는 것 하나, 좀 특별한 것 하나.' },
  { 아이콘: '✈️', 제목: '여행 일정', 문장: '다가오는 연휴에 맞춰 2박 3일 국내 여행 일정을 짜고 싶어. 어디로 가면 좋을지부터 같이 정해 줘.' },
]
</script>

<template>
  <div class="empty">
    <p class="empty-lead">무엇을 계획해 볼까요?</p>
    <p class="empty-desc">이번 달 공휴일, 연휴, 남은 출근일을 이미 알고 있어서 달력 없이 바로 물어볼 수 있어요.</p>
    <div class="suggestions">
      <button
        v-for="제안 in 시작제안"
        :key="제안.제목"
        type="button"
        class="suggestion"
        @click="emit('선택', 제안.문장)"
      >
        <span class="suggestion-icon">{{ 제안.아이콘 }}</span>
        <span class="suggestion-text">
          <strong>{{ 제안.제목 }}</strong>
          <span>{{ 제안.문장 }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.empty {
  margin: auto 0;
  text-align: center;
  padding: 12px 4px 20px;
}
.empty-lead {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.empty-desc {
  margin: 0 auto 18px;
  max-width: 360px;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--label);
}
.suggestions {
  display: grid;
  gap: 8px;
  text-align: left;
}
.suggestion {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--surface-soft);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}
.suggestion:hover { background: var(--surface-muted); border-color: var(--input-border-hover); transform: translateY(-1px); }
.suggestion:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--focus-ring); }
.suggestion-icon { font-size: 1.3rem; line-height: 1.2; }
.suggestion-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-soft);
}
.suggestion-text strong { font-size: 0.9rem; color: var(--text); }
</style>

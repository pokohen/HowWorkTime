<script setup>
// 카드 형태의 섹션 래퍼. 제목 + 본문 슬롯.
defineProps({
  제목: { type: String, required: true },
})
</script>

<template>
  <section class="card">
    <h2 class="section-title">{{ 제목 }}</h2>
    <slot />
  </section>
</template>

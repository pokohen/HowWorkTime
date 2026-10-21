<script setup>
// 경고 문구 앞에 붙이는 아이콘. 글자 기호(⚠)는 글꼴·기기마다 모양이 달라 SVG 로 그린다. 글자 크기·색을 따른다
</script>

<template>
  <svg class="warn-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.2 1.9 20.6h20.2L12 3.2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
    <path d="M12 9.6v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="12" cy="17.6" r="1.25" fill="currentColor" />
  </svg>
</template>

<style scoped>
.warn-icon {
  display: inline-block;
  width: 1.05em;
  height: 1.05em;
  margin-right: 0.3em;
  vertical-align: -0.16em;
  flex: none;
}
</style>

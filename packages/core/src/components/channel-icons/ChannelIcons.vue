<script setup lang="ts">
import Github from './Github.vue'
import ShareIcon from './ShareIcon.vue'

withDefaults(
  defineProps<{
    type?: 'vertical' | 'horizontal'
    share?: boolean
    github?: boolean
  }>(),
  {
    type: 'vertical',
    share: true,
    github: true,
  }
)
</script>

<template>
  <div class="center" :class="type === 'vertical' ? 'flex-col gap-1' : 'gap-4'">
    <Github v-if="github" />
    <ShareIcon v-if="share" />
  </div>
</template>
<style scoped lang="scss"></style>

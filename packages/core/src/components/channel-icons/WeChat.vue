<script setup lang="ts">
import { BaseIcon } from '@typewords/base'
import { defineAsyncComponent } from 'vue'
let showWechatDialog = $ref(false)
const Dialog = defineAsyncComponent(() => import('@typewords/base/Dialog'))
</script>

<template>
  <BaseIcon :title="$t('wechat_group')" @click="showWechatDialog = true">
    <IconSimpleIconsWechat class="color-green-500" />
  </BaseIcon>
  <Dialog v-model="showWechatDialog" :title="$t('wechat_group')">
    <div class="w-120 p-6 pt-0">
      <div class="mb-4">
        {{ $t('community_desc') }}
      </div>
      <div class="text-center">
        <img src="/imgs/channel/wechat.png" :alt="$t('wechat_qrcode')" class="w-70 rounded-xl shadow-lg" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss"></style>

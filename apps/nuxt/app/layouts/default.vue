<script setup lang="ts">
import { BaseIcon, ToastComponent } from '@typewords/base'
import Logo from '@typewords/core/components/Logo.vue'
import MigrateDialog from '@typewords/core/components/dialog/MigrateDialog.vue'
import { Origin } from '@typewords/core/config/env'
import useTheme from '@typewords/core/hooks/theme.ts'
import { useRuntimeStore } from '@typewords/core/stores/runtime.ts'
import { useSettingStore } from '@typewords/core/stores/setting.ts'
import { ShortcutKey } from '@typewords/core/types/enum.ts'
import { onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useInit } from '@typewords/core/composables/useInit.ts'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { toggleTheme, getTheme, setTheme } = useTheme()
const runtimeStore = useRuntimeStore()
const settingStore = useSettingStore()
let expand = $ref(false)
const init = useInit()

function toggleExpand(n: boolean) {
  expand = n
  document.documentElement.style.setProperty('--aside-width', n ? '12rem' : '4.5rem')
}

watch(() => settingStore.sideExpand, toggleExpand)

//迁移数据
let showTransfer = $ref(false)
onMounted(() => {
  init()

  if (new URLSearchParams(window.location.search).get('from_old_site') === '1' && location.origin === Origin) {
    if (localStorage.getItem('__migrated_from_2study_top__')) return
    setTimeout(() => {
      showTransfer = true
    }, 1000)
  }
})

watch(
  () => settingStore.load,
  n => {
    if (!n) return
    toggleExpand(settingStore.sideExpand)
    setTheme(settingStore.theme)
  }
)

watch(
  () => settingStore.theme,
  n => {
    setTheme(n)
  }
)

const { locales, setLocale } = useI18n()
const route = useRoute()

const showIcon = $computed(() => {
  return ['/words', '/articles', '/setting', '/help', '/doc', '/feedback'].includes(route.path)
})

</script>

<template>
  <div class="layout anim">
    <MigrateDialog v-model="showTransfer" @ok="init" />

<div class="flex-1 z-1 relative main-content overflow-x-hidden">
      <div class="mt-3 center relative z-9999" @click="router.push('/setting?index=6 ')" v-if="runtimeStore.isError">
        <ToastComponent type="error" :duration="0" :shadow="false" :showClose="false" message="同步失败" />
      </div>
      <!--      <slot></slot>-->
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout {
  width: 100%;
  height: 100%;
  display: flex;
  background: var(--color-primary);
}


</style>

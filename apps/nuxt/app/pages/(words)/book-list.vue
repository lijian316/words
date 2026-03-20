<script setup lang="ts">
import { _nextTick, resourceWrap, useNav } from '@typewords/core/utils'
import { BasePage } from '@typewords/base'
import type { DictResource } from '@typewords/core/types/types.ts'
import { useRuntimeStore } from '@typewords/core/stores/runtime.ts'
import Empty from '@typewords/core/components/Empty.vue'
import BackIcon from '@typewords/core/components/icon/BackIcon.vue'

import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getDefaultDict } from '@typewords/core/types/func.ts'
import { useFetch } from '@vueuse/core'
import { DICT_LIST } from '@typewords/core/config/env.ts'

const { nav } = useNav()
const runtimeStore = useRuntimeStore()

const router = useRouter()

function selectBook(val: DictResource) {
  runtimeStore.editDict = getDefaultDict(val)
  nav('/book/' + val.id, { from: 'list' })
}

const { data: book_list, isFetching } = useFetch(resourceWrap(DICT_LIST.ARTICLE.ALL)).json()

const allBookList = $computed<any[]>(() => {
  if (!book_list.value) return []
  return (book_list.value as any[]).filter((b: any) => !b.hidden)
})

let currentTag = $ref('所有')

const allTags = $computed<string[]>(() => {
  if (!allBookList.length) return []
  const tags = new Set<string>()
  allBookList.forEach((d: any) => d.tags?.forEach((t: string) => { if (t !== '所有') tags.add(t) }))
  return tags.size > 0 ? ['所有', ...tags] : []
})

const filteredList = $computed<any[]>(() => {
  if (!allBookList.length) return []
  if (currentTag === '所有') return allBookList
  return allBookList.filter((d: any) => d.tags?.includes(currentTag))
})

let searchKey = $ref('')
let showScrollHint = $ref(true)
const scrollRef = ref<HTMLElement | null>(null)

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  showScrollHint = el.scrollTop + el.clientHeight < el.scrollHeight - 10
}

onMounted(() => {
  const el = scrollRef.value
  if (el) {
    el.addEventListener('scroll', onScroll)
    showScrollHint = el.scrollHeight > el.clientHeight
  }
})

onUnmounted(() => {
  scrollRef.value?.removeEventListener('scroll', onScroll)
})

const searchList = computed<any[]>(() => {
  if (searchKey) {
    const s = searchKey.toLowerCase()
    return allBookList.filter((item: any) =>
      item.id?.toLowerCase().includes(s) ||
      item.name?.toLowerCase().includes(s)
    )
  }
  return []
})

watch(filteredList, () => {
  _nextTick(() => {
    const el = scrollRef.value
    if (el) {
      el.addEventListener('scroll', onScroll)
      showScrollHint = el.scrollHeight > el.clientHeight
    }
  }, 100)
})
</script>

<template>
  <BasePage>
    <div class="dict-list-page" v-loading="isFetching">
      <!-- 标题行 -->
      <div class="dict-list-header">
        <BackIcon @click="router.back" />
        <div class="dl-title">全部书籍</div>
        <div style="width: 2rem; flex-shrink: 0" />
      </div>

      <div class="line my-2" />

      <!-- 搜索行 -->
      <div class="dl-toolbar">
        <div class="dl-search-wrap">
          <IconFluentSearch24Regular class="dl-search-icon" />
          <input
            v-model="searchKey"
            placeholder="搜索书籍…"
            class="dl-search-input"
          />
        </div>
        <span class="dl-count">{{ (searchKey ? searchList : filteredList).length }} 本</span>
      </div>

      <div class="scroll-wrap">
        <div class="dict-list-scroll" ref="scrollRef" v-if="searchKey">
          <div v-if="searchList.length" class="article-list">
            <div
              v-for="(item, index) in searchList" :key="item.id"
              class="article-bubble"
                            @click="selectBook(item)"
            >
              <span class="article-num">{{ index + 1 }}.</span>
              <div class="article-body">
                <span class="article-title-en">{{ item.name }}</span>
                <span class="article-title-zh">{{ item.length }} 篇</span>
              </div>
              <IconFluentChevronRight20Regular class="article-arrow" />
            </div>
          </div>
          <Empty v-else text="没有相关书籍" />
        </div>
        <div class="dict-list-scroll" ref="scrollRef" v-else>
          <div class="article-list">
            <div
              v-for="(item, index) in filteredList" :key="item.id"
              class="article-bubble"
                            @click="selectBook(item)"
            >
              <span class="article-num">{{ index + 1 }}.</span>
              <div class="article-body">
                <span class="article-title-en">{{ item.name }}</span>
                <span class="article-title-zh">{{ item.length }} 篇</span>
              </div>
              <IconFluentChevronRight20Regular class="article-arrow" />
            </div>
          </div>
        </div>
        <Transition name="fade">
          <div class="scroll-hint" v-if="showScrollHint">
            <IconFluentChevronDown20Regular />
          </div>
        </Transition>
      </div>
    </div>
  </BasePage>
</template>

<style scoped lang="scss">
.dict-list-page {
  border-radius: 1rem;
  padding: 1.5rem;
  background: var(--color-second);
  border: 1px solid var(--color-item-border);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 2.4rem);
  overflow: hidden;
  box-sizing: border-box;
}

.dict-list-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  margin-bottom: 0.25rem;
}

.dl-title {
  flex: 1;
  text-align: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-main-text);
}

.dl-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 0.5rem 0;
}

.dl-search-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  background: var(--color-third);
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
}

.dl-search-icon {
  color: var(--color-sub-text);
  font-size: 1rem;
  flex-shrink: 0;
}

.dl-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.9rem;
  color: var(--color-main-text);
  &::placeholder { color: var(--color-sub-text); }
}

.dl-count {
  font-size: 0.8rem;
  color: var(--color-sub-text);
  white-space: nowrap;
}

.scroll-wrap {
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dict-list-scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.scroll-hint {
  position: absolute;
  bottom: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: rgba(123, 191, 158, 0.18);
  border: 1.5px solid rgba(123, 191, 158, 0.45);
  color: #7bbf9e;
  font-size: 1.1rem;
  backdrop-filter: blur(4px);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.article-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.25rem 0 1.5rem;
}

.article-bubble {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 1rem;
  border-radius: 1rem;
  background: var(--color-third);
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;

  &:hover {
    background: var(--color-progress-bar);
    border-color: var(--color-item-border);
    transform: translateX(2px);
  }

  &--active {
    border-color: rgba(123, 191, 158, 0.5);
    .article-title-en { color: #7bbf9e; }
  }
}

.article-num {
  font-size: 0.78rem;
  color: var(--color-sub-text);
  flex-shrink: 0;
  min-width: 1.6rem;
}

.article-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.article-title-en {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-main-text);
  line-height: 1.3;
}

.article-title-zh {
  font-size: 0.78rem;
  color: var(--color-sub-text);
}

.article-arrow {
  font-size: 0.9rem;
  color: var(--color-sub-text);
  opacity: 0.4;
  flex-shrink: 0;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.8rem 0 1rem;
}

.tag-item {
  padding: 0.25rem 0.85rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-sub-text);
  background: var(--color-third);
  transition: all 0.15s;

  &:hover { color: var(--color-main-text); }

  &.active {
    background: #7bbf9e;
    color: #fff;
  }
}

@media (max-width: 768px) {
  .dict-list-page {
    padding: 0.8rem;
    margin-bottom: 1rem;
  }
}
</style>

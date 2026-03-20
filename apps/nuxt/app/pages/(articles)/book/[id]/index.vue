<script setup lang="ts">
import { BasePage } from '@typewords/base'
import BackIcon from '@typewords/core/components/icon/BackIcon.vue'
import { useRuntimeStore } from '@typewords/core/stores/runtime.ts'
import { useBaseStore } from '@typewords/core/stores/base.ts'
import { useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { _nextTick, useNav } from '@typewords/core/utils'
import { useGetDict } from '@typewords/core/hooks/dict.ts'

const { nav } = useNav()
const runtimeStore = useRuntimeStore()
const store = useBaseStore()
const router = useRouter()
const { loading } = useGetDict()

const statsMap = $computed<Record<string, { count: number; spend: number }>>(() => {
  if (store.sbook?.id !== runtimeStore.editDict.id) return {}
  const map: Record<string, { count: number; spend: number }> = {}
  for (const s of (store.sbook.statistics || [])) {
    const key = (s as any).title
    if (!key) continue
    if (!map[key]) map[key] = { count: 0, spend: 0 }
    map[key].count++
    map[key].spend += (s as any).spend || 0
  }
  return map
})

function getArticleStat(title: string) {
  return statsMap[title]
}

function formatMinutes(ms: number) {
  const m = Math.round(ms / 60000)
  return m < 1 ? '<1分钟' : `${m}分钟`
}

let searchKey = $ref('')
let showScrollHint = $ref(true)
const scrollRef = ref<HTMLElement | null>(null)

const articles = $computed(() => runtimeStore.editDict.articles || [])

const filteredArticles = $computed(() => {
  if (!searchKey) return articles
  const s = searchKey.toLowerCase()
  return articles.filter((a: any) =>
    a.title?.toLowerCase().includes(s) ||
    a.titleTranslate?.toLowerCase().includes(s)
  )
})

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

watch(articles, () => {
  _nextTick(() => {
    const el = scrollRef.value
    if (el) {
      el.addEventListener('scroll', onScroll)
      showScrollHint = el.scrollHeight > el.clientHeight
    }
  }, 100)
})

function openArticle(index: number) {
  nav(`/book/${runtimeStore.editDict.id}/${index + 1}`)
}

</script>

<template>
  <BasePage>
    <div class="dict-list-page" v-loading="loading">
      <!-- 标题行 -->
      <div class="dict-list-header">
        <BackIcon @click="router.back" />
        <div class="dl-title">{{ runtimeStore.editDict.name }}</div>
        <div style="width: 2rem; flex-shrink: 0" />
      </div>

      <div class="line my-2" />

      <!-- 书籍简介 -->
      <div class="book-intro" v-if="runtimeStore.editDict.description && !searchKey">
        {{ runtimeStore.editDict.description }}
      </div>

      <!-- 搜索行 -->
      <div class="dl-toolbar">
        <div class="dl-search-wrap">
          <IconFluentSearch24Regular class="dl-search-icon" />
          <input v-model="searchKey" placeholder="搜索文章…" class="dl-search-input" />
        </div>
        <span class="dl-count">{{ filteredArticles.length }} 篇</span>
      </div>

      <!-- 文章列表 -->
      <div class="scroll-wrap">
        <div class="dict-list-scroll" ref="scrollRef">
          <div class="article-list">
            <div
              v-for="(item, index) in filteredArticles" :key="item.id"
              class="article-bubble"
              @click="openArticle(index)"
            >
              <span class="article-num">{{ index + 1 }}.</span>
              <div class="article-body">
                <span class="article-title-en">{{ item.title }}</span>
                <span class="article-title-zh" v-if="item.titleTranslate">{{ item.titleTranslate }}</span>
              </div>
              <div v-if="getArticleStat(item.title)" class="article-stat">
                <span class="stat-dot" />
                <span class="stat-time">已学习：{{ formatMinutes(getArticleStat(item.title)!.spend) }}</span>
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

.book-intro {
  font-size: 0.85rem;
  color: var(--color-sub-text);
  line-height: 1.5;
  padding: 0.5rem 0 0.25rem;
  flex-shrink: 0;
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

// 文章气泡列表
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

.article-stat {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7bbf9e;
  opacity: 0.7;
  flex-shrink: 0;
}

.stat-time {
  font-size: 0.7rem;
  color: var(--color-sub-text);
  opacity: 0.7;
}

@media (max-width: 768px) {
  .dict-list-page {
    padding: 0.8rem;
    border-radius: 0;
    border: none;
    height: 100vh;
    margin-top: 0;
  }
}
</style>

<script setup lang="ts">
import { BasePage, BaseButton, Toast } from '@typewords/base'
import BackIcon from '@typewords/core/components/icon/BackIcon.vue'
import { useRuntimeStore } from '@typewords/core/stores/runtime.ts'
import { useBaseStore } from '@typewords/core/stores/base.ts'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useGetDict } from '@typewords/core/hooks/dict.ts'
import { useNav } from '@typewords/core/utils'
import ArticleAudio from '@typewords/core/components/article/ArticleAudio.vue'
import { useSettingStore } from '@typewords/core/stores/setting.ts'

const route = useRoute()
const router = useRouter()
const runtimeStore = useRuntimeStore()
const store = useBaseStore()
const settingStore = useSettingStore()
const { nav } = useNav()
const { loading } = useGetDict()

const articleIndex = computed(() => parseInt(route.params.article as string) - 1)

const article = computed(() => runtimeStore.editDict.articles?.[articleIndex.value])

let showTranslate = $ref(true)

const dialoguePairs = $computed(() => {
  if (!article.value?.text) return []
  const sentences: string[] = []
  article.value.text.split('\n\n').forEach((para: string) => {
    para.split('\n').forEach((s: string) => { if (s.trim()) sentences.push(s.trim()) })
  })
  const translates: string[] = []
  if (article.value.textTranslate) {
    article.value.textTranslate.split('\n\n').forEach((para: string) => {
      para.split('\n').forEach((s: string) => { if (s.trim()) translates.push(s.trim()) })
    })
  }
  return sentences.map((text, i) => ({
    text,
    translate: translates[i] || '',
    isRight: i % 2 === 1,
  }))
})

const totalArticles = computed(() => runtimeStore.editDict.articles?.length || 0)
const hasPrev = computed(() => articleIndex.value > 0)
const hasNext = computed(() => articleIndex.value < totalArticles.value - 1)

function goPrev() {
  nav(`/book/${runtimeStore.editDict.id}/${articleIndex.value}`)
}
function goNext() {
  nav(`/book/${runtimeStore.editDict.id}/${articleIndex.value + 2}`)
}

let startPlay = $ref(false)
function onAudioEnded() {
  if (settingStore.articleAutoPlayNext && hasNext.value) {
    startPlay = true
    goNext()
  }
}

let studyLoading = $ref(false)
async function startPractice() {
  if (!article.value) return Toast.warning('没有文章可学习！')
  studyLoading = true
  await store.changeBook(runtimeStore.editDict)
  studyLoading = false
  nav('/practice-articles/' + runtimeStore.editDict.id)
}
</script>

<template>
  <BasePage>
    <div class="dict-list-page" v-loading="loading">
      <!-- 标题行 -->
      <div class="dict-list-header">
        <BackIcon @click="router.back" />
        <div class="dl-title-block">
          <span class="dl-title-en">{{ article?.title }}</span>
          <span class="dl-title-zh" v-if="showTranslate && article?.titleTranslate">
            {{ article?.titleTranslate }}
          </span>
        </div>
        <BaseButton type="primary" size="small" :loading="studyLoading" @click="startPractice" class="header-learn-btn">
          {{ $t('learn') }}
        </BaseButton>
        <button class="translate-btn" @click="showTranslate = !showTranslate" :title="$t('toggle_translation')">
          <IconPhTranslate v-if="showTranslate" />
          <IconFluentTranslateOff16Regular v-else />
        </button>
      </div>

      <div class="line my-2" />

      <!-- 对话气泡 -->
      <div class="dialogue-scroll" v-if="article">
        <div class="dialogue-area">
          <!-- 问题 -->
          <div class="article-question" v-if="article.question?.text">
            <div class="question-en">Question: {{ article.question.text }}</div>
            <div class="question-zh" v-if="showTranslate && article.question.translate">
              问题: {{ article.question.translate }}
            </div>
          </div>

          <div
            v-for="(pair, i) in dialoguePairs" :key="i"
            class="dialogue-row"
            :class="pair.isRight ? 'dialogue-row--right' : 'dialogue-row--left'"
          >
            <div class="dialogue-bubble" :class="pair.isRight ? 'bubble--right' : 'bubble--left'">
              <div class="bubble-en">{{ pair.text }}</div>
              <div class="bubble-zh" v-if="showTranslate && pair.translate">{{ pair.translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部：音频 + 上下篇 -->
      <div class="article-footer">
        <ArticleAudio
          v-if="article?.audioSrc || article?.audioFileId"
          :article="article"
          :autoplay="startPlay"
          @ended="onAudioEnded"
          class="footer-audio"
        />
        <div class="nav-btns">
          <BaseButton type="info" size="small" :disabled="!hasPrev" @click="goPrev">
            <IconFluentChevronLeft20Regular /> 上一篇
          </BaseButton>
          <span class="nav-index">{{ articleIndex + 1 }} / {{ totalArticles }}</span>
          <BaseButton type="info" size="small" :disabled="!hasNext" @click="goNext">
            下一篇 <IconFluentChevronRight20Regular />
          </BaseButton>
        </div>
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

// ── 标题行 ──────────────────────────────────────────
.dict-list-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.dl-title-block {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dl-title-en {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-main-text);
  line-height: 1.2;
}

.dl-title-zh {
  font-size: 0.82rem;
  color: var(--color-sub-text);
}

.translate-btn {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-sub-text);
  cursor: pointer;
  border-radius: 50%;
  font-size: 1.1rem;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: var(--color-third);
    color: var(--color-main-text);
  }
}

// ── 问题 ─────────────────────────────────────────────
.article-question {
  background: var(--color-third);
  border-radius: 0.75rem;
  padding: 0.65rem 1rem;
  margin-bottom: 0.5rem;
  .question-en {
    font-size: 0.92rem;
    color: var(--color-main-text);
    font-style: italic;
  }
  .question-zh {
    font-size: 0.8rem;
    color: var(--color-sub-text);
    margin-top: 0.2rem;
  }
}

// ── 对话区 ───────────────────────────────────────────
.dialogue-scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.dialogue-area {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.5rem 0 1.5rem;
}

.dialogue-row {
  display: flex;
  &--left { justify-content: flex-start; }
  &--right { justify-content: flex-end; }
}

.dialogue-bubble {
  max-width: 72%;
  padding: 0.65rem 1rem;
  line-height: 1.55;

  &.bubble--left {
    background: var(--color-third);
    border: 1px solid var(--color-item-border);
    border-radius: 0.25rem 1.2rem 1.2rem 1.2rem;
  }

  &.bubble--right {
    background: rgba(123, 191, 158, 0.12);
    border: 1px solid rgba(123, 191, 158, 0.35);
    border-radius: 1.2rem 0.25rem 1.2rem 1.2rem;
  }
}

.bubble-en {
  font-size: 1rem;
  color: var(--color-main-text);
}

.bubble-zh {
  font-size: 0.82rem;
  color: var(--color-sub-text);
  margin-top: 0.3rem;
  line-height: 1.4;
}

// ── 底部导航 ─────────────────────────────────────────
.article-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--color-item-border);
  padding-top: 0.75rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-audio {
  justify-content: center;
}

.nav-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.nav-index {
  font-size: 0.82rem;
  color: var(--color-sub-text);
  min-width: 4rem;
  text-align: center;
}

.header-learn-btn {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .dict-list-page {
    padding: 0.8rem;
    border-radius: 0;
    border: none;
    height: 100vh;
  }
  .dialogue-bubble { max-width: 85%; }
}
</style>

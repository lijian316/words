<script setup lang="ts">
import { useBaseStore } from '@typewords/core/stores/base.ts'
import { BaseButton, BasePage, OptionButton, PopConfirm, Toast } from '@typewords/base'
import {
  _getAccomplishDate,
  _getDictDataByUrl,
  _nextTick,
  isMobile,
  loadJsLib,
  shuffle,
  useNav,
} from '@typewords/core/utils'
import type { DictResource } from '@typewords/core/types/types.ts'
import { watch } from 'vue'
import { getCurrentStudyWord } from '@typewords/core/hooks/dict.ts'
import { useRuntimeStore } from '@typewords/core/stores/runtime.ts'
import { getDefaultDict } from '@typewords/core/types/func.ts'
import PracticeSettingDialog from '@typewords/core/components/word/PracticeSettingDialog.vue'
import ChangeLastPracticeIndexDialog from '@typewords/core/components/word/ChangeLastPracticeIndexDialog.vue'
import { defineAsyncComponent } from 'vue'
const Dialog = defineAsyncComponent(() => import('@typewords/base/Dialog'))
import { useSettingStore } from '@typewords/core/stores/setting.ts'
import {
  APP_NAME,
  AppEnv,
  LIB_JS_URL,
  Old_Host,
  Origin,
  TourConfig,
  WordPracticeModeNameMap,
  WordPracticeModeUrlMap,
} from '@typewords/core/config/env.ts'
import { myDictList } from '@typewords/core/apis'
import PracticeWordListDialog from '@typewords/core/components/word/PracticeWordListDialog.vue'
import ShufflePracticeSettingDialog from '@typewords/core/components/word/ShufflePracticeSettingDialog.vue'
import { usePracticeWordPersistence } from '@typewords/core/composables/usePracticePersistence.ts'
import { WordPracticeMode } from '@typewords/core/types/enum.ts'
import type { PracticeWordCache } from '@typewords/core/utils/cache.ts'

const store = useBaseStore()
const settingStore = useSettingStore()
const wordPersistence = usePracticeWordPersistence()
const { nav } = useNav()
const runtimeStore = useRuntimeStore()
let loading = $ref(true)
let isSaveData = $ref(false)

const shouldShowDialogPracticeMode = [WordPracticeMode.Shuffle, WordPracticeMode.ShuffleWordsTest]

useHead({
  title: APP_NAME + ' 单词',
})

let practiceData = $ref<PracticeWordCache>({
  taskWords: {
    new: [],
    review: [],
  },
  practiceData: null,
  statStoreData: null,
} as any)

function resetCacheData() {
  isSaveData = false
  practiceData.practiceData = null
  practiceData.statStoreData = null
  wordPersistence.clear()
}

watch(
  [() => store.load, () => runtimeStore.globalLoading],
  ([a, b]) => {
    if (a && !b) {
      init()
      _nextTick(async () => {
        const Shepherd = await loadJsLib('Shepherd', LIB_JS_URL.SHEPHERD)
        const tour = new Shepherd.Tour(TourConfig)
        tour.on('cancel', () => {
          localStorage.setItem('tour-guide', '1')
        })
        tour.addStep({
          id: 'step1',
          text: '点击这里选择一本词典开始学习',
          attachTo: {
            element: '#step1',
            on: 'bottom',
          },
          buttons: [
            {
              text: `下一步（1/${TourConfig.total}）`,
              action() {
                tour.next()
                openDictListDialog()
              },
            },
          ],
        })
        const r = localStorage.getItem('tour-guide')
        if (settingStore.first && !r && !isMobile()) tour.start()
      }, 500)
    }
  },
  { immediate: true }
)

async function onvisibilitychange() {
  if (!document.hidden) {
    const d = await wordPersistence.fetch()
    if (d) {
      practiceData = d
      isSaveData = true
    }
  }
}

async function init() {
  if (AppEnv.CAN_REQUEST) {
    let res = await myDictList({ type: 'word' })
    if (res.success) {
      store.setState(Object.assign(store.$state, res.data))
    }
  }

  document.removeEventListener('visibilitychange', onvisibilitychange)
  document.addEventListener('visibilitychange', onvisibilitychange)

  if (store.word.studyIndex >= 3) {
    if (!store.sdict.custom && !store.sdict.words.length) {
      store.word.bookList[store.word.studyIndex] = await _getDictDataByUrl(store.sdict)
    }
  }

  if (!practiceData?.taskWords.new.length && store.sdict.words.length) {
    const d = await wordPersistence.load()
    if (d) {
      practiceData = d
      isSaveData = true
    } else {
      practiceData.taskWords = getCurrentStudyWord()
    }
  }
  loading = false
}

function startPractice(practiceMode: WordPracticeMode, resetCache: boolean = false): void {
  if (resetCache) resetCacheData()

  if (shouldShowDialogPracticeMode.includes(practiceMode) && !isSaveData) {
    editingWordPracticeMode = practiceMode
    showShufflePracticeSettingDialog = true
    return
  }

  if (store.sdict.id) {
    if (!store.sdict.words.length) {
      Toast.warning('没有单词可学习！')
      return
    }

    settingStore.wordPracticeMode = practiceMode

    window.umami?.track('startStudyWord', {
      name: store.sdict.name,
      index: store.sdict.lastLearnIndex,
      perDayStudyNumber: store.sdict.perDayStudyNumber,
      custom: store.sdict.custom,
      complete: store.sdict.complete,
      wordPracticeMode: settingStore.wordPracticeMode,
    })
    if (settingStore.first) settingStore.first = false
    nav(WordPracticeModeUrlMap[practiceMode] + '/' + store.sdict.id, {}, practiceData)
  } else {
    window.umami?.track('no-dict')
    Toast.warning('请先选择一本词典')
  }
}

function freePractice() {
  startPractice(WordPracticeMode.Free, settingStore.wordPracticeMode !== WordPracticeMode.Free)
}
function systemPractice() {
  startPractice(
    settingStore.wordPracticeMode === WordPracticeMode.Free ? WordPracticeMode.System : settingStore.wordPracticeMode,
    settingStore.wordPracticeMode === WordPracticeMode.Free
  )
}

let editingWordPracticeMode = $ref(0)

let showPracticeSettingDialog = $ref(false)
let showShufflePracticeSettingDialog = $ref(false)
let showChangeLastPracticeIndexDialog = $ref(false)
let showPracticeWordListDialog = $ref(false)

let sliderValue = $ref(0)
let pendingSliderValue = $ref(0)
let showSliderConfirm = $ref(false)

watch(() => store.sdict.lastLearnIndex, (v) => {
  if (!showSliderConfirm) sliderValue = v || 0
}, { immediate: true })

function onSliderInput(e: Event) {
  sliderValue = parseInt((e.target as HTMLInputElement).value)
}

function onSliderChange(e: Event) {
  const newVal = parseInt((e.target as HTMLInputElement).value)
  if (newVal === store.sdict.lastLearnIndex) return
  pendingSliderValue = newVal
  showSliderConfirm = true
}

async function confirmSlider() {
  showSliderConfirm = false
  runtimeStore.editDict = getDefaultDict(store.sdict)
  await saveLastPracticeIndex(pendingSliderValue)
  sliderValue = pendingSliderValue
}

function cancelSlider() {
  sliderValue = store.sdict.lastLearnIndex || 0
  showSliderConfirm = false
}

async function goDictDetail(val: DictResource) {
  if (!val.id) return nav('dict-list')
  runtimeStore.editDict = getDefaultDict(val)
  nav('/dict', {})
}


function check(cb: Function) {
  if (!store.sdict.id) {
    Toast.warning('请先选择一本词典')
  } else {
    runtimeStore.editDict = getDefaultDict(store.sdict)
    cb()
  }
}

async function savePracticeSetting() {
  Toast.success('修改成功')
  resetCacheData()
  await store.changeDict(runtimeStore.editDict)
  practiceData.taskWords = getCurrentStudyWord()
}

async function onShufflePracticeSettingOk(total) {
  resetCacheData()
  settingStore.wordPracticeMode = editingWordPracticeMode

  window.umami?.track('startStudyWord', {
    name: store.sdict.name,
    index: store.sdict.lastLearnIndex,
    perDayStudyNumber: store.sdict.perDayStudyNumber,
    custom: store.sdict.custom,
    complete: store.sdict.complete,
    wordPracticeMode: settingStore.wordPracticeMode,
  })

  let ignoreSet = [store.allIgnoreWordsSet, store.knownWordsSet][settingStore.ignoreSimpleWord ? 0 : 1]
  practiceData.taskWords.review = shuffle(
    store.sdict.words
      .slice(0, store.sdict.lastLearnIndex)
      .filter(v => !ignoreSet.has(v.word))
      .slice(0, total)
  )
  nav(
    WordPracticeModeUrlMap[editingWordPracticeMode] + '/' + store.sdict.id,
    {},
    {
      ...practiceData,
      total,
    }
  )
}

async function saveLastPracticeIndex(e) {
  Toast.success('修改成功')
  runtimeStore.editDict.lastLearnIndex = e
  showChangeLastPracticeIndexDialog = false
  isSaveData = false
  resetCacheData()
  await store.changeDict(runtimeStore.editDict)
  practiceData.taskWords = getCurrentStudyWord()
}

async function goBookDetail(val: DictResource) {
  runtimeStore.editDict = getDefaultDict(val)
  nav('/book/' + val.id)
}

const systemPracticeText = $computed(() => {
  if (settingStore.wordPracticeMode === WordPracticeMode.Free) {
    return '开始学习'
  } else {
    return isSaveData
      ? '继续' + WordPracticeModeNameMap[settingStore.wordPracticeMode]
      : '开始' + WordPracticeModeNameMap[settingStore.wordPracticeMode]
  }
})

let isOldHost = $ref(false)
let showSettingDialog = $ref(false)
let showFsrsDialog = $ref(false)
let showDictSwitchDropdown = $ref(false)
let showBookSwitchDropdown = $ref(false)


function onClickBookSwitch() {
  const others = store.article.bookList.filter((_, i) => i !== store.article.studyIndex)
  if (others.length > 0) {
    showBookSwitchDropdown = !showBookSwitchDropdown
  } else {
    openBookListDialog()
  }
}

function switchToStudyBook(index: number) {
  showBookSwitchDropdown = false
  store.article.studyIndex = index
}

function onClickDictSwitch() {
  const others = store.word.bookList.filter((_, i) => i !== store.word.studyIndex)
  if (others.length > 0) {
    showDictSwitchDropdown = !showDictSwitchDropdown
  } else {
    openDictListDialog()
  }
}

async function switchToStudyDict(item: any, index: number) {
  showDictSwitchDropdown = false
  store.word.studyIndex = index
  resetCacheData()
  if (index >= 3 && !item.custom && !item.words?.length) {
    store.word.bookList[index] = await _getDictDataByUrl(item)
  }
  practiceData.taskWords = getCurrentStudyWord()
}

function openDictListDialog() {
  nav('/dict-list')
}
function openBookListDialog() {
  nav('/book-list')
}
onMounted(() => {
  isOldHost = window.location.host === Old_Host
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onvisibilitychange)
})
</script>

<template>
  <BasePage>
    <div class="top-entries">
      <div class="setting-entry" @click="showFsrsDialog = true" title="学习记录" v-if="settingStore.enableFSRS">
        <IconFluentCalendarLtr20Regular />
      </div>
      <div class="setting-entry" @click="showSettingDialog = true" title="设置">
        <IconFluentSettings20Regular />
      </div>
    </div>

    <div class="my-30 text-2xl text-red" v-if="isOldHost">
      已启用新域名
      <a class="mr-4" :href="`${Origin}/words?from_old_site=1`">{{ Origin }}</a
      >当前 2study.top 域名将在不久后停止使用
    </div>

    <!-- ══════════════ 词典练习 ══════════════ -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-title">
          <IconFluentBook20Regular class="section-icon" />
          <span>词典练习</span>
        </div>
        <div class="action-link" @click="openDictListDialog()">全部词典</div>
      </div>

      <!-- 当前词典 -->
      <template v-if="store.sdict.id">
        <!-- 词典名 + 进度 -->
        <div class="dict-progress-row">
          <div class="flex items-baseline gap-3 flex-wrap">
            <div class="dict-switch-wrap" @click.stop>
              <IconFluentArrowSwap20Regular class="dict-switch-icon" title="切换词典" @click="onClickDictSwitch" />
              <div class="dict-switch-dropdown" v-if="showDictSwitchDropdown">
                <template v-for="(item, i) in store.word.bookList" :key="item.id">
                  <div class="dict-switch-item" v-if="i !== store.word.studyIndex" @click="switchToStudyDict(item, i)">
                    <span class="dict-switch-name">{{ item.name }}</span>
                    <span class="dict-switch-meta">{{ item.length || item.words?.length || 0 }} 词</span>
                  </div>
                </template>
                <div class="dict-switch-item dict-switch-all" @click="showDictSwitchDropdown = false; openDictListDialog()">
                  <span>浏览全部词典…</span>
                </div>
              </div>
            </div>
            <div v-if="showDictSwitchDropdown" class="dict-switch-backdrop" @click="showDictSwitchDropdown = false" />
            <span @click="goDictDetail(store.sdict)" class="dict-name cursor-pointer">{{ store.sdict.name }}</span>
            <span class="dict-meta">{{ store.sdict.lastLearnIndex }} / {{ store.sdict.length }} 词</span>
            <span class="dict-meta" v-opacity="store.sdict.lastLearnIndex < store.sdict.length">
              预计完成 {{ _getAccomplishDate(store.sdict.words.length - store.sdict.lastLearnIndex, store.sdict.perDayStudyNumber) }}
            </span>
          </div>
          <div class="progress-slider-wrap mt-2">
            <input type="range" class="progress-slider"
              :min="0" :max="store.sdict.length"
              :value="sliderValue"
              @input="onSliderInput"
              @change="onSliderChange" />
            <div class="progress-slider-track">
              <div class="progress-slider-fill" :style="{ width: (store.sdict.length ? sliderValue / store.sdict.length * 100 : 0) + '%' }" />
            </div>
          </div>
          <div class="slider-confirm" v-if="showSliderConfirm">
            <span>修改进度到 <b>{{ pendingSliderValue }}</b> / {{ store.sdict.length }} 词？</span>
            <span class="action-link cursor-pointer" @click="confirmSlider">确认</span>
            <span class="action-link-gray cursor-pointer" @click="cancelSlider">取消</span>
          </div>
        </div>

        <!-- 今日任务统计 -->
        <div class="task-row">
          <div class="task-stat task-stat--clickable" @click="showPracticeWordListDialog = true" title="查看今日词表">
            <span class="task-num">{{ practiceData?.taskWords?.new?.length }}</span>
            <span class="task-label">{{ $t('new_words') }}</span>
          </div>
          <div class="task-divider" />
          <div class="task-stat">
            <span class="task-num">{{ practiceData?.taskWords?.review?.length }}</span>
            <span class="task-label">{{ $t('review') }}</span>
          </div>
          <div class="task-divider" />
          <div class="task-stat">
            <span class="task-num" style="color: var(--color-sub-text)">{{ store.sdict.perDayStudyNumber }}</span>
            <span class="task-label">
              {{ $t('daily_goal') }}
              <PopConfirm :disabled="!isSaveData" title="当前存在未完成的学习任务，修改会重新生成学习任务，是否继续？"
                @confirm="check(() => (showPracticeSettingDialog = true))" @click.stop>
                <span class="action-link ml-1" @click.stop>{{ $t('change') }}</span>
              </PopConfirm>
            </span>
          </div>
          <div class="flex-1" />
          <OptionButton class="primary-btn">
            <BaseButton size="normal" type="primary" :loading="loading" @click="systemPractice">
              <div class="flex items-center gap-1">
                <IconFluentPlay20Filled />
                <span>{{ systemPracticeText }}</span>
              </div>
            </BaseButton>
            <template #options>
              <BaseButton class="w-full"
                v-if="settingStore.wordPracticeMode !== WordPracticeMode.System && settingStore.wordPracticeMode !== WordPracticeMode.Free"
                @click="startPractice(WordPracticeMode.System, true)">{{ $t('smart_learning') }}</BaseButton>
              <BaseButton class="w-full" v-if="settingStore.wordPracticeMode !== WordPracticeMode.Review"
                :disabled="!practiceData?.taskWords?.review?.length" @click="startPractice(WordPracticeMode.Review, true)">{{ $t('review') }}</BaseButton>
              <BaseButton class="w-full" v-if="settingStore.wordPracticeMode !== WordPracticeMode.Shuffle"
                :disabled="store.sdict.lastLearnIndex < 10 && !store.sdict.complete" @click="startPractice(WordPracticeMode.Shuffle, true)">{{ $t('random_review') }}</BaseButton>
              <BaseButton class="w-full" v-if="settingStore.wordPracticeMode !== WordPracticeMode.ReviewWordsTest"
                :disabled="store.sdict.lastLearnIndex < 10 && !store.sdict.complete" @click="startPractice(WordPracticeMode.ReviewWordsTest, true)">{{ $t('words') }}{{ $t('test') }}</BaseButton>
              <BaseButton class="w-full" v-if="settingStore.wordPracticeMode !== WordPracticeMode.ShuffleWordsTest"
                :disabled="store.sdict.lastLearnIndex < 10 && !store.sdict.complete" @click="startPractice(WordPracticeMode.ShuffleWordsTest, true)">{{ $t('random_words_test') }}</BaseButton>
              <BaseButton class="w-full" @click="freePractice()">
                {{ isSaveData && settingStore.wordPracticeMode === WordPracticeMode.Free ? $t('continue_free_practice') : $t('free_practice') }}
              </BaseButton>
            </template>
          </OptionButton>
        </div>
      </template>

      <!-- 未选词典 -->
      <div class="flex items-center gap-4 py-2" v-else>
        <div class="text-base" style="color: var(--color-sub-text)">{{ $t('select_dict_to_start') }}</div>
        <BaseButton id="step1" type="primary" size="large" @click="openDictListDialog()">
          <div class="center gap-1"><IconFluentAdd16Regular /><span>{{ $t('select_dict') }}</span></div>
        </BaseButton>
      </div>

    </div>

    <!-- ══════════════ 书籍练习 ══════════════ -->
    <div class="section-block">
      <div class="section-header">
        <div class="section-title">
          <IconFluentBookOpen20Regular class="section-icon" />
          <span>书籍练习</span>
        </div>
        <div class="action-link" @click="openBookListDialog()">全部书籍</div>
      </div>

      <template v-if="store.sbook.id">
        <!-- 书籍名 + 进度 -->
        <div class="dict-progress-row">
          <div class="flex items-baseline gap-3 flex-wrap">
            <div class="dict-switch-wrap" @click.stop>
              <IconFluentArrowSwap20Regular class="dict-switch-icon" title="切换书籍" @click="onClickBookSwitch" />
              <div class="dict-switch-dropdown" v-if="showBookSwitchDropdown">
                <template v-for="(item, i) in store.article.bookList" :key="item.id">
                  <div class="dict-switch-item" v-if="i !== store.article.studyIndex" @click="switchToStudyBook(i)">
                    <span class="dict-switch-name">{{ item.name }}</span>
                    <span class="dict-switch-meta">{{ item.length }} 篇</span>
                  </div>
                </template>
                <div class="dict-switch-item dict-switch-all" @click="showBookSwitchDropdown = false; openBookListDialog()">
                  <span>浏览全部书籍…</span>
                </div>
              </div>
            </div>
            <div v-if="showBookSwitchDropdown" class="dict-switch-backdrop" @click="showBookSwitchDropdown = false" />
            <span @click="goBookDetail(store.sbook)" class="dict-name cursor-pointer">{{ store.sbook.name }}</span>
            <span class="dict-meta">{{ store.sbook.lastLearnIndex }} / {{ store.sbook.length }} 篇</span>
          </div>
          <div class="progress-slider-wrap mt-2">
            <div class="progress-slider-track">
              <div class="progress-slider-fill" :style="{ width: store.currentBookProgress + '%' }" />
            </div>
          </div>
        </div>

        <!-- 统计行 -->
        <div class="task-row">
          <div class="task-stat">
            <span class="task-num">{{ store.sbook.lastLearnIndex }}</span>
            <span class="task-label">已学篇数</span>
          </div>
          <div class="task-divider" />
          <div class="task-stat">
            <span class="task-num" style="color: var(--color-sub-text)">{{ store.sbook.length - store.sbook.lastLearnIndex }}</span>
            <span class="task-label">剩余篇数</span>
          </div>
          <div class="flex-1" />
          <BaseButton size="normal" type="primary" @click="goBookDetail(store.sbook)">
            <div class="flex items-center gap-1">
              <IconFluentPlay20Filled />
              <span>{{ store.sbook.lastLearnIndex > 0 ? '继续学习' : '开始学习' }}</span>
            </div>
          </BaseButton>
        </div>
      </template>

      <!-- 未选书籍 -->
      <div class="flex items-center gap-4 py-2" v-else>
        <div class="text-base" style="color: var(--color-sub-text)">尚未选择书籍</div>
        <BaseButton type="primary" size="large" @click="openBookListDialog()">
          <div class="center gap-1"><IconFluentAdd16Regular /><span>选择书籍</span></div>
        </BaseButton>
      </div>

    </div>

    <!-- ══════════════ 美剧学英语（预留）══════════════ -->
    <div class="section-block coming-soon-block">
      <div class="section-header">
        <div class="section-title">
          <IconFluentMoviesAndTv20Regular class="section-icon" />
          <span>美剧学英语</span>
        </div>
        <span class="coming-tag">即将推出</span>
      </div>
      <div class="coming-body">
        通过跟打美剧台词练习听力与口语，敬请期待…
      </div>
    </div>
  </BasePage>

  <Dialog v-model="showSettingDialog" :full-screen="true" :header="false" :padding="false">
    <iframe src="/setting" class="setting-iframe" />
  </Dialog>

  <Dialog v-model="showFsrsDialog" :full-screen="true" :header="false" :padding="false">
    <iframe src="/fsrs" class="setting-iframe" />
  </Dialog>

  <PracticeSettingDialog :show-left-option="false" v-model="showPracticeSettingDialog" @ok="savePracticeSetting" />
  <ChangeLastPracticeIndexDialog v-model="showChangeLastPracticeIndexDialog" @ok="saveLastPracticeIndex" />
  <PracticeWordListDialog :data="practiceData?.taskWords" v-model="showPracticeWordListDialog" />
  <ShufflePracticeSettingDialog v-model="showShufflePracticeSettingDialog" @ok="onShufflePracticeSettingOk" :wordPracticeMode="editingWordPracticeMode" />
</template>

<style scoped lang="scss">
.dict-btn-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.dict-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 1rem;
  min-width: 90px;
  border-radius: 10px;
  background: var(--color-second);
  border: 1.5px solid var(--color-item-border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  overflow: hidden;

  &:hover { border-color: var(--color-select-bg); }

  &--active {
    border-color: var(--color-select-bg);
    background: var(--color-fifth);
  }

  &--add {
    flex-direction: row;
    align-items: center;
    gap: 0.3rem;
    color: var(--color-main-text);
    opacity: 0.5;
    border-style: dashed;
    font-size: 0.85rem;
    &:hover { opacity: 0.8; }
  }
}

.dict-btn-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.dict-btn-count {
  font-size: 0.75rem;
  color: var(--color-sub-text);
  margin-top: 2px;
}

.dict-btn-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-item-border);
}

.dict-btn-progress-bar {
  height: 100%;
  background: var(--color-select-bg);
  border-radius: 0 2px 2px 0;
  transition: width 0.3s;
}

.dict-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-main-text);
  transition: color 0.15s;
  &:hover { color: var(--color-select-bg); }
}

.dict-meta {
  font-size: 0.8rem;
  color: var(--color-sub-text);
}

.dict-switch-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.dict-switch-icon {
  font-size: 1rem;
  color: var(--color-sub-text);
  cursor: pointer;
  opacity: 0.6;
  align-self: center;
  transition: opacity 0.15s, color 0.15s;
  &:hover { opacity: 1; color: var(--color-select-bg); }
}

.dict-switch-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  min-width: 180px;
  background: var(--color-second);
  border: 1px solid var(--color-item-border);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  overflow: hidden;
}

.dict-switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--color-main-text);
  transition: background 0.12s;

  &:hover { background: var(--color-third); }

  &.dict-switch-all {
    color: var(--color-select-bg);
    border-top: 1px solid var(--color-item-border);
    font-size: 0.82rem;
  }
}

.dict-switch-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dict-switch-meta {
  font-size: 0.75rem;
  color: var(--color-sub-text);
  flex-shrink: 0;
}

.dict-switch-backdrop {
  position: fixed;
  inset: 0;
  z-index: 199;
}

.dict-progress-row {
  padding: 0.25rem 0 0.5rem;
}

.progress-slider-wrap {
  position: relative;
  height: 1rem;
  display: flex;
  align-items: center;
}

.progress-slider-track {
  position: absolute;
  left: 0; right: 0;
  height: 6px;
  border-radius: 3px;
  background: var(--color-progress-bar);
  pointer-events: none;
}

.progress-slider-fill {
  height: 100%;
  border-radius: 3px;
  background: #7bbf9e;
  transition: width 0.1s;
}

.progress-slider {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 1rem;
  appearance: none;
  background: transparent;
  cursor: pointer;
  margin: 0;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #7bbf9e;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: transform 0.15s;
  }

  &:hover::-webkit-slider-thumb,
  &:active::-webkit-slider-thumb {
    transform: scale(1.25);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #7bbf9e;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    cursor: pointer;
  }
}

.slider-confirm {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.82rem;
  color: var(--color-sub-text);
  margin-top: 0.35rem;
}

.action-link-gray {
  color: var(--color-sub-text);
  cursor: pointer;
  &:hover { opacity: 0.7; }
}

.task-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  flex-wrap: wrap;
}

.task-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;

  &--clickable {
    cursor: pointer;
    border-radius: 8px;
    padding: 0.2rem 0.5rem;
    transition: background 0.15s;
    &:hover { background: var(--color-third); }
  }
}

.task-num {
  font-size: 1.6rem;
  font-weight: 700;
  color: #7bbf9e;
  line-height: 1;
}

.task-label {
  font-size: 0.75rem;
  color: var(--color-sub-text);
  display: flex;
  align-items: center;
}

.task-divider {
  width: 1px;
  height: 2rem;
  background: var(--color-item-border);
  flex-shrink: 0;
}

.dict-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
  --btn-primary: #7bbf9e;
  --btn-primary-hover: #5fa882;
  --btn-primary-disabled: #b8dece;

  :deep(.primary-btn .more) {
    border-left-color: #5fa882 !important;
  }
}

.current-progress-bar {
  padding: 0.4rem 0;
  cursor: pointer;
  margin-bottom: 0.5rem;
  &:hover .current-progress-name { color: var(--color-select-bg); }
}

.current-progress-name {
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.15s;
}

.setting-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.list-dialog-wrap {
  width: min(700px, 85vw);
  display: flex;
  flex-direction: column;
}

.dl-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1.2rem 0.5rem;
  flex-shrink: 0;
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

.list-dialog-scroll-wrap {
  position: relative;
  overflow: hidden;
  flex: 1;
}

.list-dialog-body {
  max-height: 65vh;
  overflow-y: auto;
  padding: 0 1.2rem 1.2rem;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.list-dialog-scroll-hint {
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

.list-dialog-tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
}

.list-dialog-tag-item {
  padding: 0.2rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.82rem;
  cursor: pointer;
  color: var(--color-sub-text);
  background: var(--color-third);
  transition: all 0.15s;

  &:hover { color: var(--color-main-text); }

  &.active {
    background: var(--color-select-bg);
    color: #fff;
  }
}

.list-dialog-btns {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
}

// 书脊颜色循环
$spine-colors: #7bbf9e;
@for $i from 1 through length($spine-colors) {
  .list-dialog-btn:nth-child(#{length($spine-colors)}n + #{$i}) {
    --spine-color: #{nth($spine-colors, $i)};
  }
}

.list-dialog-btn {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.75rem 0.6rem 0.6rem 1rem;
  min-height: 90px;
  border-radius: 2px 6px 6px 2px;
  border: 1px solid var(--color-item-border);
  border-left: 6px solid var(--spine-color, var(--color-select-bg));
  background: var(--color-second);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.07);
  position: relative;

  // 书页边缘效果
  &::after {
    content: '';
    position: absolute;
    right: -1px;
    top: 3px;
    bottom: 3px;
    width: 3px;
    background: linear-gradient(to right, var(--color-item-border), transparent);
    border-radius: 0 2px 2px 0;
  }

  &:hover {
    transform: translateY(-2px) rotate(-0.5deg);
    box-shadow: 4px 6px 12px rgba(0,0,0,0.12);
  }

  &--active {
    background: var(--color-fifth);
    border-left-color: var(--spine-color, var(--color-select-bg));
    box-shadow: 4px 4px 10px rgba(0,0,0,0.12);

    .list-dialog-btn-name { color: var(--color-select-bg); }
  }
}

.list-dialog-btn-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-main-text);
  line-height: 1.3;
  word-break: break-all;
}

.list-dialog-btn-count {
  font-size: 0.68rem;
  color: var(--color-sub-text);
  margin-top: 0.4rem;
}

.top-entries {
  position: fixed;
  top: 1rem;
  right: 1.2rem;
  z-index: 100;
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .top-entries {
    position: static;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
    padding-right: 0.25rem;
  }
}

.setting-entry {
  position: static;
  width: 2.2rem;
  height: 2.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--color-sub-text);
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--color-third);
    color: var(--color-main-text);
  }
}

.section-block {
  @apply rounded-2xl p-6 mb-3;
  background: var(--color-second);
  border: 1px solid var(--color-item-border);
}

.section-divider {
  width: 100%;
  border-bottom: 1px solid var(--color-item-border);
  margin: 0.75rem 0 1rem;
  opacity: 0.5;
}

.section-header {
  @apply flex justify-between items-center mb-5;
}

.section-title {
  @apply flex items-center gap-2 text-xl font-bold;
}

.section-icon {
  font-size: 1.3rem;
  color: var(--color-sub-text);
}

.sub-label {
  @apply text-sm font-semibold text-gray-400 mt-5 mb-3 uppercase tracking-wider;
}

.action-link {
  @apply color-link cursor-pointer text-sm;
}

.task-label .action-link {
  color: #7bbf9e;
  &:hover { color: #5fa882; }
}

.section-header .action-link {
  color: var(--color-sub-text);
  &:hover { color: var(--color-main-text); }
}

.coming-soon-block {
  border: 2px dashed var(--color-item-border);
  background: var(--color-primary) !important;
  box-shadow: none !important;
}

.coming-tag {
  @apply text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-500 font-medium;
}

.coming-body {
  @apply text-gray-400 text-sm py-4 text-center;
}

@media (max-width: 768px) {
  .task-row { gap: 0.6rem; }
  .task-num { font-size: 1.3rem; }
  .dict-actions { gap: 0.4rem; }
}
</style>

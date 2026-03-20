<script setup lang="ts">
import { detail } from '@typewords/core/apis'
import BackIcon from '@typewords/core/components/icon/BackIcon.vue'
import { BaseButton, BaseIcon, BasePage, Form, FormItem, PopConfirm, Textarea, Toast } from '@typewords/base'
import { BaseInput } from '@typewords/base'
import { AppEnv, DictId, LIB_JS_URL, TourConfig } from '@typewords/core/config/env.ts'
import { getCurrentStudyWord, useWordOptions } from '@typewords/core/hooks/dict.ts'
import EditBook from '@typewords/core/components/article/EditBook.vue'
import PracticeSettingDialog from '@typewords/core/components/word/PracticeSettingDialog.vue'
import { useBaseStore } from '@typewords/core/stores/base.ts'
import { useRuntimeStore } from '@typewords/core/stores/runtime.ts'
import { useSettingStore } from '@typewords/core/stores/setting.ts'
import { getDefaultDict } from '@typewords/core/types/func.ts'
import {
  _getDictDataByUrl,
  _nextTick,
  convertToWord,
  isMobile,
  loadJsLib,
  reverse,
  shuffle,
  useNav,
} from '@typewords/core/utils'
import { MessageBox } from '@typewords/core/utils/MessageBox.tsx'
import { nanoid } from 'nanoid'
import { computed, defineAsyncComponent, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { wordDelete } from '@typewords/core/apis/words.ts'
import { copyOfficialDict } from '@typewords/core/apis/dict.ts'
import { PRACTICE_WORD_CACHE } from '@typewords/core/utils/cache.ts'
import { Sort, WordPracticeMode } from '@typewords/core/types/enum.ts'

const Dialog = defineAsyncComponent(() => import('@typewords/base/Dialog'))

const runtimeStore = useRuntimeStore()
const base = useBaseStore()
const router = useRouter()
const route = useRoute()
const { t: $t } = useI18n()

let loading = $ref(false)
let allList = $ref([])

// ── Word form ────────────────────────────────────────────────
const getDefaultFormWord = () => ({
  id: '', word: '', phonetic0: '', phonetic1: '',
  trans: '', sentences: '', phrases: '', synos: '', relWords: '', etymology: '',
})

let wordForm = $ref(getDefaultFormWord())
let wordFormRef = $ref<any>()
let showWordDialog = $ref(false)

const wordRules = reactive<any>({
  word: [
    { required: true, message: '请输入单词', trigger: 'blur' },
    { max: 100, message: '名称不能超过100个字符', trigger: 'blur' },
  ],
})

// ── Dict state ───────────────────────────────────────────────
let isEdit = $ref(false)
let isAdd = $ref(false)
let studyLoading = $ref(false)
let showPracticeSettingDialog = $ref(false)

const showBookDetail = computed(() => !(isAdd || isEdit))
const dict = $computed(() => runtimeStore.editDict)

// ── Infinite scroll & search ─────────────────────────────────
const PAGE_SIZE = 50
let visibleCount = $ref(PAGE_SIZE)
let dictSearch = $ref('')
let showSortMenu = $ref(false)
let showDeleteMode = $ref(false)
let selectedIds = $ref<string[]>([])
let filterKnown = $ref(false)
let wordGridRef = $ref<HTMLElement | null>(null)

const dictFiltered = $computed(() => {
  let list = allList as any[]
  if (dictSearch.trim()) {
    const s = dictSearch.trim().toLowerCase()
    list = list.filter((v: any) => v.word?.toLowerCase().includes(s))
  }
  if (filterKnown) {
    list = list.filter((v: any) => !base.knownWordsSet.has(v.word))
  }
  return list
})

const dictPaged = $computed(() => dictFiltered.slice(0, visibleCount))

const currentScrollPage = $computed(() => Math.ceil(visibleCount / PAGE_SIZE))
const totalScrollPages = $computed(() => Math.ceil(dictFiltered.length / PAGE_SIZE))

function onWordGridScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
    if (visibleCount < dictFiltered.length) {
      visibleCount += PAGE_SIZE
    }
  }
}

function scrollPageDown() {
  const el = wordGridRef
  if (!el) return
  el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' })
}

function toggleSelect(id: string) {
  const i = selectedIds.indexOf(id)
  if (i > -1) selectedIds.splice(i, 1)
  else selectedIds.push(id)
}

function toggleDeleteMode() {
  showDeleteMode = !showDeleteMode
  selectedIds = []
}

// ── Sync ─────────────────────────────────────────────────────
function syncDictInMyStudyList(study = false) {
  _nextTick(() => {
    let rIndex = base.word.bookList.findIndex(v => v.id === runtimeStore.editDict.id)
    runtimeStore.editDict.words = allList
    let temp = runtimeStore.editDict
    if (!temp.custom && ![DictId.wordKnown, DictId.wordWrong, DictId.wordCollect].includes(temp.id)) {
      temp.custom = true
      if (!temp.id.includes('_custom')) temp.id += '_custom_' + nanoid(6)
    }
    temp.length = temp.words.length
    if (rIndex > -1) {
      base.word.bookList[rIndex] = getDefaultDict(temp)
      if (study) base.word.studyIndex = rIndex
    } else {
      base.word.bookList.push(getDefaultDict(temp))
      if (study) base.word.studyIndex = base.word.bookList.length - 1
    }
  }, 100)
}

// ── Word CRUD ─────────────────────────────────────────────────
function word2Str(word) {
  let res = getDefaultFormWord()
  res.id = word.id
  res.word = word.word
  res.phonetic1 = word.phonetic1
  res.phonetic0 = word.phonetic0
  res.trans = word.trans.map(v => (v.pos + v.cn).replaceAll('"', '')).join('\n')
  res.sentences = word.sentences.map(v => (v.c + '\n' + v.cn).replaceAll('"', '')).join('\n\n')
  res.phrases = word.phrases.map(v => (v.c + '\n' + v.cn).replaceAll('"', '')).join('\n\n')
  res.synos = word.synos.map(v => (v.pos + v.cn + '\n' + v.ws.join('/')).replaceAll('"', '')).join('\n\n')
  res.relWords = word.relWords?.root
    ? '词根:' + word.relWords.root + '\n\n' +
      word.relWords.rels.map(v => (v.pos + '\n' + v.words.map(v => v.c + ':' + v.cn).join('\n')).replaceAll('"', '')).join('\n\n')
    : ''
  res.etymology = word.etymology.map(v => (v.t + '\n' + v.d).replaceAll('"', '')).join('\n\n')
  return res
}

function editWord(word) {
  wordForm = word2Str(word)
  showWordDialog = true
}

function addWord() {
  wordForm = getDefaultFormWord()
  showWordDialog = true
}

function closeWordForm() {
  showWordDialog = false
  wordForm = getDefaultFormWord()
}

async function onSubmitWord() {
  await wordFormRef.validate(valid => {
    if (valid) {
      let data: any = convertToWord(wordForm)
      if (data.id) {
        let r = allList.find(v => v.id === data.id)
        if (r) {
          Object.assign(r, data)
          Toast.success('修改成功')
          showWordDialog = false
        } else {
          Toast.success('修改失败，未找到单词')
          return
        }
      } else {
        data.id = nanoid(6)
        data.checked = false
        let r = allList.find(v => v.word === wordForm.word)
        if (r) {
          Toast.warning('已有相同名称单词！')
          return
        }
        allList.push(data)
        Toast.success('添加成功')
        wordForm = getDefaultFormWord()
        showWordDialog = false
      }
      syncDictInMyStudyList()
    } else {
      Toast.warning('请填写完整')
    }
  })
}

// ── Batch delete ──────────────────────────────────────────────
async function batchDel(ids: string[]) {
  const localHandle = () => {
    ids.forEach(id => {
      let i = allList.findIndex(v => v.id === id)
      if (i > -1) allList.splice(i, 1)
    })
    selectedIds = []
    visibleCount = PAGE_SIZE
    syncDictInMyStudyList()
  }

  const cloudHandle = async dictId => {
    let res = await wordDelete(null, { wordIds: ids, dictId })
    if (res.success) {
      selectedIds = []
      visibleCount = PAGE_SIZE
    } else {
      return Toast.error(res.msg ?? '删除失败')
    }
  }

  if (AppEnv.CAN_REQUEST) {
    if (dict.custom) {
      if (dict.sync) await cloudHandle(dict.id)
      else localHandle()
    } else {
      let r = await copyOfficialDict(null, { id: dict.id })
      if (r.success) {
        await cloudHandle(r.data.id)
        getDetail(r.data.id)
      } else {
        return Toast.error(r.msg)
      }
    }
  } else {
    localHandle()
  }
}

// ── Sort ──────────────────────────────────────────────────────
function doSort(type: Sort) {
  showSortMenu = false
  const fun = [Sort.reverse, Sort.reverseAll].includes(type) ? reverse : shuffle
  const isAll = [Sort.reverseAll, Sort.randomAll].includes(type)
  if (isAll) {
    allList = fun([...allList])
  } else {
    allList = [
      ...fun(allList.slice(0, visibleCount)),
      ...allList.slice(visibleCount),
    ]
  }
  runtimeStore.editDict.words = allList
  Toast.success('操作成功')
  syncDictInMyStudyList()
}

// ── Import / Export ───────────────────────────────────────────
let exportLoading = $ref(false)
let importLoading = $ref(false)

function importData(e) {
  let file = e.target.files[0]
  if (!file) return
  let reader = new FileReader()
  reader.onload = async function (s) {
    let data = s.target.result
    importLoading = true
    const XLSX = await loadJsLib('XLSX', LIB_JS_URL.XLSX)
    let workbook = XLSX.read(data, { type: 'binary' })
    let res: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['Sheet1'])
    if (res.length) {
      let words = res.map(v => {
        if (v['单词']) {
          try {
            return convertToWord({ id: nanoid(6), word: v['单词'], phonetic0: v['音标①'] ?? '', phonetic1: v['音标②'] ?? '', trans: v['翻译'] ?? '', sentences: v['例句'] ?? '', phrases: v['短语'] ?? '', synos: v['近义词'] ?? '', relWords: v['同根词'] ?? '', etymology: v['词源'] ?? '' })
          } catch (e) { console.error('导入单词报错' + v['单词'], e.message) }
        }
      }).filter(v => v)
      if (words.length) {
        let repeat = [], noRepeat = []
        words.forEach((v: any) => {
          let rIndex = runtimeStore.editDict.words.findIndex(s => s.word === v.word)
          if (rIndex > -1) { v.index = rIndex; repeat.push(v) }
          else noRepeat.push(v)
        })
        runtimeStore.editDict.words = runtimeStore.editDict.words.concat(noRepeat)
        const finish = () => {
          e.target.value = ''
          importLoading = false
          allList = runtimeStore.editDict.words
          visibleCount = PAGE_SIZE
          syncDictInMyStudyList()
          Toast.success('导入成功！')
        }
        if (repeat.length) {
          MessageBox.confirm('单词"' + repeat.map(v => v.word).join(', ') + '" 已存在，是否覆盖原单词？', '检测到重复单词', () => {
            repeat.forEach(v => { runtimeStore.editDict.words[v.index] = v; delete runtimeStore.editDict.words[v.index]['index'] })
          }, null, finish, { t: $t })
        } else finish()
      } else Toast.warning('导入失败！原因：没有数据/未识别到数据')
    } else Toast.warning('导入失败！原因：没有数据')
    e.target.value = ''
    importLoading = false
  }
  reader.readAsBinaryString(file)
}

async function exportData() {
  exportLoading = true
  const XLSX = await loadJsLib('XLSX', LIB_JS_URL.XLSX)
  let list = runtimeStore.editDict.words
  let filename = runtimeStore.editDict.name
  let wb = XLSX.utils.book_new()
  let sheetData = list.map(v => {
    let t = word2Str(v)
    return { 单词: t.word, '音标①': t.phonetic0, '音标②': t.phonetic1, 翻译: t.trans, 例句: t.sentences, 短语: t.phrases, 近义词: t.synos, 同根词: t.relWords, 词源: t.etymology }
  })
  wb.Sheets['Sheet1'] = XLSX.utils.json_to_sheet(sheetData)
  wb.SheetNames = ['Sheet1']
  XLSX.writeFile(wb, `${filename}.xlsx`)
  Toast.success(filename + ' 导出成功！')
  exportLoading = false
}

// ── Practice ──────────────────────────────────────────────────
const store = useBaseStore()
const settingStore = useSettingStore()
const { nav } = useNav()
const { isWordSimple, toggleWordSimple } = useWordOptions()

async function startPractice(query = {}) {
  if (![WordPracticeMode.Free, WordPracticeMode.System].includes(settingStore.wordPracticeMode)) {
    settingStore.wordPracticeMode = WordPracticeMode.System
  }
  localStorage.removeItem(PRACTICE_WORD_CACHE.key)
  studyLoading = true
  await base.changeDict(runtimeStore.editDict)
  studyLoading = false
  let currentStudy = getCurrentStudyWord()
  nav('practice-words/' + store.sdict.id, query, { taskWords: currentStudy })
}

async function addMyStudyList() {
  if (!runtimeStore.editDict.words.length) return Toast.warning('没有单词可学习！')
  showPracticeSettingDialog = true
}

async function startTest() {
  loading = true
  if (![WordPracticeMode.Free, WordPracticeMode.System].includes(settingStore.wordPracticeMode)) {
    settingStore.wordPracticeMode = WordPracticeMode.System
  }
  await base.changeDict(runtimeStore.editDict)
  loading = false
  nav('words-test/' + store.sdict.id, {}, {})
}

// ── Init ──────────────────────────────────────────────────────
async function getDetail(id) {
  let res = await detail({ id })
  if (res.success) runtimeStore.editDict = res.data
}

onMounted(async () => {
  if (route.query?.isAdd) {
    isAdd = true
    runtimeStore.editDict = getDefaultDict()
  } else {
    if (!runtimeStore.editDict.id) {
      return router.push('/words')
    }
    if (
      !runtimeStore.editDict.words.length &&
      !runtimeStore.editDict.custom &&
      ![DictId.wordCollect, DictId.wordWrong, DictId.wordKnown].includes(runtimeStore.editDict.en_name || runtimeStore.editDict.id)
    ) {
      loading = true
      let r = await _getDictDataByUrl(runtimeStore.editDict)
      runtimeStore.editDict = r
    }
    if (base.word.bookList.find(book => book.id === runtimeStore.editDict.id) && AppEnv.CAN_REQUEST) {
      getDetail(runtimeStore.editDict.id)
    }
    loading = false
  }
  allList = runtimeStore.editDict.words
})

function formClose() {
  if (isEdit) isEdit = false
  else router.back()
}
</script>

<template>
  <BasePage>
    <!-- ── 词典详情 ── -->
    <div class="dict-card" v-if="showBookDetail" v-loading="loading">

      <!-- Header -->
      <div class="dict-header">
        <BackIcon class="shrink-0" />
        <div class="dict-name flex-1 text-center">
          {{ dict.name }}<span v-if="dict.description" class="dict-desc-inline"> · {{ dict.description }}</span>
        </div>
        <div class="dict-header-actions">
<BaseButton :loading="studyLoading || loading" type="info" size="small" @click="startTest">测试</BaseButton>
          <BaseButton id="study" :loading="studyLoading || loading" size="small" @click="addMyStudyList">学习</BaseButton>
          <BaseButton :type="filterKnown ? 'primary' : 'info'" size="small" @click="filterKnown = !filterKnown">
            {{ filterKnown ? '显示全部' : '隐藏已掌握' }}
          </BaseButton>
        </div>
      </div>

      <div class="line my-2" />

      <!-- Toolbar -->
      <div class="dict-toolbar">
        <!-- Search -->
        <div class="search-wrap">
          <IconFluentSearch24Regular class="search-icon" />
          <input
            v-model="dictSearch"
            @input="visibleCount = PAGE_SIZE"
            placeholder="搜索单词…"
            class="search-input"
          />
        </div>
        <span class="toolbar-count">{{ dictFiltered.length }} 词</span>
      </div>

      <!-- Word card grid -->
      <div class="scroll-wrap">
      <div class="word-grid" ref="wordGridRef" @scroll="onWordGridScroll">
        <div
          v-for="word in dictPaged" :key="word.id"
          class="word-card"
          :class="{
            'word-card--selected': selectedIds.includes(word.id),
            'word-card--delete': showDeleteMode,
            'word-card--known': isWordSimple(word),
          }"
          @click="showDeleteMode ? toggleSelect(word.id) : editWord(word)"
        >
          <div class="word-card-check" v-if="showDeleteMode">
            <IconFluentCheckmark20Regular v-if="selectedIds.includes(word.id)" />
          </div>
          <button
            v-if="!showDeleteMode"
            class="word-known-btn"
            :class="{ active: isWordSimple(word) }"
            :title="isWordSimple(word) ? '取消已掌握' : '标记为已掌握'"
            @click.stop="toggleWordSimple(word)"
          >
            <IconFluentCheckmark16Regular />
          </button>
          <div class="word-card-word">{{ word.word }}</div>
          <div class="word-card-ph" v-if="word.phonetic0 || word.phonetic1">{{ word.phonetic0 || word.phonetic1 }}</div>
          <div class="word-card-trans">{{ word.trans?.[0]?.cn || '' }}</div>
        </div>
      </div>
      <Transition name="fade">
        <div class="scroll-hint" v-if="visibleCount < dictFiltered.length" @click="scrollPageDown">
          <span class="scroll-progress">{{ Math.min(visibleCount, dictFiltered.length) }}/{{ dictFiltered.length }}</span>
          <IconFluentChevronDown20Regular class="scroll-hint-icon" />
        </div>
      </Transition>
      </div>

      <!-- Empty state -->
      <div class="empty-state" v-if="!dictFiltered.length && !loading">
        <div>{{ dictSearch ? '没有匹配的单词' : '暂无单词，点击 + 添加' }}</div>
      </div>

    </div>

    <!-- ── 编辑词典元信息 ── -->
    <div class="dict-card" v-else>
      <div class="dict-header">
        <BackIcon @click="() => { if (isAdd) router.back(); else isEdit = false }" />
        <div class="dict-name flex-1 text-center">{{ runtimeStore.editDict.id ? $t('edit_dict') : $t('create_dict') }}</div>
      </div>
      <div class="center">
        <EditBook :isAdd="isAdd" :isBook="false" @close="formClose" @submit="() => (isEdit = isAdd = false)" />
      </div>
    </div>

    <!-- ── 单词编辑弹窗 ── -->
    <Dialog v-model="showWordDialog" :title="wordForm.id ? '编辑单词' : '添加单词'" :padding="true" :footer="true"
      :confirmButtonText="$t('save')" :cancelButtonText="$t('close')"
      @ok="onSubmitWord" @cancel="closeWordForm">
      <Form ref="wordFormRef" :rules="wordRules" :model="wordForm" label-width="6rem" class="word-dialog-form">
        <FormItem label="单词" prop="word">
          <BaseInput v-model="wordForm.word" />
        </FormItem>
        <FormItem label="英音音标">
          <BaseInput v-model="wordForm.phonetic0" />
        </FormItem>
        <FormItem label="美音音标">
          <BaseInput v-model="wordForm.phonetic1" />
        </FormItem>
        <FormItem label="翻译">
          <Textarea v-model="wordForm.trans" placeholder="一行一个翻译，前面词性，后面内容（如n.取消）" :autosize="{ minRows: 3, maxRows: 8 }" />
        </FormItem>
        <FormItem label="例句">
          <Textarea v-model="wordForm.sentences" placeholder="一行原文，一行译文；多个请换两行" :autosize="{ minRows: 3, maxRows: 8 }" />
        </FormItem>
        <FormItem label="同义词">
          <Textarea v-model="wordForm.synos" placeholder="请参考已有单词格式" :autosize="{ minRows: 2, maxRows: 8 }" />
        </FormItem>
      </Form>
    </Dialog>

    <PracticeSettingDialog
      showLeftOption
      v-model="showPracticeSettingDialog"
      @ok="startPractice"
    />
  </BasePage>
</template>

<style scoped lang="scss">
.dict-card {
  border-radius: 1rem;
  padding: 1.5rem;
  background: var(--color-second);
  border: 1px solid var(--color-item-border);
  height: calc(100vh - 2.4rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

// ── Header ────────────────────────────────────────────────────
.dict-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
  flex-shrink: 0;
}

.dict-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-main-text);
}


.dict-desc-inline {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--color-sub-text);
}

.dict-header-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

// ── Toolbar ───────────────────────────────────────────────────
.dict-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  flex-shrink: 0;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  background: var(--color-third);
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
}

.search-icon {
  color: var(--color-sub-text);
  font-size: 1rem;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.9rem;
  color: var(--color-main-text);
  &::placeholder { color: var(--color-sub-text); }
}

.toolbar-count {
  font-size: 0.8rem;
  color: var(--color-sub-text);
  white-space: nowrap;
}

.toolbar-icons {
  display: flex;
  gap: 0.1rem;
  flex-shrink: 0;
}

.toolbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--color-main-text);
  background: transparent;
  border: none;
  transition: background 0.15s, color 0.15s;
  opacity: 0.7;

  &:hover { background: var(--color-third); opacity: 1; }
  &.active { background: var(--color-third); color: var(--color-select-bg); opacity: 1; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Sort menu ─────────────────────────────────────────────────
.sort-menu {
  position: absolute;
  right: 2rem;
  background: var(--color-card-bg);
  border: 1px solid var(--color-item-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  z-index: 100;
  overflow: hidden;
}

.sort-item {
  padding: 0.5rem 1.2rem;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  color: var(--color-main-text);
  &:hover { background: var(--color-third); }
}

// ── Batch bar ─────────────────────────────────────────────────
.batch-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  flex-shrink: 0;
}

// ── Word grid ─────────────────────────────────────────────────
.scroll-wrap {
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.word-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  padding: 0.5rem 0;
  align-content: flex-start;
}

.scroll-hint {
  position: absolute;
  bottom: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  padding: 0.35rem 0.9rem 0.35rem 0.75rem;
  border-radius: 2rem;
  background: #7bbf9e;
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(123, 191, 158, 0.4);
  transition: background 0.15s, box-shadow 0.15s;
  &:hover {
    background: #5aad88;
    box-shadow: 0 3px 10px rgba(123, 191, 158, 0.55);
  }
}

.scroll-progress {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1;
}

.scroll-hint-icon {
  font-size: 1rem;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.word-card {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 0.9rem 0.65rem;
  border-radius: 14px;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  min-width: 120px;
  max-width: 180px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,0.1);
  }

  &--delete { padding-left: 1.8rem; }

  &--selected {
    border-color: var(--color-select-bg);
    background: var(--color-fifth);
  }

  &--known {
    opacity: 0.45;
  }
}

.word-card-check {
  position: absolute;
  left: 0.4rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  color: var(--color-select-bg);
}

.word-known-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  border: 1.5px solid var(--color-item-border);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--color-sub-text);
  padding: 0;

  &:hover { border-color: var(--color-select-bg); color: var(--color-select-bg); }

  &.active {
    background: var(--color-select-bg);
    border-color: var(--color-select-bg);
    color: #fff;
  }
}

.word-card-word {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-main-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1.4rem;
}

.word-card-ph {
  font-size: 0.68rem;
  color: var(--color-select-bg);
  font-family: ui-monospace, monospace;
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.word-card-trans {
  font-size: 0.75rem;
  color: var(--color-sub-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.2rem;
}

// ── Empty / Pagination ────────────────────────────────────────
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-sub-text);
  font-size: 0.9rem;
}

.dict-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 0;
  flex-shrink: 0;
}

.page-info {
  font-size: 0.85rem;
  color: var(--color-sub-text);
  min-width: 60px;
  text-align: center;
}

// ── Word dialog form ──────────────────────────────────────────
.word-dialog-form {
  width: min(680px, 90vw);
  max-height: 75vh;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  padding: 0.5rem 0.5rem 0.5rem 0;
}

// ── Mobile ────────────────────────────────────────────────────
@media (max-width: 768px) {
  .dict-card { height: unset; min-height: calc(100vh - 2rem); }
  .dict-header { flex-wrap: wrap; }
  .dict-name { order: -1; width: 100%; text-align: center; }
  .word-card { min-width: 80px; max-width: 130px; }
}
</style>

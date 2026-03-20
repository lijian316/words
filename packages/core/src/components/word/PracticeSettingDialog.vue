<script setup lang="ts">
import { _getAccomplishDays } from '../../utils'
import { BaseButton, InputNumber, Slider, Tooltip, Toast } from '@typewords/base'
import { defineAsyncComponent, watch } from 'vue'
import { useSettingStore } from '../../stores/setting'
import ChangeLastPracticeIndexDialog from './ChangeLastPracticeIndexDialog.vue'
import { useRuntimeStore } from '../../stores/runtime'

const Dialog = defineAsyncComponent(() => import('@typewords/base/Dialog'))

const settings = useSettingStore()
const runtimeStore = useRuntimeStore()

const model = defineModel()

defineProps<{
  showLeftOption: boolean
}>()

const emit = defineEmits<{
  ok: []
}>()

let show = $ref(false)
let tempPerDayStudyNumber = $ref(0)
let tempWordReviewRatio = $ref(0)
let tempLastLearnIndex = $ref(0)

function onIndexSelected(index: number) {
  tempLastLearnIndex = index
}

function changePerDayStudyNumber() {
  runtimeStore.editDict.perDayStudyNumber = Number(tempPerDayStudyNumber)
  runtimeStore.editDict.lastLearnIndex = Number(tempLastLearnIndex)
  settings.wordReviewRatio = tempWordReviewRatio
  emit('ok')
}

watch(
  () => model.value,
  n => {
    if (n) {
      if (runtimeStore.editDict.id) {
        tempPerDayStudyNumber = runtimeStore.editDict.perDayStudyNumber
        tempLastLearnIndex = runtimeStore.editDict.lastLearnIndex
        tempWordReviewRatio = settings.wordReviewRatio
      } else {
        Toast.warning($t('please_select_dict'))
      }
    }
  }
)
</script>

<template>
  <Dialog v-model="model" :title="$t('learning_settings')" padding :footer="true" @ok="changePerDayStudyNumber">
    <div class="target-modal color-main" id="mode">

      <!-- 统计摘要 -->
      <div class="stat-summary">
        <div class="stat-item">
          <span class="stat-val">{{ runtimeStore.editDict.length }}</span>
          <span class="stat-lbl">{{ $t('words_count') }}</span>
        </div>
        <div class="stat-sep" />
        <div class="stat-item">
          <span class="stat-val">{{ tempPerDayStudyNumber }}</span>
          <span class="stat-lbl">每日新词</span>
        </div>
        <div class="stat-sep" />
        <div class="stat-item">
          <span class="stat-val">{{ tempPerDayStudyNumber * tempWordReviewRatio }}</span>
          <span class="stat-lbl">每日复习</span>
        </div>
        <div class="stat-sep" />
        <div class="stat-item">
          <span class="stat-val">{{ tempLastLearnIndex }}</span>
          <span class="stat-lbl">起始单词</span>
        </div>
        <div class="stat-sep" />
        <div class="stat-item">
          <span class="stat-val">{{ _getAccomplishDays(runtimeStore.editDict.length - tempLastLearnIndex, tempPerDayStudyNumber) }}</span>
          <span class="stat-lbl">预计天数</span>
        </div>
      </div>

      <!-- 每日新词 -->
      <div class="setting-row">
        <div class="setting-label">{{ $t('daily_learning') }}</div>
        <Slider :min="10" :step="10" show-text :max="200" v-model="tempPerDayStudyNumber" />
      </div>

      <!-- 复习比 -->
      <div class="setting-row">
        <Tooltip :title="$t('review_ratio_tooltip')">
          <div class="setting-label flex items-center gap-1">
            <span>{{ $t('review_ratio') }}</span>
            <IconFluentQuestionCircle20Regular class="text-sm opacity-50" />
          </div>
        </Tooltip>
        <div class="flex items-center gap-3">
          <InputNumber :min="0" :max="10" v-model="tempWordReviewRatio" />
          <span v-if="!tempWordReviewRatio" class="text-sm" style="color:var(--color-sub-text)">{{ $t('review_ratio_notice_1') }}</span>
        </div>
      </div>

      <!-- 学习进度 -->
      <div class="setting-row">
        <div class="setting-label">{{ $t('learning_progress') }}</div>
        <div class="flex-1">
          <Slider :min="0" :step="10" show-text :max="runtimeStore.editDict.words.length" v-model="tempLastLearnIndex" />
          <BaseButton class="mt-2" @click="show = true">{{ $t('select_from_dict') }}</BaseButton>
        </div>
      </div>

    </div>
  </Dialog>
  <ChangeLastPracticeIndexDialog
    v-model="show"
    @ok="onIndexSelected"
  />
</template>

<style scoped lang="scss">
.target-modal {
  width: 35rem;
}

.stat-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: var(--color-third, #f3f0ec);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 0.2rem;
}

.stat-val {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-select-bg);
  line-height: 1;
}

.stat-lbl {
  font-size: 0.72rem;
  color: var(--color-sub-text);
}

.stat-sep {
  width: 1px;
  height: 2rem;
  background: var(--color-item-border);
  flex-shrink: 0;
}

.setting-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.setting-label {
  width: 5rem;
  flex-shrink: 0;
  font-size: 0.9rem;
  color: var(--color-main-text);
  padding-top: 0.15rem;
}

// 移动端适配
@media (max-width: 768px) {
  .target-modal {
    width: 90vw !important;
    max-width: 400px;
    padding: 0 1rem;

    // 模式选择
    .center .flex.gap-4 {
      width: 100%;
      flex-direction: column;
      height: auto;
      gap: 0.8rem;

      .mode-item {
        width: 100%;
        padding: 1rem;

        .title {
          font-size: 1rem;
        }

        .desc {
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }
      }
    }

    // 统计显示
    .text-center {
      font-size: 0.9rem;

      .text-3xl {
        font-size: 1.5rem;
      }
    }

    // 滑块控件
    .flex.mb-4,
    .flex.mb-6 {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;

      span {
        width: 100%;
      }

      .flex-1 {
        width: 100%;
      }
    }

    // 按钮
    .base-button {
      width: 100%;
      min-height: 44px;
    }
  }
}

@media (max-width: 480px) {
  .target-modal {
    width: 95vw !important;
    padding: 0 0.5rem;

    .text-center {
      font-size: 0.8rem;

      .text-3xl {
        font-size: 1.2rem;
      }
    }
  }
}
</style>

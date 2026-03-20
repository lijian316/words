<script setup lang="ts">
import { useBaseStore } from '@typewords/core/stores/base.ts'
import { BaseButton, Toast } from '@typewords/base'
import dayjs from 'dayjs'
import { State } from 'ts-fsrs'
import isToday from 'dayjs/plugin/isToday'
import utc from 'dayjs/plugin/utc'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
dayjs.extend(isToday)
dayjs.extend(utc)
dayjs.extend(isSameOrBefore)

const baseStore = useBaseStore()
let tableType = $ref('today')

const fsrsList = computed(() => {
  return Object.entries(baseStore.fsrsData)
    .filter(([, card]: [string, any]) => {
      return tableType === 'today' ? dayjs.utc(card.last_review).local().isToday() : true
    })
    .map(([word, card]: [string, any]) => ({ word, ...card }))
})

// ── 日历热力图 ──────────────────────────────────────────────
const reviewsByDate = computed(() => {
  const map = new Map<string, number>()
  Object.values(baseStore.fsrsData).forEach((card: any) => {
    if (card.last_review) {
      const d = dayjs.utc(card.last_review).local().format('YYYY-MM-DD')
      map.set(d, (map.get(d) || 0) + 1)
    }
  })
  return map
})

// 生成最近 52 周的网格（列 = 周，行 = 星期几 0~6）
const calendarWeeks = computed(() => {
  const today = dayjs()
  // 从今天往前推到整周的起点（周日）
  const startOfThisWeek = today.startOf('week')
  const start = startOfThisWeek.subtract(51, 'week')
  const weeks: ({ date: string; count: number; label: string } | null)[][] = []
  for (let w = 0; w < 52; w++) {
    const week: ({ date: string; count: number; label: string } | null)[] = []
    for (let d = 0; d < 7; d++) {
      const day = start.add(w * 7 + d, 'day')
      if (day.isAfter(today)) {
        week.push(null)
      } else {
        const date = day.format('YYYY-MM-DD')
        week.push({ date, count: reviewsByDate.value.get(date) || 0, label: day.format('M月D日') })
      }
    }
    weeks.push(week)
  }
  return weeks
})

// 月份标签（取每列第一天所在月）
const monthLabels = computed(() => {
  const labels: { text: string; col: number }[] = []
  let lastMonth = -1
  calendarWeeks.value.forEach((week, i) => {
    const first = week.find(d => d !== null)
    if (first) {
      const m = dayjs(first.date).month()
      if (m !== lastMonth) {
        labels.push({ text: dayjs(first.date).format('M月'), col: i })
        lastMonth = m
      }
    }
  })
  return labels
})

function heatLevel(count: number) {
  if (count === 0) return 0
  if (count <= 5) return 1
  if (count <= 15) return 2
  if (count <= 30) return 3
  return 4
}

const totalStudyDays = computed(() => reviewsByDate.value.size)

const currentStreak = computed(() => {
  let streak = 0
  let day = dayjs()
  // 今天没学也算昨天起
  if (!reviewsByDate.value.has(day.format('YYYY-MM-DD'))) day = day.subtract(1, 'day')
  while (reviewsByDate.value.has(day.format('YYYY-MM-DD'))) {
    streak++
    day = day.subtract(1, 'day')
  }
  return streak
})

const longestStreak = computed(() => {
  if (!reviewsByDate.value.size) return 0
  const dates = [...reviewsByDate.value.keys()].sort()
  let max = 1, cur = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = dayjs(dates[i - 1])
    const curr = dayjs(dates[i])
    if (curr.diff(prev, 'day') === 1) {
      cur++
      max = Math.max(max, cur)
    } else {
      cur = 1
    }
  }
  return max
})

const totalReviews = computed(() => {
  return Object.keys(baseStore.fsrsData).length
})

// 导出进度
function exportProgress() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    word: { studyIndex: baseStore.word.studyIndex, bookList: baseStore.word.bookList },
    article: { studyIndex: baseStore.article.studyIndex, bookList: baseStore.article.bookList },
    fsrsData: baseStore.fsrsData,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `typewords-backup-${dayjs().format('YYYY-MM-DD')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

let importInputRef = $ref<HTMLInputElement | null>(null)
function triggerImport() { importInputRef?.click() }
function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target?.result as string)
      if (data.word) baseStore.$patch({ word: data.word })
      if (data.article) baseStore.$patch({ article: data.article })
      if (data.fsrsData) baseStore.$patch({ fsrsData: data.fsrsData })
      Toast.success('导入成功')
    } catch {
      Toast.error('文件格式错误')
    }
    ;(e.target as HTMLInputElement).value = ''
  }
  reader.readAsText(file)
}

// tooltip
let tooltip = $ref<{ text: string; x: number; y: number } | null>(null)

function showTip(e: MouseEvent, cell: { date: string; count: number; label: string }) {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  tooltip = { text: `${cell.label}：${cell.count} 词`, x: rect.left + rect.width / 2, y: rect.top - 8 }
}
function hideTip() { tooltip = null }
</script>

<template>
  <div class="fsrs-outer">
  <div class="fsrs-page card">
    <div class="page-heading-row">
      <h2 class="page-heading">学习记录</h2>
      <div class="flex gap-2">
        <BaseButton type="info" size="small" @click="triggerImport">导入进度</BaseButton>
        <BaseButton type="primary" size="small" @click="exportProgress">导出进度</BaseButton>
      </div>
    </div>
    <input ref="importInputRef" type="file" accept=".json" style="display:none" @change="onImportFile" />

    <!-- 统计摘要 -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-num">{{ totalStudyDays }}</div>
        <div class="stat-label">累计打卡天数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ currentStreak }}</div>
        <div class="stat-label">当前连续天数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ longestStreak }}</div>
        <div class="stat-label">最长连续天数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ totalReviews }}</div>
        <div class="stat-label">累计学习单词</div>
      </div>
    </div>

    <!-- 热力图 -->
    <div class="heatmap-wrap">
      <div class="month-labels">
        <div class="month-spacer" />
        <div class="months-row">
          <span
            v-for="m in monthLabels" :key="m.col"
            class="month-label"
            :style="{ left: m.col * 14 + 'px' }"
          >{{ m.text }}</span>
        </div>
      </div>
      <div class="heatmap-body">
        <div class="weekday-labels">
          <span>一</span><span></span><span>三</span><span></span><span>五</span><span></span><span>日</span>
        </div>
        <div class="grid">
          <div class="week-col" v-for="(week, wi) in calendarWeeks" :key="wi">
            <div
              v-for="(cell, di) in week" :key="di"
              class="day-cell"
              :class="cell ? `level-${heatLevel(cell.count)}` : 'empty'"
              @mouseenter="cell && showTip($event, cell)"
              @mouseleave="hideTip"
            />
          </div>
        </div>
      </div>
      <div class="legend">
        <span class="legend-label">少</span>
        <div class="day-cell level-0" />
        <div class="day-cell level-1" />
        <div class="day-cell level-2" />
        <div class="day-cell level-3" />
        <div class="day-cell level-4" />
        <span class="legend-label">多</span>
      </div>
    </div>

    <!-- tooltip -->
    <Teleport to="body">
      <div v-if="tooltip" class="heat-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
        {{ tooltip.text }}
      </div>
    </Teleport>

    <!-- 详细表格 -->
    <div class="table-header">
      <span class="text-sm" style="color: var(--color-sub-text)">共 {{ fsrsList.length }} 条记录</span>
      <div class="flex gap-2">
        <BaseButton :type="tableType === 'today' ? 'primary' : 'info'" size="small" @click="tableType = 'today'">今日</BaseButton>
        <BaseButton :type="tableType === 'all' ? 'primary' : 'info'" size="small" @click="tableType = 'all'">全部</BaseButton>
      </div>
    </div>

    <div class="table-container">
      <table v-if="fsrsList.length > 0">
        <thead>
          <tr>
            <th>单词</th><th>最近复习</th><th>下次复习</th><th>状态</th>
            <th>稳定性</th><th>难度</th><th>复习次数</th><th>遗忘次数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in fsrsList" :key="item.word">
            <td>{{ item.word }}</td>
            <td>{{ item.last_review ? dayjs(item.last_review).format('MM-DD HH:mm') : '-' }}</td>
            <td>{{ item.due ? dayjs(item.due).format('MM-DD HH:mm') : '-' }}</td>
            <td>{{ State[item.state] }}</td>
            <td>{{ item.stability }}</td>
            <td>{{ item.difficulty }}</td>
            <td>{{ item.reps }}</td>
            <td>{{ item.lapses }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无数据</div>
    </div>
  </div>
  </div>
</template>

<style scoped lang="scss">
.fsrs-outer {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1.5rem;
  background: var(--color-primary);
  min-height: 100vh;
  box-sizing: border-box;
}

.fsrs-page {
  width: 100%;
  max-width: 900px;
  padding: 1.5rem 2rem;
  box-sizing: border-box;
  height: calc(100vh - 3rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2rem;
}

.page-heading {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-main-text);
  margin: 0;
}

// 统计摘要
.stat-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 100px;
  background: var(--color-second);
  border: 1px solid var(--color-item-border);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  text-align: center;

  .stat-num {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--color-select-bg);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--color-sub-text);
    margin-top: 0.3rem;
  }
}

// 热力图
.heatmap-wrap {
  background: var(--color-second);
  border: 1px solid var(--color-item-border);
  border-radius: 12px;
  padding: 1rem 1.2rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.month-labels {
  display: flex;
  margin-bottom: 4px;
}

.month-spacer {
  width: 20px;
  flex-shrink: 0;
}

.months-row {
  position: relative;
  height: 16px;
  flex: 1;
}

.month-label {
  position: absolute;
  font-size: 0.7rem;
  color: var(--color-sub-text);
  transform: none;
}

.heatmap-body {
  display: flex;
  gap: 4px;
}

.weekday-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 16px;
  flex-shrink: 0;

  span {
    height: 11px;
    font-size: 0.6rem;
    color: var(--color-sub-text);
    line-height: 11px;
    text-align: right;
  }
}

.grid {
  display: flex;
  gap: 2px;
}

.week-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-cell {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  cursor: default;
  transition: opacity 0.1s;

  &.empty { background: transparent; }
  &.level-0 { background: var(--color-third); }
  &.level-1 { background: #c4b5e8; }
  &.level-2 { background: #a389d4; }
  &.level-3 { background: #7c5cbf; }
  &.level-4 { background: #5a3d99; }

  &:not(.empty):hover { opacity: 0.75; cursor: pointer; }
}

.legend {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 0.6rem;
  justify-content: flex-end;

  .legend-label {
    font-size: 0.7rem;
    color: var(--color-sub-text);
  }

  .day-cell { cursor: default; }
}

// tooltip
.heat-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: var(--color-tooltip-bg);
  color: var(--color-main-text);
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  pointer-events: none;
  z-index: 9999;
  white-space: nowrap;
}

// 表格
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.table-container {
  flex: 1;
  overflow: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  border-radius: 8px;
  border: 1px solid var(--color-item-border);

  table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 7px 10px;
      text-align: left;
      white-space: nowrap;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--color-item-border);
    }

    th {
      background: var(--color-second);
      font-weight: 600;
      color: var(--color-main-text);
      position: sticky;
      top: 0;
    }

    td { background: var(--color-primary); color: var(--color-main-text); }
    tr:hover td { background: var(--color-third); }
  }
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-sub-text);
}
</style>

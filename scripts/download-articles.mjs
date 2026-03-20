/**
 * 从 luzhenhua/NCE-Flow (jsDelivr CDN) 下载 LRC 文件并转换为 TypeWords 文章格式
 * 输出到 apps/nuxt/public/dicts/en/article/
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(ROOT, 'apps/nuxt/public/dicts/en/article')
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/luzhenhua/NCE-Flow@main'

// NCE 各册中文标题
const BOOK_CN_TITLES = {
  1: ['对不起！', '对不起，先生。', '很高兴认识你。', '你是老师吗', '你今天好吗', '这是你的衬衫吗', '一件新连衣裙', '我的工作', '我很好，谢谢。', '颜色好看吗？', '我是…', '他是这样说的。', '一件昂贵的大衣', '我是多少号？', '你好吗？', '我在家。', '她有没有上班？', '他们在哪里工作？', '哪国人？', '他是哪里人？', '我的家庭', '给我一些茶好吗？', '用英语怎么说？', '电话号码是多少？', '她的电话号码是多少？', '一个忙碌的家庭', '你有什么颜色的铅笔？', '一件绿色的绒线衫和一件白色的绒线衫', '哪个？', '我今天几乎没有时间。', '在哪里？', '有多少？', '有多少？', '她在哪一个？', '她生活在哪里？', '你在哪？', '我没有看见它。', '这就是我们的度假！', '那是苏西吗？', '他们在工作吗？', '他们来自哪里？', '是的，他们是。', '我能帮助你吗？', '她会做什么？', '写给奶奶的信', '这是他写的信吗？', '那个胖子做了什么？', '这怎么回事？', '我想要零钱。', '他的情绪。', '我想要大的那种。', '你想在什么时候？', '你想要哪一个？', '我已经做了！', '这里的天气是什么样的？', '什么时候去？', '你有没有吃早饭？', '什么时候？', '他们已经过来了吗？', '你今天早上做了什么？', '我以前去过那里。', '我能来吗？', '来参加我的晚会！', '明天我要去蒙特维多。', '我来帮你。', '他们会来吗？', '我曾在那里！', '有电视吗？', '多久一次？', '我通常工作得很快。', '做这件事花了多长时间？', '他在哪里睡觉？', '白天怎么了？'],
  2: Array.from({length: 96}, (_, i) => `第${i + 1}课`),
  3: Array.from({length: 60}, (_, i) => `第${i + 1}课`),
  4: Array.from({length: 48}, (_, i) => `第${i + 1}课`),
}

function parseLrc(lrcText) {
  const lines = lrcText.split('\n')
  const sentences = []

  for (const line of lines) {
    // 跳过元数据行 [al:...] [ti:...] 等
    const match = line.match(/^\[(\d+:\d+\.\d+)\](.+)$/)
    if (!match) continue

    const content = match[2].trim()
    if (!content) continue

    const pipeIdx = content.indexOf('|')
    if (pipeIdx === -1) continue

    const en = content.slice(0, pipeIdx).trim()
    const cn = content.slice(pipeIdx + 1).trim()

    if (en && cn) {
      sentences.push({ en, cn })
    }
  }

  return sentences
}

function buildArticle(id, title, titleCn, sentences) {
  // 跳过第一行（通常是 "Lesson X|第X课" 或 "Listen to tape..." 提示）
  const contentSentences = sentences.filter((s, i) => {
    if (i === 0 && /^Lesson\s+\d+$/i.test(s.en)) return false
    if (/Listen to the tape/i.test(s.en)) return false
    return true
  })

  const text = contentSentences.map(s => s.en).join('\n')
  const textTranslate = contentSentences.map(s => s.cn).join('\n')

  return {
    id,
    title,
    titleTranslate: titleCn || title,
    text,
    textTranslate,
    newWords: [],
    sections: [],
    audioSrc: '',
    audioFileId: '',
    lrcPosition: [],
    nameList: [],
    questions: [],
  }
}

async function fetchDataJson() {
  const res = await fetch(`${CDN_BASE}/static/data.json`)
  return res.json()
}

async function fetchLrc(book, filename) {
  const encoded = encodeURIComponent(filename)
  const url = `${CDN_BASE}/NCE${book}/${encoded}.lrc`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.text()
}

async function processBook(bookNum, lessons, cnTitles) {
  const articles = []
  console.log(`\n=== NCE${bookNum} (${lessons.length} 课) ===`)

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i]
    const titleCn = cnTitles[i] || lesson.title
    process.stdout.write(`[${i + 1}/${lessons.length}] ${lesson.title} ... `)

    try {
      const lrcText = await fetchLrc(bookNum, lesson.filename)
      if (!lrcText) {
        console.log('✗ (获取失败)')
        continue
      }

      const sentences = parseLrc(lrcText)
      if (!sentences.length) {
        console.log('✗ (无内容)')
        continue
      }

      const article = buildArticle(i + 1, lesson.title, titleCn, sentences)
      articles.push(article)
      console.log(`✓ (${sentences.length} 句)`)
    } catch (e) {
      console.log(`✗ (${e.message})`)
    }
  }

  return articles
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('获取课程列表...')
  const data = await fetchDataJson()

  const bookMap = { 1: 'NCE_1.json', 2: 'NCE_2.json', 3: 'NCE_3.json', 4: 'NCE_4.json' }

  for (const [bookNum, filename] of Object.entries(bookMap)) {
    const outPath = join(OUTPUT_DIR, filename)
    if (existsSync(outPath)) {
      console.log(`\n跳过 NCE${bookNum}（已存在）`)
      continue
    }

    const lessons = data[bookNum]
    if (!lessons) {
      console.log(`\nNCE${bookNum} 无数据，跳过`)
      continue
    }

    const cnTitles = BOOK_CN_TITLES[parseInt(bookNum)] || []
    const articles = await processBook(parseInt(bookNum), lessons, cnTitles)

    writeFileSync(outPath, JSON.stringify(articles, null, 2))
    console.log(`\n✓ NCE${bookNum} 已保存 (${articles.length} 篇) → ${filename}`)
  }

  console.log('\n全部完成！')
}

main().catch(console.error)

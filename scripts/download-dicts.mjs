/**
 * 从 qwerty-learner (jsDelivr CDN) 下载词库并转换为 TypeWords 格式
 * 输出到 apps/nuxt/public/dicts/en/word/
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const WORD_LIST_PATH = join(ROOT, 'apps/nuxt/public/list/word.json')
const OUTPUT_DIR = join(ROOT, 'apps/nuxt/public/dicts/en/word')
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/RealKai42/qwerty-learner@master/public/dicts'

// 将 qwerty-learner 格式转换为 TypeWords 格式
function convertEntry(entry) {
  const transRaw = Array.isArray(entry.trans) ? entry.trans : [entry.trans ?? '']
  const trans = transRaw.map(t => ({ pos: '', cn: String(t) }))

  return {
    word: entry.name ?? entry.word ?? '',
    phonetic0: entry.usphone ?? entry.phonetic0 ?? '',
    phonetic1: entry.ukphone ?? entry.phonetic1 ?? '',
    trans,
    sentences: entry.sentences ?? [],
    phrases: entry.phrases ?? [],
    synos: entry.synos ?? [],
    relWords: entry.relWords ?? null,
    etymology: entry.etymology ?? [],
  }
}

async function downloadAndConvert(url) {
  const cdnUrl = `${CDN_BASE}/${url}`
  const res = await fetch(cdnUrl)
  if (!res.ok) return null

  const data = await res.json()
  if (!Array.isArray(data)) return null

  return data.map(convertEntry)
}

async function main() {
  const wordList = JSON.parse(readFileSync(WORD_LIST_PATH, 'utf-8'))
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const urls = [...new Set(wordList.filter(d => d.language === 'en').map(d => d.url))]
  console.log(`共 ${urls.length} 个词库文件，开始下载...\n`)

  let ok = 0, skip = 0, fail = 0

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const outPath = join(OUTPUT_DIR, url)

    if (existsSync(outPath)) {
      console.log(`[${i + 1}/${urls.length}] 跳过(已存在) ${url}`)
      skip++
      continue
    }

    try {
      process.stdout.write(`[${i + 1}/${urls.length}] 下载 ${url} ... `)
      const converted = await downloadAndConvert(url)

      if (converted) {
        writeFileSync(outPath, JSON.stringify(converted))
        console.log(`✓ (${converted.length} 词)`)
        ok++
      } else {
        console.log(`✗ (未找到)`)
        fail++
      }
    } catch (e) {
      console.log(`✗ (${e.message})`)
      fail++
    }
  }

  console.log(`\n完成: 成功 ${ok}，已存在 ${skip}，未找到/失败 ${fail}`)
  console.log(`词库文件已保存到: ${OUTPUT_DIR}`)
}

main()

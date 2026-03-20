<script setup lang="ts">
import { APP_NAME } from '@typewords/core/config/env.ts'
import { setTheme } from '@typewords/core/hooks/theme.ts'

definePageMeta({ layout: 'empty' })

onMounted(() => {
  setTheme('light')
})

// Typewriter
const words = ['IELTS', 'GRE', '考研英语', 'CET-6', 'TOEFL', '四六级', '编程词汇', '专业词汇']
let wordIndex = $ref(0)
let displayed = $ref('')
let typing = $ref(true)

onMounted(() => {
  tick()
})

function tick() {
  const w = words[wordIndex]
  if (typing) {
    if (displayed.length < w.length) {
      displayed += w[displayed.length]
      setTimeout(tick, 100)
    } else {
      typing = false
      setTimeout(tick, 1600)
    }
  } else {
    if (displayed.length > 0) {
      displayed = displayed.slice(0, -1)
      setTimeout(tick, 50)
    } else {
      typing = true
      wordIndex = (wordIndex + 1) % words.length
      setTimeout(tick, 150)
    }
  }
}

const floatingCards = [
  { word: 'persevere',  phonetic: '/pɜːsɪˈvɪə/',    meaning: '坚持不懈', delay: '0s' },
  { word: 'eloquent',   phonetic: '/ˈeləkwənt/',     meaning: '雄辩的',   delay: '1.5s' },
  { word: 'ambiguous',  phonetic: '/æmˈbɪɡjuəs/',   meaning: '模糊的',   delay: '3s' },
  { word: 'tenacious',  phonetic: '/tɪˈneɪʃəs/',    meaning: '顽强的',   delay: '0.8s' },
  { word: 'diligent',   phonetic: '/ˈdɪlɪdʒənt/',   meaning: '勤奋的',   delay: '2s' },
  { word: 'lucid',      phonetic: '/ˈluːsɪd/',       meaning: '清晰的',   delay: '0.5s' },
  { word: 'resilient',  phonetic: '/rɪˈzɪliənt/',    meaning: '有韧性的', delay: '2.5s' },
  { word: 'concise',    phonetic: '/kənˈsaɪs/',      meaning: '简洁的',   delay: '1.2s' },
  { word: 'pragmatic',  phonetic: '/præɡˈmætɪk/',    meaning: '务实的',   delay: '3.5s' },
  { word: 'meticulous', phonetic: '/məˈtɪkjuləs/',   meaning: '一丝不苟的', delay: '1.8s' },
]
</script>

<template>
  <div class="root" id="wrapper">

    <!-- ── HERO ── -->
    <section class="hero">
      <!-- 背景浮动词卡 -->
      <div class="orb"></div>
      <div v-for="(card, i) in floatingCards" :key="i" class="fcard" :style="`--d:${card.delay}`" :class="`fcard-${i}`">
        <div class="fcard-word">{{ card.word }}</div>
        <div class="fcard-ph">{{ card.phonetic }}</div>
        <div class="fcard-cn">{{ card.meaning }}</div>
      </div>

      <!-- 中央内容 -->
      <div class="hero-body">
        <div class="brand">
          <svg width="48" height="48" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="6" fill="url(#g1)" />
            <text x="13" y="18.5" text-anchor="middle" font-family="system-ui,sans-serif"
              font-weight="900" font-size="13" fill="white">W</text>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="26" y2="26">
                <stop stop-color="#7c3aed" />
                <stop offset="1" stop-color="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
          <span class="brand-text">{{ APP_NAME }}</span>
        </div>
        <h1 class="hero-h1">用打字记住</h1>
        <div class="hero-tw">
          <span class="tw-word">{{ displayed }}</span>
        </div>
        <p class="hero-p">
          通过打字练习强化词汇记忆，支持 IELTS、GRE、考研等 240+ 词库，边打字边背单词，让记忆更深刻。
        </p>
        <div class="hero-btns">
          <button class="btn-p" @click="navigateTo('/words')">开始练习</button>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-n">240+</span><span class="stat-l">词库</span></div>
          <div class="stat-div"></div>
          <div class="stat"><span class="stat-n">6</span><span class="stat-l">练习模式</span></div>
          <div class="stat-div"></div>
          <div class="stat"><span class="stat-n">免费</span><span class="stat-l">开源</span></div>
        </div>
      </div>
    </section>


  </div>
</template>

<style scoped lang="scss">
/* ── TOKENS ── */
html, body {
  overflow: hidden;
  height: 100%;
}

.root {
  height: 100vh;
  overflow: hidden;
  --bg: #f4f4f8;
  --bg2: #ececf4;
  --surf: #ffffff;
  --surf2: #f0f0f8;
  --bdr: rgba(0, 0, 0, 0.08);
  --bdr-h: rgba(124, 58, 237, 0.4);
  --txt: #0a0a14;
  --txt2: #666688;
  --txt3: #aaaacc;
  --accent: #7c3aed;
  --accent2: #2563eb;
  --glow: rgba(124, 58, 237, 0.12);

  background: var(--bg);
  color: var(--txt);
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  min-height: 100vh;
}


.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.brand-text {
  font-weight: 800;
  font-size: 1.75rem;
  color: var(--txt);
  letter-spacing: -0.03em;
}

/* ── HERO ── */
.hero {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  max-width: 560px;
  padding: 0 1.5rem;
}

.hero-tag {
  display: inline-flex;
  width: fit-content;
  padding: 0.3rem 0.875rem;
  border-radius: 999px;
  border: 1px solid var(--bdr);
  background: var(--surf);
  font-size: 0.8rem;
  color: var(--txt2);
}

.hero-h1 {
  margin: 0;
  font-size: clamp(2.8rem, 5vw, 4.2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--txt);
}

.hero-tw {
  font-size: clamp(2.8rem, 6vw, 4.2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  height: 1.15em;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.05em;
}

.tw-word {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}



.cursor {
  -webkit-text-fill-color: #7c3aed;
  animation: blink 1s step-end infinite;
  font-weight: 200;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.hero-p {
  margin: 0;
  font-size: 1rem;
  color: var(--txt2);
  line-height: 1.7;
  max-width: 480px;
}

.hero-btns {
  display: flex;
  gap: 0.75rem;
}

.btn-p {
  display: inline-flex;
  align-items: center;
  height: 2.5rem;
  padding: 0 1.375rem;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 0 24px rgba(124, 58, 237, 0.4);

  &:hover { opacity: 0.88; transform: translateY(-1px); }
  &.large { height: 3rem; padding: 0 2rem; font-size: 1rem; }
}

.btn-s {
  display: inline-flex;
  align-items: center;
  height: 2.5rem;
  padding: 0 1.375rem;
  border-radius: 8px;
  border: 1px solid var(--bdr);
  background: var(--surf);
  color: var(--txt2);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { color: var(--txt); border-color: var(--bdr-h); transform: translateY(-1px); }
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 0.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.stat-n {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--txt);
  letter-spacing: -0.02em;
}

.stat-l {
  font-size: 0.72rem;
  color: var(--txt2);
}

.stat-div {
  width: 1px;
  height: 2rem;
  background: var(--bdr);
}

/* ── FLOATING CARDS ── */
.orb {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.fcard {
  position: absolute;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  animation: float 5s ease-in-out infinite var(--d);
  min-width: 140px;
  z-index: 0;
}

.fcard-0 { top: 8%;    left: 3%; }
.fcard-1 { top: 6%;    right: 3%; }
.fcard-2 { bottom: 12%; left: 3%; }
.fcard-3 { bottom: 10%; right: 3%; }
.fcard-4 { top: 42%;   left: 2%; }
.fcard-5 { top: 40%;   right: 2%; }
.fcard-6 { top: 22%;   left: 18%; }
.fcard-7 { top: 20%;   right: 18%; }
.fcard-8 { bottom: 28%; left: 16%; }
.fcard-9 { bottom: 26%; right: 16%; }

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.fcard-word {
  font-size: 1rem;
  font-weight: 700;
  color: var(--txt);
  margin-bottom: 0.25rem;
}

.fcard-ph {
  font-size: 0.72rem;
  color: var(--accent);
  font-family: ui-monospace, monospace;
  margin-bottom: 0.25rem;
}

.fcard-cn {
  font-size: 0.8rem;
  color: var(--txt2);
}


/* ── RESPONSIVE ── */
@media (max-width: 600px) {
  .fcard { display: none; }
}

@media (max-width: 600px) {
  .links { display: none; }
  .hero-stats { flex-wrap: wrap; gap: 0.75rem; }
}
</style>

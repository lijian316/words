// https://nuxt.com/docs/api/configuration/nuxt-config
//@ts-ignore
import { resolve } from 'pathe'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { execSync } from 'child_process'
import { defineNuxtConfig } from 'nuxt/config'

let latestCommitHash = ''
try {
  latestCommitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  latestCommitHash = 'unknown'
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    // keepalive: true,
    head: {
      title: 'WordDrill - 单词打字练习 · 背单词神器', // default fallback title
      htmlAttrs: {
        lang: 'zh-CN',
      },
      meta: [
        { charset: 'UTF-8' },
        //搜索引擎描述
        {
          name: 'description',
          content:
            'WordDrill - 用打字练习记忆单词，支持 IELTS、GRE、考研、CET-6 等词库，边打字边背单词，提升英语词汇量。',
        },
        //关键词
        {
          name: 'keywords',
          content:
            'WordDrill, 背单词, 单词打字练习, 英语打字, 单词记忆, IELTS词汇, GRE词汇, 考研英语, CET-6, CET-4, TOEFL, 四六级词汇, 英语学习, 打字练习, 词汇练习, 默写练习, 听写练习, 编程词汇',
        },
        { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },

        //Open Graph（用于社交媒体分享）
        { property: 'og:title', content: 'WordDrill - 单词打字练习 · 背单词神器' },
        {
          property: 'og:description',
          content: 'WordDrill - 用打字练习记忆单词，支持 IELTS、GRE、考研、CET-6 等词库，边打字边背单词。',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://worddrill.app/' },

        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'WordDrill - 单词打字练习 · 背单词神器' },
        {
          name: 'twitter:description',
          content: 'WordDrill - 用打字练习记忆单词，支持 IELTS、GRE、考研、CET-6 等词库，边打字边背单词。',
        },

        //设置浏览器地址栏颜色（在 Android Chrome 特别明显
        { name: 'theme-color', content: '#818CF8' },
        // 阻止 iOS 自动把数字识别为电话号码
        // HandheldFriendly 和 MobileOptimized 是旧手机浏览器的优化提示（现在作用不大）。
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'HandheldFriendly', content: 'True' },
        { name: 'MobileOptimized', content: '320' },
        // referrer 控制请求来源信息
        { name: 'referrer', content: 'origin-when-cross-origin' },
        // color-scheme 告诉浏览器支持亮/暗模式
        { name: 'color-scheme', content: 'light dark' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'canonical', href: 'https://worddrill.app/' },
        //苹果设备（iOS Safari）在用户添加到主屏时显示的图标
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },
  // ssr: false,
  routeRules: {
    '/': { ssr: false },
    '/words': { ssr: false },
    '/articles': { ssr: false },
    '/setting': { ssr: false },
    '/book/nce1': { prerender: true },
    '/book/nce2': { prerender: true },
    '/book/nce3': { prerender: true },
    '/book/nce4': { prerender: true },
  },
  vite: {
    plugins: [
      Components({
        resolvers: [
          IconsResolver({
            prefix: 'Icon',
          }),
        ],
      }),
      Icons({
        autoInstall: true,
      }),
    ],
  },
  // 模块
  modules: ['@pinia/nuxt', '@unocss/nuxt', 'unplugin-icons/nuxt', '@vue-macros/nuxt', '@nuxtjs/i18n', '@nuxt/image'],
  // i18n 配置
  i18n: {
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
      { code: 'zh', language: 'zh-CN', file: 'zh.json', name: '中文' },
      { code: 'es', language: 'es-ES', file: 'es.json', name: 'Español' },
      { code: 'fr', language: 'fr-FR', file: 'fr.json', name: 'Français' },
      { code: 'pt', language: 'pt-BR', file: 'pt.json', name: 'Português' },
      { code: 'de', language: 'de-DE', file: 'de.json', name: 'Deutsch' },
      { code: 'ru', language: 'ru-RU', file: 'ru.json', name: 'Русский' },
      { code: 'uk', language: 'uk-UA', file: 'uk.json', name: 'Українська' },
      { code: 'ja', language: 'ja-JP', file: 'ja.json', name: '日本語' },
      { code: 'ko', language: 'ko-KR', file: 'ko.json', name: '한국어' },
      { code: 'th', language: 'th-TH', file: 'th.json', name: 'ไทย' },
      { code: 'vi', language: 'vi-VN', file: 'vi.json', name: 'Tiếng Việt' },
      { code: 'id', language: 'id-ID', file: 'id.json', name: 'Bahasa Indonesia' },
      { code: 'tw', language: 'zh-TW', file: 'tw.json', name: '繁體中文' },
    ],
    defaultLocale: 'zh',
    // langDir:'app/i18n/',
    strategy: 'no_prefix',
  },
  // CSS
  css: ['~/assets/css/main.scss'],
  // 别名配置
  alias: {
    '@': resolve(__dirname, 'app'),
  },
  // 自动导入配置
  imports: {
    dirs: ['app/composables/**', 'app/utils/**'],
  },
  // 组件自动导入目录
  components: [
    { path: 'components', pathPrefix: false },
    { path: 'app/components', pathPrefix: false },
  ],
  // 运行时配置
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || 'http://localhost/',
      origin: process.env.ORIGIN || 'https://worddrill.app',
      host: process.env.HOST || 'worddrill.app',
      latestCommitHash: latestCommitHash + (process.env.NODE_ENV === 'production' ? '' : ' (dev)'),
    },
  },
  // 构建配置
  build: {
    transpile: ['vue-virtual-scroller'],
  },
  // 实验性功能
  experimental: {
    payloadExtraction: false, // 禁用 payload 提取，减少构建体积
  },
  // TypeScript 配置
  typescript: {
    strict: false,
    typeCheck: false, // 构建时不进行类型检查，加快构建速度
    tsConfig: {
      compilerOptions: {
        types: ['vue-macros/macros-global'],
        allowImportingTsExtensions: true,
      },
    },
  },
  devServer: {
    port: 5567,
  },
  nitro: {
    devProxy: {
      '/baidu': {
        target: 'https://api.fanyi.baidu.com/api/trans/vip/translate',
        changeOrigin: true,
      },
    },
  },
})

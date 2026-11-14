<template>
  <Teleport to="body">
    <div v-if="isOpen" class="info-modal-overlay" @click="close">
      <div class="info-modal" :class="{ mobile: isMobile }" @click.stop>
        <button class="info-close-btn" @click="close" title="Close">
          <X :size="16" />
        </button>

        <div class="info-modal-body">
          <!-- Tabs -->
          <div class="info-tabs">
            <button
              class="info-tab"
              :class="{ 'is-active': activeTab === 'learn' }"
              @click="activeTab = 'learn'"
            >
              Guide &amp; Resources
            </button>
            <button
              class="info-tab"
              :class="{ 'is-active': activeTab === 'apps' }"
              @click="activeTab = 'apps'"
            >
              Similar Apps
            </button>
          </div>

          <!-- ================= TAB: Learn ================= -->
          <div v-show="activeTab === 'learn'">
            <!-- App Info -->
            <div class="info-section">
              <h2 class="info-title">About Little Hanzi Chinese</h2>
              <p class="info-copy">
                A reading-first tool for learning Chinese. Paste Chinese text and get
                pinyin beside each character, with English translations woven into the
                paragraph — so you can read real Chinese instead of drilling flashcards.
              </p>
            </div>

            <!-- Tips -->
            <div class="tips-card">
              <h4 class="tips-heading">💡 Tips</h4>
              <ul class="tips-list">
                <li>
                  <span class="tip-bullet">•</span>
                  <span>Paste Chinese text in the first box and your English translation in the second</span>
                </li>
                <li>
                  <span class="tip-bullet">•</span>
                  <span>Pinyin stays to the right of each character and English stays inline with each paragraph — switch layouts in Settings</span>
                </li>
                <li>
                  <span class="tip-bullet">•</span>
                  <span>Press Save in the header to keep an article in History, or just read — long sessions are saved automatically</span>
                </li>
                <li>
                  <span class="tip-bullet">•</span>
                  <span>Double-click (or double-tap) a paragraph to bookmark it, then use the ⋮ menu to edit or copy that paragraph</span>
                </li>
                <li>
                  <span class="tip-bullet">•</span>
                  <span>Tap the heart on a paragraph you enjoy — the Liked tab in History ranks articles by how many paragraphs you liked</span>
                </li>
                <li>
                  <span class="tip-bullet">•</span>
                  <span>Bookmarked articles appear in History → Reading so you can continue exactly where you stopped</span>
                </li>
              </ul>
            </div>

            <!-- Learning Resources -->
            <div class="info-section">
              <label class="section-label">Learning Resources</label>
              <div class="resources-grid">
                <a
                  v-for="resource in resources"
                  :key="resource.name"
                  :href="resource.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="resource-card"
                >
                  <div class="resource-icon">{{ resource.icon }}</div>
                  <div class="resource-copy">
                    <h4 class="resource-name">{{ resource.name }}</h4>
                    <p class="resource-description">{{ resource.description }}</p>
                  </div>
                </a>
              </div>
            </div>

            <!-- Author appreciation card -->
            <div class="author-card">
              <img
                v-if="!authorAvatarFailed"
                :src="author.avatarUrl"
                :alt="author.name"
                class="author-avatar"
                @error="authorAvatarFailed = true"
              />
              <div v-else class="author-avatar author-avatar-fallback">
                {{ author.name.charAt(0) }}
              </div>

              <div class="author-copy">
                <p class="author-kicker">Made with care by</p>
                <a
                  :href="author.githubUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="author-name"
                >
                  {{ author.name }}
                  <span class="author-arrow">↗</span>
                </a>
                <p class="author-tagline">{{ author.tagline }}</p>
                <div class="author-links">
                  <a
                    :href="author.githubUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub →
                  </a>
                  <a
                    :href="author.githubUrl + '/Little_Hanzi_Chinese'"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source code →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB: Similar Apps ================= -->
          <div v-show="activeTab === 'apps'">
            <div class="info-section">
              <h2 class="info-title">More from Little Hanzi</h2>
              <p class="info-copy">
                Same reading-first approach, for other languages. Pick whichever
                you're learning next.
              </p>
            </div>

            <div class="apps-grid">
              <a
                v-for="app in siblingApps"
                :key="app.name"
                :href="app.url"
                target="_blank"
                rel="noopener noreferrer"
                class="app-link"
                :class="{ 'is-current': app.isCurrent }"
                @pointerdown="startLongPress(app, $event)"
                @pointerup="cancelLongPress"
                @pointerleave="cancelLongPress"
                @pointercancel="cancelLongPress"
                @contextmenu.prevent
                @click="handleAppClick"
              >
                <span v-if="app.isCurrent" class="app-current-badge">Here</span>

                <div class="app-icon-wrap">
                  <img
                    v-if="!app.iconFailed"
                    :src="app.iconUrl"
                    :alt="app.name"
                    class="app-icon"
                    @error="app.iconFailed = true"
                  />
                  <span v-else class="app-icon-fallback">{{ app.fallbackIcon }}</span>
                </div>

                <div class="app-copy">
                  <h4 class="app-name">{{ app.name }}</h4>
                  <span class="app-language">{{ app.language }}</span>
                  <p class="app-description">{{ app.description }}</p>
                </div>

                <div class="app-arrow">↗</div>
              </a>
            </div>

            <p class="apps-note">
              Built with the same philosophy — read real content, don't drill
              flashcards. Hold any app card to copy its link.
            </p>
          </div>

          <!-- Persistent credit line, visible on both tabs -->
          <p class="credit-line">
            Made with 🀄 by
            <a
              :href="author.githubUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ author.name }}
            </a>
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'
import { copyText } from '../utils/clipboard'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'notify'])

const activeTab = ref('learn') // 'learn' | 'apps'
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// ---------- Long-press a similar-app card to copy its link ----------
const LONG_PRESS_MS = 2000
let pressTimer = null
let suppressClick = false
let suppressTimeout = null

const cancelLongPress = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const startLongPress = (app, event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  cancelLongPress()

  pressTimer = setTimeout(async () => {
    pressTimer = null
    suppressClick = true

    const copied = await copyText(app.url)
    emit(
      'notify',
      copied ? `${app.name} link copied!` : 'Could not copy that link.',
      copied ? 'success' : 'error'
    )

    if (suppressTimeout) clearTimeout(suppressTimeout)
    suppressTimeout = setTimeout(() => {
      suppressClick = false
    }, 700)
  }, LONG_PRESS_MS)
}

const handleAppClick = (event) => {
  if (!suppressClick) return
  event.preventDefault()
  event.stopPropagation()
  suppressClick = false
}

// Reset to "Learn" tab each time the modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open) activeTab.value = 'learn'
    cancelLongPress()
  }
)

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  cancelLongPress()
  if (suppressTimeout) clearTimeout(suppressTimeout)
})

// Author info
const author = {
  name: 'Amaan Samar',
  githubUrl: 'https://github.com/Amaan-Samar',
  avatarUrl: 'https://github.com/Amaan-Samar.png',
  tagline: 'Built for learners who want to read real Chinese, not drill flashcards.'
}
const authorAvatarFailed = ref(false)

const resources = [
  // --- News (real reading practice) ---
  {
    name: '新华网 (Xinhua)',
    icon: '📰',
    url: 'https://www.news.cn/',
    description: 'China\'s national news agency — clear reports on current events and culture.'
  },
  {
    name: '人民网 (People\'s Daily)',
    icon: '🇨🇳',
    url: 'https://www.people.com.cn/',
    description: 'A major Chinese news site covering politics, society, and everyday life.'
  },
  {
    name: '澎湃新闻 (The Paper)',
    icon: '📡',
    url: 'https://www.thepaper.cn/',
    description: 'In-depth reporting and explainers written in modern, readable Chinese.'
  },
  {
    name: '知乎 (Zhihu)',
    icon: '💬',
    url: 'https://www.zhihu.com/',
    description: 'Chinese Q&A community — great for natural, conversational explanations.'
  },
  {
    name: '豆瓣 (Douban)',
    icon: '🎬',
    url: 'https://www.douban.com/',
    description: 'Book, film, and music reviews with plenty of short, expressive writing.'
  },
  {
    name: '界面新闻 (Jiemian)',
    icon: '📈',
    url: 'https://www.jiemian.com/',
    description: 'Business and lifestyle journalism with well-structured articles.'
  },

  // --- Learning / reference ---
  {
    name: 'Chinese Wiktionary',
    icon: '📖',
    url: 'https://zh.wiktionary.org/',
    description: 'Definitions, example sentences, and character information.'
  },
  {
    name: 'Chinese Grammar Wiki',
    icon: '🎓',
    url: 'https://resources.allsetlearning.com/chinese/grammar/',
    description: 'Clear grammar explanations and examples, organised by level.'
  },
  {
    name: 'Mandarin Bean',
    icon: '📚',
    url: 'https://mandarinbean.com/',
    description: 'Graded Chinese reading practice with HSK-level lessons and stories.'
  }
]

const siblingApps = ref([
  {
    name: 'Little Hanzi Chinese',
    language: 'Chinese',
    description: 'The app you\'re using right now — read Chinese with pinyin beside each character and inline English translations.',
    url: 'https://amaan-samar.github.io/Little_Hanzi_Chinese/',
    iconUrl: 'https://amaan-samar.github.io/Little_Hanzi_Chinese/icons/favicon-196.png',
    fallbackIcon: '🀄',
    iconFailed: false,
    isCurrent: true
  },
  {
    name: 'Little Hanzi Russian',
    language: 'Russian',
    description: 'Read Russian with romanization below each word and English translations, paragraph by paragraph.',
    url: 'https://amaan-samar.github.io/Little_Hanzi_Russian/',
    iconUrl: 'https://amaan-samar.github.io/Little_Hanzi_Russian/icons/favicon-196.png',
    fallbackIcon: '🇷🇺',
    iconFailed: false,
    isCurrent: false
  },
  {
    name: 'Little Hanzi Korean',
    language: 'Korean',
    description: 'Read Korean with romanization and English translations, paragraph by paragraph.',
    url: 'https://amaan-samar.github.io/Little_Hanzi_Korean/',
    iconUrl: 'https://amaan-samar.github.io/Little_Hanzi_Korean/icons/favicon-196.png',
    fallbackIcon: '🇰🇷',
    iconFailed: false,
    isCurrent: false
  },
  {
    name: 'Little Hanzi Japanese',
    language: 'Japanese',
    description: 'Read Japanese with furigana annotations and English translations, paragraph by paragraph.',
    url: 'https://amaan-samar.github.io/Little_Hanzi_Japanese/',
    iconUrl: 'https://amaan-samar.github.io/Little_Hanzi_Japanese/icons/favicon-196.png',
    fallbackIcon: '🇯🇵',
    iconFailed: false,
    isCurrent: false
  },
  {
    name: 'Little Hanzi Greek',
    language: 'Greek',
    description: 'Read Greek text with transliteration and English translations — same clean reading experience.',
    url: 'https://amaan-samar.github.io/Little_Hanzi_Greek/',
    iconUrl: 'https://amaan-samar.github.io/Little_Hanzi_Greek/icons/favicon-196.png',
    fallbackIcon: '🇬🇷',
    iconFailed: false,
    isCurrent: false
  }
])

const close = () => {
  emit('close')
}
</script>

<style scoped>
.info-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: infoFadeIn 0.25s ease;
}

@keyframes infoFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.info-modal {
  position: relative;
  background: white;
  border-radius: 20px;
  border: 1px solid #e9ecef;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: infoSlideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-modal.mobile {
  width: 94%;
  max-height: 90vh;
  border-radius: 16px;
}

@keyframes infoSlideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.info-close-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e9ecef;
  color: #868e96;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 10;
}

.info-close-btn:hover {
  transform: scale(1.08);
  background: #f8f9fa;
  color: #495057;
}

.info-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 24px 30px;
  scrollbar-width: thin;
}

.info-modal-body::-webkit-scrollbar {
  width: 5px;
}

.info-modal-body::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.2);
  border-radius: 20px;
}

/* Tabs */
.info-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 22px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f3f5;
}

.info-tab {
  padding: 7px 13px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  color: #868e96;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.info-tab:hover {
  background: #f8f9fa;
  color: #495057;
}

.info-tab.is-active {
  background: #eef1ff;
  border-color: #d8defb;
  color: #4a6cf7;
}

/* Sections */
.info-section {
  margin-bottom: 24px;
}

.info-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
}

.info-copy {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #5c677d;
}

/* Tips */
.tips-card {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 14px;
  background: #fffaf0;
  border: 1px solid #f7e7c6;
}

.tips-heading {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #b7791f;
}

.tips-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.tips-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #5c677d;
}

.tip-bullet {
  color: #d69e2e;
  margin-top: 1px;
}

/* Resources */
.section-label {
  display: block;
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #adb5bd;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.resource-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: white;
  text-decoration: none;
  transition: all 0.2s ease;
}

.resource-card:hover {
  border-color: #b9c5fb;
  box-shadow: 0 8px 18px rgba(74, 108, 247, 0.1);
  transform: translateY(-1px);
}

.resource-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eef1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.resource-copy {
  min-width: 0;
}

.resource-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  transition: color 0.2s;
}

.resource-card:hover .resource-name {
  color: #4a6cf7;
}

.resource-description {
  margin: 3px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #868e96;
}

/* Author card */
.author-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: #f8f9fa;
}

.author-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.author-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e7ff;
  color: #4a6cf7;
  font-size: 18px;
  font-weight: 700;
}

.author-copy {
  min-width: 0;
}

.author-kicker {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4a6cf7;
}

.author-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #2c3e50;
  text-decoration: none;
  transition: color 0.2s;
}

.author-name:hover {
  color: #4a6cf7;
}

.author-arrow {
  color: #adb5bd;
  font-size: 12px;
}

.author-tagline {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #868e96;
}

.author-links {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
}

.author-links a {
  font-size: 11px;
  font-weight: 600;
  color: #adb5bd;
  text-decoration: none;
  transition: color 0.2s;
}

.author-links a:hover {
  color: #4a6cf7;
}

/* Similar apps */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.app-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: white;
  text-decoration: none;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

.app-link:hover {
  border-color: #b9c5fb;
  box-shadow: 0 8px 18px rgba(74, 108, 247, 0.1);
  transform: translateY(-1px);
}

.app-link.is-current {
  border-color: #c7d2fe;
  background: #f8f9ff;
  box-shadow: inset 0 0 0 1px #c7d2fe;
}

.app-current-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #4a6cf7;
  color: white;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  box-shadow: 0 2px 5px rgba(74, 108, 247, 0.35);
}

.app-icon-wrap {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background 0.2s;
}

.app-link:hover .app-icon-wrap {
  background: #eef1ff;
}

.app-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.app-icon-fallback {
  font-size: 22px;
}

.app-copy {
  flex: 1;
  min-width: 0;
}

.app-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.3;
  transition: color 0.2s;
}

.app-link:hover .app-name {
  color: #4a6cf7;
}

.app-language {
  display: block;
  margin-top: 2px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #adb5bd;
}

.app-description {
  margin: 3px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #868e96;
}

.app-arrow {
  flex-shrink: 0;
  color: #ced4da;
  font-size: 15px;
  transition: color 0.2s;
}

.app-link:hover .app-arrow {
  color: #4a6cf7;
}

.apps-note {
  margin: 22px 0 0;
  text-align: center;
  font-size: 11px;
  color: #adb5bd;
  line-height: 1.5;
}

.credit-line {
  margin: 24px 0 0;
  padding-top: 14px;
  border-top: 1px solid #f1f3f5;
  text-align: center;
  font-size: 11px;
  color: #adb5bd;
}

.credit-line a {
  color: #868e96;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.credit-line a:hover {
  color: #4a6cf7;
}

/* Mobile */
@media (max-width: 640px) {
  .info-modal-body {
    padding: 20px 18px 26px;
  }

  .resources-grid,
  .apps-grid {
    grid-template-columns: 1fr;
  }

  .info-title {
    font-size: 18px;
  }

  .info-close-btn {
    top: 8px;
    right: 8px;
  }
}
</style>

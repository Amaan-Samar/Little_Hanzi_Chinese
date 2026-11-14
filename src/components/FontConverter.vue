<template>
  <div class="converter-wrapper">
    <!-- Header with Logo and Settings -->
    <div class="app-header">
      <div class="logo-section">
        <h1 class="logo">LittleHanzi</h1>
      </div>
      <div class="header-buttons">
        <!-- Save Button -->
        <button
          class="save-icon-btn"
          @click="handleManualSave"
          title="Save Article"
          :disabled="!inputText.trim() || isSaving"
        >
          <Save :size="20" />
        </button>

        <button class="history-icon-btn" @click="openHistoryModal" title="Reading History">
          <BookOpen :size="22" />
        </button>
        <button class="settings-icon-btn" @click="openSettingsModal" title="Settings">
          <Settings :size="24" />
        </button>
        <button class="info-icon-btn" @click="openInfoModal" title="Information">
          <Info :size="22" />
        </button>
      </div>
    </div>
    <!-- Add History Modal right after Settings Modal -->
    <ArticleHistoryModal
      :isOpen="isHistoryModalOpen"
      :articles="articles"
      :isCurrentArticle="isCurrentArticle"
      :formatDate="formatDate"
      :getLikeCount="getLikeCount"
      @close="closeHistoryModal"
      @load-article="loadArticleIntoEditor"
      @delete-article="handleDeleteArticle"
      @delete-all="handleDeleteAllArticles"
      @toggle-archive="handleToggleArchive"
    />

    <!-- Info Modal -->
    <InfoModal
      :isOpen="isInfoModalOpen"
      @close="closeInfoModal"
      @notify="showToastMessage"
    />

    <div class="main-content">
      <LoadingSpinner :isLoading="isLoading" :text="loadingText" />

      <!-- Toast notification -->
      <div v-if="showSaveToast" class="toast" :class="`toast-${toastType}`">
        <span>{{ toastMessage }}</span>
      </div>

      <!-- "Continue where you left off" prompt -->
      <Transition name="resume">
        <div v-if="resumeArticle" class="resume-banner">
          <div class="resume-icon"><BookMarked :size="20" /></div>
          <div class="resume-copy">
            <strong>Continue where you left off?</strong>
            <p>
              Last time you left <em>“{{ resumeArticle.title }}”</em> mid-reading.
              Your bookmark is at paragraph {{ Number(resumeArticle.bookmark) + 1 }}.
            </p>
          </div>
          <div class="resume-actions">
            <button class="resume-primary" @click="resumeReading">
              Continue reading
            </button>
            <button class="resume-dismiss" @click="dismissResume">Not now</button>
          </div>
        </div>
      </Transition>

      <div class="input-display-row">
        <!-- Chinese Text Input -->
        <div class="text-section" :style="{fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
          <div class="input-wrapper">
            <textarea 
              ref="chineseTextareaRef"
              v-model="inputText" 
              placeholder="Enter Chinese text here..." 
              class="text-input w-full" 
              @input="handleChineseInput"
            ></textarea>
            <button 
              v-if="inputText.trim()" 
              @click="openEditModal('chinese')" 
              class="edit-btn"
              title="Edit in popup"
            >
              <EditIcon :size="16" />
            </button>
          </div>
          <button @click="clearOrPasteText('chinese')" class="action-btn">
            {{ pasteButtonLabel(inputText) }}
          </button>
        </div>

        <!-- English Translation Input -->
        <div class="text-section" :style="{fontSize: `${fontSize}px` }">
          <div class="input-wrapper">
            <textarea 
              ref="englishTextareaRef"
              v-model="englishText" 
              placeholder="Enter English translation here..." 
              class="text-input w-full english-input" 
            ></textarea>
            <button 
              v-if="englishText.trim()" 
              @click="openEditModal('english')" 
              class="edit-btn"
              title="Edit in popup"
            >
              <EditIcon :size="16" />
            </button>
          </div>
          <button @click="clearOrPasteText('english')" class="action-btn">
            {{ pasteButtonLabel(englishText) }}
          </button>
        </div>
      </div>

      <!-- Edit Modal -->
      <EditModal
        :isOpen="isEditModalOpen"
        :title="editModalTitle"
        :content="editModalContent"
        :fontSize="Number(fontSize)"
        :fontFamily="getFontFamily"
        @close="closeEditModal"
        @save="saveEditModalContent"
      />

      <!-- Settings Modal -->
      <SettingsModal
        :isOpen="isSettingsModalOpen"
        :settings="settings"
        @close="closeSettingsModal"
        @save="saveSettings"
        @reset="resetToDefaults"
      />

      <div v-if="inputText.trim() && (showEnglish || showChinese)" class="comparison-section">
        <div class="comparison-display relative">
          <!-- Old rendering method (paragraph by paragraph) -->
          <template v-if="!interleaveLines">
            <div
              v-for="(block, sentenceId) in comparisonData"
              :key="sentenceId"
              class="comparison-block relative"
              :data-paragraph-index="sentenceId"
            >
              
              <!-- Render based on display order and visibility toggles -->
              <template v-if="displayOrder === 'en-cn'">
                <!-- English first, then Chinese -->
                <div v-if="showEnglish && englishSegments[sentenceId]" class="english-translation-box">
                  <div class="english-text" :style="{ fontSize: `${fontSize * 0.8}px`, lineHeight: '1.1' }">
                    {{ englishSegments[sentenceId] }}
                  </div>
                </div>

                <div
                  v-if="showChinese"
                  class="line-container"
                  :class="{ 'is-focused': focusedParagraph === sentenceId }"
                  @click="handleParagraphClick(sentenceId)"
                >
                  <div class="paragraph-topline">
                    <span class="lang-badge">CN</span>
                  </div>
                  <div class="paragraph-actions">
                    <button
                      v-if="focusedParagraph === sentenceId"
                      class="paragraph-like-btn"
                      :class="{ 'is-liked': isLikedParagraph(sentenceId) }"
                      @click.stop="toggleLike(sentenceId)"
                      :title="isLikedParagraph(sentenceId) ? 'Remove like from this paragraph' : 'Like this paragraph'"
                    >
                      <Heart :size="14" :fill="isLikedParagraph(sentenceId) ? 'currentColor' : 'none'" />
                    </button>
                    <button
                      v-if="currentBookmark === sentenceId"
                      class="bookmark-btn is-active"
                      @click.stop="toggleBookmark(sentenceId)"
                      title="Remove bookmark"
                    >
                      <Bookmark :size="14" fill="currentColor" />
                    </button>
                    <button
                      v-if="focusedParagraph === sentenceId && currentBookmark !== sentenceId"
                      class="paragraph-menu-btn"
                      @click.stop="toggleParagraphMenu(sentenceId, $event)"
                      title="More actions"
                    >
                      <MoreVertical :size="14" />
                    </button>
                  </div>
                  <div class="text-line relative">
                    <div class="line-characters-and-pinyin" :style="{ fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
                      <span v-for="(pair, pairIndex) in flattenBlockLines(block)" :key="pairIndex">
                        <span class="character" :style="{fontWeight: '600'}">
                          {{ showPinyin ? pair[0] : (pair[0] === ' ' && pair[1] === ' ' ? ' ' : pair[0]) }}
                        </span>
                        <span class="pinyin" :style="{fontSize: `${fontSize * 0.8}px`, display: showPinyin ? 'inline' : 'none'}">
                          {{ pair[1] }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <!-- Chinese first, then English -->
                <div
                  v-if="showChinese"
                  class="line-container"
                  :class="{ 'is-focused': focusedParagraph === sentenceId }"
                  @click="handleParagraphClick(sentenceId)"
                >
                  <div class="paragraph-topline">
                    <span class="lang-badge">CN</span>
                  </div>
                  <div class="paragraph-actions">
                    <button
                      v-if="focusedParagraph === sentenceId"
                      class="paragraph-like-btn"
                      :class="{ 'is-liked': isLikedParagraph(sentenceId) }"
                      @click.stop="toggleLike(sentenceId)"
                      :title="isLikedParagraph(sentenceId) ? 'Remove like from this paragraph' : 'Like this paragraph'"
                    >
                      <Heart :size="14" :fill="isLikedParagraph(sentenceId) ? 'currentColor' : 'none'" />
                    </button>
                    <button
                      v-if="currentBookmark === sentenceId"
                      class="bookmark-btn is-active"
                      @click.stop="toggleBookmark(sentenceId)"
                      title="Remove bookmark"
                    >
                      <Bookmark :size="14" fill="currentColor" />
                    </button>
                    <button
                      v-if="focusedParagraph === sentenceId && currentBookmark !== sentenceId"
                      class="paragraph-menu-btn"
                      @click.stop="toggleParagraphMenu(sentenceId, $event)"
                      title="More actions"
                    >
                      <MoreVertical :size="14" />
                    </button>
                  </div>
                  <div class="text-line relative">
                    <div class="line-characters-and-pinyin" :style="{ fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
                      <span v-for="(pair, pairIndex) in flattenBlockLines(block)" :key="pairIndex">
                        <span class="character" :style="{fontWeight: '600'}">
                          {{ showPinyin ? pair[0] : (pair[0] === ' ' && pair[1] === ' ' ? ' ' : pair[0]) }}
                        </span>
                        <span class="pinyin" :style="{fontSize: `${fontSize * 0.8}px`, display: showPinyin ? 'inline' : 'none'}">
                          {{ pair[1] }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="showEnglish && englishSegments[sentenceId]" class="english-translation-box">
                  <div class="english-text" :style="{ fontSize: `${fontSize * 0.8}px`, lineHeight: '1.1' }">
                    {{ englishSegments[sentenceId] }}
                  </div>
                </div>
              </template>

            </div>
          </template>

          <!-- New interleaved rendering method -->
          <template v-else>
            <div v-if="interleavedDisplayData && interleavedDisplayData.length" class="interleaved-container">
              <div
                v-for="(block, blockIndex) in interleavedDisplayData"
                :key="blockIndex"
                class="interleaved-block"
                :class="{ 'is-focused': focusedParagraph === blockIndex }"
                :data-paragraph-index="blockIndex"
                @click="handleParagraphClick(blockIndex)"
              >
                <div class="paragraph-topline">
                  <span class="lang-badge">{{ showChinese ? 'CN' : 'EN' }}</span>
                  <span v-if="showChinese" class="paragraph-hint">double-tap to bookmark</span>
                </div>
                <div class="paragraph-actions">
                  <button
                    v-if="focusedParagraph === blockIndex"
                    class="paragraph-like-btn"
                    :class="{ 'is-liked': isLikedParagraph(blockIndex) }"
                    @click.stop="toggleLike(blockIndex)"
                    :title="isLikedParagraph(blockIndex) ? 'Remove like from this paragraph' : 'Like this paragraph'"
                  >
                    <Heart :size="14" :fill="isLikedParagraph(blockIndex) ? 'currentColor' : 'none'" />
                  </button>
                  <button
                    v-if="currentBookmark === blockIndex"
                    class="bookmark-btn is-active"
                    @click.stop="toggleBookmark(blockIndex)"
                    title="Remove bookmark"
                  >
                    <Bookmark :size="14" fill="currentColor" />
                  </button>
                  <button
                    v-if="focusedParagraph === blockIndex && currentBookmark !== blockIndex"
                    class="paragraph-menu-btn"
                    @click.stop="toggleParagraphMenu(blockIndex, $event)"
                    title="More actions"
                  >
                    <MoreVertical :size="14" />
                  </button>
                </div>

                <div v-for="(line, lineIndex) in block" :key="lineIndex" 
                     :class="['interleaved-line', line.type]"
                     :style="{
                       fontSize: line.type === 'chinese' ? `${fontSize}px` : `${fontSize * 0.8}px`,
                       fontFamily: line.type === 'chinese' ? getFontFamily : '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif'
                     }">
                  <span v-if="line.type === 'chinese'" v-html="line.content"></span>
                  <span v-else>{{ line.content }}</span>
                </div>
              </div>
            </div>
          </template>

          <div v-if="inputText.trim()" class="quick-actions">
            <button @click="requestClearAll" class="clear-all-btn">
              Clear All Text
            </button>
          </div>

          <div 
            class="scroll-spacer"
            :style="{
              minHeight: `calc(66vh - ${fontSize * 2}px)`
            }"
          ></div>
        </div>
      </div>

      <!-- Empty state when both English and Chinese are hidden -->
      <div v-else-if="inputText.trim() && !showEnglish && !showChinese" class="empty-state">
        <p>Both English and Chinese paragraphs are hidden. Enable them in settings.</p>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmModal
      :isOpen="showConfirmModal"
      title="Clear All Text"
      message="Are you sure you want to clear all Chinese and English text? This action cannot be undone."
      confirmText="Yes, Clear All"
      cancelText="Cancel"
      @confirm="confirmClearAll"
      @cancel="cancelClearAll"
    />

    <!-- Teleported paragraph ⋮ menu -->
    <Teleport to="body">
      <div
        v-if="openMenuParagraph !== null && menuPosition"
        class="paragraph-menu paragraph-menu--teleported"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        @click.stop
      >
        <button
          class="paragraph-menu-item"
          @click.stop="bookmarkFromMenu(openMenuParagraph)"
        >
          <Bookmark :size="14" />
          Bookmark
        </button>
        <button
          class="paragraph-menu-item"
          @click.stop="editParagraphFromMenu(openMenuParagraph)"
        >
          <PencilLine :size="14" />
          Edit paragraph
        </button>
        <button
          class="paragraph-menu-item"
          @click.stop="copyParagraph(openMenuParagraph)"
        >
          <Copy :size="14" />
          Copy
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script>
import ArticleHistoryModal from './ArticleHistoryModal.vue';
import InfoModal from './InfoModal.vue';
import { useArticleHistory } from '../composables/useArticleHistory';
import {
  Edit as EditIcon,
  Settings,
  BookOpen,
  Save,
  Info,
  Bookmark,
  BookMarked,
  MoreVertical,
  Heart,
  PencilLine,
  Copy,
} from 'lucide-vue-next';
import EditModal from './EditModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import SettingsModal from './SettingsModal.vue';
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { pinyin } from 'pinyin-pro';
import LoadingSpinner from './LoadingSpinner.vue'; // Import the loading component
import { useSettings } from '../composables/useSettings';
import { splitParagraphs, normalizeParagraphBreaks, getParagraphRanges } from '../utils/textProcessing';
import { copyText, isFirefox } from '../utils/clipboard';


export default {
  components: {
    ArticleHistoryModal,
    InfoModal,
    EditModal,
    ConfirmModal,
    SettingsModal,
    LoadingSpinner,
    BookOpen,
    EditIcon,
    Settings,
  },
  name: 'FontConverter',
  setup() {
    const {
      fontSize,
      selectedFont,
      showPinyin,
      showEnglish,
      showChinese,
      displayOrder,
      interleaveLines,
      displayName,
      resetSettings
    } = useSettings()

    const {
      articles,
      currentArticleId,
      createArticle,
      updateArticle,
      setCurrentArticle,
      clearCurrentArticle,
      flushAutoSave,
      scheduleAutoSave,
      cancelAutoSave,
      deleteArticle,
      deleteAllArticles,
      isCurrentArticle,
      formatDate,
      isSaving,
      setBookmark,
      getResumeArticle,
      clearLastSession,
      markArticleRead,
      toggleParagraphLike,
      isParagraphLiked,
      getLikeCount,
      toggleArchived
    } = useArticleHistory()
    
    const inputText = ref('');
    const englishText = ref('');
    const chineseTextareaRef = ref(null);
    const englishTextareaRef = ref(null);
    const firefoxBrowser = isFirefox();
    const pasteButtonLabel = (text) => {
      if (text.trim()) return 'Clear';
      return firefoxBrowser ? 'Paste manually' : 'Paste';
    };

    const showConfirmModal = ref(false);
    const isSettingsModalOpen = ref(false);
    const isInfoModalOpen = ref(false);
    const containerWidth = ref(800); // Default container width
    const isLoading = ref(false); // Add loading state
    const loadingText = ref('Processing...'); // Add loading text

    const showSaveToast = ref(false);
    const toastMessage = ref('');
    const toastType = ref('success');
    let toastTimeout = null;

    const isEditModalOpen = ref(false)
    const editModalType = ref('chinese')
    const editModalTitle = computed(() => editModalType.value === 'chinese' ? 'Chinese Text' : 'English Translation')
    const editModalContent = computed(() => editModalType.value === 'chinese' ? inputText.value : englishText.value)


    // Add these refs:
    const isHistoryModalOpen = ref(false)
    const lastSavedContent = ref({ chinese: '', english: '' })
    const resumeArticle = ref(null)

    // Bookmark & paragraph menu state
    const currentBookmark = ref(null)
    const pendingBookmark = ref(null)
    const focusedParagraph = ref(null)
    const openMenuParagraph = ref(null)
    const menuPosition = ref(null)

    // ---------- Toast ----------
    const showToastMessage = (message, type = 'success', duration = 3200) => {
      toastMessage.value = message
      toastType.value = type
      showSaveToast.value = true
      if (toastTimeout) clearTimeout(toastTimeout)
      toastTimeout = setTimeout(() => {
        showSaveToast.value = false
      }, duration)
    }

    // Add watchers for auto-save
    watch([inputText, englishText], ([newChinese, newEnglish]) => {
      if (newChinese && newChinese.trim()) {
        scheduleAutoSave(newChinese, newEnglish)
        lastSavedContent.value = { chinese: newChinese, english: newEnglish }
      } else {
        cancelAutoSave()
      }
    }, { deep: true })

    // Add the modal methods:
    const openHistoryModal = () => {
      isHistoryModalOpen.value = true
    }

    const closeHistoryModal = () => {
      isHistoryModalOpen.value = false
    }

    const openInfoModal = () => {
      isInfoModalOpen.value = true
    }

    const closeInfoModal = () => {
      isInfoModalOpen.value = false
    }

    const scrollToBookmark = (paragraphIndex) => {
      const index = Number(paragraphIndex)
      const el = document.querySelector(`[data-paragraph-index="${index}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    const loadArticleIntoEditor = async (article) => {
      isLoading.value = true
      loadingText.value = 'Loading article...'
      await new Promise((resolve) => setTimeout(resolve, 200))

      const bookmark =
        article.bookmark === null || article.bookmark === undefined
          ? null
          : Number(article.bookmark)

      inputText.value = article.chineseContent || ''
      englishText.value = article.englishContent || ''
      currentBookmark.value = Number.isFinite(bookmark) ? bookmark : null
      resumeArticle.value = null
      cancelAutoSave()
      setCurrentArticle(article.id)
      markArticleRead(article.id)

      isLoading.value = false

      if (currentBookmark.value !== null) {
        if (comparisonData.value[currentBookmark.value]) {
          await nextTick()
          scrollToBookmark(currentBookmark.value)
        } else {
          pendingBookmark.value = currentBookmark.value
        }
      }
    }

    const resumeReading = async () => {
      const article = resumeArticle.value
      if (!article) return
      await loadArticleIntoEditor(article)
    }

    const dismissResume = () => {
      clearLastSession()
      resumeArticle.value = null
    }

    const handleChineseInput = () => {
      // The reader has started typing/pasting something else — stop offering the
      // old article in the banner. The history entry is untouched.
      if (resumeArticle.value) resumeArticle.value = null
    }

    const handleDeleteArticle = (articleId) => {
      const wasCurrent = isCurrentArticle(articleId)
      deleteArticle(articleId)
      if (wasCurrent) {
        currentBookmark.value = null
        pendingBookmark.value = null
        focusedParagraph.value = null
        closeParagraphMenu()
      }
    }

    const handleDeleteAllArticles = () => {
      deleteAllArticles()
      currentBookmark.value = null
      pendingBookmark.value = null
      focusedParagraph.value = null
      closeParagraphMenu()
    }

    const handleToggleArchive = (articleId) => {
      const archived = toggleArchived(articleId)
      showToastMessage(
        archived ? '🗄️ Article archived' : 'Article restored from archive',
        'info'
      )
    }

    // ---------- Manual save ----------
    const handleManualSave = () => {
      if (!inputText.value.trim()) return

      let article
      if (currentArticleId.value) {
        flushAutoSave(inputText.value, englishText.value)
        article = updateArticle(currentArticleId.value, {
          chineseContent: inputText.value,
          englishContent: englishText.value
        })
      } else {
        article = createArticle(inputText.value, englishText.value)
      }

      if (article) {
        resumeArticle.value = null
        currentBookmark.value =
          article.bookmark === null || article.bookmark === undefined
            ? null
            : Number(article.bookmark)
        showToastMessage('🀄 Article saved successfully!')
      }
    }

    // ---------- Bookmark toggle ----------
    const toggleBookmark = (paragraphIndex) => {
      const index = Number(paragraphIndex)
      if (!currentArticleId.value) {
        const article = createArticle(inputText.value, englishText.value)
        if (!article) return
      }
      if (!currentArticleId.value) return

      const nextBookmark = currentBookmark.value === index ? null : index
      currentBookmark.value = nextBookmark
      setBookmark(currentArticleId.value, nextBookmark)
    }

    // ---------- Paragraph likes ----------
    const isLikedParagraph = (paragraphIndex) => {
      if (!currentArticleId.value) return false
      return isParagraphLiked(currentArticleId.value, paragraphIndex)
    }

    const toggleLike = (paragraphIndex) => {
      if (!currentArticleId.value) {
        const article = createArticle(inputText.value, englishText.value)
        if (!article) return
      }
      if (!currentArticleId.value) return

      const liked = toggleParagraphLike(currentArticleId.value, paragraphIndex)
      showToastMessage(
        liked ? '❤️ Paragraph liked' : 'Like removed',
        liked ? 'success' : 'info'
      )
    }

    // ---------- Paragraph focus & menu ----------
    // One click focuses a paragraph. A quick second click on the same paragraph
    // bookmarks it. Handling both gestures here avoids relying on the browser's
    // native dblclick, which loses the second tap when focus re-renders the
    // paragraph actions.
    const DOUBLE_ACTIVATION_MS = 500
    let lastParagraphTap = { index: null, time: 0 }

    const handleParagraphClick = (index) => {
      const now = Date.now()
      const isSecondTap =
        lastParagraphTap.index === index &&
        now - lastParagraphTap.time <= DOUBLE_ACTIVATION_MS

      focusedParagraph.value = index

      if (isSecondTap) {
        lastParagraphTap = { index: null, time: 0 }
        toggleBookmark(index)
        return
      }

      lastParagraphTap = { index, time: now }
    }

    const closeParagraphMenu = () => {
      openMenuParagraph.value = null
      menuPosition.value = null
    }

    const toggleParagraphMenu = (index, event) => {
      if (openMenuParagraph.value === index) {
        closeParagraphMenu()
        return
      }
      openMenuParagraph.value = index
      focusedParagraph.value = index

      const btn = event?.currentTarget
      if (btn) {
        const rect = btn.getBoundingClientRect()
        const MENU_WIDTH = 210
        const MENU_HEIGHT = 140
        const MARGIN = 8

        const left = Math.min(
          window.innerWidth - MENU_WIDTH - MARGIN,
          Math.max(MARGIN, rect.right - MENU_WIDTH)
        )

        const spaceBelow = window.innerHeight - rect.bottom
        const top =
          spaceBelow >= MENU_HEIGHT + MARGIN
            ? rect.bottom + 4
            : rect.top - MENU_HEIGHT - 4

        menuPosition.value = { top, left }
      }
    }

    const handleDocumentClick = (e) => {
      const inside = e.target.closest(
        '.line-container, .interleaved-block, .paragraph-menu'
      )
      if (!inside) {
        focusedParagraph.value = null
        lastParagraphTap = { index: null, time: 0 }
        closeParagraphMenu()
      }
    }

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeParagraphMenu()
        focusedParagraph.value = null
        lastParagraphTap = { index: null, time: 0 }
      }
    }

    // ---------- Menu actions ----------
    const bookmarkFromMenu = (index) => {
      toggleBookmark(index)
      closeParagraphMenu()
    }

    const editParagraphFromMenu = (index) => {
      const block = comparisonData.value[index]
      if (!block) return

      closeParagraphMenu()
      focusedParagraph.value = null

      const ranges = getParagraphRanges(inputText.value)
      const range = ranges[index]
      if (!range) return

      nextTick(() => {
        const el = chineseTextareaRef.value
        if (!el) return

        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus({ preventScroll: true })
        el.setSelectionRange(range.start, range.end)

        const before = inputText.value.slice(0, range.start)
        const lineCount = before.split('\n').length - 1
        const computedStyle = window.getComputedStyle(el)
        const lineHeight = parseFloat(computedStyle.lineHeight) || Number(fontSize.value) * 1.4
        el.scrollTop = Math.max(0, lineCount * lineHeight - el.clientHeight / 2)
      })

      showToastMessage('Paragraph selected in the editor above.', 'info')
    }

    const copyParagraph = async (index) => {
      const block = comparisonData.value[index]
      if (!block?.raw) return

      if (await copyText(block.raw)) {
        showToastMessage('📋 Paragraph copied!')
      } else {
        showToastMessage('Failed to copy paragraph.', 'error')
      }
      closeParagraphMenu()
    }

    // Settings object for modal
    const settings = computed(() => ({
      fontSize: Number(fontSize.value),
      selectedFont: selectedFont.value,
      showPinyin: showPinyin.value,
      showEnglish: showEnglish.value,
      showChinese: showChinese.value,
      displayOrder: displayOrder.value,
      interleaveLines: interleaveLines.value,
      displayName: displayName.value
    }))

    // Update container width on resize
    const updateContainerWidth = () => {
      const container = document.querySelector('.comparison-display')
      if (container) {
        containerWidth.value = container.clientWidth - 32 // Subtract padding
      }
    }

    // Split text into lines based on container width
    const splitTextIntoLines = (text, width, fontSz, fontFamily, isChinese = true) => {
      if (!text || !width || width <= 0) return [text]
      
      // Create a hidden measuring element
      const measureDiv = document.createElement('div')
      measureDiv.style.position = 'absolute'
      measureDiv.style.visibility = 'hidden'
      measureDiv.style.top = '-9999px'
      measureDiv.style.left = '-9999px'
      measureDiv.style.width = `${width}px`
      measureDiv.style.fontSize = `${fontSz}px`
      measureDiv.style.fontFamily = fontFamily
      measureDiv.style.lineHeight = '1.5'
      measureDiv.style.whiteSpace = 'pre-wrap'
      measureDiv.style.wordWrap = 'break-word'
      measureDiv.style.wordBreak = 'break-word'
      measureDiv.style.padding = '0'
      measureDiv.style.margin = '0'
      document.body.appendChild(measureDiv)
      
      const lines = []
      let currentLine = ''
      
      // For Chinese text, we need to preserve the character+pinyin pairs
      let chars = []
      if (isChinese) {
        // For Chinese, we need to split by character+pinyin pairs
        // The text comes as "司sī 美měi 的de" format
        chars = text.split(/(\S+?[\u4e00-\u9fa5][a-z]+\s+|\S+?[\u4e00-\u9fa5][a-z]+$|\S+)/)
      } else {
        // For English, split by spaces and punctuation
        chars = text.split(/(\S+\s+|\S+$)/)
      }
      
      chars = chars.filter(c => c && c.trim())
      
      for (const char of chars) {
        const testLine = currentLine + char
        measureDiv.textContent = testLine
        
        // Check if adding this character exceeds line height
        if (measureDiv.scrollHeight > 30) { // Height threshold (approx 1 line)
          if (currentLine.trim()) {
            lines.push(currentLine.trim())
          }
          currentLine = char
        } else {
          currentLine = testLine
        }
      }
      
      if (currentLine.trim()) {
        lines.push(currentLine.trim())
      }
      
      document.body.removeChild(measureDiv)
      return lines
    }

    // Get Chinese text as plain string with pinyin
    const getChineseWithPinyinText = (chineseText) => {
      if (!chineseText) return ''
      if (!showPinyin.value) return chineseText
      
      const pairs = getPinyinAndChar(chineseText)
      return pairs.map(pair => pair[0] + (pair[1] || '')).join(' ')
    }

    // Interleaved display data
    const interleavedDisplayData = computed(() => {
      if (!interleaveLines.value || !inputText.value.trim()) return null
      
      const chineseParagraphs = splitParagraphs(inputText.value)
      const englishParagraphs = splitParagraphs(englishText.value)
      
      // Update container width
      nextTick(() => updateContainerWidth())
      
      const interleavedBlocks = []
      
      for (let i = 0; i < chineseParagraphs.length; i++) {
        const chinesePara = chineseParagraphs[i]
        const englishPara = englishParagraphs[i] || ''
        
        if (!showChinese.value && !showEnglish.value) continue
        
        // Get Chinese text with pinyin
        const chineseText = getChineseWithPinyinText(chinesePara)
        
        // Split into lines based on container width
        let chineseLines = []
        let englishLines = []
        
        if (showChinese.value && chineseText) {
          chineseLines = splitTextIntoLines(
            chineseText, 
            containerWidth.value, 
            fontSize.value, 
            getFontFamily.value,
            true
          )
        }
        
        if (showEnglish.value && englishPara) {
          englishLines = splitTextIntoLines(
            englishPara,
            containerWidth.value,
            fontSize.value * 0.8,
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            false
          )
        }
        
        // Interleave lines based on display order
        const interleaved = []
        const maxLines = Math.max(chineseLines.length, englishLines.length)
        
        if (displayOrder.value === 'en-cn') {
          // English first
          for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
            if (lineIndex < englishLines.length && showEnglish.value) {
              interleaved.push({
                type: 'english',
                content: englishLines[lineIndex]
              })
            }
            if (lineIndex < chineseLines.length && showChinese.value) {
              interleaved.push({
                type: 'chinese',
                content: chineseLines[lineIndex]
              })
            }
          }
        } else {
          // Chinese first
          for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
            if (lineIndex < chineseLines.length && showChinese.value) {
              interleaved.push({
                type: 'chinese',
                content: chineseLines[lineIndex]
              })
            }
            if (lineIndex < englishLines.length && showEnglish.value) {
              interleaved.push({
                type: 'english',
                content: englishLines[lineIndex]
              })
            }
          }
        }
        
        if (interleaved.length) {
          interleavedBlocks.push(interleaved)
        }
      }
      
      return interleavedBlocks
    })

    const openSettingsModal = () => {
      isSettingsModalOpen.value = true
    }

    // Request clear with confirmation
    const requestClearAll = () => {
      if (inputText.value.trim() || englishText.value.trim()) {
        showConfirmModal.value = true
      }
    }

    const confirmClearAll = () => {
      clearText('both')
      showConfirmModal.value = false
    }

    const cancelClearAll = () => {
      showConfirmModal.value = false
    }

    const closeSettingsModal = () => {
      isSettingsModalOpen.value = false
    }

    const saveSettings = (newSettings) => {
      fontSize.value = newSettings.fontSize
      selectedFont.value = newSettings.selectedFont
      showPinyin.value = newSettings.showPinyin
      showEnglish.value = newSettings.showEnglish
      showChinese.value = newSettings.showChinese
      displayOrder.value = newSettings.displayOrder
      interleaveLines.value = newSettings.interleaveLines
      displayName.value = (newSettings.displayName || '').slice(0, 40)
      // Keep the modal open for live preview; the Close button dismisses it.
      // Recalculate lines when settings change
      nextTick(() => updateContainerWidth())
    }

    const resetToDefaults = () => {
      resetSettings()
      closeSettingsModal()
    }

    const openEditModal = (type) => {
      editModalType.value = type
      isEditModalOpen.value = true
    }

    const closeEditModal = () => {
      isEditModalOpen.value = false
    }

    const saveEditModalContent = (newContent) => {
      if (editModalType.value === 'chinese') {
        inputText.value = normalizeParagraphBreaks(newContent)
      } else {
        englishText.value = normalizeParagraphBreaks(newContent)
      }
      closeEditModal()
    }

    // Font configurations
    const fonts = {
      NotoSansSC: "'Noto Sans SC', 'Inter', sans-serif",
      NotoSerifSC: "'Noto Serif SC', 'Georgia', serif",
      Inter: "'Inter', 'Noto Sans SC', sans-serif",
      Roboto: "'Roboto', 'Noto Sans SC', sans-serif",
      Poppins: "'Poppins', 'Noto Sans SC', sans-serif",
      ZCOOLKuaiLe: "'ZCOOL KuaiLe', cursive",
      MaShanZheng: "'Ma Shan Zheng', cursive",
    };

    const getFontFamily = computed(() => fonts[selectedFont.value]);

    const breakEnglishText = (englishText, chineseSegments) => {
      if (!englishText.trim()) return {};
      
      const normalizedText = englishText
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n(\s*\n)*/g, '\n\n');
      
      const englishParagraphs = normalizedText
        .split(/\n\n/)
        .map(para => para.trim())
        .filter(para => para);
      
      const result = {};
      const chineseSegmentKeys = chineseSegments ? Object.keys(chineseSegments) : [];
      
      englishParagraphs.forEach((paragraph, index) => {
        if (index < chineseSegmentKeys.length) {
          result[chineseSegmentKeys[index]] = paragraph;
        }
      });
      
      return result;
    };

    const englishSegments = computed(() => {
      return breakEnglishText(englishText.value, comparisonData.value);
    });

    // Firefox always asks for confirmation before a page can read the clipboard.
    // Avoid that extra prompt by focusing the right text box and asking for a
    // normal Ctrl+V / ⌘V paste instead.
    const focusForManualPaste = (targetType) => {
      const el =
        targetType === 'english' ? englishTextareaRef.value : chineseTextareaRef.value
      if (!el) return

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })

      const end = el.value.length
      try {
        el.setSelectionRange(end, end)
      } catch {
        // The element may not support selection in some browsers.
      }

      const coarsePointer =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)').matches
      const isMac = /mac|iphone|ipad|ipod/i.test(
        navigator.platform || navigator.userAgent
      )

      showToastMessage(
        coarsePointer
          ? 'Firefox needs a manual paste. Long-press the text box and choose Paste.'
          : `Firefox needs a manual paste. Press ${isMac ? '⌘V' : 'Ctrl+V'} now.`,
        'info',
        6000
      )
    }

    const pasteFromClipboard = async (target = null) => {
      const targetType = target || 'chinese'

      if (firefoxBrowser) {
        focusForManualPaste(targetType)
        return
      }

      isLoading.value = true;
      loadingText.value = 'Pasting from clipboard...';
      
      try {
        // Simulate a small delay to ensure loading state is visible
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const clipboardText = await navigator.clipboard.readText();
        
        loadingText.value = 'Processing text...';
        
        // Use setTimeout to allow the loading state to be visible
        // and to prevent UI blocking during processing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (targetType === 'chinese') {
          inputText.value = normalizeParagraphBreaks(clipboardText);
        } else {
          englishText.value = normalizeParagraphBreaks(clipboardText);
        }

        resumeArticle.value = null;
        
        // Small delay to show completion before hiding
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Failed to read clipboard contents: ', error);
        showToastMessage('Could not read the clipboard. Please paste manually.', 'error');
      } finally {
        isLoading.value = false;
      }
    };

    // const clearText = (type = 'both') => {
    //   if (type === 'chinese' || type === 'both') {
    //     inputText.value = '';
    //   }
      
    //   if (type === 'english' || type === 'both') {
    //     englishText.value = '';
    //   }
    // };

    // Update the clearText function to also reset tracking
    const clearText = (type = 'both') => {
      if (type === 'chinese' || type === 'both') {
        inputText.value = '';
      }
      
      if (type === 'english' || type === 'both') {
        englishText.value = '';
      }
      
      // Reset tracking when clearing
      if (type === 'both' || (type === 'chinese' && !inputText.value.trim())) {
        cancelAutoSave()
        clearCurrentArticle()
        currentBookmark.value = null
        pendingBookmark.value = null
        focusedParagraph.value = null
        closeParagraphMenu()
      }
    }

    const clearOrPasteText = (type) => {
      const text = type === 'chinese' ? inputText.value : englishText.value;
      
      if (text.trim()) {
        clearText(type);
      } else {
        pasteFromClipboard(type);
      }
    };

    const flattenBlockLines = (blockObject) => {
      const flattenedPairs = [];
      
      if (!blockObject || !blockObject.lines) {
        return flattenedPairs;
      }
      
      Object.values(blockObject.lines).forEach(line => {
        if (line.textAndPinyin && Array.isArray(line.textAndPinyin)) {
          line.textAndPinyin.forEach(pair => {
            flattenedPairs.push(pair);
          });
        }
      });
      return flattenedPairs;
    };
    
    const comparisonData = computed(() => {
      if (!inputText.value) return {};
      
      const chineseParagraphs = splitParagraphs(inputText.value);
      
      const result = {};
      
      chineseParagraphs.forEach((paragraph, index) => {
        const sentenceId = index;
        result[sentenceId] = {
          raw: paragraph,
          lines: {},
          sentencePinyin: getPinyinForSentence(paragraph)
        };
        
        result[sentenceId].lines[0] = {
          text: paragraph,
          pinyin: getPinyinForSentence(paragraph),
          textAndPinyin: getPinyinAndChar(paragraph)
        };
      });
      
      return result;
    });

    const getPinyinForSentence = sentence => {
      if (!sentence) return '';
      return pinyin(sentence);
    };

    function preprocessing(sentence) {
        const preprocessed_sentence = [];
        let current_segment = '';
        let current_type = null;

        const isChinese = char => /[\u4e00-\u9fa5]/.test(char);
        const isEnglish = char => /[a-zA-Z0-9]/.test(char);
        const isSpace = char => /\s/.test(char);
        const isSymbol = char => /[。，？%#@*&^$!-><()_.""''=[\]:《》【】（）！。，、：;'"『』「」]/.test(char);

        for (const char of sentence) {
            if (isChinese(char)) {
                if (current_type && current_type !== 'chinese') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                if (current_segment) {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                preprocessed_sentence.push([char]);
                current_type = 'chinese';
            } 
            else if (isEnglish(char) || isSpace(char)) {
                if (current_type === 'symbol') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                current_segment += char;
                current_type = 'english';
            }
            else if (isSymbol(char)) {
                if (current_type === 'english') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                if (current_segment) {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                preprocessed_sentence.push([char]);
                current_type = 'symbol';
            }
        }

        if (current_segment) {
            preprocessed_sentence.push([current_segment]);
        }

        return preprocessed_sentence;
    }

    function getPinyin(sentence) {
        const pinyinObj = [];
        const preprocessedSentence = preprocessing(sentence);
        
        const chineseOnly = sentence.split('').filter(c => /[\u4e00-\u9fa5]/.test(c)).join('');
        const chinesePinyin = pinyin(chineseOnly);
        
        const pinyinParts = chinesePinyin.split(' ');
        
        let pinyinIndex = 0;
        
        for (const [text] of preprocessedSentence) {
            if (/[\u4e00-\u9fa5]/.test(text)) {
                pinyinObj.push([text, pinyinParts[pinyinIndex] || '']);
                pinyinIndex++;
            } else {
                pinyinObj.push([text, '']);
            }
        }
        
        return pinyinObj;
    }

    const getPinyinAndChar = sentence => {
      if (!sentence) return [];
      
      const chars = preprocessing(sentence);
      if (!showPinyin.value) return chars.map(char => [char[0], '']);

      try {
        return getPinyin(sentence);
      } catch (error) {
        console.error('Error processing pinyin:', error);
        return chars.map(char => [char, '']);
      }
    };

    // Watch for window resize to recalculate lines
    watch([interleaveLines, inputText, englishText, fontSize, showPinyin], () => {
      if (interleaveLines.value) {
        nextTick(() => updateContainerWidth())
      }
    })

    // Set up resize observer
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (interleaveLines.value) {
          updateContainerWidth()
        }
      })
    }

    // When comparisonData recomputes (fresh parse), satisfy pending bookmark scroll
    watch(comparisonData, async () => {
      if (pendingBookmark.value !== null) {
        const target = pendingBookmark.value
        pendingBookmark.value = null
        await nextTick()
        scrollToBookmark(target)
      }
    })

    // ---------- Lifecycle ----------
    onMounted(() => {
      resumeArticle.value = getResumeArticle()
      document.addEventListener('click', handleDocumentClick)
      document.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeydown)
      if (toastTimeout) clearTimeout(toastTimeout)
    })

    return {
      articles,
      isHistoryModalOpen,
      openHistoryModal,
      closeHistoryModal,
      loadArticleIntoEditor,
      handleDeleteArticle,
      handleDeleteAllArticles,
      handleToggleArchive,
      isCurrentArticle,
      formatDate,
      getLikeCount,

      // Data
      inputText,
      englishText,
      chineseTextareaRef,
      englishTextareaRef,
      pasteButtonLabel,
      selectedFont,
      fontSize,
      showPinyin,
      showEnglish,
      showChinese,
      displayOrder,
      interleaveLines,
      isSaving,

      isLoading, // Add to return
      loadingText, // Add to return

      // Toast
      showSaveToast,
      toastMessage,
      toastType,
      showToastMessage,

      // Resume
      resumeArticle,
      resumeReading,
      dismissResume,
      handleChineseInput,

      // Save
      handleManualSave,

      // Paragraph interactions
      currentBookmark,
      focusedParagraph,
      openMenuParagraph,
      menuPosition,
      handleParagraphClick,
      toggleBookmark,
      toggleLike,
      isLikedParagraph,
      toggleParagraphMenu,
      closeParagraphMenu,
      bookmarkFromMenu,
      editParagraphFromMenu,
      copyParagraph,
      
      // Computed
      getFontFamily,
      comparisonData,
      englishSegments,
      settings,
      interleavedDisplayData,
      
      // Methods
      clearOrPasteText,
      clearAllText: clearText,
      flattenBlockLines,
      
      // Modal related
      EditIcon,
      Settings,
      BookOpen,
      Save,
      Info,
      Bookmark,
      BookMarked,
      MoreVertical,
      Heart,
      PencilLine,
      Copy,
      isEditModalOpen,
      editModalTitle,
      editModalContent,
      openEditModal,
      closeEditModal,
      saveEditModalContent,
      
      // Settings modal
      isSettingsModalOpen,
      openSettingsModal,
      closeSettingsModal,
      saveSettings,
      resetToDefaults,

      // Info modal
      isInfoModalOpen,
      openInfoModal,
      closeInfoModal,

      showConfirmModal,
      requestClearAll,
      confirmClearAll,
      cancelClearAll,
    };
  },
};
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  background: white;
  border-bottom: 1px solid #e9ecef;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.logo-section {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #4a6cf7 0%, #6c5ce7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.settings-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #495057;
}

.settings-icon-btn:hover {
  background: #f8f9fa;
  transform: rotate(90deg);
}

.main-content {
  display: block;
}

.input-display-row {
  margin: 20px auto;
  padding: 5px;
  display: block;
  width: 100%;
  max-width: 1200px;
}

.text-section {
  width: 100%;
  padding: 0 1rem;
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.text-input {
  width: 100%;
  min-height: 40px;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.2s;
  resize: vertical;
  font-family: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
}

.text-input:focus {
  outline: none;
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
}

.action-btn {
  padding: 8px 20px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
  border-color: #4a6cf7;
  color: #4a6cf7;
}

.edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6c757d;
  z-index: 10;
}

.edit-btn:hover {
  background: #4a6cf7;
  border-color: #4a6cf7;
  color: white;
  transform: scale(1.05);
}

.quick-actions {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 1rem;
  text-align: center;
}

.clear-all-btn {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

/* Updated text wrapping styles */
.line-characters-and-pinyin {
  text-wrap: wrap;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  line-height: 1.8;
  gap: 2px;
}

.line-characters-and-pinyin > span {
  display: inline;
  white-space: normal;
  word-break: keep-all;
}

.english-translation-box {
  background-color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}

.english-text {
  color: #2c3e50;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
}

.english-input {
  border-color: #5dade2 !important;
  outline-color: #5dade2 !important;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #868e96;
  font-style: italic;
}

.relative {
  position: relative;
}

.converter-wrapper {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.comparison-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  overflow-x: hidden;
}

.comparison-display {
  max-width: 100%;
  width: 100%;
  overflow-x: hidden;
}

.comparison-block {
  margin-bottom: 24px;
  width: 100%;
  overflow-x: hidden;
}

.line-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  overflow-x: auto;
  word-wrap: break-word;
  word-break: break-word;
}

.text-line {
  display: block;
  word-wrap: break-word;
  white-space: normal;
  overflow-wrap: break-word;
}

.character {
  display: inline;
  margin-right: 2px;
  font-weight: normal;
  color: #1a1a1a;
  white-space: normal;
  word-break: keep-all;
  line-height: 1.5;
}

.pinyin {
  display: inline;
  margin-right: 4px;
  font-size: 0.65em;
  color: #9ca3af;
  font-weight: 400;
  letter-spacing: 0.3px;
  white-space: normal;
  word-break: keep-all;
  transition: color 0.2s ease;
}

.pinyin:hover {
  color: #6b7280;
}

/* Interleaved mode styles */
.interleaved-container {
  width: 100%;
}

.interleaved-block {
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.interleaved-line {
  padding: 6px 0;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
  word-break: break-word;
}

.interleaved-line.chinese {
  font-weight: 500;
  color: #1a1a1a;
}

.interleaved-line.english {
  color: #4a6cf7;
  /* margin-bottom: 4px; */
  /* border-left: 3px solid #4a6cf7; */
  /* padding-left: 12px; */
}

/* Inline pinyin styling for interleaved mode */
.chinese-with-pinyin {
  display: inline-block;
  margin-right: 4px;
}

.inline-pinyin {
  font-size: 0.65em;
  color: #9ca3af;
  margin-left: 1px;
  font-weight: 400;
}

/* Mobile specific fixes */
@media (max-width: 768px) {
  .app-header {
    padding: 8px 16px;
  }
  
  .logo {
    font-size: 18px;
  }
  
  .input-display-row {
    margin: 10px auto;
  }
  
  .text-section {
    padding: 0 0.5rem;
  }
  
  .comparison-section {
    padding: 0 0.5rem;
  }
  
  .line-container {
    padding: 12px;
  }
  
  .character {
    font-size: 0.95em;
  }
  
  .pinyin {
    font-size: 0.55em;
    margin-left: 1px;
    margin-right: 2px;
  }
  
  .line-characters-and-pinyin {
    gap: 1px;
    line-height: 1.6;
  }
  
  .interleaved-block {
    padding: 12px;
  }
  
  .interleaved-line.english {
    padding-left: 8px;
  }
}

/* For very small screens */
@media (max-width: 480px) {
  .character {
    font-size: 0.9em;
  }
  
  .pinyin {
    font-size: 0.5em;
  }
  
  .line-container {
    padding: 8px;
  }
  
  .english-text {
    font-size: 0.9em;
  }
}


/* Add to the existing styles */
.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.history-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #495057;
}

.history-icon-btn:hover {
  background: #f8f9fa;
  transform: scale(1.05);
}

.save-icon-btn,
.info-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #495057;
}

.save-icon-btn:hover:not(:disabled),
.info-icon-btn:hover {
  background: #f8f9fa;
  transform: scale(1.05);
}

.save-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Toast notification */
.toast {
  position: fixed;
  top: 82px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 3000;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  background: white;
  border: 1px solid #e9ecef;
  animation: toastSlideDown 0.3s ease;
  max-width: min(92vw, 560px);
  text-align: center;
}

.toast-success {
  color: #2f855a;
  border-color: #c6f6d5;
}

.toast-error {
  color: #c53030;
  border-color: #fed7d7;
}

.toast-info {
  color: #3a5ce8;
  border-color: #d8defb;
}

@keyframes toastSlideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* Resume banner */
.resume-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  max-width: 1160px;
  margin: 16px auto 0;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d8defb;
  border-radius: 14px;
  box-shadow: 0 8px 22px rgba(74, 108, 247, 0.08);
}

.resume-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eef1ff;
  color: #4a6cf7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.resume-copy {
  flex: 1;
  min-width: 200px;
}

.resume-copy strong {
  display: block;
  font-size: 14px;
  color: #2c3e50;
}

.resume-copy p {
  margin: 3px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: #6c757d;
}

.resume-copy em {
  color: #4a6cf7;
  font-style: normal;
  font-weight: 600;
}

.resume-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.resume-primary,
.resume-dismiss {
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.resume-primary {
  background: #4a6cf7;
  border: 1px solid #4a6cf7;
  color: white;
}

.resume-primary:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
}

.resume-dismiss {
  background: white;
  border: 1px solid #e9ecef;
  color: #6c757d;
}

.resume-dismiss:hover {
  background: #f8f9fa;
  color: #495057;
}

.resume-enter-active,
.resume-leave-active {
  transition: all 0.25s ease;
}

.resume-enter-from,
.resume-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Paragraph chrome */
.line-container {
  position: relative;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.line-container.is-focused {
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.22), 0 6px 18px rgba(74, 108, 247, 0.1);
}

.interleaved-block {
  position: relative;
  transition: box-shadow 0.2s ease;
}

.interleaved-block.is-focused {
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.22), 0 6px 18px rgba(74, 108, 247, 0.1);
}

.paragraph-topline {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 16px;
  margin-bottom: 6px;
}

.lang-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: #4a6cf7;
  background: #eef1ff;
  border: 1px solid #d8defb;
}

.paragraph-hint {
  font-size: 10px;
  color: #b0b7c3;
}

.paragraph-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 3;
}

.paragraph-like-btn,
.bookmark-btn,
.paragraph-menu-btn {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  background: white;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  padding: 0;
}

.paragraph-like-btn:hover {
  color: #e11d48;
  border-color: #fecdd3;
  background: #fff1f2;
}

.paragraph-like-btn.is-liked {
  color: #e11d48;
  border-color: #fecdd3;
  background: #fff1f2;
}

.bookmark-btn:hover,
.bookmark-btn.is-active {
  color: #4a6cf7;
  border-color: #d8defb;
  background: #eef1ff;
}

.paragraph-menu-btn:hover {
  color: #4a6cf7;
  border-color: #d8defb;
  background: #eef1ff;
}

/* Teleported paragraph menu */
.paragraph-menu {
  position: fixed;
  z-index: 3000;
  min-width: 170px;
  padding: 6px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
  animation: paragraphMenuIn 0.14s ease;
}

@keyframes paragraphMenuIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.paragraph-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #495057;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}

.paragraph-menu-item:hover {
  background: #f8f9fa;
  color: #4a6cf7;
}

@media (max-width: 768px) {
  .toast {
    top: 70px;
    font-size: 13px;
    padding: 10px 16px;
  }

  .resume-banner {
    margin: 12px 8px 0;
    padding: 12px 14px;
    gap: 10px;
  }

  .resume-actions {
    width: 100%;
  }

  .resume-primary,
  .resume-dismiss {
    flex: 1;
  }
}
</style>
<template>
  <div
    class="converter-wrapper"
    @dragover.prevent
    @drop.prevent="handleFileDrop"
  >
    <!-- Header with Logo and article actions -->
    <div class="app-header">
      <div class="logo-section">
        <h1 class="logo">LittleHanzi</h1>
      </div>
      <div class="header-buttons">
        <button
          class="new-tab-btn"
          @click="openNewTab"
          title="New article tab"
        >
          <Plus :size="20" />
        </button>

        <button
          v-if="inputText.trim()"
          class="share-icon-btn"
          @click="shareCurrentArticle"
          title="Share this article"
        >
          <Share2 :size="20" />
        </button>

        <button class="scan-icon-btn" @click="openScanner" title="Scan a QR code">
          <ScanLine :size="21" />
        </button>
        <button class="info-icon-btn" @click="openInfoModal" title="Information">
          <Info :size="22" />
        </button>
      </div>
    </div>

    <!-- Open articles: switch contexts without losing the editor state. -->
    <div v-if="workspaceTabs.length > 1" class="workspace-tabs">
      <div class="workspace-tabs-scroll">
        <button
          v-for="tab in workspaceTabs"
          :key="tab.key"
          class="workspace-tab"
          :class="{ active: tab.key === activeTabKey }"
          @click="activateTab(tab)"
        >
          <span class="workspace-tab-title">{{ tabTitle(tab) }}</span>
          <span
            class="workspace-tab-close"
            role="button"
            title="Close tab"
            @click.stop="closeTab(tab.key)"
          >
            <X :size="12" />
          </span>
        </button>
      </div>
    </div>

    <!-- Info Modal -->
    <InfoModal
      :isOpen="isInfoModalOpen"
      @close="closeInfoModal"
      @notify="showToastMessage"
    />

    <!-- Share Modal -->
    <ShareModal
      :isOpen="isShareModalOpen"
      :article="shareTarget"
      :displayName="profile.name || displayName"
      @close="closeShareModal"
      @save-name="handleSaveDisplayName"
      @notify="showToastMessage"
    />

    <!-- Database / backup Modal -->
    <BackupModal
      :isOpen="isBackupModalOpen"
      :backupSupported="backupSupported"
      :backupStatus="backupStatus"
      :backupFileName="backupFileName"
      :backupLastSaved="backupLastSaved"
      :articleCount="articles.length"
      @close="closeBackupModal"
      @choose-backup="handleChooseBackup"
      @reconnect-backup="handleReconnectBackup"
      @disable-backup="handleDisableBackup"
      @download-backup="handleDownloadBackup"
      @import-backup="handleImportBackup"
      @export-share="handleExportShareLibrary"
    />

    <!-- QR Scanner Modal -->
    <ScannerModal
      :isOpen="isScannerModalOpen"
      @close="closeScanner"
      @detected="handleScanDetected"
    />

    <div class="main-content">
      <div v-show="activeView === 'home'" class="home-view">
      <LoadingSpinner :isLoading="isLoading" :text="loadingText" />

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
                  <div class="english-text" :style="{ fontSize: `${englishFontSize}px`, lineHeight: '1.5' }">
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
                        <span class="pinyin" :style="{fontSize: `${pinyinFontSize}px`, display: showPinyin ? 'inline' : 'none'}">
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
                        <span class="pinyin" :style="{fontSize: `${pinyinFontSize}px`, display: showPinyin ? 'inline' : 'none'}">
                          {{ pair[1] }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="showEnglish && englishSegments[sentenceId]" class="english-translation-box">
                  <div class="english-text" :style="{ fontSize: `${englishFontSize}px`, lineHeight: '1.5' }">
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
                       fontSize: line.type === 'chinese' ? `${fontSize}px` : `${englishFontSize}px`,
                       fontFamily: line.type === 'chinese' ? getFontFamily : '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif'
                     }">
                  <span v-if="line.type === 'chinese'" class="interleaved-chinese">
                    <span
                      v-for="(pair, pairIndex) in line.pairs"
                      :key="pairIndex"
                      class="interleaved-pair"
                    >
                      <span class="character">{{ pair[0] }}</span>
                      <span
                        v-if="showPinyin && pair[1]"
                        class="pinyin"
                        :style="{ fontSize: `${pinyinFontSize}px` }"
                      >{{ pair[1] }}</span>
                    </span>
                  </span>
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
      </div><!-- /home-view -->

      <!-- History tab -->
      <div v-show="activeView === 'history'" class="history-view">
        <ArticleHistoryModal
          embedded
          :articles="articles"
          :isCurrentArticle="isCurrentArticle"
          :formatDate="formatDate"
          :getLikeCount="getLikeCount"
          @load-article="loadArticleIntoEditor"
          @delete-article="handleDeleteArticle"
          @delete-all="handleDeleteAllArticles"
          @share-article="openShareModal"
          @toggle-archive="handleToggleArchive"
          @open-backup="openBackupModal"
          @import-file="handleImportBackup"
        />
      </div>

      <!-- Profile tab -->
      <div v-show="activeView === 'profile'" class="profile-view">
        <ProfilePanel
          :profile="profile"
          :settings="settings"
          :backupSupported="backupSupported"
          :backupStatus="backupStatus"
          :backupFileName="backupFileName"
          :backupLastSaved="backupLastSaved"
          :articleCount="articles.length"
          @update-profile="updateProfile"
          @reset-profile="handleResetProfile"
          @save-settings="saveSettings"
          @reset-settings="resetToDefaults"
          @choose-backup="handleChooseBackup"
          @reconnect-backup="handleReconnectBackup"
          @disable-backup="handleDisableBackup"
          @download-backup="handleDownloadBackup"
          @import-backup="handleImportBackup"
          @export-share="handleExportShareLibrary"
          @scan-qr="openScanner"
        />
      </div>
    </div>

    <!-- Toast notification: global, so every tab and modal can show it. -->
    <div v-if="showSaveToast" class="toast" :class="`toast-${toastType}`">
      <span>{{ toastMessage }}</span>
    </div>

    <BottomNav v-model="activeView" />

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
  Plus,
  X,
  Info,
  Bookmark,
  BookMarked,
  MoreVertical,
  Heart,
  PencilLine,
  Copy,
  Share2,
  ScanLine,
} from 'lucide-vue-next';
import EditModal from './EditModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import ShareModal from './ShareModal.vue';
import BackupModal from './BackupModal.vue';
import ScannerModal from './ScannerModal.vue';
import BottomNav from './BottomNav.vue';
import ProfilePanel from './ProfilePanel.vue';
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { pinyin } from 'pinyin-pro';
import LoadingSpinner from './LoadingSpinner.vue'; // Import the loading component
import { useSettings } from '../composables/useSettings';
import { useBackup } from '../composables/useBackup';
import { useProfile } from '../composables/useProfile';
import { splitParagraphs, normalizeParagraphBreaks, getParagraphRanges } from '../utils/textProcessing';
import { copyText, isFirefox } from '../utils/clipboard';
import {
  makeBackupBundle,
  makeShareBundle,
  parseBundle,
  parseShareHash,
  parseScannedValue,
  downloadJson,
  contentSignature,
} from '../utils/sharePayload';


export default {
  components: {
    ArticleHistoryModal,
    InfoModal,
    EditModal,
    ConfirmModal,
    ShareModal,
    BackupModal,
    ScannerModal,
    BottomNav,
    ProfilePanel,
    LoadingSpinner,
    // Options API components must be registered here. Returning an icon from
    // setup() only exposes it as data, so the template cannot render it.
    EditIcon,
    Plus,
    X,
    Info,
    Bookmark,
    BookMarked,
    MoreVertical,
    Heart,
    PencilLine,
    Copy,
    Share2,
    ScanLine,
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
      pinyinFontSize,
      englishFontSize,
      displayName,
      resetSettings,
      saveCurrentSettings
    } = useSettings()

    const {
      articles,
      currentArticleId,
      createArticle,
      updateArticle,
      setCurrentArticle,
      deleteArticle,
      deleteAllArticles,
      isCurrentArticle,
      formatDate,
      setBookmark,
      getResumeArticle,
      clearLastSession,
      markArticleRead,
      toggleParagraphLike,
      isParagraphLiked,
      getLikeCount,
      toggleArchived,
      importBundle
    } = useArticleHistory()

    const {
      backupSupported,
      backupFileName,
      backupStatus,
      backupLastSaved,
      initBackup,
      chooseBackupFile,
      reconnectBackup,
      disableBackup,
      scheduleBackup,
      downloadBackup,
      pickImportFile,
    } = useBackup()

    const {
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
      address: profileAddress,
      occupation: profileOccupation,
      country: profileCountry,
      city: profileCity,
      bio: profileBio,
      photo: profilePhoto,
      applyProfile,
      snapshot: profileSnapshot,
      resetProfile,
    } = useProfile()

    // Adopt the old display-name setting the first time the profile is opened.
    if (!profileName.value && displayName.value) {
      profileName.value = displayName.value.slice(0, 40)
    }

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
    const activeView = ref('home')
    const isHistoryModalOpen = ref(false)
    const isShareModalOpen = ref(false)
    const isBackupModalOpen = ref(false)
    const isScannerModalOpen = ref(false)
    const shareTarget = ref(null)
    const resumeArticle = ref(null)

    // ---------- Open article tabs ----------
    // Each tab carries its own editor content. Article-backed tabs restore
    // from the article library; English-first drafts stay in the workspace
    // until Chinese text arrives and an article can be created.
    const WORKSPACE_KEY = 'littleHanzi_workspace'
    const ARTICLE_SAVE_DELAY = 150
    const workspaceTabs = ref([])
    const activeTabKey = ref(null)
    let articleSaveTimer = null
    let workspaceSaveTimer = null

    const activeTab = computed(
      () => workspaceTabs.value.find((tab) => tab.key === activeTabKey.value) || null
    )

    const makeTabKey = () =>
      `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

    const makeTab = (overrides = {}) => ({
      key: overrides.key || makeTabKey(),
      articleId: null,
      chinese: '',
      english: '',
      bookmark: null,
      // A detached tab keeps its text but does not auto-create an article.
      // This avoids resurrecting an article the reader just deleted.
      detached: false,
      ...overrides,
    })

    const profile = computed(() => ({
      name: profileName.value,
      email: profileEmail.value,
      phone: profilePhone.value,
      address: profileAddress.value,
      occupation: profileOccupation.value,
      country: profileCountry.value,
      city: profileCity.value,
      bio: profileBio.value,
      photo: profilePhoto.value,
    }))

    const updateProfile = (next) => {
      if (!next) return
      applyProfile(next)
      // Sharing and the old settings field follow the profile name.
      displayName.value = profileName.value
    }

    const handleResetProfile = () => {
      resetProfile()
      displayName.value = ''
      showToastMessage('Profile cleared.', 'info')
    }

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

    // History lives in its own bottom-nav tab now.
    const openHistoryModal = () => {
      activeView.value = 'history'
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

    // ---------- Sharing ----------
    const openShareModal = (article) => {
      if (!article?.chineseContent?.trim()) return
      shareTarget.value = article
      isShareModalOpen.value = true
    }

    const shareCurrentArticle = () => {
      if (!inputText.value.trim()) return
      flushActiveTab()

      const current = currentArticleId.value
        ? articles.value.find((item) => item.id === currentArticleId.value)
        : null
      const firstLine = splitParagraphs(inputText.value)[0] || 'Untitled article'
      openShareModal({
        ...(current || {}),
        title:
          current?.title ||
          (firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine),
        chineseContent: inputText.value,
        englishContent: englishText.value,
      })
    }

    const closeShareModal = () => {
      isShareModalOpen.value = false
    }

    const handleSaveDisplayName = (name) => {
      displayName.value = (name || '').slice(0, 40)
      profileName.value = displayName.value
    }

    // ---------- Backup / database ----------
    const datedName = (prefix) =>
      `${prefix}-${new Date().toISOString().slice(0, 10)}.json`

    const backupData = () => makeBackupBundle(articles.value, profileSnapshot())

    const applyBundleProfile = (bundle) => {
      if (bundle?.kind === 'backup' && bundle.profile) {
        applyProfile(bundle.profile)
        displayName.value = bundle.profile.name || ''
      }
    }

    watch(articles, () => scheduleBackup(backupData), { deep: true })
    // Profile changes (including a new photo) belong in automatic backups too.
    watch(profile, () => scheduleBackup(backupData), { deep: true })

    const openBackupModal = () => {
      isBackupModalOpen.value = true
    }

    const closeBackupModal = () => {
      isBackupModalOpen.value = false
    }

    const handleChooseBackup = async () => {
      const result = await chooseBackupFile(backupData)
      if (result.ok) {
        showToastMessage(`Database connected to ${result.fileName}`)
      } else if (!result.canceled) {
        showToastMessage(result.error || 'Could not set up the database.', 'error')
      }
    }

    const handleReconnectBackup = async () => {
      const result = await reconnectBackup(backupData)
      if (result.ok) showToastMessage('Database reconnected.')
      else showToastMessage(result.error || 'Could not reconnect the database.', 'error')
    }

    const handleDisableBackup = async () => {
      await disableBackup()
      showToastMessage('Database disconnected.', 'info')
    }

    const handleDownloadBackup = () => {
      downloadBackup(backupData(), datedName('little-hanzi-chinese-backup'))
      showToastMessage('Database backup downloaded.')
    }

    const importBundleText = (text, sourceName = '') => {
      const parsed = parseBundle(text)
      if (!parsed.ok) {
        showToastMessage(parsed.error, 'error')
        return false
      }

      const { added, merged } = importBundle(parsed.bundle)
      applyBundleProfile(parsed.bundle)
      if (!added && !merged) {
        showToastMessage('Nothing new to import.', 'info')
        return true
      }

      showToastMessage(
        `Imported ${added} new ${added === 1 ? 'article' : 'articles'}` +
          (merged ? `, merged ${merged}.` : '.') +
          (sourceName ? ` (${sourceName})` : '')
      )
      return true
    }

    const handleImportBackup = async () => {
      const picked = await pickImportFile()
      if (!picked.ok) {
        if (!picked.canceled) {
          showToastMessage(picked.error || 'Could not read that file.', 'error')
        }
        return
      }

      importBundleText(picked.text, picked.name)
    }

    const handleFileDrop = async (event) => {
      const file = event.dataTransfer?.files?.[0]
      if (!file) return

      if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
        showToastMessage('Drop a Little Hanzi .json file.', 'error')
        return
      }

      try {
        importBundleText(await file.text(), file.name)
        activeView.value = 'history'
      } catch (error) {
        console.error('Could not read dropped file:', error)
        showToastMessage('Could not read that file.', 'error')
      }
    }

    const handleExportShareLibrary = () => {
      const bundle = makeShareBundle(
        articles.value,
        profileName.value || displayName.value || 'A friend'
      )
      downloadJson(bundle, datedName('little-hanzi-chinese-library'))
      showToastMessage('Library bundle downloaded. Send it to a friend!')
    }

    // ---------- Incoming shares & QR scanning ----------
    const PENDING_EN_KEY = 'littleHanzi_pendingEnglish'

    const readPendingEnglish = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(PENDING_EN_KEY) || '{}')
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }

    const writePendingEnglish = (pending) => {
      try {
        if (Object.keys(pending).length) {
          localStorage.setItem(PENDING_EN_KEY, JSON.stringify(pending))
        } else {
          localStorage.removeItem(PENDING_EN_KEY)
        }
      } catch {
        // Pending translations are a convenience; ignore storage failures.
      }
    }

    const applyIncomingShare = async (shared) => {
      if (!shared) return false

      const hash = shared.contentHash
      const findChineseArticle = () =>
        articles.value.find(
          (article) => contentSignature(article.chineseContent) === hash
        )

      // ---- English half of a split share ----
      if (shared.part === 'en') {
        const target = findChineseArticle()

        if (!target) {
          const pending = readPendingEnglish()
          pending[hash] = {
            en: shared.englishContent,
            by: shared.sharedBy,
            at: shared.sharedAt,
          }
          writePendingEnglish(pending)
          showToastMessage(
            'English saved. Now scan the Chinese QR to complete the article.',
            'info'
          )
          return true
        }

        if (String(target.englishContent || '').trim()) {
          await loadArticleIntoEditor(target)
          showToastMessage(
            `${shared.sharedBy} shared a translation you already have.`,
            'info'
          )
          return true
        }

        updateArticle(target.id, {
          englishContent: shared.englishContent,
          sharedBy: target.sharedBy || shared.sharedBy,
          sharedAt: target.sharedAt || shared.sharedAt,
        })
        await loadArticleIntoEditor(target)
        showToastMessage(`English translation received from ${shared.sharedBy}.`)
        return true
      }

      // ---- Full article or Chinese half ----
      const isChineseOnly = shared.part === 'cn'
      const { added } = importBundle({
        articles: [{ ...shared, id: undefined }],
        sharedBy: shared.sharedBy,
      })

      const key = shared.chineseContent.trim()
      const target = articles.value.find(
        (article) => (article.chineseContent || '').trim() === key
      )

      // The English code may have arrived before the Chinese one.
      let mergedTranslation = false
      if (target && !String(target.englishContent || '').trim() && hash) {
        const pending = readPendingEnglish()
        const entry = pending[hash]
        if (entry?.en) {
          updateArticle(target.id, {
            englishContent: entry.en,
            sharedBy: target.sharedBy || entry.by || shared.sharedBy,
          })
          delete pending[hash]
          writePendingEnglish(pending)
          mergedTranslation = true
        }
      }

      if (target) await loadArticleIntoEditor(target)
      activeView.value = 'home'

      if (isChineseOnly) {
        showToastMessage(
          mergedTranslation
            ? `Chinese and English received from ${shared.sharedBy}.`
            : `Chinese text received from ${shared.sharedBy}. Now scan the English QR.`
        )
      } else {
        showToastMessage(
          added
            ? `Shared by ${shared.sharedBy}: article opened.`
            : `${shared.sharedBy} shared an article you already have.`
        )
      }
      return true
    }

    const handleIncomingShare = async () => {
      const shared = parseShareHash(window.location.hash)
      if (!shared) return false

      // Drop the payload from the address bar so a refresh never re-imports it.
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`
      )

      return await applyIncomingShare(shared)
    }

    const openScanner = () => {
      isScannerModalOpen.value = true
    }

    const closeScanner = () => {
      isScannerModalOpen.value = false
    }

    const handleScanDetected = async (value) => {
      isScannerModalOpen.value = false
      const parsed = parseScannedValue(value)

      if (parsed.kind === 'share') {
        await applyIncomingShare(parsed.share)
        return
      }

      if (parsed.kind === 'bundle') {
        const { added, merged } = importBundle(parsed.bundle)
        applyBundleProfile(parsed.bundle)
        if (added || merged) {
          activeView.value = 'history'
          showToastMessage(
            `Imported ${added} new article${added === 1 ? '' : 's'}` +
              (merged ? `, merged ${merged}.` : '.')
          )
        } else {
          showToastMessage('Nothing new to import.', 'info')
        }
        return
      }

      showToastMessage(
        parsed.error || 'That code is not a Little Hanzi article.',
        'error'
      )
    }

    const scrollToBookmark = (paragraphIndex) => {
      const index = Number(paragraphIndex)
      const el = document.querySelector(`[data-paragraph-index="${index}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    // ---------- Article tabs & instant autosave ----------
    const tabTitle = (tab) => {
      const source = (tab?.chinese || '').trim() || (tab?.english || '').trim()
      if (!source) return 'New article'
      const first = splitParagraphs(source)[0] || source
      const text = first.replace(/\s+/g, ' ').trim()
      return text.length > 30 ? `${text.slice(0, 30)}…` : text
    }

    const persistWorkspaceNow = () => {
      if (workspaceSaveTimer) {
        clearTimeout(workspaceSaveTimer)
        workspaceSaveTimer = null
      }
      try {
        const payload = {
          version: 1,
          activeKey: activeTabKey.value,
          tabs: workspaceTabs.value.map((tab) => {
            const hasArticle =
              tab.articleId &&
              articles.value.some((article) => article.id === tab.articleId)
            return {
              key: tab.key,
              articleId: tab.articleId || null,
              // Article-backed tabs reload from the library, so their text is
              // not duplicated in localStorage.
              chinese: hasArticle ? '' : tab.chinese,
              english: hasArticle ? '' : tab.english,
              bookmark: tab.bookmark ?? null,
              detached: Boolean(tab.detached),
            }
          }),
        }
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(payload))
      } catch (error) {
        console.error('Failed to save open tabs:', error)
      }
    }

    const scheduleWorkspaceSave = () => {
      if (workspaceSaveTimer) clearTimeout(workspaceSaveTimer)
      workspaceSaveTimer = setTimeout(() => {
        workspaceSaveTimer = null
        persistWorkspaceNow()
      }, 250)
    }

    const saveTabToArticle = (tab) => {
      if (!tab) return
      const chinese = tab.chinese || ''
      const english = tab.english || ''

      // Without Chinese text there is no article yet. Keep the tab as a draft
      // so pasting English first still lands in the same context later.
      if (!chinese.trim()) {
        if (tab.articleId) tab.articleId = null
        return
      }

      // The reader deleted this article; keep the text as a detached draft
      // until they edit it again.
      if (tab.detached) return

      const existing = tab.articleId
        ? articles.value.find((article) => article.id === tab.articleId)
        : null

      if (existing) {
        if (
          existing.chineseContent === chinese &&
          existing.englishContent === english
        ) {
          return
        }
        updateArticle(existing.id, {
          chineseContent: chinese,
          englishContent: english,
        })
        return
      }

      const article = createArticle(chinese, english)
      if (article) {
        tab.articleId = article.id
        tab.bookmark = article.bookmark ?? null
      }
    }

    const flushActiveTab = () => {
      const tab = activeTab.value
      if (!tab) {
        persistWorkspaceNow()
        return
      }
      tab.chinese = inputText.value
      tab.english = englishText.value
      if (articleSaveTimer) {
        clearTimeout(articleSaveTimer)
        articleSaveTimer = null
      }
      saveTabToArticle(tab)
      persistWorkspaceNow()
    }

    const scheduleArticleSave = () => {
      if (articleSaveTimer) clearTimeout(articleSaveTimer)
      articleSaveTimer = setTimeout(() => {
        articleSaveTimer = null
        const tab = activeTab.value
        if (!tab) return
        tab.chinese = inputText.value
        tab.english = englishText.value
        saveTabToArticle(tab)
        persistWorkspaceNow()
      }, ARTICLE_SAVE_DELAY)
    }

    const applyTabToEditor = (tab, { scroll = true } = {}) => {
      if (!tab) return
      const bookmark =
        tab.bookmark === null || tab.bookmark === undefined
          ? null
          : Number(tab.bookmark)

      inputText.value = tab.chinese || ''
      englishText.value = tab.english || ''
      currentBookmark.value = Number.isFinite(bookmark) ? bookmark : null
      pendingBookmark.value = null
      focusedParagraph.value = null
      closeParagraphMenu()
      resumeArticle.value = null
      setCurrentArticle(tab.articleId || null)
      if (tab.articleId) markArticleRead(tab.articleId)
      activeView.value = 'home'

      if (scroll && currentBookmark.value !== null) {
        if (comparisonData.value[currentBookmark.value]) {
          nextTick(() => scrollToBookmark(currentBookmark.value))
        } else {
          pendingBookmark.value = currentBookmark.value
        }
      }
    }

    const activateTab = (tab) => {
      if (!tab) return
      if (tab.key === activeTabKey.value) {
        activeView.value = 'home'
        return
      }
      flushActiveTab()
      activeTabKey.value = tab.key
      applyTabToEditor(tab)
      persistWorkspaceNow()
    }

    const openNewTab = () => {
      flushActiveTab()
      const tab = makeTab()
      workspaceTabs.value.push(tab)
      activeTabKey.value = tab.key
      applyTabToEditor(tab, { scroll: false })
      persistWorkspaceNow()
      nextTick(() => chineseTextareaRef.value?.focus())
    }

    const closeTab = (key) => {
      const index = workspaceTabs.value.findIndex((tab) => tab.key === key)
      if (index < 0) return

      const wasActive = activeTabKey.value === key
      if (wasActive) flushActiveTab()

      workspaceTabs.value.splice(index, 1)
      if (!workspaceTabs.value.length) workspaceTabs.value.push(makeTab())

      if (wasActive) {
        const next =
          workspaceTabs.value[
            Math.min(index, workspaceTabs.value.length - 1)
          ]
        activeTabKey.value = next.key
        applyTabToEditor(next)
      }
      persistWorkspaceNow()
    }

    // Keep the active tab and the article it points at in sync while typing.
    watch([inputText, englishText], () => {
      const tab = activeTab.value
      if (!tab) return
      if (tab.chinese === inputText.value && tab.english === englishText.value) {
        return
      }
      tab.chinese = inputText.value
      tab.english = englishText.value
      tab.detached = false
      resumeArticle.value = null
      scheduleArticleSave()
      scheduleWorkspaceSave()
    })

    // Leaving the editor is a save point, just like switching VS Code tabs.
    watch(activeView, (view) => {
      if (view !== 'home') flushActiveTab()
    })

    const loadArticleIntoEditor = async (article) => {
      if (!article) return
      const articleId = article.id
      const previous = activeTab.value

      // A share may update the article that is already open. Push the fresh
      // text into the editor before flushing so the update is not overwritten.
      if (previous && previous.articleId === articleId) {
        previous.chinese = article.chineseContent || ''
        previous.english = article.englishContent || ''
        previous.detached = false
        previous.bookmark =
          article.bookmark === null || article.bookmark === undefined
            ? null
            : Number(article.bookmark)
        inputText.value = previous.chinese
        englishText.value = previous.english
      }

      flushActiveTab()

      let tab = workspaceTabs.value.find((item) => item.articleId === articleId)
      if (!tab) {
        tab = makeTab({
          articleId,
          chinese: article.chineseContent || '',
          english: article.englishContent || '',
          bookmark:
            article.bookmark === null || article.bookmark === undefined
              ? null
              : Number(article.bookmark),
        })
        workspaceTabs.value.push(tab)
      } else {
        tab.chinese = article.chineseContent || ''
        tab.english = article.englishContent || ''
        tab.detached = false
        tab.bookmark =
          article.bookmark === null || article.bookmark === undefined
            ? null
            : Number(article.bookmark)
      }

      activeTabKey.value = tab.key
      applyTabToEditor(tab)
      persistWorkspaceNow()
    }

    const restoreWorkspace = () => {
      let parsed = null
      try {
        parsed = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null')
      } catch (error) {
        console.error('Failed to restore open tabs:', error)
      }

      let tabs = []
      if (parsed && Array.isArray(parsed.tabs)) {
        tabs = parsed.tabs
          .filter((raw) => raw && typeof raw === 'object')
          .map((raw) => {
            const article = raw.articleId
              ? articles.value.find((item) => item.id === raw.articleId)
              : null
            return makeTab({
              key:
                typeof raw.key === 'string' && raw.key ? raw.key : undefined,
              articleId: article?.id || raw.articleId || null,
              chinese: article
                ? article.chineseContent || ''
                : raw.chinese || '',
              english: article
                ? article.englishContent || ''
                : raw.english || '',
              bookmark: article
                ? article.bookmark ?? null
                : raw.bookmark ?? null,
              detached: Boolean(raw.detached),
            })
          })
      }

      if (!tabs.length) tabs = [makeTab()]

      workspaceTabs.value = tabs
      const requestedKey = parsed?.activeKey
      const activeKey = tabs.some((tab) => tab.key === requestedKey)
        ? requestedKey
        : tabs[0].key
      activeTabKey.value = activeKey
      applyTabToEditor(tabs.find((tab) => tab.key === activeKey), {
        scroll: false,
      })
      persistWorkspaceNow()
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

      // Keep any open tab readable by turning it into a draft.
      workspaceTabs.value.forEach((tab) => {
        if (tab.articleId === articleId) {
          tab.articleId = null
          tab.bookmark = null
          tab.detached = true
        }
      })

      if (wasCurrent) {
        currentBookmark.value = null
        pendingBookmark.value = null
        focusedParagraph.value = null
        closeParagraphMenu()
      }
      persistWorkspaceNow()
    }

    const handleDeleteAllArticles = () => {
      deleteAllArticles()
      workspaceTabs.value.forEach((tab) => {
        tab.articleId = null
        tab.bookmark = null
        tab.detached = true
      })
      currentBookmark.value = null
      pendingBookmark.value = null
      focusedParagraph.value = null
      closeParagraphMenu()
      persistWorkspaceNow()
    }

    const handleToggleArchive = (articleId) => {
      const archived = toggleArchived(articleId)
      showToastMessage(
        archived ? '🗄️ Article archived' : 'Article restored from archive',
        'info'
      )
    }

    // ---------- Bookmark toggle ----------
    const ensureArticleForActiveTab = () => {
      if (currentArticleId.value) return true
      const tab = activeTab.value
      if (tab) saveTabToArticle(tab)
      return Boolean(currentArticleId.value)
    }

    const toggleBookmark = (paragraphIndex) => {
      const index = Number(paragraphIndex)
      if (!ensureArticleForActiveTab()) return
      if (!currentArticleId.value) return

      const nextBookmark = currentBookmark.value === index ? null : index
      currentBookmark.value = nextBookmark
      setBookmark(currentArticleId.value, nextBookmark)
      if (activeTab.value) {
        activeTab.value.bookmark = nextBookmark
        scheduleWorkspaceSave()
      }
    }

    // ---------- Paragraph likes ----------
    const isLikedParagraph = (paragraphIndex) => {
      if (!currentArticleId.value) return false
      return isParagraphLiked(currentArticleId.value, paragraphIndex)
    }

    const toggleLike = (paragraphIndex) => {
      if (!ensureArticleForActiveTab()) return
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

    // Settings object shared with the Profile tabs
    const settings = computed(() => ({
      fontSize: Number(fontSize.value),
      selectedFont: selectedFont.value,
      showPinyin: showPinyin.value,
      showEnglish: showEnglish.value,
      showChinese: showChinese.value,
      displayOrder: displayOrder.value,
      interleaveLines: interleaveLines.value,
      pinyinFontSize: Number(pinyinFontSize.value),
      englishFontSize: Number(englishFontSize.value),
      displayName: displayName.value
    }))

    // Update container width on resize
    const updateContainerWidth = () => {
      const container = document.querySelector('.comparison-display')
      if (container) {
        containerWidth.value = container.clientWidth - 32 // Subtract padding
      }
    }

    // Create the hidden element used to measure wrapped line widths.
    const createMeasureDiv = (width, fontSz, fontFamily) => {
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
      return measureDiv
    }

    // Split text into lines based on container width
    const splitTextIntoLines = (text, width, fontSz, fontFamily, isChinese = true) => {
      if (!text || !width || width <= 0) return [text]

      const measureDiv = createMeasureDiv(width, fontSz, fontFamily)
      const oneLineHeight = Math.ceil(fontSz * 1.7)

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

        // Check if adding this character exceeds one line.
        if (measureDiv.scrollHeight > oneLineHeight) {
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

    // Split Chinese character/pinyin pairs into lines while keeping each pair
    // together, so pinyin stays beside its character and can use its own size.
    const splitPairsIntoLines = (pairs, width, fontSz, fontFamily) => {
      if (!pairs?.length) return []
      if (!width || width <= 0) return [pairs]

      const measureDiv = createMeasureDiv(width, fontSz, fontFamily)
      const oneLineHeight = Math.ceil(fontSz * 1.7)

      const lines = []
      let current = []
      let currentText = ''

      for (const pair of pairs) {
        const token = `${pair[0]}${pair[1] || ''}`
        const testLine = currentText + token
        measureDiv.textContent = testLine

        if (measureDiv.scrollHeight > oneLineHeight && current.length) {
          lines.push(current)
          current = [pair]
          currentText = token
        } else {
          current.push(pair)
          currentText = testLine
        }
      }

      if (current.length) lines.push(current)

      document.body.removeChild(measureDiv)
      return lines
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
        
        // Split into lines based on container width
        let chineseLines = []
        let englishLines = []
        
        if (showChinese.value && chinesePara) {
          chineseLines = splitPairsIntoLines(
            getPinyinAndChar(chinesePara),
            containerWidth.value,
            fontSize.value,
            getFontFamily.value
          )
        }
        
        if (showEnglish.value && englishPara) {
          englishLines = splitTextIntoLines(
            englishPara,
            containerWidth.value,
            englishFontSize.value,
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
                pairs: chineseLines[lineIndex]
              })
            }
          }
        } else {
          // Chinese first
          for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
            if (lineIndex < chineseLines.length && showChinese.value) {
              interleaved.push({
                type: 'chinese',
                pairs: chineseLines[lineIndex]
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

    const saveSettings = (newSettings) => {
      if (!newSettings) return

      const nextSize = Math.min(
        32,
        Math.max(12, Number(newSettings.fontSize) || fontSize.value)
      )

      fontSize.value = nextSize
      selectedFont.value = newSettings.selectedFont || selectedFont.value
      showPinyin.value = Boolean(newSettings.showPinyin)
      showEnglish.value = Boolean(newSettings.showEnglish)
      showChinese.value = Boolean(newSettings.showChinese)
      displayOrder.value =
        newSettings.displayOrder === 'cn-en' ? 'cn-en' : 'en-cn'
      interleaveLines.value = Boolean(newSettings.interleaveLines)
      pinyinFontSize.value = Math.min(
        nextSize,
        Math.max(4, Number(newSettings.pinyinFontSize) || pinyinFontSize.value)
      )
      englishFontSize.value = Math.min(
        nextSize,
        Math.max(4, Number(newSettings.englishFontSize) || englishFontSize.value)
      )

      // Persist right away; closing the app must never lose a toggle.
      saveCurrentSettings()
      nextTick(() => updateContainerWidth())
    }

    const resetToDefaults = () => {
      resetSettings()
      saveCurrentSettings()
      nextTick(() => updateContainerWidth())
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

    // Clearing Chinese detaches the tab from its saved article so the article
    // in History is never blanked. English-only text stays as a draft.
    const clearText = (type = 'both') => {
      if (type === 'chinese' || type === 'both') {
        inputText.value = '';
      }
      
      if (type === 'english' || type === 'both') {
        englishText.value = '';
      }

      const tab = activeTab.value
      if (tab) {
        tab.chinese = inputText.value
        tab.english = englishText.value
        if (type === 'both' || type === 'chinese') {
          tab.articleId = null
          tab.bookmark = null
          tab.detached = true
          setCurrentArticle(null)
        }
        scheduleWorkspaceSave()
      }

      if (type === 'both' || type === 'chinese') {
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
    watch([interleaveLines, inputText, englishText, fontSize, pinyinFontSize, englishFontSize, showPinyin], () => {
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushActiveTab()
    }

    onMounted(async () => {
      restoreWorkspace()

      const openedShare = await handleIncomingShare()
      if (!openedShare) resumeArticle.value = getResumeArticle()

      // Restore a previously connected database file in the background.
      initBackup()

      document.addEventListener('click', handleDocumentClick)
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('hashchange', handleIncomingShare)
      window.addEventListener('beforeunload', flushActiveTab)
    })

    onBeforeUnmount(() => {
      flushActiveTab()
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('hashchange', handleIncomingShare)
      window.removeEventListener('beforeunload', flushActiveTab)
      if (toastTimeout) clearTimeout(toastTimeout)
    })

    return {
      articles,
      activeView,
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

      // Profile
      profile,
      updateProfile,
      handleResetProfile,

      // Sharing
      isShareModalOpen,
      shareTarget,
      openShareModal,
      shareCurrentArticle,
      closeShareModal,
      handleSaveDisplayName,

      // Backup / database
      isBackupModalOpen,
      openBackupModal,
      closeBackupModal,
      handleChooseBackup,
      handleReconnectBackup,
      handleDisableBackup,
      handleDownloadBackup,
      handleImportBackup,
      handleExportShareLibrary,
      handleFileDrop,
      backupSupported,
      backupFileName,
      backupStatus,
      backupLastSaved,

      // QR scanning
      isScannerModalOpen,
      openScanner,
      closeScanner,
      handleScanDetected,

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
      pinyinFontSize,
      englishFontSize,

      // Open article tabs
      workspaceTabs,
      activeTabKey,
      activateTab,
      closeTab,
      openNewTab,
      tabTitle,

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
      Plus,
      X,
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

      // Settings live in the Profile tab now.
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
  padding-bottom: 92px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.home-view,
.history-view,
.profile-view {
  width: 100%;
}

.history-view {
  padding-top: 8px;
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

.interleaved-chinese {
  display: inline;
}

.interleaved-pair {
  display: inline;
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

.new-tab-btn {
  background: #eef1ff;
  border: 1px solid #d8defb;
  color: #4a6cf7;
  cursor: pointer;
  padding: 7px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.new-tab-btn:hover {
  background: #e0e6ff;
  transform: scale(1.05);
}

/* Open article tabs */
.workspace-tabs {
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e9ecef;
  padding: 6px 16px 0;
  backdrop-filter: blur(10px);
}

.workspace-tabs-scroll {
  display: flex;
  gap: 5px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-x: auto;
  scrollbar-width: none;
}

.workspace-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.workspace-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 240px;
  padding: 8px 8px 8px 12px;
  border: 1px solid #e9ecef;
  border-bottom: none;
  border-radius: 9px 9px 0 0;
  background: #f8f9fa;
  color: #64748b;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.16s, color 0.16s;
}

.workspace-tab:hover {
  background: #eef1ff;
  color: #334155;
}

.workspace-tab.active {
  background: white;
  border-color: #d8defb;
  color: #4a6cf7;
  box-shadow: 0 -2px 0 #4a6cf7 inset;
}

.workspace-tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 190px;
}

.workspace-tab-close {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  flex-shrink: 0;
}

.workspace-tab-close:hover {
  background: #e2e8f0;
  color: #475569;
}


.share-icon-btn,
.scan-icon-btn {
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

.share-icon-btn:hover,
.scan-icon-btn:hover {
  background: #f8f9fa;
  transform: scale(1.05);
}

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

.info-icon-btn:hover {
  background: #f8f9fa;
  transform: scale(1.05);
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
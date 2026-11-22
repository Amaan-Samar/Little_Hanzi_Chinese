<template>
  <Teleport to="body" :disabled="embedded">
    <div
      v-if="embedded || isOpen"
      class="history-modal-overlay"
      :class="{ embedded }"
      @click="handleOverlayClick"
    >
      <div class="history-modal" :class="{ mobile: isMobile, embedded }" @click.stop>
        <button v-if="!embedded" class="close-btn" @click="close" title="Close">
          <X :size="18" />
        </button>

        <!-- Tabs: only categories that actually contain articles. -->
        <div v-if="tabs.length" class="history-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="history-tab"
            :class="{ 'is-active': effectiveTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="14" />
            <span>{{ tab.label }}</span>
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Body -->
        <div class="history-modal-body">
          <!-- Empty states -->
          <div v-if="visibleArticles.length === 0" class="empty-history">
            <component :is="activeTabConfig.emptyIcon" :size="42" class="empty-icon" />
            <p class="empty-title">{{ activeTabConfig.emptyTitle }}</p>
            <p class="empty-subtitle">{{ activeTabConfig.emptyDetail }}</p>
          </div>

          <div v-else class="articles-list">
            <div class="list-header">
              <span>
                {{ visibleArticles.length }}
                {{ visibleArticles.length === 1 ? 'article' : 'articles' }}
                <span class="list-meta">
                  · {{ readCount }} read · {{ unreadCount }} unread
                </span>
              </span>
              <button
                v-if="articles.length > 0"
                @click="confirmDeleteAll"
                class="delete-all-btn"
              >
                <Trash2 :size="14" />
                Delete All
              </button>
            </div>

            <div class="articles-container">
              <div
                v-for="article in visibleArticles"
                :key="article.id"
                class="article-item"
                :class="{ current: isCurrentArticle(article.id) }"
              >
                <div class="article-content" @click="selectArticle(article)">
                  <div class="article-header">
                    <h3 class="article-title">
                      <span
                        v-if="!article.read"
                        class="unread-dot"
                        aria-label="Unread"
                      ></span>
                      {{ article.title }}
                    </h3>
                    <span class="article-date">{{ formatDate(article.timestamp) }}</span>
                  </div>

                  <p class="article-preview cn-preview">
                    <span class="preview-label">CN</span>
                    {{ truncateText(article.chineseContent, 72) }}
                  </p>
                  <p class="article-preview en-preview">
                    <span class="preview-label">EN</span>
                    {{ truncateText(article.englishContent, 90) }}
                  </p>

                  <div class="badges">
                    <span v-if="!article.read" class="badge badge-unread">Unread</span>
                    <span
                      v-if="getLikeCount(article) > 0"
                      class="badge badge-like"
                      :title="`${getLikeCount(article)} liked paragraph${getLikeCount(article) === 1 ? '' : 's'}`"
                    >
                      <Heart :size="10" fill="currentColor" />
                      {{ getLikeCount(article) }}
                    </span>
                    <span v-if="article.sharedBy" class="badge badge-shared">
                      <Share2 :size="10" />
                      Shared by {{ article.sharedBy }}
                    </span>
                    <span v-if="article.archived" class="badge badge-muted">
                      <Archive :size="10" />
                      Archived
                    </span>
                    <span v-if="hasBookmark(article)" class="badge badge-bookmark">
                      <Bookmark :size="10" fill="currentColor" />
                      Continue at paragraph {{ article.bookmark + 1 }}
                    </span>
                    <span
                      v-if="needsTruncation(article.chineseContent, 72) || needsTruncation(article.englishContent, 90)"
                      class="read-more"
                    >
                      Read more →
                    </span>
                  </div>
                </div>

                <div class="article-actions">
                  <button
                    @click.stop="$emit('share-article', article)"
                    class="card-action"
                    title="Share article"
                  >
                    <Share2 :size="15" />
                  </button>
                  <button
                    @click.stop="$emit('toggle-archive', article.id)"
                    class="card-action"
                    :title="article.archived ? 'Unarchive article' : 'Archive article'"
                  >
                    <ArchiveRestore v-if="article.archived" :size="15" />
                    <Archive v-else :size="15" />
                  </button>
                  <button
                    @click.stop="confirmDeleteArticle(article.id)"
                    class="card-action card-action-danger"
                    title="Delete article"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="history-modal-footer">
          <div class="footer-links">
            <button class="backup-link" @click="$emit('import-file')">
              <FileUp :size="14" />
              Open shared file
            </button>
            <button class="backup-link" @click="$emit('open-backup')">
              <Database :size="14" />
              Database
            </button>
          </div>
          <button v-if="!embedded" class="close-btn-bottom" @click="close">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Delete -->
    <ConfirmModal
      :isOpen="showConfirmModal"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :confirmText="confirmModalConfirmText"
      cancelText="Cancel"
      @confirm="handleConfirmDelete"
      @cancel="cancelDelete"
    />
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  X,
  BookOpen,
  BookMarked,
  Bookmark,
  Library,
  Trash2,
  Heart,
  Share2,
  Archive,
  ArchiveRestore,
  CircleDot,
  Database,
  FileUp
} from 'lucide-vue-next'
import ConfirmModal from './ConfirmModal.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  embedded: {
    type: Boolean,
    default: false
  },
  articles: {
    type: Array,
    default: () => []
  },
  isCurrentArticle: {
    type: Function,
    default: () => false
  },
  formatDate: {
    type: Function,
    default: () => ''
  },
  getLikeCount: {
    type: Function,
    default: () => 0
  }
})

const emit = defineEmits([
  'close',
  'load-article',
  'delete-article',
  'delete-all',
  'share-article',
  'toggle-archive',
  'open-backup',
  'import-file'
])

const activeTab = ref('reading') // reading | unread | liked | all | archived
const isMobile = ref(false)
const showConfirmModal = ref(false)
const pendingDeleteId = ref(null)
const pendingDeleteAll = ref(false)

const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')

const hasBookmark = (article) =>
  article.bookmark !== null && article.bookmark !== undefined

const unfinishedArticles = computed(() =>
  props.articles.filter((article) => hasBookmark(article) && !article.archived)
)

const unreadArticles = computed(() =>
  props.articles.filter((article) => !article.read && !article.archived)
)

const likedArticles = computed(() =>
  props.articles
    .filter((article) => props.getLikeCount(article) > 0 && !article.archived)
    .sort(
      (a, b) =>
        props.getLikeCount(b) - props.getLikeCount(a) ||
        b.timestamp - a.timestamp
    )
)

const sharedArticles = computed(() =>
  props.articles
    .filter((article) => article.sharedBy && !article.archived)
    .sort(
      (a, b) =>
        (b.sharedAt || b.timestamp) - (a.sharedAt || a.timestamp)
    )
)

const allArticles = computed(() =>
  [...props.articles]
    .filter((article) => !article.archived)
    .sort((a, b) => b.timestamp - a.timestamp)
)

const archivedArticles = computed(() =>
  [...props.articles]
    .filter((article) => article.archived)
    .sort((a, b) => b.timestamp - a.timestamp)
)

const readCount = computed(
  () => props.articles.filter((article) => article.read && !article.archived).length
)
const unreadCount = computed(() => unreadArticles.value.length)

const allTabs = computed(() => [
  {
    id: 'reading',
    label: 'Reading',
    icon: BookMarked,
    count: unfinishedArticles.value.length
  },
  {
    id: 'unread',
    label: 'Unread',
    icon: CircleDot,
    count: unreadArticles.value.length
  },
  {
    id: 'liked',
    label: 'Liked',
    icon: Heart,
    count: likedArticles.value.length
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: Share2,
    count: sharedArticles.value.length
  },
  {
    id: 'all',
    label: 'All',
    icon: Library,
    count: allArticles.value.length
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: Archive,
    count: archivedArticles.value.length
  }
])

// A tab with zero articles is noise, so only render the categories that
// actually have something inside them.
const tabs = computed(() => allTabs.value.filter((tab) => tab.count > 0))

// Keep a valid selection when the tab the reader was on disappears after a
// delete, archive, or import.
const effectiveTab = computed(() => {
  if (tabs.value.some((tab) => tab.id === activeTab.value)) {
    return activeTab.value
  }
  return tabs.value[0]?.id || 'all'
})

const activeTabConfig = computed(() => {
  switch (effectiveTab.value) {
    case 'reading':
      return {
        emptyIcon: BookMarked,
        emptyTitle: 'No unfinished reads',
        emptyDetail: 'Bookmark a paragraph while reading and it will wait for you here.'
      }
    case 'unread':
      return {
        emptyIcon: CircleDot,
        emptyTitle: 'Nothing unread',
        emptyDetail: 'Articles you have not opened yet appear here.'
      }
    case 'liked':
      return {
        emptyIcon: Heart,
        emptyTitle: 'No liked paragraphs yet',
        emptyDetail: 'Tap the heart on any paragraph you enjoy; articles are ranked by likes.'
      }
    case 'shared':
      return {
        emptyIcon: Share2,
        emptyTitle: 'No shared articles',
        emptyDetail: 'Articles a friend sends you appear here with their name.'
      }
    case 'archived':
      return {
        emptyIcon: Archive,
        emptyTitle: 'No archived articles',
        emptyDetail: 'Archive articles to keep your main reading list tidy.'
      }
    default:
      return {
        emptyIcon: BookOpen,
        emptyTitle: 'No saved articles yet',
        emptyDetail: 'Articles you save or read for a while will appear here.'
      }
  }
})

const visibleArticles = computed(() => {
  switch (effectiveTab.value) {
    case 'reading':
      return unfinishedArticles.value
    case 'unread':
      return unreadArticles.value
    case 'liked':
      return likedArticles.value
    case 'shared':
      return sharedArticles.value
    case 'archived':
      return archivedArticles.value
    default:
      return allArticles.value
  }
})

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleOverlayClick = () => {
  close()
}

const close = () => {
  emit('close')
}

const truncateText = (text, maxLength) => {
  if (!text) return 'No content available'
  const cleaned = text.replace(/\n/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}

const needsTruncation = (text, maxLength) => {
  if (!text) return false
  const cleaned = text.replace(/\n/g, ' ').trim()
  return cleaned.length > maxLength
}

const selectArticle = (article) => {
  emit('load-article', article)
  close()
}

const confirmDeleteArticle = (articleId) => {
  pendingDeleteId.value = articleId
  pendingDeleteAll.value = false
  confirmModalTitle.value = 'Delete Article'
  confirmModalMessage.value =
    'Are you sure you want to delete this article from your history?'
  confirmModalConfirmText.value = 'Yes, Delete'
  showConfirmModal.value = true
}

const confirmDeleteAll = () => {
  pendingDeleteAll.value = true
  pendingDeleteId.value = null
  confirmModalTitle.value = 'Delete All Articles'
  confirmModalMessage.value =
    'Are you sure you want to delete ALL articles from your history? This action cannot be undone.'
  confirmModalConfirmText.value = 'Yes, Delete All'
  showConfirmModal.value = true
}

const handleConfirmDelete = () => {
  if (pendingDeleteAll.value) {
    emit('delete-all')
  } else if (pendingDeleteId.value) {
    emit('delete-article', pendingDeleteId.value)
  }
  showConfirmModal.value = false
  pendingDeleteId.value = null
  pendingDeleteAll.value = false
}

const cancelDelete = () => {
  showConfirmModal.value = false
  pendingDeleteId.value = null
  pendingDeleteAll.value = false
}

const handleEscape = (e) => {
  if (e.key === 'Escape' && props.isOpen && !showConfirmModal.value) {
    close()
  }
}

// Choose a tab that exists whenever the visible category set changes.
watch(
  tabs,
  (list) => {
    if (list.length && !list.some((tab) => tab.id === activeTab.value)) {
      activeTab.value = list[0].id
    }
  },
  { immediate: true }
)

// Unfinished reads are the default tab every time the history opens, falling
// back to whichever category actually has articles.
watch(
  () => props.isOpen,
  (open) => {
    if (open) activeTab.value = tabs.value[0]?.id || 'all'
  }
)

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.history-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.history-modal {
  position: relative;
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 700px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid #e9ecef;
}

.history-modal.mobile {
  width: 95%;
  max-height: 90vh;
  border-radius: 16px;
}

@keyframes slideUp {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
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

.close-btn:hover {
  transform: scale(1.08);
  background: #f8f9fa;
  color: #495057;
}

/* Tabs */
.history-tabs {
  display: flex;
  gap: 6px;
  padding: 16px 18px 10px;
  border-bottom: 1px solid #e9ecef;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.history-tabs::-webkit-scrollbar {
  display: none;
}

.history-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #868e96;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.history-tab:hover {
  background: #f8f9fa;
  color: #495057;
}

.history-tab.is-active {
  background: #eef1ff;
  border-color: #d8defb;
  color: #4a6cf7;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: inherit;
  font-size: 10px;
  font-weight: 700;
}

.history-tab.is-active .tab-count {
  background: rgba(74, 108, 247, 0.16);
}

/* Body */
.history-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 10px;
  scrollbar-width: thin;
}

.history-modal-body::-webkit-scrollbar {
  width: 5px;
}

.history-modal-body::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.22);
  border-radius: 20px;
}

/* Empty state */
.empty-history {
  text-align: center;
  padding: 52px 18px;
  color: #868e96;
}

.empty-icon {
  margin: 0 auto;
  color: #b9c5fb;
}

.empty-title {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.empty-subtitle {
  margin: 4px auto 0;
  max-width: 340px;
  font-size: 12px;
  line-height: 1.5;
  color: #adb5bd;
}

/* List */
.articles-list {
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 2px 10px;
  border-bottom: 1px solid #e9ecef;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #adb5bd;
}

.list-meta {
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  color: #adb5bd;
}

.delete-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #adb5bd;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  flex-shrink: 0;
}

.delete-all-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.articles-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0 4px;
}

.article-item {
  display: flex;
  align-items: stretch;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.article-item:hover {
  border-color: #b9c5fb;
  box-shadow: 0 6px 16px rgba(74, 108, 247, 0.08);
}

.article-item.current {
  border-color: #4a6cf7;
  background: #f8f9ff;
  box-shadow: 0 0 0 1px rgba(74, 108, 247, 0.25);
}

.article-content {
  flex: 1;
  min-width: 0;
  padding: 14px 14px 12px;
  cursor: pointer;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 7px;
}

.article-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.35;
  word-break: break-word;
}

.unread-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: #4a6cf7;
  vertical-align: middle;
}

.article-date {
  flex-shrink: 0;
  font-size: 10px;
  color: #adb5bd;
  white-space: nowrap;
  padding-top: 2px;
}

.article-preview {
  margin: 0 0 3px;
  font-size: 12px;
  line-height: 1.45;
  color: #6c757d;
  word-break: break-word;
}

.en-preview {
  color: #868e96;
}

.preview-label {
  display: inline-block;
  margin-right: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: #4a6cf7;
}

.en-preview .preview-label {
  color: #adb5bd;
}

/* Badges */
.badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-unread,
.badge-bookmark {
  color: #4a6cf7;
  background: #eef1ff;
  border-color: #d8defb;
}

.badge-like {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}

.badge-muted {
  color: #868e96;
  background: #f8f9fa;
  border-color: #e9ecef;
}

.badge-shared {
  color: #7c3aed;
  background: #f5f3ff;
  border-color: #ddd6fe;
}

.read-more {
  font-size: 10px;
  font-weight: 600;
  color: #4a6cf7;
}

/* Actions */
.article-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
}

.card-action {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: white;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s;
}

.card-action:hover {
  background: #f8f9fa;
  border-color: #e9ecef;
  color: #4a6cf7;
}

.card-action-danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

/* Footer */
.history-modal-footer {
  padding: 12px 18px 16px;
  border-top: 1px solid #f1f3f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.backup-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
}

.backup-link:hover {
  background: #f8f9fa;
  color: #4a6cf7;
}

/* History tab presentation: no overlay, fills the page instead. */
.history-modal-overlay.embedded {
  position: static;
  display: block;
  min-height: 100%;
  padding: 12px 12px 120px;
  background: transparent;
  backdrop-filter: none;
  animation: none;
}

.history-modal.embedded {
  width: 100%;
  max-width: 920px;
  max-height: none;
  margin: 0 auto;
  border-radius: 18px;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.08);
}

.history-modal.embedded .history-modal-body {
  overflow: visible;
  max-height: none;
}

.close-btn-bottom {
  padding: 9px 22px;
  background: #4a6cf7;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn-bottom:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 108, 247, 0.3);
}

@media (max-width: 768px) {
  .history-tabs {
    padding: 14px 14px 8px;
  }

  .history-modal-body {
    padding: 14px 14px 8px;
  }

  .article-content {
    padding: 12px 12px 10px;
  }

  .article-actions {
    flex-direction: column;
    justify-content: center;
    padding: 0 8px;
  }

  .article-title {
    font-size: 13px;
  }

  .article-preview {
    font-size: 11.5px;
  }

  .close-btn {
    top: 8px;
    right: 8px;
  }

  .history-modal-footer {
    padding: 10px 14px 14px;
  }
}
</style>

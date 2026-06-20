<template>
  <Teleport to="body">
    <div v-if="isOpen" class="history-modal-overlay" @click="handleOverlayClick">
      <div class="history-modal" :class="{ 'mobile': isMobile }" @click.stop>
        <div class="history-modal-header">
          <h2>Reading History</h2>
          <button class="close-btn" @click="close">
            <X :size="24" />
          </button>
        </div>

        <div class="history-modal-body">
          <div v-if="articles.length === 0" class="empty-history">
            <BookOpen :size="48" />
            <p>No saved articles yet</p>
            <p class="empty-subtitle">Articles you read for 3+ minutes will appear here</p>
          </div>

          <div v-else class="articles-list">
            <div class="list-header">
              <span>{{ articles.length }} article{{ articles.length === 1 ? '' : 's' }}</span>
              <button v-if="articles.length > 0" @click="confirmDeleteAll" class="delete-all-btn">
                <Trash2 :size="16" />
                Delete All
              </button>
            </div>

            <div class="articles-container">
              <div
                v-for="article in articles"
                :key="article.id"
                class="article-item"
                :class="{ 'current': isCurrentArticle(article.id) }"
              >
                <div class="article-content" @click="selectArticle(article)">
                  <div class="article-header">
                    <h3 class="article-title">{{ article.title }}</h3>
                    <span class="article-date">{{ formatDate(article.timestamp) }}</span>
                  </div>
                  <div class="article-preview">
                    {{ getPreview(article.chineseContent) }}
                  </div>
                </div>
                <div class="article-actions">
                  <button 
                    @click="confirmDeleteArticle(article.id)" 
                    class="delete-btn"
                    title="Delete article"
                  >
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="history-modal-footer">
          <button class="close-btn-bottom" @click="close">
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { X, BookOpen, Trash2 } from 'lucide-vue-next'
import ConfirmModal from './ConfirmModal.vue'

const props = defineProps({
  isOpen: {
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
  }
})

const emit = defineEmits(['close', 'load-article', 'delete-article', 'delete-all'])

const isMobile = ref(false)
const showConfirmModal = ref(false)
const pendingDeleteId = ref(null)
const pendingDeleteAll = ref(false)

const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmText = ref('')

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleOverlayClick = () => {
  close()
}

const close = () => {
  emit('close')
}

const getPreview = (content) => {
  if (!content) return ''
  // Get first 100 characters, remove newlines
  const preview = content.replace(/\n/g, ' ').substring(0, 100)
  return preview + (preview.length >= 100 ? '...' : '')
}

const selectArticle = (article) => {
  emit('load-article', article)
  close()
}

const confirmDeleteArticle = (articleId) => {
  pendingDeleteId.value = articleId
  pendingDeleteAll.value = false
  confirmModalTitle.value = 'Delete Article'
  confirmModalMessage.value = 'Are you sure you want to delete this article from your history?'
  confirmModalConfirmText.value = 'Yes, Delete'
  showConfirmModal.value = true
}

const confirmDeleteAll = () => {
  pendingDeleteAll.value = true
  pendingDeleteId.value = null
  confirmModalTitle.value = 'Delete All Articles'
  confirmModalMessage.value = 'Are you sure you want to delete ALL articles from your history? This action cannot be undone.'
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
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
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.history-modal.mobile {
  width: 95%;
  max-height: 90vh;
  border-radius: 20px;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.history-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.history-modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #868e96;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #2c3e50;
}

.history-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.empty-history {
  text-align: center;
  padding: 60px 20px;
  color: #868e96;
}

.empty-history p {
  margin-top: 16px;
  font-size: 16px;
}

.empty-subtitle {
  font-size: 14px !important;
  color: #adb5bd;
}

.articles-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  padding: 16px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 10;
}

.delete-all-btn {
  padding: 6px 12px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.delete-all-btn:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

.articles-container {
  padding: 8px 0;
}

.article-item {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #e9ecef;
  transition: all 0.2s;
}

.article-item:hover {
  background: #f8f9fa;
}

.article-item.current {
  background: #e8f0fe;
  border-left: 3px solid #4a6cf7;
}

.article-content {
  flex: 1;
  padding: 16px 20px;
  cursor: pointer;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.article-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  word-break: break-word;
}

.article-date {
  font-size: 12px;
  color: #868e96;
  white-space: nowrap;
}

.article-preview {
  font-size: 13px;
  color: #6c757d;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-actions {
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #adb5bd;
}

.delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.history-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
}

.close-btn-bottom {
  padding: 10px 24px;
  background: #4a6cf7;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn-bottom:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 108, 247, 0.3);
}

@media (max-width: 768px) {
  .history-modal-header {
    padding: 16px 20px;
  }
  
  .list-header {
    padding: 12px 16px;
  }
  
  .article-content {
    padding: 12px 16px;
  }
  
  .article-actions {
    padding: 0 12px;
  }
  
  .article-title {
    font-size: 15px;
  }
  
  .article-preview {
    font-size: 12px;
  }
  
  .history-modal-footer {
    padding: 12px 16px;
  }
}
</style>
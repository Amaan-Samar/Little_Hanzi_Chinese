// composables/useArticleHistory.js
import { ref } from 'vue'

const STORAGE_KEY = 'littleHanzi_articles'
const LEGACY_STORAGE_KEY = 'littleHanzi_article_history'
const LAST_SESSION_KEY = 'littleHanzi_lastSession'
const MAX_ARTICLES = 300
const AUTOSAVE_DELAY = 60 * 1000 // 1 minute

const normalizeLikes = (value) => {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0),
    ),
  ].sort((a, b) => a - b)
}

export function useArticleHistory() {
  const articles = ref([])
  const currentArticleId = ref(null)
  const lastSession = ref(null)
  const autoSaveTimeout = ref(null)
  const isSaving = ref(false)

  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  const extractTitle = (content) => {
    if (!content) return 'Untitled Article'
    const lines = content.split('\n').filter((line) => line.trim())
    if (lines.length === 0) return 'Untitled Article'
    const firstLine = lines[0].trim()
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine
  }

  const normalizeArticle = (article, { imported = false } = {}) => {
    const bookmark =
      article.bookmark === null || article.bookmark === undefined
        ? null
        : Number(article.bookmark)

    const chineseContent =
      article.chineseContent ?? article.koreanContent ?? ''

    return {
      ...article,
      id: article.id || generateId(),
      chineseContent,
      englishContent: article.englishContent ?? '',
      title: article.title || extractTitle(chineseContent),
      timestamp: Number(article.timestamp) || Date.now(),
      bookmark: Number.isFinite(bookmark) ? bookmark : null,
      likedParagraphs: normalizeLikes(article.likedParagraphs),
      // Existing local articles have been seen; imports arrive unread.
      read: imported ? false : (article.read ?? true),
      archived: imported ? false : Boolean(article.archived),
      sharedBy: article.sharedBy || null,
      sharedAt: Number(article.sharedAt) || null,
    }
  }

  // ---- persistence ----
  const loadArticles = () => {
    try {
      let saved = localStorage.getItem(STORAGE_KEY)
      let migrated = false

      if (!saved) {
        saved = localStorage.getItem(LEGACY_STORAGE_KEY)
        migrated = Boolean(saved)
      }
      if (!saved) return

      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return

      articles.value = parsed.map((article) => normalizeArticle(article))
      if (migrated) saveArticles()
    } catch (error) {
      console.error('Failed to load articles:', error)
      articles.value = []
    }
  }

  const loadLastSession = () => {
    try {
      const saved = localStorage.getItem(LAST_SESSION_KEY)
      if (saved) lastSession.value = JSON.parse(saved)
    } catch (error) {
      console.error('Failed to load last reading session:', error)
      lastSession.value = null
    }
  }

  const saveArticles = () => {
    const write = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles.value))
      return true
    }

    try {
      return write()
    } catch (error) {
      // localStorage is small (~5 MB). If a large library fills it, drop the
      // oldest read articles that are neither liked nor archived, then retry.
      if (error?.name === 'QuotaExceededError' || error?.code === 22) {
        const droppable = [...articles.value]
          .filter(
            (article) =>
              article.read &&
              !article.archived &&
              (article.likedParagraphs?.length || 0) === 0,
          )
          .sort((a, b) => a.timestamp - b.timestamp)

        for (const article of droppable.slice(0, 60)) {
          articles.value = articles.value.filter((item) => item.id !== article.id)
          try {
            return write()
          } catch {
            // Keep pruning.
          }
        }
      }
      console.error('Failed to save articles:', error)
      return false
    }
  }

  const saveLastSession = () => {
    try {
      if (lastSession.value) {
        localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(lastSession.value))
      } else {
        localStorage.removeItem(LAST_SESSION_KEY)
      }
    } catch (error) {
      console.error('Failed to save last reading session:', error)
    }
  }

  // ---- last-session helpers ----
  const touchLastSession = (articleId, bookmarkOverride) => {
    if (!articleId) return
    const article = articles.value.find((item) => item.id === articleId)
    lastSession.value = {
      articleId,
      bookmark:
        bookmarkOverride !== undefined
          ? bookmarkOverride
          : (article?.bookmark ?? null),
      timestamp: Date.now(),
    }
    saveLastSession()
  }

  const clearLastSession = () => {
    lastSession.value = null
    saveLastSession()
  }

  const getResumeArticle = () => {
    const session = lastSession.value
    if (!session?.articleId) return null
    const article = articles.value.find((item) => item.id === session.articleId)
    if (!article) return null
    if (article.bookmark === null || article.bookmark === undefined) return null
    return article
  }

  // ---- core API ----
  const createArticle = (chineseContent, englishContent = '') => {
    if (!chineseContent || !chineseContent.trim()) return null

    const now = Date.now()
    const article = normalizeArticle({
      id: generateId(),
      chineseContent,
      englishContent: englishContent || '',
      title: extractTitle(chineseContent),
      timestamp: now,
      bookmark: null,
      likedParagraphs: [],
      read: true,
      archived: false,
      sharedBy: null,
      sharedAt: null,
    })
    articles.value.unshift(article)
    if (articles.value.length > MAX_ARTICLES) {
      articles.value = articles.value.slice(0, MAX_ARTICLES)
    }
    saveArticles()
    currentArticleId.value = article.id
    touchLastSession(article.id, null)
    return article
  }

  const updateArticle = (id, patch) => {
    if (!id) return null
    const article = articles.value.find((item) => item.id === id)
    if (!article) return null

    if (patch.chineseContent !== undefined) {
      article.chineseContent = patch.chineseContent
      article.title = extractTitle(patch.chineseContent)
    }
    if (patch.englishContent !== undefined) {
      article.englishContent = patch.englishContent
    }
    if (patch.bookmark !== undefined) {
      article.bookmark = patch.bookmark
    }
    if (patch.likedParagraphs !== undefined) {
      article.likedParagraphs = normalizeLikes(patch.likedParagraphs)
    }
    if (patch.archived !== undefined) {
      article.archived = Boolean(patch.archived)
    }
    if (patch.read !== undefined) {
      article.read = Boolean(patch.read)
    }
    if (patch.sharedBy !== undefined) {
      article.sharedBy = patch.sharedBy
    }
    if (patch.sharedAt !== undefined) {
      article.sharedAt = patch.sharedAt
    }
    article.timestamp = Date.now()

    saveArticles()
    return article
  }

  const setCurrentArticle = (id) => {
    currentArticleId.value = id
    touchLastSession(id)
  }

  const clearCurrentArticle = () => {
    currentArticleId.value = null
    clearLastSession()
  }

  const scheduleAutoSave = (chineseContent, englishContent = '') => {
    if (autoSaveTimeout.value) clearTimeout(autoSaveTimeout.value)

    if (!chineseContent && !englishContent) return

    autoSaveTimeout.value = setTimeout(() => {
      if (currentArticleId.value) {
        updateArticle(currentArticleId.value, {
          chineseContent,
          englishContent,
        })
      } else if (chineseContent && chineseContent.trim()) {
        // Preserve the app's original behaviour: a long enough reading session
        // should land in History even if the reader never presses Save.
        createArticle(chineseContent, englishContent)
      }
      autoSaveTimeout.value = null
    }, AUTOSAVE_DELAY)
  }

  const flushAutoSave = (chineseContent, englishContent = '') => {
    if (autoSaveTimeout.value) {
      clearTimeout(autoSaveTimeout.value)
      autoSaveTimeout.value = null
    }
    if (currentArticleId.value) {
      return updateArticle(currentArticleId.value, {
        chineseContent,
        englishContent,
      })
    }
    return null
  }

  const cancelAutoSave = () => {
    if (autoSaveTimeout.value) {
      clearTimeout(autoSaveTimeout.value)
      autoSaveTimeout.value = null
    }
  }

  const deleteArticle = (articleId) => {
    articles.value = articles.value.filter((article) => article.id !== articleId)
    if (currentArticleId.value === articleId) currentArticleId.value = null
    if (lastSession.value?.articleId === articleId) clearLastSession()
    saveArticles()
  }

  const deleteAllArticles = () => {
    articles.value = []
    currentArticleId.value = null
    clearLastSession()
    saveArticles()
  }

  const loadArticle = (articleId) => {
    const article = articles.value.find((item) => item.id === articleId)
    if (article) {
      currentArticleId.value = articleId
      touchLastSession(articleId)
      return article
    }
    return null
  }

  const isCurrentArticle = (articleId) => currentArticleId.value === articleId

  const setBookmark = (articleId, paragraphIndex) => {
    const article = articles.value.find((item) => item.id === articleId)
    if (article) {
      article.bookmark = paragraphIndex
      article.read = true
      saveArticles()
      touchLastSession(articleId, paragraphIndex)
    }
  }

  // ---- read / like / archive ----
  const markArticleRead = (articleId) => {
    const article = articles.value.find((item) => item.id === articleId)
    if (!article || article.read) return false
    article.read = true
    saveArticles()
    return true
  }

  const toggleParagraphLike = (articleId, paragraphIndex) => {
    const article = articles.value.find((item) => item.id === articleId)
    if (!article) return false
    const index = Number(paragraphIndex)
    if (!Number.isInteger(index) || index < 0) return false

    const liked = new Set(article.likedParagraphs || [])
    if (liked.has(index)) liked.delete(index)
    else liked.add(index)
    article.likedParagraphs = [...liked].sort((a, b) => a - b)
    saveArticles()
    return liked.has(index)
  }

  const isParagraphLiked = (articleId, paragraphIndex) => {
    const article = articles.value.find((item) => item.id === articleId)
    return Boolean(article?.likedParagraphs?.includes(Number(paragraphIndex)))
  }

  const getLikeCount = (article) => article?.likedParagraphs?.length || 0

  const setArchived = (articleId, archived = true) => {
    const article = articles.value.find((item) => item.id === articleId)
    if (!article) return false
    article.archived = Boolean(archived)
    saveArticles()
    return article.archived
  }

  const toggleArchived = (articleId) => {
    const article = articles.value.find((item) => item.id === articleId)
    if (!article) return false
    return setArchived(articleId, !article.archived)
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Load before the component mounts so History and the resume prompt have
  // data on the first paint.
  loadArticles()
  loadLastSession()

  return {
    articles,
    currentArticleId,
    lastSession,
    isSaving,
    createArticle,
    updateArticle,
    setCurrentArticle,
    clearCurrentArticle,
    flushAutoSave,
    scheduleAutoSave,
    cancelAutoSave,
    deleteArticle,
    deleteAllArticles,
    loadArticle,
    isCurrentArticle,
    setBookmark,
    formatDate,
    saveArticles,
    markArticleRead,
    toggleParagraphLike,
    isParagraphLiked,
    getLikeCount,
    setArchived,
    toggleArchived,
    getResumeArticle,
    clearLastSession,
  }
}

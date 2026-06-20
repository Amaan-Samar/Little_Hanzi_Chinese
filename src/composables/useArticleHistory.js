import { ref, watch, onMounted } from 'vue'

const STORAGE_KEY = 'littleHanzi_article_history'
const SAVE_DELAY = 3 * 60 * 1000 // 3 minutes in milliseconds

export function useArticleHistory() {
  const articles = ref([])
  const saveTimeout = ref(null)
  const currentArticleId = ref(null)
  const lastContentHash = ref('')
  
  // Load articles from localStorage
  const loadArticles = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Validate and migrate if needed (for version compatibility)
        if (Array.isArray(parsed)) {
          articles.value = parsed.map(article => ({
            ...article,
            // Ensure all required fields exist
            id: article.id || Date.now(),
            title: article.title || 'Untitled Article',
            chineseContent: article.chineseContent || '',
            englishContent: article.englishContent || '',
            timestamp: article.timestamp || Date.now(),
            version: article.version || 1
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load articles:', error)
      articles.value = []
    }
  }
  
  // Save articles to localStorage
  const saveArticles = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles.value))
    } catch (error) {
      console.error('Failed to save articles:', error)
    }
  }
  
  // Generate a simple hash of the content to detect changes
  const generateContentHash = (chinese, english) => {
    return `${chinese}|${english}`.length.toString() + 
           (chinese + english).substring(0, 100)
  }
  
  // Extract title from first line of content
  const extractTitle = (chineseContent) => {
    if (!chineseContent || !chineseContent.trim()) {
      return 'Untitled Article'
    }
    // Get first line (up to first newline or first 50 characters)
    const firstLine = chineseContent.split('\n')[0].trim()
    if (firstLine && firstLine.length > 0) {
      // Limit title length
      return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine
    }
    return 'Untitled Article'
  }
  
  // Save current article to history
  const saveCurrentArticle = (chineseContent, englishContent) => {
    if (!chineseContent || !chineseContent.trim()) {
      return // Don't save empty articles
    }
    
    const contentHash = generateContentHash(chineseContent, englishContent)
    
    // Check if content has actually changed from last save
    if (contentHash === lastContentHash.value && currentArticleId.value) {
      // Update timestamp of existing article if content hasn't changed much
      const existingArticle = articles.value.find(a => a.id === currentArticleId.value)
      if (existingArticle && 
          existingArticle.chineseContent === chineseContent && 
          existingArticle.englishContent === englishContent) {
        existingArticle.timestamp = Date.now()
        existingArticle.title = extractTitle(chineseContent)
        saveArticles()
      }
      return
    }
    
    const title = extractTitle(chineseContent)
    
    const newArticle = {
      id: Date.now(),
      title: title,
      chineseContent: chineseContent,
      englishContent: englishContent || '',
      timestamp: Date.now(),
      version: 1
    }
    
    // Add to beginning of array (newest first)
    articles.value.unshift(newArticle)
    
    // Keep only last 50 articles to prevent localStorage overflow
    if (articles.value.length > 50) {
      articles.value = articles.value.slice(0, 50)
    }
    
    currentArticleId.value = newArticle.id
    lastContentHash.value = contentHash
    saveArticles()
  }
  
  // Schedule auto-save after delay
  const scheduleAutoSave = (chineseContent, englishContent) => {
    // Clear existing timeout
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
    }
    
    // Only schedule if there's content
    if (chineseContent && chineseContent.trim()) {
      saveTimeout.value = setTimeout(() => {
        saveCurrentArticle(chineseContent, englishContent)
        saveTimeout.value = null
      }, SAVE_DELAY)
    }
  }
  
  // Cancel pending auto-save
  const cancelAutoSave = () => {
    if (saveTimeout.value) {
      clearTimeout(saveTimeout.value)
      saveTimeout.value = null
    }
  }
  
  // Delete an article
  const deleteArticle = (articleId) => {
    const index = articles.value.findIndex(a => a.id === articleId)
    if (index !== -1) {
      articles.value.splice(index, 1)
      saveArticles()
      return true
    }
    return false
  }
  
  // Delete all articles
  const deleteAllArticles = () => {
    articles.value = []
    saveArticles()
  }
  
  // Load an article into the editor
  const loadArticle = (article) => {
    return {
      chinese: article.chineseContent,
      english: article.englishContent
    }
  }
  
  // Check if article is currently being viewed
  const isCurrentArticle = (articleId) => {
    return currentArticleId.value === articleId
  }
  
  // Get formatted date string
  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    
    return date.toLocaleDateString()
  }
  
  // Reset current article tracking (for when user clears text)
  const resetCurrentTracking = () => {
    currentArticleId.value = null
    lastContentHash.value = ''
    cancelAutoSave()
  }
  
  onMounted(() => {
    loadArticles()
  })
  
  return {
    articles,
    scheduleAutoSave,
    cancelAutoSave,
    saveCurrentArticle,
    deleteArticle,
    deleteAllArticles,
    loadArticle,
    isCurrentArticle,
    formatDate,
    resetCurrentTracking
  }
}
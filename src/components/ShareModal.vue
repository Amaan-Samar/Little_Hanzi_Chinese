<template>
  <Teleport to="body">
    <div v-if="isOpen" class="share-modal-overlay" @click="close">
      <div class="share-modal" @click.stop>
        <button class="close-btn" @click="close" title="Close">
          <X :size="18" />
        </button>

        <div class="share-modal-body">
          <h3 class="share-title">Share article</h3>
          <p class="share-subtitle">
            Chinese and English travel together in one compressed article. Scan
            the QR code, open the link, or send the JSON file through any app.
          </p>

          <div class="language-row">
            <span class="language-pill">中文 Chinese</span>
            <span class="language-pill">English</span>
          </div>

          <div class="field">
            <label class="field-label">Your name</label>
            <input
              v-model="name"
              maxlength="40"
              placeholder="Shown to the person you share with"
              class="text-input"
              @input="emitName"
            />
          </div>

          <!-- One QR carries both languages. -->
          <div v-if="!qrTooLarge" class="qr-card">
            <img
              v-if="qrFull"
              :src="qrFull"
              alt="QR code containing the shared article in Chinese and English"
              class="qr-image"
            />
            <div v-else class="qr-placeholder">
              <Loader2 v-if="qrLoading" :size="24" class="spinner" />
              <AlertTriangle v-else :size="24" class="warn-icon" />
              <p>{{ qrLoading ? 'Generating QR…' : 'QR code is not available.' }}</p>
            </div>
            <p class="qr-caption">{{ articleTitle }}</p>
          </div>

          <div v-else class="notice notice-info">
            <AlertTriangle :size="18" />
            <p>
              This article is too large for one QR code. Send the JSON file
              below instead — your friend can open it from History → Open shared
              file.
            </p>
          </div>

          <!-- Share link (only when it is a sensible size). -->
          <div v-if="fullShare.url && !qrTooLarge" class="field">
            <label class="field-label">Share link</label>
            <div class="link-row">
              <input
                :value="fullShare.url"
                readonly
                class="link-input"
                @focus="$event.target.select()"
              />
              <button class="copy-btn" @click="copyLink(fullShare.url)">
                <Check v-if="copied" :size="14" />
                <Copy v-else :size="14" />
                {{ copied ? 'Copied' : 'Copy' }}
              </button>
            </div>
          </div>

          <button
            v-if="canNativeShare"
            class="native-share-btn"
            @click="shareNatively"
          >
            <Share2 :size="16" />
            {{ canShareFiles ? 'Share JSON file' : 'Share to another app' }}
          </button>

          <div class="download-grid">
            <button
              class="secondary-btn"
              :disabled="!qrFull"
              @click="downloadQr"
            >
              <Download :size="15" />
              Download QR
            </button>
            <button class="secondary-btn" @click="downloadFile">
              <FileDown :size="15" />
              Article JSON
            </button>
          </div>

          <p class="share-footnote">
            The JSON file contains both the Chinese text and its English
            translation. Open it from History → Open shared file, or drop it
            anywhere on the app.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  X,
  Copy,
  Check,
  Download,
  FileDown,
  AlertTriangle,
  Loader2,
  Share2,
} from 'lucide-vue-next'
import QRCode from 'qrcode'
import {
  buildSharePayload,
  buildShareUrl,
  makeShareBundle,
  downloadJson,
  slugify,
} from '../utils/sharePayload'
import { copyText } from '../utils/clipboard'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  article: { type: Object, default: null },
  displayName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save-name', 'notify'])

const name = ref('')
const qrFull = ref('')
const qrLoading = ref(false)
const copied = ref(false)
let copiedTimeout = null
let qrToken = 0

const articleTitle = computed(() => props.article?.title || 'Untitled article')
const shareBy = computed(() => name.value.trim() || 'A friend')

const fullShare = computed(() =>
  buildShareUrl(buildSharePayload(props.article, shareBy.value, 'full')),
)
const qrTooLarge = computed(
  () => fullShare.value.tooLarge || !fullShare.value.url,
)

const shareBundle = computed(() =>
  props.article ? makeShareBundle([props.article], shareBy.value) : null,
)
const shareFileName = computed(
  () => `${slugify(articleTitle.value, 'article')}-little-hanzi.json`,
)
const shareJson = computed(() =>
  shareBundle.value ? JSON.stringify(shareBundle.value, null, 2) : '',
)

const canNativeShare = computed(
  () =>
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    Boolean((props.article?.chineseContent || '').trim()),
)

const makeShareFile = () =>
  new File([shareJson.value], shareFileName.value, {
    type: 'application/json',
  })

const canShareFiles = computed(() => {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function' ||
    typeof File === 'undefined'
  ) {
    return false
  }
  try {
    return navigator.canShare({ files: [makeShareFile()] })
  } catch {
    return false
  }
})

const emitName = () => {
  emit('save-name', name.value.slice(0, 40))
}

const notify = (message, type = 'info') => emit('notify', message, type)

const close = () => emit('close')

const renderQr = (url) =>
  QRCode.toDataURL(url, {
    errorCorrectionLevel: 'L',
    margin: 2,
    width: 560,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  })

const generateQr = async () => {
  const token = ++qrToken
  qrFull.value = ''

  if (!props.isOpen || !props.article || qrTooLarge.value) return

  qrLoading.value = true
  try {
    const data = await renderQr(fullShare.value.url)
    if (token === qrToken) qrFull.value = data
  } catch (error) {
    console.error('QR generation failed:', error)
    if (token === qrToken) notify('Could not generate a QR code.', 'error')
  } finally {
    if (token === qrToken) qrLoading.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      name.value = props.displayName || ''
      copied.value = false
      generateQr()
    }
  },
)

watch([name, () => props.article], () => {
  if (props.isOpen) generateQr()
})

const copyLink = async (url) => {
  if (!url) return
  if (!(await copyText(url))) {
    notify('Could not copy the link.', 'error')
    return
  }

  copied.value = true
  if (copiedTimeout) clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    copied.value = false
  }, 1800)
}

const downloadQr = () => {
  if (!qrFull.value) return
  const link = document.createElement('a')
  link.href = qrFull.value
  link.download = `${slugify(articleTitle.value, 'article')}-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const downloadFile = () => {
  if (!shareBundle.value) return
  downloadJson(shareBundle.value, shareFileName.value)
}

const shareNatively = async () => {
  if (!canNativeShare.value) return

  const article = props.article

  try {
    if (canShareFiles.value) {
      await navigator.share({
        files: [makeShareFile()],
        title: articleTitle.value,
        text: 'A Little Hanzi article with Chinese and English.',
      })
      return
    }

    const textParts = [article.chineseContent || '']
    if ((article.englishContent || '').trim()) {
      textParts.push(article.englishContent)
    }

    const data = {
      title: articleTitle.value,
      text: textParts.filter(Boolean).join('\n\n'),
    }

    // Long links are awkward in messaging apps, and the text above already
    // carries the article. Only attach the link when it fits comfortably.
    if (!qrTooLarge.value && fullShare.value.url) data.url = fullShare.value.url

    await navigator.share(data)
  } catch (error) {
    if (error?.name !== 'AbortError') {
      notify('Could not open the share menu. Use Copy or Download instead.', 'error')
    }
  }
}
</script>

<style scoped>
.share-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.share-modal {
  position: relative;
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 460px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #e9ecef;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

.share-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
}

.share-modal-body::-webkit-scrollbar {
  width: 5px;
}

.share-modal-body::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.22);
  border-radius: 20px;
}

.share-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.share-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: #6b7280;
}

.language-row {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.language-pill {
  padding: 3px 9px;
  border-radius: 999px;
  background: #eef1ff;
  border: 1px solid #d8defb;
  color: #4a6cf7;
  font-size: 10.5px;
  font-weight: 700;
}

.field {
  margin-top: 16px;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.text-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e9ecef;
  border-radius: 9px;
  background: #f8f9fa;
  color: #374151;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.text-input:focus {
  border-color: #4a6cf7;
  background: white;
}

.qr-card {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: #f8f9fa;
  text-align: center;
}

.qr-image {
  display: block;
  width: 100%;
  max-width: 250px;
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
  image-rendering: pixelated;
}

.qr-placeholder {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.qr-placeholder p {
  margin: 0;
}

.spinner {
  animation: spin 0.9s linear infinite;
  color: #4a6cf7;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.warn-icon {
  color: #b45309;
}

.qr-caption {
  margin: 12px 0 0;
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 16px;
  padding: 12px;
  border-radius: 12px;
}

.notice-info {
  background: #eef4ff;
  border: 1px solid #d6e2ff;
  color: #3652b8;
}

.notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.link-row {
  display: flex;
  gap: 8px;
}

.link-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
  color: #6b7280;
  font-size: 11px;
  outline: none;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: #4a6cf7;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.copy-btn:hover {
  background: #3a5ce8;
}

.native-share-btn {
  width: 100%;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px;
  border: none;
  border-radius: 10px;
  background: #4a6cf7;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(74, 108, 247, 0.24);
}

.native-share-btn:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
}

.download-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px;
  border: 1px solid #e9ecef;
  border-radius: 9px;
  background: white;
  color: #495057;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #cbd5e1;
}

.secondary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.share-footnote {
  margin: 14px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #adb5bd;
}

@media (max-width: 520px) {
  .share-modal-body {
    padding: 20px;
  }

  .download-grid {
    grid-template-columns: 1fr;
  }
}
</style>

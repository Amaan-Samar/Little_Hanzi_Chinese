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
            Let a friend scan the QR code, open the share link, or receive the
            article through any app on your device.
          </p>

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

          <!-- Single QR: everything fits -->
          <div v-if="!splitMode" class="qr-card">
            <img
              v-if="qrFull"
              :src="qrFull"
              alt="QR code containing the shared article"
              class="qr-image"
            />
            <div v-else class="qr-placeholder">
              <Loader2 v-if="qrLoading" :size="24" class="spinner" />
              <AlertTriangle v-else :size="24" class="warn-icon" />
              <p>{{ qrLoading ? 'Generating QR…' : 'QR code is not available.' }}</p>
            </div>
            <p class="qr-caption">{{ articleTitle }}</p>
          </div>

          <!-- Too large for one QR -->
          <template v-else>
            <div class="notice notice-info">
              <ScanLine :size="18" />
              <p v-if="hasEnglish && cnCanQr && enCanQr">
                This article is too large for one QR code. Share it in two
                steps: scan the Chinese code first, then the English code.
              </p>
              <p v-else-if="cnCanQr">
                The full article is too large for one QR code. Scan the Chinese
                code below, or download the article file.
              </p>
              <p v-else>
                This article is too large for a QR code. Download the article
                file below and send it to your friend.
              </p>
            </div>

            <div v-if="cnCanQr" class="qr-block">
              <div class="qr-head">
                <span class="step-badge">1</span>
                <span>Chinese</span>
              </div>
              <img
                v-if="qrCn"
                :src="qrCn"
                alt="QR code containing the Chinese text"
                class="qr-image"
              />
              <div v-else class="qr-placeholder small">
                <Loader2 :size="20" class="spinner" />
                <p>Generating QR…</p>
              </div>
            </div>

            <div v-if="hasEnglish && enCanQr" class="qr-block">
              <div class="qr-head">
                <span class="step-badge">{{ cnCanQr ? 2 : 1 }}</span>
                <span>English translation</span>
              </div>
              <img
                v-if="qrEn"
                :src="qrEn"
                alt="QR code containing the English translation"
                class="qr-image"
              />
              <div v-else class="qr-placeholder small">
                <Loader2 :size="20" class="spinner" />
                <p>Generating QR…</p>
              </div>
            </div>

            <p v-if="cnCanQr && hasEnglish && enCanQr" class="qr-hint">
              Keep the article until both codes have been scanned. The English
              code finds the article by its Chinese text.
            </p>
          </template>

          <!-- Share link -->
          <div v-if="!splitMode && fullShare.url" class="field">
            <label class="field-label">Share link</label>
            <div class="link-row">
              <input
                :value="fullShare.url"
                readonly
                class="link-input"
                @focus="$event.target.select()"
              />
              <button class="copy-btn" @click="copyLink(fullShare.url, 'full')">
                <Check v-if="copiedKey === 'full'" :size="14" />
                <Copy v-else :size="14" />
                {{ copiedKey === 'full' ? 'Copied' : 'Copy' }}
              </button>
            </div>
          </div>

          <!-- Native share -->
          <button
            v-if="canNativeShare"
            class="native-share-btn"
            @click="shareNatively"
          >
            <Share2 :size="16" />
            Share to another app
          </button>

          <!-- Downloads always available, and the primary fallback when a QR
               cannot hold the article. -->
          <div class="download-grid">
            <button
              class="secondary-btn"
              :disabled="!primaryQr"
              @click="downloadQr"
            >
              <Download :size="15" />
              Download QR
            </button>
            <button class="secondary-btn" @click="downloadFile">
              <FileDown :size="15" />
              Article file
            </button>
          </div>

          <p class="share-footnote">
            Received a .json file instead? Open History → Open shared file, or
            scan it from the home screen.
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
  ScanLine,
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
const qrCn = ref('')
const qrEn = ref('')
const qrLoading = ref(false)
const copiedKey = ref('')
let copiedTimeout = null
let qrToken = 0

const articleTitle = computed(() => props.article?.title || 'Untitled article')
const hasEnglish = computed(() =>
  Boolean((props.article?.englishContent || '').trim()),
)

const shareBy = computed(() => name.value.trim() || 'A friend')

const fullShare = computed(() =>
  buildShareUrl(buildSharePayload(props.article, shareBy.value, 'full')),
)
const cnShare = computed(() =>
  buildShareUrl(buildSharePayload(props.article, shareBy.value, 'cn')),
)
const enShare = computed(() =>
  hasEnglish.value
    ? buildShareUrl(buildSharePayload(props.article, shareBy.value, 'en'))
    : { url: '', encoded: '', tooLarge: false },
)

// If the combined article will not fit in a QR, switch to two codes.
const splitMode = computed(() => fullShare.value.tooLarge)
const cnCanQr = computed(
  () => Boolean(cnShare.value.url) && !cnShare.value.tooLarge,
)
const enCanQr = computed(
  () => hasEnglish.value && Boolean(enShare.value.url) && !enShare.value.tooLarge,
)
const primaryQr = computed(() => (splitMode.value ? qrCn.value : qrFull.value))

const canNativeShare = computed(
  () =>
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    Boolean((props.article?.chineseContent || '').trim()),
)

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

const generateQrs = async () => {
  const token = ++qrToken
  qrFull.value = ''
  qrCn.value = ''
  qrEn.value = ''

  if (!props.isOpen || !props.article) return

  qrLoading.value = true
  try {
    if (!splitMode.value) {
      const data = await renderQr(fullShare.value.url)
      if (token === qrToken) qrFull.value = data
      return
    }

    if (cnCanQr.value) {
      const data = await renderQr(cnShare.value.url)
      if (token !== qrToken) return
      qrCn.value = data
    }

    if (enCanQr.value) {
      const data = await renderQr(enShare.value.url)
      if (token !== qrToken) return
      qrEn.value = data
    }
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
      copiedKey.value = ''
      generateQrs()
    }
  },
)

watch([name, () => props.article], () => {
  if (props.isOpen) generateQrs()
})

const copyLink = async (url, key) => {
  if (!url) return
  if (!(await copyText(url))) {
    notify('Could not copy the link.', 'error')
    return
  }

  copiedKey.value = key
  if (copiedTimeout) clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    copiedKey.value = ''
  }, 1800)
}

const downloadQr = () => {
  if (!primaryQr.value) return
  const suffix = splitMode.value ? '-chinese-qr' : '-qr'
  const link = document.createElement('a')
  link.href = primaryQr.value
  link.download = `${slugify(articleTitle.value, 'article')}${suffix}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const downloadFile = () => {
  if (!props.article) return
  const bundle = makeShareBundle([props.article], shareBy.value)
  downloadJson(bundle, `${slugify(articleTitle.value, 'article')}-shared.json`)
}

const shareNatively = async () => {
  if (!canNativeShare.value) return

  const article = props.article
  const textParts = [article.chineseContent || '']
  if ((article.englishContent || '').trim()) {
    textParts.push(article.englishContent)
  }

  const data = {
    title: articleTitle.value,
    text: textParts.filter(Boolean).join('\n\n'),
  }

  // Only attach the link when it fits in a QR; huge links are awkward in
  // messaging apps and the text above already carries the full article.
  if (!splitMode.value && fullShare.value.url) data.url = fullShare.value.url

  try {
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

.qr-placeholder.small {
  min-height: 90px;
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

.qr-block {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  background: #f8f9fa;
}

.qr-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 9px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.step-badge {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #4a6cf7;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  letter-spacing: 0;
}

.qr-hint {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #6b7280;
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

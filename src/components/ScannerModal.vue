<template>
  <Teleport to="body">
    <div v-if="isOpen" class="scanner-overlay" @click="close">
      <div class="scanner-modal" @click.stop>
        <button class="close-btn" @click="close" title="Close">
          <X :size="18" />
        </button>

        <h3 class="scanner-title">Scan a QR code</h3>
        <p class="scanner-subtitle">
          Point your camera at a Little Hanzi article code, or choose a QR image
          from this device.
        </p>

        <div class="camera-frame">
          <video
            ref="videoRef"
            class="camera-video"
            playsinline
            muted
            autoplay
          ></video>
          <div class="scan-guide"></div>
          <div v-if="!cameraActive" class="camera-placeholder">
            <CameraOff v-if="error" :size="30" />
            <Camera v-else :size="30" />
            <p>{{ error || 'Starting camera…' }}</p>
          </div>
        </div>

        <div class="scanner-status" :class="`status-${statusTone}`">
          <span>{{ statusMessage }}</span>
        </div>

        <div class="scanner-actions">
          <button
            class="secondary-btn"
            :disabled="!cameraActive"
            @click="restartCamera"
          >
            <RefreshCw :size="15" />
            Restart camera
          </button>
          <button class="secondary-btn" @click="chooseImage">
            <ImageUp :size="15" />
            Choose image
          </button>
        </div>

        <p class="scanner-note">
          Camera scanning works best in Chrome, Edge, and Android browsers. If
          your browser blocks the camera, use Choose image instead.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X, Camera, CameraOff, RefreshCw, ImageUp } from 'lucide-vue-next'
import jsQR from 'jsqr'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'detected'])

const videoRef = ref(null)
const cameraActive = ref(false)
const error = ref('')
const statusMessage = ref('Point the camera at a QR code.')
const statusTone = ref('info')

let stream = null
let scanTimer = null
let detector = null
let canvas = null
let stopped = false

const supportsBarcodeDetector =
  typeof window !== 'undefined' && 'BarcodeDetector' in window

const cameraConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
}

const stopCamera = () => {
  stopped = true
  if (scanTimer) {
    clearInterval(scanTimer)
    scanTimer = null
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  cameraActive.value = false
}

const close = () => {
  stopCamera()
  emit('close')
}

const decodeFrame = async () => {
  const video = videoRef.value
  if (!video || video.readyState < 2 || stopped) return

  // Prefer the native detector where it exists, but fall back to jsQR when
  // the detector has no QR support.
  if (detector) {
    try {
      const codes = await detector.detect(video)
      const value = codes?.[0]?.rawValue
      if (value) {
        stopCamera()
        emit('detected', value)
        return
      }
      return
    } catch {
      // Fall through to the canvas decoder.
    }
  }

  if (!canvas) canvas = document.createElement('canvas')
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return
  context.drawImage(video, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: 'attemptBoth',
  })

  if (result?.data) {
    stopCamera()
    emit('detected', result.data)
  }
}

const startCamera = async () => {
  stopCamera()
  stopped = false
  error.value = ''
  statusTone.value = 'info'
  statusMessage.value = 'Starting camera…'

  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = 'This browser does not support camera access.'
    statusTone.value = 'error'
    statusMessage.value = error.value
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia(cameraConstraints)
    await nextTick()
    const video = videoRef.value
    if (!video) return
    video.srcObject = stream
    await video.play()
    cameraActive.value = true
    statusMessage.value = 'Looking for a QR code…'

    if (supportsBarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      } catch {
        detector = null
      }
    }

    scanTimer = setInterval(decodeFrame, 260)
  } catch (err) {
    console.error('Camera scan failed:', err)
    error.value =
      err?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow it in your browser settings, or choose an image.'
        : 'Could not start the camera. Choose a QR image instead.'
    statusTone.value = 'error'
    statusMessage.value = error.value
    cameraActive.value = false
  }
}

const restartCamera = () => {
  startCamera()
}

const decodeImageFile = (file) => {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    if (!canvas) canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const result = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth',
    })
    URL.revokeObjectURL(objectUrl)

    if (result?.data) {
      stopCamera()
      emit('detected', result.data)
    } else {
      statusTone.value = 'error'
      statusMessage.value = 'No QR code found in that image. Try a clearer picture.'
    }
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    statusTone.value = 'error'
    statusMessage.value = 'Could not read that image.'
  }
  image.src = objectUrl
}

const chooseImage = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  input.onchange = () => {
    const file = input.files?.[0]
    input.remove()
    if (file) decodeImageFile(file)
  }
  document.body.appendChild(input)
  input.click()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      error.value = ''
      statusTone.value = 'info'
      statusMessage.value = 'Point the camera at a QR code.'
      nextTick(startCamera)
    } else {
      stopCamera()
    }
  },
)

onBeforeUnmount(stopCamera)
</script>

<style scoped>
.scanner-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2600;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.scanner-modal {
  position: relative;
  width: 92%;
  max-width: 430px;
  max-height: 92vh;
  overflow-y: auto;
  padding: 22px;
  border-radius: 20px;
  background: white;
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
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e9ecef;
  color: #868e96;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.scanner-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.scanner-subtitle {
  margin: 4px 24px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: #6b7280;
}

.camera-frame {
  position: relative;
  margin-top: 16px;
  border-radius: 14px;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 4 / 3;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.scan-guide {
  position: absolute;
  inset: 14%;
  border: 2px solid rgba(255, 255, 255, 0.78);
  border-radius: 14px;
  box-shadow: 0 0 0 999px rgba(15, 23, 42, 0.18);
  pointer-events: none;
}

.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 20px;
  text-align: center;
  color: #cbd5e1;
  background: #0f172a;
}

.camera-placeholder p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  max-width: 260px;
}

.scanner-status {
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 9px;
  font-size: 11.5px;
  line-height: 1.45;
  text-align: center;
}

.status-info {
  background: #eef4ff;
  border: 1px solid #d6e2ff;
  color: #3652b8;
}

.status-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.scanner-actions {
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

.scanner-note {
  margin: 14px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #adb5bd;
}
</style>

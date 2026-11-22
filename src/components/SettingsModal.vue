<template>
  <Teleport to="body">
    <div v-if="isOpen" class="settings-modal-overlay" @click="handleOverlayClick">
      <div class="settings-modal" :class="{ mobile: isMobile }" @click.stop>
        <button class="close-btn" @click="close" title="Close">
          <X :size="18" />
        </button>

        <div class="settings-modal-body">
          <!-- Live preview -->
          <div class="preview-card">
            <label class="setting-label">Live Preview</label>
            <div class="preview-surface" :style="{ fontFamily: getSelectedFontFamily() }">
              <div class="preview-chinese">
                <span
                  v-for="pair in previewPairs"
                  :key="pair.char"
                  class="preview-char"
                >
                  <span
                    class="preview-hanzi"
                    :style="{ fontSize: `${localSettings.fontSize}px` }"
                  >{{ pair.char }}</span>
                  <span
                    v-if="localSettings.showPinyin"
                    class="preview-pinyin"
                    :style="{ fontSize: `${Math.min(localSettings.pinyinFontSize, localSettings.fontSize)}px` }"
                  >{{ pair.pinyin }}</span>
                </span>
              </div>
              <div v-if="localSettings.showEnglish" class="preview-english">
                <span
                  :style="{ fontSize: `${Math.min(localSettings.englishFontSize, localSettings.fontSize)}px` }"
                >Hello, this is a preview.</span>
              </div>
              <div class="preview-order">
                Order:
                <span>{{ localSettings.displayOrder === 'en-cn' ? 'English → Chinese' : 'Chinese → English' }}</span>
              </div>
            </div>
          </div>

          <!-- Chinese font size -->
          <div class="setting-group">
            <label class="setting-label">Chinese Font Size</label>
            <div class="size-control-row">
              <button
                class="step-btn"
                :disabled="localSettings.fontSize <= 12"
                @click="decreaseFontSize"
                title="Smaller"
              >
                <Minus :size="16" />
              </button>
              <span class="size-value">{{ localSettings.fontSize }}</span>
              <button
                class="step-btn"
                :disabled="localSettings.fontSize >= 32"
                @click="increaseFontSize"
                title="Larger"
              >
                <Plus :size="16" />
              </button>
            </div>
            <div class="preset-row">
              <button
                v-for="size in fontSizePresets"
                :key="size"
                class="preset-btn"
                :class="{ active: localSettings.fontSize === size }"
                @click="setFontSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- Pinyin size -->
          <div class="setting-group">
            <label class="setting-label">Pinyin Size</label>
            <div class="size-control-row">
              <button
                class="step-btn"
                :disabled="localSettings.pinyinFontSize <= 4"
                @click="decreasePinyinSize"
                title="Smaller"
              >
                <Minus :size="16" />
              </button>
              <span class="size-value">{{ localSettings.pinyinFontSize }}</span>
              <button
                class="step-btn"
                :disabled="localSettings.pinyinFontSize >= localSettings.fontSize"
                @click="increasePinyinSize"
                title="Larger"
              >
                <Plus :size="16" />
              </button>
            </div>
            <div class="preset-row">
              <button
                v-for="size in pinyinPresets"
                :key="size"
                class="preset-btn"
                :class="{ active: localSettings.pinyinFontSize === size }"
                :disabled="size > localSettings.fontSize"
                @click="setPinyinSize(size)"
              >
                {{ size }}
              </button>
            </div>
            <p class="setting-description">
              Maximum {{ localSettings.fontSize }}px, the same as the Chinese text.
            </p>
          </div>

          <!-- English size -->
          <div class="setting-group">
            <label class="setting-label">English Size</label>
            <div class="size-control-row">
              <button
                class="step-btn"
                :disabled="localSettings.englishFontSize <= 4"
                @click="decreaseEnglishSize"
                title="Smaller"
              >
                <Minus :size="16" />
              </button>
              <span class="size-value">{{ localSettings.englishFontSize }}</span>
              <button
                class="step-btn"
                :disabled="localSettings.englishFontSize >= localSettings.fontSize"
                @click="increaseEnglishSize"
                title="Larger"
              >
                <Plus :size="16" />
              </button>
            </div>
            <div class="preset-row">
              <button
                v-for="size in englishPresets"
                :key="size"
                class="preset-btn"
                :class="{ active: localSettings.englishFontSize === size }"
                :disabled="size > localSettings.fontSize"
                @click="setEnglishSize(size)"
              >
                {{ size }}
              </button>
            </div>
            <p class="setting-description">
              Maximum {{ localSettings.fontSize }}px, the same as the Chinese text.
            </p>
          </div>

          <!-- Font family dropdown -->
          <div class="setting-group">
            <label class="setting-label">Font Family</label>
            <div class="font-select-wrapper">
              <button
                class="font-select"
                :style="{ fontFamily: getSelectedFontFamily() }"
                @click="toggleFontDropdown"
              >
                <span>{{ getSelectedFontLabel() }}</span>
                <ChevronDown
                  :size="16"
                  class="chevron"
                  :class="{ open: isFontDropdownOpen }"
                />
              </button>
              <div v-if="isFontDropdownOpen" class="font-dropdown">
                <button
                  v-for="font in fontOptions"
                  :key="font.value"
                  class="font-dropdown-item"
                  :class="{ active: localSettings.selectedFont === font.value }"
                  :style="{ fontFamily: font.fontFamily }"
                  @click="handleFontChange(font.value)"
                >
                  {{ font.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Display sections -->
          <div class="setting-group">
            <label class="setting-label">Display Sections</label>
            <div class="toggle-group">
              <label class="toggle-item">
                <input
                  type="checkbox"
                  v-model="localSettings.showPinyin"
                  @change="emitSave"
                />
                <span>Pinyin</span>
              </label>
              <label class="toggle-item">
                <input
                  type="checkbox"
                  v-model="localSettings.showChinese"
                  @change="emitSave"
                />
                <span>Chinese</span>
              </label>
              <label class="toggle-item">
                <input
                  type="checkbox"
                  v-model="localSettings.showEnglish"
                  @change="emitSave"
                />
                <span>English</span>
              </label>
            </div>
          </div>

          <!-- Display order -->
          <div class="setting-group">
            <label class="setting-label">Display Order</label>
            <div class="radio-group">
              <label class="radio-item">
                <input
                  type="radio"
                  v-model="localSettings.displayOrder"
                  value="en-cn"
                  @change="emitSave"
                />
                <span>English → Chinese</span>
              </label>
              <label class="radio-item">
                <input
                  type="radio"
                  v-model="localSettings.displayOrder"
                  value="cn-en"
                  @change="emitSave"
                />
                <span>Chinese → English</span>
              </label>
            </div>
          </div>

          <!-- Layout mode -->
          <div class="setting-group">
            <label class="setting-label">Layout Mode</label>
            <div class="toggle-group">
              <label class="toggle-item">
                <input
                  type="checkbox"
                  v-model="localSettings.interleaveLines"
                  @change="emitSave"
                />
                <span>Interleave lines (alternating Chinese/English lines)</span>
              </label>
              <p class="setting-description">
                When enabled, Chinese and English alternate line by line for
                easier parallel reading.
              </p>
            </div>
          </div>

          <div class="reset-row">
            <button class="reset-btn" @click="resetToDefaults">
              Reset to defaults
            </button>
          </div>
        </div>

        <div class="settings-modal-footer">
          <span class="autosave-note">Changes save automatically</span>
          <button class="done-btn" @click="close">Done</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { X, Minus, Plus, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  settings: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'save', 'reset'])

const localSettings = ref({
  fontSize: 18,
  selectedFont: 'NotoSansSC',
  showPinyin: true,
  showChinese: true,
  showEnglish: true,
  displayOrder: 'en-cn',
  interleaveLines: true,
  pinyinFontSize: 12,
  englishFontSize: 14,
  ...props.settings,
})

const isMobile = ref(false)
const isFontDropdownOpen = ref(false)
const fontSizePresets = [12, 14, 16, 18, 20, 24, 28, 32]
const pinyinPresets = [4, 6, 8, 10, 12, 14, 16, 18]
const englishPresets = [6, 8, 10, 12, 14, 16, 18, 20]

const fontOptions = [
  {
    value: 'NotoSansSC',
    label: 'Noto Sans SC',
    fontFamily: "'Noto Sans SC', 'Inter', sans-serif",
  },
  {
    value: 'NotoSerifSC',
    label: 'Noto Serif SC',
    fontFamily: "'Noto Serif SC', Georgia, serif",
  },
  {
    value: 'Inter',
    label: 'Inter',
    fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
  },
  {
    value: 'Roboto',
    label: 'Roboto',
    fontFamily: "'Roboto', 'Noto Sans SC', sans-serif",
  },
  {
    value: 'Poppins',
    label: 'Poppins',
    fontFamily: "'Poppins', 'Noto Sans SC', sans-serif",
  },
  {
    value: 'ZCOOLKuaiLe',
    label: 'ZCOOL KuaiLe',
    fontFamily: "'ZCOOL KuaiLe', cursive",
  },
  {
    value: 'MaShanZheng',
    label: 'Ma Shan Zheng',
    fontFamily: "'Ma Shan Zheng', cursive",
  },
]

const previewPairs = [
  { char: '你', pinyin: 'nǐ' },
  { char: '好', pinyin: 'hǎo' },
  { char: '，', pinyin: '' },
  { char: '这', pinyin: 'zhè' },
  { char: '是', pinyin: 'shì' },
  { char: '一', pinyin: 'yī' },
  { char: '个', pinyin: 'gè' },
  { char: '例', pinyin: 'lì' },
  { char: '子', pinyin: 'zi' },
  { char: '。', pinyin: '' },
]

let fontSizeTimeout = null

const getSelectedFontLabel = () => {
  const font = fontOptions.find(
    (item) => item.value === localSettings.value.selectedFont,
  )
  return font ? font.label : 'Noto Sans SC'
}

const getSelectedFontFamily = () => {
  const font = fontOptions.find(
    (item) => item.value === localSettings.value.selectedFont,
  )
  return font ? font.fontFamily : "'Noto Sans SC', sans-serif"
}

const toggleFontDropdown = () => {
  isFontDropdownOpen.value = !isFontDropdownOpen.value
}

const clampSubSizes = () => {
  const max = localSettings.value.fontSize
  if (localSettings.value.pinyinFontSize > max) {
    localSettings.value.pinyinFontSize = max
  }
  if (localSettings.value.englishFontSize > max) {
    localSettings.value.englishFontSize = max
  }
}

const emitSave = () => {
  if (fontSizeTimeout) clearTimeout(fontSizeTimeout)
  fontSizeTimeout = setTimeout(() => {
    emit('save', localSettings.value)
  }, 50)
}

const increaseFontSize = () => {
  if (localSettings.value.fontSize < 32) {
    localSettings.value.fontSize += 2
    clampSubSizes()
    emitSave()
  }
}

const decreaseFontSize = () => {
  if (localSettings.value.fontSize > 12) {
    localSettings.value.fontSize -= 2
    clampSubSizes()
    emitSave()
  }
}

const setFontSize = (size) => {
  localSettings.value.fontSize = size
  clampSubSizes()
  emitSave()
}

const increasePinyinSize = () => {
  if (localSettings.value.pinyinFontSize < localSettings.value.fontSize) {
    localSettings.value.pinyinFontSize += 1
    emitSave()
  }
}

const decreasePinyinSize = () => {
  if (localSettings.value.pinyinFontSize > 4) {
    localSettings.value.pinyinFontSize -= 1
    emitSave()
  }
}

const setPinyinSize = (size) => {
  if (size <= localSettings.value.fontSize) {
    localSettings.value.pinyinFontSize = size
    emitSave()
  }
}

const increaseEnglishSize = () => {
  if (localSettings.value.englishFontSize < localSettings.value.fontSize) {
    localSettings.value.englishFontSize += 1
    emitSave()
  }
}

const decreaseEnglishSize = () => {
  if (localSettings.value.englishFontSize > 4) {
    localSettings.value.englishFontSize -= 1
    emitSave()
  }
}

const setEnglishSize = (size) => {
  if (size <= localSettings.value.fontSize) {
    localSettings.value.englishFontSize = size
    emitSave()
  }
}

const handleFontChange = (fontValue) => {
  localSettings.value.selectedFont = fontValue
  isFontDropdownOpen.value = false
  emit('save', localSettings.value)
}

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleOverlayClick = () => {
  // Keep the modal open while the reader experiments with the live preview.
}

const close = () => {
  isFontDropdownOpen.value = false
  emit('close')
}

const resetToDefaults = () => {
  const defaults = {
    fontSize: 18,
    selectedFont: 'NotoSansSC',
    showPinyin: true,
    showChinese: true,
    showEnglish: true,
    displayOrder: 'en-cn',
    interleaveLines: true,
    pinyinFontSize: 12,
    englishFontSize: 14,
  }
  localSettings.value = { ...localSettings.value, ...defaults }
  emit('reset')
  emit('save', localSettings.value)
}

const handleEscape = (e) => {
  if (e.key === 'Escape' && props.isOpen) close()
}

const handleClickOutside = (e) => {
  if (!isFontDropdownOpen.value) return
  const wrapper = document.querySelector('.font-select-wrapper')
  if (wrapper && !wrapper.contains(e.target)) {
    isFontDropdownOpen.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      localSettings.value = { ...props.settings }
      clampSubSizes()
      isFontDropdownOpen.value = false
    }
  },
)

watch(
  () => props.settings,
  (newVal) => {
    if (props.isOpen) {
      localSettings.value = { ...newVal }
      clampSubSizes()
    }
  },
  { deep: true },
)

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('click', handleClickOutside)
  if (fontSizeTimeout) clearTimeout(fontSizeTimeout)
})
</script>

<style scoped>
.settings-modal-overlay {
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

.settings-modal {
  position: relative;
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 540px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #e9ecef;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-modal.mobile {
  width: 94%;
  max-height: 92vh;
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

.settings-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
}

.settings-modal-body::-webkit-scrollbar {
  width: 5px;
}

.settings-modal-body::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.22);
  border-radius: 20px;
}

.preview-card {
  margin-bottom: 24px;
  padding: 14px;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  background: #f8f9fa;
}

.preview-surface {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 14px;
}

.preview-chinese {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 4px;
  align-items: flex-end;
}

.preview-char {
  display: inline-flex;
  align-items: flex-end;
  gap: 1px;
}

.preview-hanzi {
  color: #1f2937;
  font-weight: 600;
  line-height: 1.2;
}

.preview-pinyin {
  color: #94a3b8;
  line-height: 1.2;
  margin-bottom: 2px;
}

.preview-english {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f5;
  color: #4b5563;
  line-height: 1.5;
}

.preview-order {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #94a3b8;
}

.preview-order span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 600;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.setting-description {
  margin-top: 8px;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.45;
}

.size-control-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.step-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e9ecef;
  background: white;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s;
}

.step-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #cbd5e1;
  transform: scale(1.05);
}

.step-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.size-value {
  min-width: 46px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn {
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid #e9ecef;
  background: white;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
}

.preset-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #cbd5e1;
}

.preset-btn.active {
  background: #eef1ff;
  border-color: #d8defb;
  color: #4a6cf7;
}

.preset-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.font-select-wrapper {
  position: relative;
}

.font-select {
  width: 100%;
  padding: 12px 14px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #495057;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.font-select:hover {
  background: #f8f9fa;
  border-color: #cbd5e1;
}

.chevron {
  transition: transform 0.2s;
  color: #94a3b8;
}

.chevron.open {
  transform: rotate(180deg);
}

.font-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
  max-height: 230px;
  overflow-y: auto;
  padding: 5px;
  animation: dropdownIn 0.16s ease;
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.font-dropdown-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #495057;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}

.font-dropdown-item:hover {
  background: #f8f9fa;
}

.font-dropdown-item.active {
  background: #eef1ff;
  color: #4a6cf7;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-item,
.radio-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
}

.toggle-item input,
.radio-item input {
  width: 17px;
  height: 17px;
  cursor: pointer;
  accent-color: #4a6cf7;
}

.radio-group {
  display: flex;
  gap: 22px;
}

.reset-row {
  margin-top: 4px;
}

.reset-btn {
  width: 100%;
  padding: 10px 18px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 9px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #fee2e2;
  transform: translateY(-1px);
}

.settings-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid #e9ecef;
  flex-shrink: 0;
}

.autosave-note {
  font-size: 11px;
  color: #adb5bd;
}

.done-btn {
  padding: 9px 22px;
  border: none;
  border-radius: 9px;
  background: #4a6cf7;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(74, 108, 247, 0.25);
}

.done-btn:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .settings-modal-body {
    padding: 20px;
  }

  .settings-modal-footer {
    padding: 12px 20px;
  }

  .radio-group {
    flex-direction: column;
    gap: 10px;
  }
}
</style>

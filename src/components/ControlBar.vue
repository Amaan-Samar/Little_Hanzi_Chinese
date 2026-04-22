<template>
  <div class="control-bar-wrapper" :class="{ 'hidden': isHidden, 'visible': !isHidden }">
    <div class="control-bar" :class="{ 'mobile': isMobile }">
      <!-- Rest of your template remains the same -->
      <div class="control-section left-section">
        <button class="control-btn" @click="handleClear" :title="isMobile ? 'Clear all' : 'Clear all text'">
          <Trash2 :size="isMobile ? 18 : 20" />
          <span v-if="!isMobile" class="btn-label">Clear</span>
        </button>

        <button class="control-btn" :class="{ 'active': showPinyin }" @click="handleTogglePinyin" :title="showPinyin ? 'Hide Pinyin' : 'Show Pinyin'">
          <Languages :size="isMobile ? 18 : 20" />
          <span v-if="!isMobile" class="btn-label">Pinyin</span>
        </button>

        <button class="control-btn" :class="{ 'active': showChinese }" @click="handleToggleChinese" :title="showChinese ? 'Hide Chinese' : 'Show Chinese'">
          <span class="custom-icon chinese-icon">文</span>
          <span v-if="!isMobile" class="btn-label">中文</span>
        </button>

        <button class="control-btn" :class="{ 'active': showEnglish }" @click="handleToggleEnglish" :title="showEnglish ? 'Hide English' : 'Show English'">
          <span class="custom-icon english-icon">EN</span>
          <span v-if="!isMobile" class="btn-label">English</span>
        </button>
      </div>

      <div class="control-section middle-section">
        <div class="order-dropdown">
          <button class="control-btn order-btn" @click="toggleOrderDropdown" :title="'Change display order - Current: ' + orderLabel">
            <ArrowLeftRight :size="isMobile ? 18 : 20" />
            <span v-if="!isMobile" class="btn-label">{{ orderLabel }}</span>
            <ChevronDown :size="isMobile ? 14 : 16" class="chevron" />
          </button>
          
          <div v-if="isOrderDropdownOpen" class="dropdown-menu" @click.stop>
            <button class="dropdown-item" :class="{ 'active': displayOrder === 'en-cn' }" @click="selectOrder('en-cn')">
              <span>EN → CN</span>
              <Check v-if="displayOrder === 'en-cn'" :size="16" />
            </button>
            <button class="dropdown-item" :class="{ 'active': displayOrder === 'cn-en' }" @click="selectOrder('cn-en')">
              <span>CN → EN</span>
              <Check v-if="displayOrder === 'cn-en'" :size="16" />
            </button>
          </div>
        </div>

        <div class="font-select-wrapper">
          <button class="control-btn font-btn" @click="toggleFontDropdown" :title="'Change font - Current: ' + currentFontName">
            <Type :size="isMobile ? 18 : 20" />
            <span v-if="!isMobile" class="btn-label">{{ currentFontShortName }}</span>
            <ChevronDown :size="isMobile ? 14 : 16" class="chevron" />
          </button>
          
          <div v-if="isFontDropdownOpen" class="dropdown-menu font-dropdown" @click.stop>
            <button v-for="font in fontOptions" :key="font.value" class="dropdown-item" :class="{ 'active': selectedFont === font.value }" @click="selectFont(font.value)" :style="{ fontFamily: font.fontFamily }">
              <span>{{ font.label }}</span>
              <Check v-if="selectedFont === font.value" :size="16" />
            </button>
          </div>
        </div>

        <div class="font-size-wrapper">
          <button class="control-btn size-btn" @click="toggleSizeControl" :title="'Font size: ' + fontSize + 'px'">
            <FontSize :size="isMobile ? 18 : 20" />
            <span v-if="!isMobile" class="btn-label">{{ fontSize }}px</span>
          </button>
          
          <div v-if="isSizeControlOpen" class="size-control-popup" @click.stop>
            <input type="range" v-model="localFontSize" min="12" max="32" step="1" class="size-slider" @input="updateFontSizeDebounced" />
            <span class="size-value">{{ localFontSize }}px</span>
          </div>
        </div>
      </div>

      <div class="control-section right-section">
        <button class="control-btn" @click="openSettingsModal" title="Settings">
          <Settings :size="isMobile ? 18 : 20" />
          <span v-if="!isMobile" class="btn-label">Settings</span>
        </button>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="modal-overlay" @click="closeSettingsModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Settings</h3>
          <button class="close-btn" @click="closeSettingsModal">×</button>
        </div>
        <div class="modal-body">
          <div class="setting-item">
            <label>Default View</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="localShowPinyin" @change="updateShowPinyin">
                <span>Show Pinyin by default</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="localShowChinese" @change="updateShowChinese">
                <span>Show Chinese by default</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="localShowEnglish" @change="updateShowEnglish">
                <span>Show English by default</span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <label>Default Display Order</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="localDisplayOrder" value="en-cn" @change="updateDisplayOrder">
                <span>English → Chinese</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="localDisplayOrder" value="cn-en" @change="updateDisplayOrder">
                <span>Chinese → English</span>
              </label>
            </div>
          </div>
          <button class="reset-btn" @click="handleResetSettings">
            Reset to Defaults
          </button>
        </div>
        <div class="modal-footer">
          <button class="save-btn" @click="saveSettingsAndClose">Save Settings</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Trash2, Languages, ArrowLeftRight, ChevronDown, Check, Settings, Type } from 'lucide-vue-next'

const FontSize = {
  template: '<span style="font-size: 18px; font-weight: 600;">Aa</span>'
}

const props = defineProps({
  showPinyin: { type: Boolean, required: true },
  showEnglish: { type: Boolean, required: true },
  showChinese: { type: Boolean, required: true },
  displayOrder: { type: String, required: true },
  fontSize: { type: Number, required: true },
  selectedFont: { type: String, required: true }
})

const emit = defineEmits([
  'clear', 'toggle-pinyin', 'toggle-english', 'toggle-chinese', 'toggle-order',
  'update-font-size', 'update-selected-font', 'reset-settings'
])

// UI State
const isOrderDropdownOpen = ref(false)
const isFontDropdownOpen = ref(false)
const isSizeControlOpen = ref(false)
const isMobile = ref(false)
const showSettingsModal = ref(false)
const isHidden = ref(false)

// FIXED: Better scroll handling with throttling and direction locking
let lastScrollY = ref(0)
let ticking = false
let scrollLock = false
let scrollLockTimeout = null

// Local copies for modals
const localFontSize = ref(props.fontSize)
const localShowPinyin = ref(props.showPinyin)
const localShowChinese = ref(props.showChinese)
const localShowEnglish = ref(props.showEnglish)
const localDisplayOrder = ref(props.displayOrder)

// Font options
const fontOptions = [
  { value: 'NotoSansSC', label: 'Noto Sans SC', fontFamily: "'Noto Sans SC', sans-serif" },
  { value: 'NotoSerifSC', label: 'Noto Serif SC', fontFamily: "'Noto Serif SC', serif" },
  { value: 'Inter', label: 'Inter', fontFamily: "'Inter', sans-serif" },
  { value: 'Roboto', label: 'Roboto', fontFamily: "'Roboto', sans-serif" },
  { value: 'Poppins', label: 'Poppins', fontFamily: "'Poppins', sans-serif" },
  { value: 'ZCOOLKuaiLe', label: 'ZCOOL KuaiLe', fontFamily: "'ZCOOL KuaiLe', cursive" },
  { value: 'MaShanZheng', label: 'Ma Shan Zheng', fontFamily: "'Ma Shan Zheng', cursive" }
]

const currentFontName = computed(() => {
  const font = fontOptions.find(f => f.value === props.selectedFont)
  return font ? font.label : 'Noto Sans SC'
})

const currentFontShortName = computed(() => {
  if (isMobile.value) return ''
  const name = currentFontName.value
  if (name.length > 12) return name.substring(0, 10) + '...'
  return name
})

const orderLabel = computed(() => {
  return props.displayOrder === 'en-cn' ? 'EN→CN' : 'CN→EN'
})

// FIXED: Throttled scroll handler with requestAnimationFrame
const handleScroll = () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.value
      
      // Only trigger if we've scrolled past a minimum threshold
      // and the scroll distance is significant
      if (Math.abs(delta) > 10 && !scrollLock) {
        if (delta > 0 && currentScrollY > 60) {
          // Scrolling down - hide
          isHidden.value = true
        } else if (delta < 0) {
          // Scrolling up - show
          isHidden.value = false
        }
      }
      
      lastScrollY.value = currentScrollY
      ticking = false
    })
    ticking = true
  }
}

// FIXED: Debounced scroll lock to prevent rapid show/hide
const lockScrollHandler = () => {
  scrollLock = true
  if (scrollLockTimeout) clearTimeout(scrollLockTimeout)
  scrollLockTimeout = setTimeout(() => {
    scrollLock = false
  }, 200)
}

// Wrap handleScroll with lock
let scrollEndTimeout = null
const onScroll = () => {
  lockScrollHandler()
  handleScroll()
  
  // Show control bar when scrolling stops
  if (scrollEndTimeout) clearTimeout(scrollEndTimeout)
  scrollEndTimeout = setTimeout(() => {
    if (isHidden.value) {
      isHidden.value = false
    }
  }, 500)
}

// Debounced font size update
let sizeUpdateTimeout = null
const updateFontSizeDebounced = () => {
  if (sizeUpdateTimeout) clearTimeout(sizeUpdateTimeout)
  sizeUpdateTimeout = setTimeout(() => {
    emit('update-font-size', localFontSize.value)
  }, 100)
}

const toggleOrderDropdown = () => {
  isOrderDropdownOpen.value = !isOrderDropdownOpen.value
  isFontDropdownOpen.value = false
  isSizeControlOpen.value = false
}

const toggleFontDropdown = () => {
  isFontDropdownOpen.value = !isFontDropdownOpen.value
  isOrderDropdownOpen.value = false
  isSizeControlOpen.value = false
}

const toggleSizeControl = () => {
  isSizeControlOpen.value = !isSizeControlOpen.value
  isOrderDropdownOpen.value = false
  isFontDropdownOpen.value = false
}

const selectOrder = (order) => {
  if (order !== props.displayOrder) {
    emit('toggle-order')
  }
  isOrderDropdownOpen.value = false
}

const selectFont = (font) => {
  if (font !== props.selectedFont) {
    emit('update-selected-font', font)
  }
  isFontDropdownOpen.value = false
}

const handleClear = () => {
  emit('clear')
  isOrderDropdownOpen.value = false
  isFontDropdownOpen.value = false
  isSizeControlOpen.value = false
}

const handleTogglePinyin = () => emit('toggle-pinyin')
const handleToggleEnglish = () => emit('toggle-english')
const handleToggleChinese = () => emit('toggle-chinese')

const openSettingsModal = () => {
  localShowPinyin.value = props.showPinyin
  localShowChinese.value = props.showChinese
  localShowEnglish.value = props.showEnglish
  localDisplayOrder.value = props.displayOrder
  showSettingsModal.value = true
  isOrderDropdownOpen.value = false
  isFontDropdownOpen.value = false
  isSizeControlOpen.value = false
}

const closeSettingsModal = () => {
  showSettingsModal.value = false
}

const updateShowPinyin = () => {
  if (localShowPinyin.value !== props.showPinyin) {
    emit('toggle-pinyin')
  }
}

const updateShowChinese = () => {
  if (localShowChinese.value !== props.showChinese) {
    emit('toggle-chinese')
  }
}

const updateShowEnglish = () => {
  if (localShowEnglish.value !== props.showEnglish) {
    emit('toggle-english')
  }
}

const updateDisplayOrder = () => {
  if (localDisplayOrder.value !== props.displayOrder) {
    emit('toggle-order')
  }
}

const saveSettingsAndClose = () => {
  showSettingsModal.value = false
}

const handleResetSettings = () => {
  emit('reset-settings')
  localFontSize.value = 15
  localShowPinyin.value = true
  localShowChinese.value = true
  localShowEnglish.value = true
  localDisplayOrder.value = 'en-cn'
  showSettingsModal.value = false
}

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    isOrderDropdownOpen.value = false
    isFontDropdownOpen.value = false
    isSizeControlOpen.value = false
  }
}

const handleClickOutside = (event) => {
  if (isOrderDropdownOpen.value && !event.target.closest('.order-dropdown')) {
    isOrderDropdownOpen.value = false
  }
  if (isFontDropdownOpen.value && !event.target.closest('.font-select-wrapper')) {
    isFontDropdownOpen.value = false
  }
  if (isSizeControlOpen.value && !event.target.closest('.font-size-wrapper')) {
    isSizeControlOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', handleClickOutside)
  if (sizeUpdateTimeout) clearTimeout(sizeUpdateTimeout)
  if (scrollLockTimeout) clearTimeout(scrollLockTimeout)
})
</script>

<style scoped>
.control-bar-wrapper {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  max-width: 1200px;
  width: calc(100% - 40px);
  margin: 0 auto;
  will-change: transform, opacity;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.control-bar-wrapper.hidden {
  transform: translateX(-50%) translateY(calc(-100% - 20px));
  opacity: 0;
  pointer-events: none;
}

.control-bar-wrapper.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
  pointer-events: auto;
}

/* Rest of your styles remain the same */
.control-bar {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.control-bar.mobile {
  padding: 8px 12px;
  gap: 8px;
}

.control-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.control-bar.mobile .control-section {
  gap: 6px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
  white-space: nowrap;
}

.control-bar.mobile .control-btn {
  padding: 8px;
  min-width: 40px;
  justify-content: center;
}

.control-btn:hover {
  background: #e9ecef;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-btn.active {
  background: #4a6cf7;
  border-color: #4a6cf7;
  color: white;
}

.control-btn.active:hover {
  background: #3a5ce8;
}

.btn-label {
  display: inline-block;
}

.control-bar.mobile .btn-label {
  display: none;
}

.custom-icon {
  font-weight: bold;
}

.chinese-icon {
  font-size: 16px;
}

.english-icon {
  font-size: 12px;
  font-weight: 600;
}

.order-dropdown,
.font-select-wrapper,
.font-size-wrapper {
  position: relative;
}

.chevron {
  transition: transform 0.2s;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 160px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e9ecef;
  overflow: hidden;
  z-index: 1000;
  animation: slideDown 0.2s ease;
}

.font-dropdown {
  min-width: 180px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item.active {
  background: #4a6cf7;
  color: white;
}

.size-control-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e9ecef;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  animation: slideDown 0.2s ease;
  min-width: 160px;
}

.size-slider {
  flex: 1;
  cursor: pointer;
}

.size-value {
  min-width: 45px;
  font-size: 14px;
  font-weight: 500;
  color: #4a6cf7;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
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

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.setting-item {
  margin-bottom: 24px;
}

.setting-item label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.checkbox-group,
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label,
.radio-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
}

.checkbox-label input,
.radio-label input {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #fecaca;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
}

.save-btn {
  width: 100%;
  padding: 12px;
  background: #4a6cf7;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #3a5ce8;
}

.main-content {
  display: block;
  padding-top: 70px; /* Add space for fixed control bar */
}

@media (max-width: 768px) {
  .main-content {
    padding-top: 60px;
  }
}

@media (max-width: 768px) {
  .control-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-section {
    justify-content: center;
  }
  
  .left-section,
  .middle-section,
  .right-section {
    justify-content: center;
  }
  
  .middle-section {
    flex-wrap: wrap;
  }
  
  .size-control-popup {
    left: auto;
    right: 0;
    transform: none;
  }
}

@media (max-width: 480px) {
  .control-bar {
    padding: 6px 10px;
  }
  
  .control-btn {
    padding: 6px;
    min-width: 36px;
  }
}
</style>
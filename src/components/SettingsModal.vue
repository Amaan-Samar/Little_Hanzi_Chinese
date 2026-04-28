<template>
  <Teleport to="body">
    <div v-if="isOpen" class="settings-modal-overlay" @click="handleOverlayClick">
      <div class="settings-modal" :class="{ 'mobile': isMobile }" @click.stop>
        <div class="settings-modal-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="close">
            <X :size="24" />
          </button>
        </div>

        <div class="settings-modal-body">
          <!-- Font Size -->
          <div class="setting-group">
            <label class="setting-label">Font Size</label>
            <div class="font-size-control">
              <input 
                type="range" 
                v-model="localSettings.fontSize" 
                min="12" 
                max="32" 
                step="1" 
                class="size-slider"
              />
              <span class="size-value">{{ localSettings.fontSize }}px</span>
            </div>
          </div>

          <!-- Font Family -->
          <div class="setting-group">
            <label class="setting-label">Font Family</label>
            <div class="font-options-grid">
              <button
                v-for="font in fontOptions"
                :key="font.value"
                class="font-option"
                :class="{ active: localSettings.selectedFont === font.value }"
                :style="{ fontFamily: font.fontFamily }"
                @click="localSettings.selectedFont = font.value"
              >
                {{ font.label }}
              </button>
            </div>
          </div>

          <!-- Display Sections -->
          <div class="setting-group">
            <label class="setting-label">Display Sections</label>
            <div class="toggle-group">
              <label class="toggle-item">
                <input type="checkbox" v-model="localSettings.showPinyin">
                <span>Show Pinyin</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="localSettings.showChinese">
                <span>Show Chinese</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="localSettings.showEnglish">
                <span>Show English</span>
              </label>
            </div>
          </div>

          <!-- Display Order -->
          <div class="setting-group">
            <label class="setting-label">Display Order</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="localSettings.displayOrder" value="en-cn">
                <span>English → Chinese</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="localSettings.displayOrder" value="cn-en">
                <span>Chinese → English</span>
              </label>
            </div>
          </div>
        </div>

        <div class="settings-modal-footer">
          <button class="reset-btn" @click="resetToDefaults">
            Reset to Defaults
          </button>
          <div class="action-buttons">
            <button class="cancel-btn" @click="close">
              Cancel
            </button>
            <button class="save-btn" @click="save">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && 
        typeof value.fontSize === 'number' &&
        typeof value.selectedFont === 'string' &&
        typeof value.showPinyin === 'boolean' &&
        typeof value.showChinese === 'boolean' &&
        typeof value.showEnglish === 'boolean' &&
        typeof value.displayOrder === 'string'
    }
  }
})

const emit = defineEmits(['close', 'save', 'reset'])

const localSettings = ref({ ...props.settings })
const isMobile = ref(false)

const fontOptions = [
  { value: 'NotoSansSC', label: 'Noto Sans SC', fontFamily: "'Noto Sans SC', sans-serif" },
  { value: 'NotoSerifSC', label: 'Noto Serif SC', fontFamily: "'Noto Serif SC', serif" },
  { value: 'Inter', label: 'Inter', fontFamily: "'Inter', sans-serif" },
  { value: 'Roboto', label: 'Roboto', fontFamily: "'Roboto', sans-serif" },
  { value: 'Poppins', label: 'Poppins', fontFamily: "'Poppins', sans-serif" },
  { value: 'ZCOOLKuaiLe', label: 'ZCOOL KuaiLe', fontFamily: "'ZCOOL KuaiLe', cursive" },
  { value: 'MaShanZheng', label: 'Ma Shan Zheng', fontFamily: "'Ma Shan Zheng', cursive" }
]

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleOverlayClick = () => {
  close()
}

const close = () => {
  emit('close')
}

const save = () => {
  emit('save', localSettings.value)
}

const resetToDefaults = () => {
  emit('reset')
  localSettings.value = {
    fontSize: 15,
    selectedFont: 'NotoSansSC',
    showPinyin: true,
    showChinese: true,
    showEnglish: true,
    displayOrder: 'en-cn'
  }
}

// Handle escape key
const handleEscape = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

// Reset local settings when modal opens with new props
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    localSettings.value = { ...props.settings }
  }
})

watch(() => props.settings, (newVal) => {
  if (props.isOpen) {
    localSettings.value = { ...newVal }
  }
}, { deep: true })

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
.settings-modal-overlay {
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

.settings-modal {
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 550px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.settings-modal.mobile {
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

.settings-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.settings-modal-header h2 {
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

.settings-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.setting-group {
  margin-bottom: 32px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.font-size-control {
  display: flex;
  align-items: center;
  gap: 16px;
}

.size-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #e9ecef;
  cursor: pointer;
  -webkit-appearance: none;
}

.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a6cf7;
  cursor: pointer;
  transition: all 0.2s;
}

.size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.size-value {
  font-size: 14px;
  font-weight: 600;
  color: #4a6cf7;
  min-width: 45px;
  text-align: center;
}

.font-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.font-option {
  padding: 10px 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.font-option:hover {
  background: #e9ecef;
  border-color: #4a6cf7;
}

.font-option.active {
  background: #4a6cf7;
  border-color: #4a6cf7;
  color: white;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 15px;
  color: #495057;
}

.toggle-item input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.toggle-item span {
  cursor: pointer;
}

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 15px;
  color: #495057;
}

.radio-item input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-item span {
  cursor: pointer;
}

.settings-modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.reset-btn {
  padding: 10px 20px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

.cancel-btn {
  padding: 10px 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  color: #495057;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #e9ecef;
}

.save-btn {
  padding: 10px 24px;
  background: #4a6cf7;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 108, 247, 0.3);
}

@media (max-width: 768px) {
  .settings-modal-header {
    padding: 16px 20px;
  }
  
  .settings-modal-body {
    padding: 20px;
  }
  
  .settings-modal-footer {
    padding: 16px 20px;
    flex-direction: column;
  }
  
  .action-buttons {
    width: 100%;
  }
  
  .cancel-btn,
  .save-btn,
  .reset-btn {
    flex: 1;
  }
  
  .font-options-grid {
    grid-template-columns: 1fr;
  }
  
  .radio-group {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
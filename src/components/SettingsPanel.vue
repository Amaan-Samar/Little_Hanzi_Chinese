<template>
  <div class="settings-panel">
    <!-- Fonts ------------------------------------------------------------->
    <template v-if="showFonts">
      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Live preview</h3>
            <p>See exactly how your articles will read.</p>
          </div>
          <span class="saved-pill">Auto-saved</span>
        </div>

        <div class="preview-surface" :style="{ fontFamily: selectedFontFamily }">
          <div class="preview-chinese">
            <span v-for="pair in previewPairs" :key="pair.char" class="preview-char">
              <span class="preview-hanzi" :style="{ fontSize: `${local.fontSize}px` }">
                {{ pair.char }}
              </span>
              <span
                v-if="local.showPinyin"
                class="preview-pinyin"
                :style="{ fontSize: `${Math.min(local.pinyinFontSize, local.fontSize)}px` }"
              >
                {{ pair.pinyin }}
              </span>
            </span>
          </div>
          <div v-if="local.showEnglish" class="preview-english">
            <span :style="{ fontSize: `${Math.min(local.englishFontSize, local.fontSize)}px` }">
              Hello, this is a preview of your reading view.
            </span>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Chinese size</h3>
            <p>Size of the Hanzi characters.</p>
          </div>
          <span class="size-badge">{{ local.fontSize }}px</span>
        </div>
        <div class="size-control-row">
          <button
            class="step-btn"
            :disabled="local.fontSize <= 12"
            title="Smaller"
            @click="stepFontSize(-2)"
          >
            <Minus :size="16" />
          </button>
          <input
            v-model.number="local.fontSize"
            type="range"
            min="12"
            max="32"
            step="1"
            class="size-slider"
            @input="onFontSizeInput"
          />
          <button
            class="step-btn"
            :disabled="local.fontSize >= 32"
            title="Larger"
            @click="stepFontSize(2)"
          >
            <Plus :size="16" />
          </button>
        </div>
        <div class="preset-row">
          <button
            v-for="size in fontSizePresets"
            :key="size"
            class="preset-btn"
            :class="{ active: local.fontSize === size }"
            @click="setFontSize(size)"
          >
            {{ size }}
          </button>
        </div>
      </section>

      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Pinyin size</h3>
            <p>Small text beside each character.</p>
          </div>
          <span class="size-badge">{{ local.pinyinFontSize }}px</span>
        </div>
        <div class="size-control-row">
          <button
            class="step-btn"
            :disabled="local.pinyinFontSize <= 4"
            title="Smaller"
            @click="stepSubSize('pinyin', -1)"
          >
            <Minus :size="16" />
          </button>
          <input
            v-model.number="local.pinyinFontSize"
            type="range"
            min="4"
            :max="local.fontSize"
            step="1"
            class="size-slider"
            @input="emitSave"
          />
          <button
            class="step-btn"
            :disabled="local.pinyinFontSize >= local.fontSize"
            title="Larger"
            @click="stepSubSize('pinyin', 1)"
          >
            <Plus :size="16" />
          </button>
        </div>
        <p class="setting-description">Maximum {{ local.fontSize }}px, the same as the Hanzi.</p>
      </section>

      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>English size</h3>
            <p>Size of the translation text.</p>
          </div>
          <span class="size-badge">{{ local.englishFontSize }}px</span>
        </div>
        <div class="size-control-row">
          <button
            class="step-btn"
            :disabled="local.englishFontSize <= 4"
            title="Smaller"
            @click="stepSubSize('english', -1)"
          >
            <Minus :size="16" />
          </button>
          <input
            v-model.number="local.englishFontSize"
            type="range"
            min="4"
            :max="local.fontSize"
            step="1"
            class="size-slider"
            @input="emitSave"
          />
          <button
            class="step-btn"
            :disabled="local.englishFontSize >= local.fontSize"
            title="Larger"
            @click="stepSubSize('english', 1)"
          >
            <Plus :size="16" />
          </button>
        </div>
        <p class="setting-description">Maximum {{ local.fontSize }}px, the same as the Hanzi.</p>
      </section>

      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Font family</h3>
            <p>Choose how Hanzi are drawn.</p>
          </div>
        </div>
        <div ref="fontSelectWrapper" class="font-select-wrapper">
          <button
            class="font-select"
            :style="{ fontFamily: selectedFontFamily }"
            @click="isFontDropdownOpen = !isFontDropdownOpen"
          >
            <span>{{ selectedFontLabel }}</span>
            <ChevronDown :size="16" class="chevron" :class="{ open: isFontDropdownOpen }" />
          </button>
          <div v-if="isFontDropdownOpen" class="font-dropdown">
            <button
              v-for="font in fontOptions"
              :key="font.value"
              class="font-dropdown-item"
              :class="{ active: local.selectedFont === font.value }"
              :style="{ fontFamily: font.fontFamily }"
              @click="chooseFont(font.value)"
            >
              {{ font.label }}
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- Display ----------------------------------------------------------->
    <template v-if="showDisplay">
      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Reading layout</h3>
            <p>Turn sections on or off and choose their order.</p>
          </div>
        </div>

        <label class="setting-label">Visible sections</label>
        <div class="toggle-group">
          <label class="toggle-item">
            <input v-model="local.showPinyin" type="checkbox" @change="emitSave" />
            <span>Pinyin</span>
          </label>
          <label class="toggle-item">
            <input v-model="local.showChinese" type="checkbox" @change="emitSave" />
            <span>Chinese</span>
          </label>
          <label class="toggle-item">
            <input v-model="local.showEnglish" type="checkbox" @change="emitSave" />
            <span>English</span>
          </label>
        </div>

        <label class="setting-label setting-label-spaced">Display order</label>
        <div class="radio-group">
          <label class="radio-item">
            <input v-model="local.displayOrder" type="radio" value="en-cn" @change="emitSave" />
            <span>English → Chinese</span>
          </label>
          <label class="radio-item">
            <input v-model="local.displayOrder" type="radio" value="cn-en" @change="emitSave" />
            <span>Chinese → English</span>
          </label>
        </div>
      </section>

      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Interleave lines</h3>
            <p>Alternate Chinese and English line by line inside each paragraph.</p>
          </div>
        </div>
        <label class="switch-row">
          <span class="switch-copy">
            <strong>{{ local.interleaveLines ? 'On' : 'Off' }}</strong>
            <span>
              {{
                local.interleaveLines
                  ? 'Each translation line sits directly under its Chinese line.'
                  : 'Whole paragraphs are shown one after another.'
              }}
            </span>
          </span>
          <input
            v-model="local.interleaveLines"
            type="checkbox"
            class="switch-input"
            @change="emitSave"
          />
          <span class="switch-track" :class="{ on: local.interleaveLines }">
            <span class="switch-thumb"></span>
          </span>
        </label>
      </section>

      <section class="panel-card">
        <div class="card-head">
          <div>
            <h3>Reset</h3>
            <p>Return fonts and layout to their defaults.</p>
          </div>
        </div>
        <button class="reset-btn" @click="resetAll">Reset to defaults</button>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Minus, Plus, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
  section: {
    type: String,
    default: 'all', // all | fonts | display
  },
})

const emit = defineEmits(['save', 'reset'])

const showFonts = computed(() => props.section === 'all' || props.section === 'fonts')
const showDisplay = computed(() => props.section === 'all' || props.section === 'display')

const local = ref({ ...props.settings })
const isFontDropdownOpen = ref(false)
const fontSelectWrapper = ref(null)

const fontSizePresets = [12, 14, 16, 18, 20, 24, 28, 32]

const fontOptions = [
  { value: 'NotoSansSC', label: 'Noto Sans SC', fontFamily: "'Noto Sans SC', 'Inter', sans-serif" },
  { value: 'NotoSerifSC', label: 'Noto Serif SC', fontFamily: "'Noto Serif SC', Georgia, serif" },
  { value: 'Inter', label: 'Inter', fontFamily: "'Inter', 'Noto Sans SC', sans-serif" },
  { value: 'Roboto', label: 'Roboto', fontFamily: "'Roboto', 'Noto Sans SC', sans-serif" },
  { value: 'Poppins', label: 'Poppins', fontFamily: "'Poppins', 'Noto Sans SC', sans-serif" },
  { value: 'ZCOOLKuaiLe', label: 'ZCOOL KuaiLe', fontFamily: "'ZCOOL KuaiLe', cursive" },
  { value: 'MaShanZheng', label: 'Ma Shan Zheng', fontFamily: "'Ma Shan Zheng', cursive" },
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
  { char: '子', pinyin: 'zì' },
  { char: '。', pinyin: '' },
]

const selectedFont = computed(
  () => fontOptions.find((font) => font.value === local.value.selectedFont) || fontOptions[0],
)
const selectedFontLabel = computed(() => selectedFont.value.label)
const selectedFontFamily = computed(() => selectedFont.value.fontFamily)

const clampLocal = () => {
  if (local.value.pinyinFontSize > local.value.fontSize) {
    local.value.pinyinFontSize = local.value.fontSize
  }
  if (local.value.englishFontSize > local.value.fontSize) {
    local.value.englishFontSize = local.value.fontSize
  }
}

const emitSave = () => {
  clampLocal()
  emit('save', { ...local.value })
}

const onFontSizeInput = () => {
  clampLocal()
  emitSave()
}

const stepFontSize = (delta) => {
  const next = Number(local.value.fontSize) + delta
  local.value.fontSize = Math.min(32, Math.max(12, next))
  clampLocal()
  emitSave()
}

const setFontSize = (size) => {
  local.value.fontSize = size
  clampLocal()
  emitSave()
}

const stepSubSize = (key, delta) => {
  const field = key === 'pinyin' ? 'pinyinFontSize' : 'englishFontSize'
  const minimum = 4
  const maximum = local.value.fontSize
  local.value[field] = Math.min(maximum, Math.max(minimum, local.value[field] + delta))
  emitSave()
}

const chooseFont = (value) => {
  local.value.selectedFont = value
  isFontDropdownOpen.value = false
  emitSave()
}

const resetAll = () => {
  isFontDropdownOpen.value = false
  emit('reset')
}

watch(
  () => props.settings,
  (next) => {
    local.value = { ...next }
    clampLocal()
  },
  { deep: true },
)

const handleClickOutside = (event) => {
  if (!isFontDropdownOpen.value) return
  if (fontSelectWrapper.value && !fontSelectWrapper.value.contains(event.target)) {
    isFontDropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-card {
  padding: 18px;
  border-radius: 16px;
  background: white;
  border: 1px solid #e9ecef;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.card-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.card-head p {
  margin: 3px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: #94a3b8;
}

.saved-pill,
.size-badge {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.saved-pill {
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  color: #04855b;
}

.size-badge {
  background: #eef1ff;
  border: 1px solid #d8defb;
  color: #4a6cf7;
}

.preview-surface {
  padding: 16px;
  border-radius: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
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
  line-height: 1.25;
}

.preview-pinyin {
  color: #94a3b8;
  line-height: 1.25;
  margin-bottom: 2px;
}

.preview-english {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
  color: #4b5563;
  line-height: 1.5;
}

.size-control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.step-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
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

.size-slider {
  flex: 1;
  min-width: 0;
  accent-color: #4a6cf7;
  cursor: pointer;
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

.setting-description {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #94a3b8;
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

.setting-label {
  display: block;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.setting-label-spaced {
  margin-top: 18px;
}

.toggle-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.toggle-item,
.radio-item {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  font-size: 13.5px;
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
  flex-wrap: wrap;
  gap: 12px 22px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}

.switch-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-copy strong {
  font-size: 13.5px;
  color: #1f2937;
}

.switch-copy span {
  font-size: 11.5px;
  line-height: 1.45;
  color: #94a3b8;
}

.switch-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  width: 44px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #e2e8f0;
  padding: 3px;
  transition: background 0.2s;
}

.switch-track.on {
  background: #4a6cf7;
}

.switch-thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s;
}

.switch-track.on .switch-thumb {
  transform: translateX(18px);
}

.reset-btn {
  width: 100%;
  padding: 11px 18px;
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
</style>

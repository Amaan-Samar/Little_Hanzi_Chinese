import { ref, watch } from 'vue'

const STORAGE_KEY = 'littleHanzi_settings'

export function useSettings() {
  // Load saved settings or use defaults
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    return null
  }

  const saveSettings = (settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // Default settings
  const defaultSettings = {
    fontSize: 15,
    selectedFont: 'NotoSansSC',
    showPinyin: true,
    showEnglish: true,
    showChinese: true,
    displayOrder: 'en-cn'
  }

  const savedSettings = loadSettings()
  
  // Create reactive settings with saved values or defaults
  const fontSize = ref(savedSettings?.fontSize ?? defaultSettings.fontSize)
  const selectedFont = ref(savedSettings?.selectedFont ?? defaultSettings.selectedFont)
  const showPinyin = ref(savedSettings?.showPinyin ?? defaultSettings.showPinyin)
  const showEnglish = ref(savedSettings?.showEnglish ?? defaultSettings.showEnglish)
  const showChinese = ref(savedSettings?.showChinese ?? defaultSettings.showChinese)
  const displayOrder = ref(savedSettings?.displayOrder ?? defaultSettings.displayOrder)

  // Save settings whenever any setting changes
  const saveCurrentSettings = () => {
    saveSettings({
      fontSize: fontSize.value,
      selectedFont: selectedFont.value,
      showPinyin: showPinyin.value,
      showEnglish: showEnglish.value,
      showChinese: showChinese.value,
      displayOrder: displayOrder.value
    })
  }

  // Watch all settings and save on change
  watch([fontSize, selectedFont, showPinyin, showEnglish, showChinese, displayOrder], () => {
    saveCurrentSettings()
  }, { deep: true })

  // Reset to defaults
  const resetSettings = () => {
    fontSize.value = defaultSettings.fontSize
    selectedFont.value = defaultSettings.selectedFont
    showPinyin.value = defaultSettings.showPinyin
    showEnglish.value = defaultSettings.showEnglish
    showChinese.value = defaultSettings.showChinese
    displayOrder.value = defaultSettings.displayOrder
  }

  return {
    fontSize,
    selectedFont,
    showPinyin,
    showEnglish,
    showChinese,
    displayOrder,
    resetSettings,
    saveCurrentSettings
  }
}
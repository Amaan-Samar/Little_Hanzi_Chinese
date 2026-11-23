import { ref, watch } from 'vue'

const STORAGE_KEY = 'littleHanzi_settings'

const CHINESE_FONTS = [
  'NotoSansSC',
  'NotoSerifSC',
  'Inter',
  'Roboto',
  'Poppins',
  'ZCOOLKuaiLe',
  'MaShanZheng',
]

export function useSettings() {
  // Load saved settings or use defaults
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const fontSize = Number(parsed.fontSize) || 18
        // Older builds scaled pinyin and English from the main size. Keep
        // those proportions when the dedicated size controls are first added.
        const fallbackSubSize = Math.max(4, Math.round(fontSize * 0.8))

        // Ensure all properties exist (for backwards compatibility).
        // `interleaveLines` must stay a real boolean: `false ?? true` is
        // false, but a malformed string would silently change the layout.
        return {
          fontSize,
          selectedFont: CHINESE_FONTS.includes(parsed.selectedFont)
            ? parsed.selectedFont
            : 'NotoSansSC',
          showPinyin: parsed.showPinyin !== false,
          showEnglish: parsed.showEnglish !== false,
          showChinese: parsed.showChinese !== false,
          displayOrder:
            parsed.displayOrder === 'cn-en' ? 'cn-en' : 'en-cn',
          interleaveLines:
            typeof parsed.interleaveLines === 'boolean'
              ? parsed.interleaveLines
              : true,
          pinyinFontSize: Math.min(
            Number(parsed.pinyinFontSize ?? parsed.romanizationFontSize) ||
              fallbackSubSize,
            fontSize,
          ),
          englishFontSize: Math.min(
            Number(parsed.englishFontSize) || fallbackSubSize,
            fontSize,
          ),
          displayName:
            typeof parsed.displayName === 'string'
              ? parsed.displayName.slice(0, 40)
              : '',
        }
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
    fontSize: 18,
    selectedFont: 'NotoSansSC',
    showPinyin: true,
    showEnglish: true,
    showChinese: true,
    displayOrder: 'en-cn',
    interleaveLines: true,
    pinyinFontSize: 12,
    englishFontSize: 14,
    displayName: '',
  }

  const savedSettings = loadSettings()

  // Create reactive settings with saved values or defaults
  const fontSize = ref(savedSettings?.fontSize ?? defaultSettings.fontSize)
  const selectedFont = ref(
    savedSettings?.selectedFont ?? defaultSettings.selectedFont,
  )
  const showPinyin = ref(
    savedSettings?.showPinyin ?? defaultSettings.showPinyin,
  )
  const showEnglish = ref(
    savedSettings?.showEnglish ?? defaultSettings.showEnglish,
  )
  const showChinese = ref(
    savedSettings?.showChinese ?? defaultSettings.showChinese,
  )
  const displayOrder = ref(
    savedSettings?.displayOrder ?? defaultSettings.displayOrder,
  )
  const interleaveLines = ref(
    savedSettings?.interleaveLines ?? defaultSettings.interleaveLines,
  )
  const pinyinFontSize = ref(
    savedSettings?.pinyinFontSize ?? defaultSettings.pinyinFontSize,
  )
  const englishFontSize = ref(
    savedSettings?.englishFontSize ?? defaultSettings.englishFontSize,
  )
  const displayName = ref(
    savedSettings?.displayName ?? defaultSettings.displayName,
  )

  // Save settings whenever any setting changes
  const saveCurrentSettings = () => {
    saveSettings({
      fontSize: fontSize.value,
      selectedFont: selectedFont.value,
      showPinyin: showPinyin.value,
      showEnglish: showEnglish.value,
      showChinese: showChinese.value,
      displayOrder: displayOrder.value,
      interleaveLines: interleaveLines.value,
      pinyinFontSize: pinyinFontSize.value,
      englishFontSize: englishFontSize.value,
      displayName: displayName.value,
    })
  }

  // The secondary text must never grow larger than the Chinese characters.
  watch(
    fontSize,
    (size) => {
      if (pinyinFontSize.value > size) pinyinFontSize.value = size
      if (englishFontSize.value > size) englishFontSize.value = size
    },
    { immediate: true },
  )

  // Watch all settings and save on change
  watch(
    [
      fontSize,
      selectedFont,
      showPinyin,
      showEnglish,
      showChinese,
      displayOrder,
      interleaveLines,
      pinyinFontSize,
      englishFontSize,
      displayName,
    ],
    () => {
      saveCurrentSettings()
    },
    // Persist synchronously so a quick tab close cannot race the write.
    { deep: true, flush: 'sync' },
  )

  // Reset to defaults. The profile name is owned by the profile page, so it
  // is intentionally left alone here.
  const resetSettings = () => {
    fontSize.value = defaultSettings.fontSize
    selectedFont.value = defaultSettings.selectedFont
    showPinyin.value = defaultSettings.showPinyin
    showEnglish.value = defaultSettings.showEnglish
    showChinese.value = defaultSettings.showChinese
    displayOrder.value = defaultSettings.displayOrder
    interleaveLines.value = defaultSettings.interleaveLines
    pinyinFontSize.value = defaultSettings.pinyinFontSize
    englishFontSize.value = defaultSettings.englishFontSize
  }

  return {
    fontSize,
    selectedFont,
    showPinyin,
    showEnglish,
    showChinese,
    displayOrder,
    interleaveLines,
    pinyinFontSize,
    englishFontSize,
    displayName,
    resetSettings,
    saveCurrentSettings,
  }
}

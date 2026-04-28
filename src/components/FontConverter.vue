<template>
  <div class="converter-wrapper">
    <!-- Header with Logo and Settings -->
    <div class="app-header">
      <div class="logo-section">
        <h1 class="logo">LittleHanzi</h1>
      </div>
      <button class="settings-icon-btn" @click="openSettingsModal" title="Settings">
        <Settings :size="24" />
      </button>
    </div>

    <div class="main-content">
      <div class="input-display-row">
        <!-- Chinese Text Input -->
        <div class="text-section" :style="{fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
          <div class="input-wrapper">
            <textarea 
              v-model="inputText" 
              placeholder="Enter Chinese text here..." 
              class="text-input w-full" 
              @input="adjustHeight"
              ref="chineseTextarea"
            ></textarea>
            <button 
              v-if="inputText.trim()" 
              @click="openEditModal('chinese')" 
              class="edit-btn"
              title="Edit in popup"
            >
              <EditIcon :size="16" />
            </button>
          </div>
          <button @click="clearOrPasteText('chinese')" class="action-btn">
            {{ inputText.trim() ? 'Clear' : 'Paste' }}
          </button>
        </div>

        <!-- English Translation Input -->
        <div class="text-section" :style="{fontSize: `${fontSize}px` }">
          <div class="input-wrapper">
            <textarea 
              v-model="englishText" 
              placeholder="Enter English translation here..." 
              class="text-input w-full english-input" 
              @input="adjustEnglishHeight"
              ref="englishTextarea"
            ></textarea>
            <button 
              v-if="englishText.trim()" 
              @click="openEditModal('english')" 
              class="edit-btn"
              title="Edit in popup"
            >
              <EditIcon :size="16" />
            </button>
          </div>
          <button @click="clearOrPasteText('english')" class="action-btn">
            {{ englishText.trim() ? 'Clear' : 'Paste' }}
          </button>
        </div>
      </div>

      <!-- Edit Modal -->
      <EditModal
        :isOpen="isEditModalOpen"
        :title="editModalTitle"
        :content="editModalContent"
        :fontSize="Number(fontSize)"
        :fontFamily="getFontFamily"
        @close="closeEditModal"
        @save="saveEditModalContent"
      />

      <!-- Settings Modal -->
      <SettingsModal
        :isOpen="isSettingsModalOpen"
        :settings="settings"
        @close="closeSettingsModal"
        @save="saveSettings"
        @reset="resetToDefaults"
      />

      <div v-if="inputText.trim() && (showEnglish || showChinese)" class="comparison-section">
        <div class="comparison-display relative">
          <template v-if="comparisonData && Object.keys(comparisonData).length">
            <div v-for="(block, sentenceId) in comparisonData" :key="sentenceId" class="comparison-block relative">
              
              <!-- Render based on display order and visibility toggles -->
              <template v-if="displayOrder === 'en-cn'">
                <!-- English first, then Chinese -->
                <div v-if="showEnglish && englishSegments[sentenceId]" class="english-translation-box">
                  <div class="english-text" :style="{ fontSize: `${fontSize * 0.8}px`, lineHeight: '1.1' }">
                    {{ englishSegments[sentenceId] }}
                  </div>
                </div>

                <div v-if="showChinese" class="line-container">
                  <div class="text-line relative">
                    <div class="line-characters-and-pinyin" :style="{ fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
                      <span v-for="(pair, pairIndex) in flattenBlockLines(block)" :key="pairIndex">
                        <span class="character" :style="{fontWeight: '600'}">
                          {{ showPinyin ? pair[0] : (pair[0] === ' ' && pair[1] === ' ' ? ' ' : pair[0]) }}
                        </span>
                        <span class="pinyin" :style="{fontSize: `${fontSize * 0.8}px`, display: showPinyin ? 'inline' : 'none'}">
                          {{ pair[1] }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <!-- Chinese first, then English -->
                <div v-if="showChinese" class="line-container">
                  <div class="text-line relative">
                    <div class="line-characters-and-pinyin" :style="{ fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
                      <span v-for="(pair, pairIndex) in flattenBlockLines(block)" :key="pairIndex">
                        <span class="character" :style="{fontWeight: '600'}">
                          {{ showPinyin ? pair[0] : (pair[0] === ' ' && pair[1] === ' ' ? ' ' : pair[0]) }}
                        </span>
                        <span class="pinyin" :style="{fontSize: `${fontSize * 0.8}px`, display: showPinyin ? 'inline' : 'none'}">
                          {{ pair[1] }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="showEnglish && englishSegments[sentenceId]" class="english-translation-box">
                  <div class="english-text" :style="{ fontSize: `${fontSize * 0.8}px`, lineHeight: '1.1' }">
                    {{ englishSegments[sentenceId] }}
                  </div>
                </div>
              </template>

            </div>
            <div 
              class="scroll-spacer"
              :style="{
                minHeight: `calc(66vh - ${fontSize * 2}px)`
              }"
            ></div>
          </template>
        </div>
      </div>

      <!-- Empty state when both English and Chinese are hidden -->
      <div v-else-if="inputText.trim() && !showEnglish && !showChinese" class="empty-state">
        <p>Both English and Chinese paragraphs are hidden. Enable them in settings.</p>
      </div>

      <div v-if="inputText.trim()" class="quick-actions">
        <button @click="requestClearAll" class="clear-all-btn">
          Clear All Text
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmModal
      :isOpen="showConfirmModal"
      title="Clear All Text"
      message="Are you sure you want to clear all Chinese and English text? This action cannot be undone."
      confirmText="Yes, Clear All"
      cancelText="Cancel"
      @confirm="confirmClearAll"
      @cancel="cancelClearAll"
    />
  </div>
</template>

<script>
import { Edit as EditIcon, Settings } from 'lucide-vue-next';
import EditModal from './EditModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import SettingsModal from './SettingsModal.vue';
import { ref, computed, watch } from 'vue';
import { pinyin } from 'pinyin-pro';
import { useSettings } from '../composables/useSettings';


export default {
  components: {
    EditModal,
    ConfirmModal,
    SettingsModal,
    EditIcon,
    Settings,
  },
  name: 'FontConverter',
  setup() {
    const {
      fontSize,
      selectedFont,
      showPinyin,
      showEnglish,
      showChinese,
      displayOrder,
      resetSettings
    } = useSettings()
    
    const inputText = ref('');
    const englishText = ref('');
    const chineseTextarea = ref(null);
    const showConfirmModal = ref(false);
    const englishTextarea = ref(null);
    const isSettingsModalOpen = ref(false);

    const isEditModalOpen = ref(false)
    const editModalType = ref('chinese')
    const editModalTitle = computed(() => editModalType.value === 'chinese' ? 'Chinese Text' : 'English Translation')
    const editModalContent = computed(() => editModalType.value === 'chinese' ? inputText.value : englishText.value)

    // Settings object for modal
    const settings = computed(() => ({
      fontSize: Number(fontSize.value),
      selectedFont: selectedFont.value,
      showPinyin: showPinyin.value,
      showEnglish: showEnglish.value,
      showChinese: showChinese.value,
      displayOrder: displayOrder.value
    }))

    const openSettingsModal = () => {
      isSettingsModalOpen.value = true
    }

        // Request clear with confirmation
    const requestClearAll = () => {
      // Only show confirmation if there's actual text to clear
      if (inputText.value.trim() || englishText.value.trim()) {
        showConfirmModal.value = true
      }
    }

    // Actually clear the text when confirmed
    const confirmClearAll = () => {
      clearText('both')
      showConfirmModal.value = false
    }

    // Cancel clearing
    const cancelClearAll = () => {
      showConfirmModal.value = false
    }

    const closeSettingsModal = () => {
      isSettingsModalOpen.value = false
    }

    const saveSettings = (newSettings) => {
      fontSize.value = newSettings.fontSize
      selectedFont.value = newSettings.selectedFont
      showPinyin.value = newSettings.showPinyin
      showEnglish.value = newSettings.showEnglish
      showChinese.value = newSettings.showChinese
      displayOrder.value = newSettings.displayOrder
      closeSettingsModal()
    }

    const resetToDefaults = () => {
      resetSettings()
      closeSettingsModal()
    }

    const openEditModal = (type) => {
      editModalType.value = type
      isEditModalOpen.value = true
    }

    const closeEditModal = () => {
      isEditModalOpen.value = false
    }

    const saveEditModalContent = (newContent) => {
      if (editModalType.value === 'chinese') {
        inputText.value = newContent
      } else {
        englishText.value = newContent
      }
      closeEditModal()
    }

    // Font configurations
    const fonts = {
      NotoSansSC: "'Noto Sans SC', 'Inter', sans-serif",
      NotoSerifSC: "'Noto Serif SC', 'Georgia', serif",
      Inter: "'Inter', 'Noto Sans SC', sans-serif",
      Roboto: "'Roboto', 'Noto Sans SC', sans-serif",
      Poppins: "'Poppins', 'Noto Sans SC', sans-serif",
      ZCOOLKuaiLe: "'ZCOOL KuaiLe', cursive",
      MaShanZheng: "'Ma Shan Zheng', cursive",
    };

    const getFontFamily = computed(() => fonts[selectedFont.value]);

    const breakEnglishText = (englishText, chineseSegments) => {
      if (!englishText.trim()) return {};
      
      const normalizedText = englishText
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n(\s*\n)*/g, '\n\n');
      
      const englishParagraphs = normalizedText
        .split(/\n\n/)
        .map(para => para.trim())
        .filter(para => para);
      
      const result = {};
      const chineseSegmentKeys = chineseSegments ? Object.keys(chineseSegments) : [];
      
      englishParagraphs.forEach((paragraph, index) => {
        if (index < chineseSegmentKeys.length) {
          result[chineseSegmentKeys[index]] = paragraph;
        }
      });
      
      return result;
    };

    const englishSegments = computed(() => {
      return breakEnglishText(englishText.value, comparisonData.value);
    });

    const pasteFromClipboard = async (target = null) => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        const targetType = target || 'chinese';
        
        if (targetType === 'chinese') {
          inputText.value = clipboardText;
        } else {
          englishText.value = clipboardText;
        }
      } catch (error) {
        console.error('Failed to read clipboard contents: ', error);
      }
    };

    const clearText = (type = 'both') => {
      if (type === 'chinese' || type === 'both') {
        inputText.value = '';
        if (chineseTextarea.value) {
          setTimeout(() => {
            chineseTextarea.value.style.height = 'auto';
            chineseTextarea.value.style.height = '40px';
          }, 0);
        }
      }
      
      if (type === 'english' || type === 'both') {
        englishText.value = '';
        if (englishTextarea.value) {
          setTimeout(() => {
            englishTextarea.value.style.height = 'auto';
            englishTextarea.value.style.height = '40px';
          }, 0);
        }
      }
    };

    const clearAllText = () => {
      clearText('both');
    };

    const clearOrPasteText = (type) => {
      const text = type === 'chinese' ? inputText.value : englishText.value;
      
      if (text.trim()) {
        clearText(type);
      } else {
        pasteFromClipboard(type);
      }
    };

    const flattenBlockLines = (blockObject) => {
      const flattenedPairs = [];
      
      if (!blockObject || !blockObject.lines) {
        return flattenedPairs;
      }
      
      Object.values(blockObject.lines).forEach(line => {
        if (line.textAndPinyin && Array.isArray(line.textAndPinyin)) {
          line.textAndPinyin.forEach(pair => {
            flattenedPairs.push(pair);
          });
        }
      });
      return flattenedPairs;
    };
    
    const comparisonData = computed(() => {
      if (!inputText.value) return {};
      
      const normalizedText = inputText.value
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n(\s*\n)*/g, '\n\n');
      
      const chineseParagraphs = normalizedText
        .split(/\n\n/)
        .map(para => para.trim())
        .filter(para => para);
      
      const result = {};
      
      chineseParagraphs.forEach((paragraph, index) => {
        const sentenceId = index;
        result[sentenceId] = {
          lines: {},
          sentencePinyin: getPinyinForSentence(paragraph)
        };
        
        result[sentenceId].lines[0] = {
          text: paragraph,
          pinyin: getPinyinForSentence(paragraph),
          textAndPinyin: getPinyinAndChar(paragraph)
        };
      });
      
      return result;
    });

    // const isPunctuation = char => {
    //   const punctuationRegex = /[《》【】（）！？。，、：；'"『』「」]/;
    //   return punctuationRegex.test(char);
    // };

    // const getPinyinForChar = char => {
    //   if (isPunctuation(char)) return '';
    //   return pinyin(char, {
    //     toneType: 'symbol',
    //     type: 'array',
    //     nonZh: 'consecutive',
    //   })[0];
    // };

    const getPinyinForSentence = sentence => {
      if (!sentence) return '';
      return pinyin(sentence);
    };

    function preprocessing(sentence) {
        const preprocessed_sentence = [];
        let current_segment = '';
        let current_type = null;

        const isChinese = char => /[\u4e00-\u9fa5]/.test(char);
        const isEnglish = char => /[a-zA-Z0-9]/.test(char);
        const isSpace = char => /\s/.test(char);
        const isSymbol = char => /[。，？%#@*&^$!-><()_.""''=[\]:《》【】（）！。，、：;'"『』「」]/.test(char);

        for (const char of sentence) {
            if (isChinese(char)) {
                if (current_type && current_type !== 'chinese') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                if (current_segment) {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                preprocessed_sentence.push([char]);
                current_type = 'chinese';
            } 
            else if (isEnglish(char) || isSpace(char)) {
                if (current_type === 'symbol') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                current_segment += char;
                current_type = 'english';
            }
            else if (isSymbol(char)) {
                if (current_type === 'english') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                if (current_segment) {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                preprocessed_sentence.push([char]);
                current_type = 'symbol';
            }
        }

        if (current_segment) {
            preprocessed_sentence.push([current_segment]);
        }

        return preprocessed_sentence;
    }

    function getPinyin(sentence) {
        const pinyinObj = [];
        const preprocessedSentence = preprocessing(sentence);
        
        const chineseOnly = sentence.split('').filter(c => /[\u4e00-\u9fa5]/.test(c)).join('');
        const chinesePinyin = pinyin(chineseOnly);
        
        const pinyinParts = chinesePinyin.split(' ');
        
        let pinyinIndex = 0;
        
        for (const [text] of preprocessedSentence) {
            if (/[\u4e00-\u9fa5]/.test(text)) {
                pinyinObj.push([text, pinyinParts[pinyinIndex] || '']);
                pinyinIndex++;
            } else {
                pinyinObj.push([text, '']);
            }
        }
        
        return pinyinObj;
    }

    const getPinyinAndChar = sentence => {
      if (!sentence) return [];
      
      const chars = preprocessing(sentence);
      if (!showPinyin.value) return chars.map(char => [char[0], '']);

      try {
        return getPinyin(sentence);
      } catch (error) {
        console.error('Error processing pinyin:', error);
        return chars.map(char => [char, '']);
      }
    };

    const adjustHeight = () => {
      if (chineseTextarea.value) {
        chineseTextarea.value.style.height = 'auto';

        if (!inputText.value.trim()) {
          chineseTextarea.value.style.height = '40px';
        } else {
          chineseTextarea.value.style.height = `${chineseTextarea.value.scrollHeight}px`;
        }
      }
    };

    const adjustEnglishHeight = () => {
      if (englishTextarea.value) {
        englishTextarea.value.style.height = 'auto';

        if (!englishText.value.trim()) {
          englishTextarea.value.style.height = '40px';
        } else {
          englishTextarea.value.style.height = `${englishTextarea.value.scrollHeight}px`;
        }
      }
    };

    watch(inputText, adjustHeight);
    watch(englishText, adjustEnglishHeight);

    return {
      // Data
      inputText,
      englishText,
      selectedFont,
      fontSize,
      showPinyin,
      showEnglish,
      showChinese,
      displayOrder,
      
      // Computed
      getFontFamily,
      comparisonData,
      englishSegments,
      settings,
      
      // Methods
      clearOrPasteText,
      clearAllText,
      flattenBlockLines,
      adjustHeight,
      adjustEnglishHeight,
      
      // Refs
      chineseTextarea,
      englishTextarea,
      
      // Modal related
      EditIcon,
      Settings,
      isEditModalOpen,
      editModalTitle,
      editModalContent,
      openEditModal,
      closeEditModal,
      saveEditModalContent,
      
      // Settings modal
      isSettingsModalOpen,
      openSettingsModal,
      closeSettingsModal,
      saveSettings,
      resetToDefaults,

      showConfirmModal,
      requestClearAll,
      confirmClearAll,
      cancelClearAll,
    };
  },
};
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  background: white;
  border-bottom: 1px solid #e9ecef;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.logo-section {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #4a6cf7 0%, #6c5ce7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.settings-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #495057;
}

.settings-icon-btn:hover {
  background: #f8f9fa;
  transform: rotate(90deg);
}

.main-content {
  display: block;
}

.input-display-row {
  margin: 20px auto;
  padding: 5px;
  display: block;
  width: 100%;
  max-width: 1200px;
}

.text-section {
  width: 100%;
  padding: 0 1rem;
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.text-input {
  width: 100%;
  min-height: 40px;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.2s;
  resize: vertical;
  font-family: inherit;
}

.text-input:focus {
  outline: none;
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
}

.action-btn {
  padding: 8px 20px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
  border-color: #4a6cf7;
  color: #4a6cf7;
}

.edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6c757d;
  z-index: 10;
}

.edit-btn:hover {
  background: #4a6cf7;
  border-color: #4a6cf7;
  color: white;
  transform: scale(1.05);
}

.quick-actions {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 1rem;
  text-align: center;
}

.clear-all-btn {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-all-btn:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

.line-characters-and-pinyin {
  text-wrap: wrap;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
}

.english-translation-box {
  background-color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}

.english-text {
  color: #2c3e50;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  white-space: pre-wrap;
}

.english-input {
  border-color: #5dade2 !important;
  outline-color: #5dade2 !important;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #868e96;
  font-style: italic;
}

.relative {
  position: relative;
}

.converter-wrapper {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.comparison-section {
  max-width: 1200px;
  margin: 0 auto; 
  padding: 0 1rem;
}

.comparison-display {
  max-width: 100%;
}

.comparison-block {
  margin-bottom: 24px;
}

.line-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.text-line {
  display: block;
  flex-wrap: wrap;
}

.character {
  display: inline-block;
  margin-right: 2px;
  font-weight: normal;
  color: #1a1a1a;
}

.pinyin {
  display: inline-block;
  margin-right: 4px;
  font-size: 0.7em;     /* Reduced from 0.8em to 0.7em */
  color: #9ca3af;       /* Dimmed gray color */
  font-weight: 400;     /* Normal weight for pinyin */
  letter-spacing: 0.3px; /* Slight spacing for readability */
  transform: translateY(-2px); /* Slightly raised position */
}

.pinyin:hover {
  color: #6b7280;
}

.line-characters-and-pinyin {
  display: inline;
}

.line-characters-and-pinyin > span {
  display: inline;
  white-space: normal;
  word-break: keep-all;
}

.character, .pinyin {
  display: inline;
}

@media (max-width: 768px) {
  .app-header {
    padding: 8px 16px;
  }
  
  .logo {
    font-size: 18px;
  }
  
  .input-display-row {
    margin: 10px auto;
  }
  
  .text-section {
    padding: 0 0.5rem;
  }
  
  .comparison-section {
    padding: 0 0.5rem;
  }
  
  .line-container {
    padding: 12px;
  }
}
</style>
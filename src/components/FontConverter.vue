<template>
  <div class="converter-wrapper">
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
              @focus="setActiveTextarea('chinese')"
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
          <button @click="clearOrPasteText('chinese')" class="paste-btn">
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
              @focus="setActiveTextarea('english')"
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
          <button @click="clearOrPasteText('english')" class="paste-btn">
            {{ englishText.trim() ? 'Clear' : 'Paste' }}
          </button>
        </div>
      </div>


      <!-- Edit Modal -->
      <EditModal
        :isOpen="isEditModalOpen"
        :title="editModalTitle"
        :content="editModalContent"
        :fontSize="fontSize"
        :fontFamily="getFontFamily"
        @close="closeEditModal"
        @save="saveEditModalContent"
      />

      <!-- New Control Bar -->
      <!-- <ControlBar
        v-if="inputText.trim()"
        :showPinyin="showPinyin"
        :showEnglish="showEnglish"
        :showChinese="showChinese"
        :displayOrder="displayOrder"
        :fontSize="fontSize"
        :selectedFont="selectedFont"
        @clear="clearAllText"
        @toggle-pinyin="togglePinyin"
        @toggle-english="toggleEnglish"
        @toggle-chinese="toggleChinese"
        @toggle-order="toggleOrder"
        @update-font-size="updateFontSize"
        @update-selected-font="updateSelectedFont"
        @reset-settings="resetSettings"
      /> -->

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
        <p>Both English and Chinese paragraphs are hidden. Toggle them on using the control bar.</p>
      </div>

    </div>
  </div>
</template>

<script>
import { Edit as EditIcon } from 'lucide-vue-next'
import EditModal from './EditModal.vue'
import ControlBar from './ControlBar.vue';
import { ref, computed, watch, reactive} from 'vue';
import { pinyin } from 'pinyin-pro';
import { useSettings } from '../composables/useSettings'


export default {
  components: {
    EditModal,
    ControlBar,
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
    // const fontSize = ref(15);
    // const selectedFont = ref('NotoSansSC');
    const chineseTextarea = ref(null);
    const englishTextarea = ref(null);
    const activeTextarea = ref('chinese');
    const copiedStates = reactive({});
    const COPIED_ICON_DURATION = 3000;

    const isEditModalOpen = ref(false)
    const editModalType = ref('chinese') // 'chinese' or 'english'
    const editModalTitle = computed(() => editModalType.value === 'chinese' ? 'Chinese Text' : 'English Translation')
    const editModalContent = computed(() => editModalType.value === 'chinese' ? inputText.value : englishText.value)

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

    // And add these new methods to pass to ControlBar:
    const updateFontSize = (newSize) => {
      fontSize.value = newSize
    }
    
    const updateSelectedFont = (newFont) => {
      selectedFont.value = newFont
    }

    const togglePinyin = () => {
      showPinyin.value = !showPinyin.value;
    };

    const toggleEnglish = () => {
      showEnglish.value = !showEnglish.value;
    };

    const toggleChinese = () => {
      showChinese.value = !showChinese.value;
    };

    const toggleOrder = () => {
      displayOrder.value = displayOrder.value === 'en-cn' ? 'cn-en' : 'en-cn';
    };

    const setActiveTextarea = (type) => {
      activeTextarea.value = type;
    };

    // Updated fonts using Google Fonts
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
      const chineseSegmentKeys = Object.keys(chineseSegments);
      
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

    const textBlocks = computed(() => {
      if (!inputText.value) return [];

      const sentences = inputText.value.match(/[^。!?！？]+[。!?！？]+/g) || [];
      const remainingText = inputText.value.match(/[^。!?！？]+$/);

      if (remainingText) {
        sentences.push(remainingText[0]);
      }
      return sentences.filter(sentence => sentence);
    });
 
    const pasteFromClipboard = async (target = null) => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        const targetType = target || activeTextarea.value;
        
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

    const splitIntoLines = text => {
      const newlineParts = text.split(/\r?\n/);
      
      return newlineParts.flatMap(part => {
        const commaParts = part.split('，');
        return commaParts
          .map((line, index) => {
            if (index < commaParts.length - 1 || part.endsWith('，')) {
              return line.trim() + '，';
            } else {
              return line.trim();
            }
          })
          .filter(line => line);
      });
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

    const isPunctuation = char => {
      const punctuationRegex = /[《》【】（）！？。，、：；'"『』「」]/;
      return punctuationRegex.test(char);
    };

    const getPinyinForChar = char => {
      if (isPunctuation(char)) return '';
      return pinyin(char, {
        toneType: 'symbol',
        type: 'array',
        nonZh: 'consecutive',
      })[0];
    };

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

    const copyToClipboard = (text, buttonId) => {
      navigator.clipboard.writeText(text)
        .then(() => {
          copiedStates[buttonId] = true;
          setTimeout(() => {
            copiedStates[buttonId] = false;
          }, COPIED_ICON_DURATION);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
        });
    };
    
    const showCopySuccess = () => {
      const toast = document.createElement('div');
      toast.textContent = 'Copied to clipboard!';
      toast.className = 'copy-toast';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 2000);
      }, 10);
    };
    
    const getAllText = () => {
      let allText = '';
      if (comparisonData.value) {
        for (const sentenceId in comparisonData) {
          const lines = comparisonData[sentenceId];
          for (const line of lines) {
            allText += line + '\n';
          }
        }
      }
      return allText;
    };

    const getBlockText = (lines) => {
      return Object.values(lines).map(line => line.text).join('，');
    };

    return {
      clearOrPasteText,
      pasteFromClipboard,
      copyToClipboard,
      showCopySuccess,
      getAllText,
      getBlockText,
      inputText,
      englishText,
      selectedFont,
      fontSize,
      getFontFamily,
      textBlocks,
      comparisonData,
      englishSegments,
      fonts,
      splitIntoLines,
      isPunctuation,
      getPinyinForChar,
      adjustHeight,
      adjustEnglishHeight,
      chineseTextarea,
      englishTextarea,
      copiedStates,
      clearText,
      clearAllText,
      flattenBlockLines,
      showPinyin,
      showEnglish,
      showChinese,
      displayOrder,
      togglePinyin,
      toggleEnglish,
      toggleChinese,
      toggleOrder,
      setActiveTextarea,
      activeTextarea,

      updateFontSize,
      updateSelectedFont,
      resetSettings,

      EditIcon,
      isEditModalOpen,
      editModalTitle,
      editModalContent,
      openEditModal,
      closeEditModal,
      saveEditModalContent,
    };
  },
};
</script>

<style scoped>

.input-wrapper {
  position: relative;
  width: 100%;
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

@media (max-width: 768px) {
  .edit-btn {
    padding: 8px;
  }
  
  .edit-btn svg {
    width: 18px;
    height: 18px;
  }
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

.english-input::placeholder {
  color: #1f1f20 !important;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.paste-btn {  
  padding: 8px 16px;
  margin-top: 5px;
  font-size: 14px;
  background-color: white;
  font-weight: 800;
  border-radius: 4px;
  box-shadow: rgb(216, 215, 215) 0 10px 20px -10px;
  color: black;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  outline: 0 solid transparent;
  text-align: center;
  text-decoration: none;
  transition: all 250ms;
  border: none;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.paste-btn:hover {
  background-color: #c9cacb;
}

.relative {
  position: relative;
}

.converter-wrapper {
  width: 100%;
}

.controls-container {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  gap: 1rem;
  justify-items: center;
}

.main-content {
  display: block;
}

.input-display-row {
  margin: 5px;
  padding: 5px;
  display: block;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.text-section {
  width: 100%;
  padding: 0 0.2rem;
  margin-bottom: 15px;
}

.text-input {
  padding: 0.5rem;
  border-radius: 4px;
  border-color: #7a90ff87;
  font-size: 12px;
}

.text-display {
  border-radius: 4px;
  white-space: pre-wrap;
}

.comparison-section {
  max-width: 1200px;
  margin: 0 auto; 
  padding: 0 0.5rem;
}

.comparison-display {
  max-width: 100%;
}

.comparison-block {
  margin-bottom: 20px;
}

.line-container {
  background-color: rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
}

.text-line {
  display: block;
  flex-wrap: wrap;
  background-color: rgba(256, 256, 256, 0.4);
  border-radius: 0.25rem;
  padding: 0.2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.select-input {
  padding: 0.5rem;
  border-radius: 0.25rem;
}

textarea::placeholder {
  border-color: #7a91ff;
  color: #1f1f20;
}

textarea::-webkit-input-placeholder {
  border-color: #7a91ff;
  color: #1f1f20;
}

textarea::-moz-placeholder {
  border-color: #7a91ff;
  color: #1f1f20;
  opacity: 1;
}

textarea:-ms-input-placeholder {
  border-color: #7a91ff;
  color: #1f1f20;
}

textarea:-moz-placeholder {
  border-color: #7a91ff;
  color: #1f1f20;
  opacity: 1;
}

@media (max-width: 1024px) {
  .input-display-row {
    grid-template-columns: repeat(auto-fit, minmax(225px, 1fr));
  }

  .character-column {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .controls-container {
    flex-direction: row;
    align-items: flex-start;
  }

  .text-input,
  .text-display,
  .comparison-display {
    min-height: auto;
  }

  .comparison-block {
    margin-bottom: 0.5rem;
  }
}
</style>
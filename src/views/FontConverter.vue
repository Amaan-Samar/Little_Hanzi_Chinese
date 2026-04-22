<template>
  <div class="converter-wrapper">
    <div class="main-content">
      <FontControls
        v-model="fontSize"
        :defaultFontSize="15"
      />

      <div class="input-display-row">
        <!-- Chinese Text Input -->
        <div class="text-section" :style="{fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
          <textarea 
            v-model="inputText" 
            placeholder="Enter Chinese text here..." 
            class="text-input w-full" 
            @input="adjustHeight" 
            @focus="setActiveTextarea('chinese')"
            ref="chineseTextarea"
          ></textarea>
          <button @click="clearOrPasteText('chinese')" class="paste-btn">
            {{ inputText.trim() ? 'Clear' : 'Paste' }}
          </button>
        </div>

        <!-- English Translation Input -->
        <div class="text-section" :style="{fontSize: `${fontSize}px` }">
          <textarea 
            v-model="englishText" 
            placeholder="Enter English translation here..." 
            class="text-input w-full english-input" 
            @input="adjustEnglishHeight" 
            @focus="setActiveTextarea('english')"
            ref="englishTextarea"
          ></textarea>
          <button @click="clearOrPasteText('english')" class="paste-btn">
            {{ englishText.trim() ? 'Clear' : 'Paste' }}
          </button>
        </div>
      </div>

      <FloatingControls 
        v-if="inputText.trim()"
        :showPinyin="showPinyin"
        @clear="clearAllText"
        @toggle-pinyin="togglePinyin"
      />  

      <div v-if="inputText.trim()" class="comparison-section">
        <div class="comparison-display relative">
          <template v-if="comparisonData && Object.keys(comparisonData).length">
            <div v-for="(block, sentenceId) in comparisonData" :key="sentenceId" class="comparison-block relative">
              
              <!-- English Translation Display -->
              <div v-if="englishSegments[sentenceId]" class="english-translation-box">
                <div class="english-text" :style="{ fontSize: `${fontSize * 0.8}px`, lineHeight: '1.1' }">
                  {{ englishSegments[sentenceId] }}
                </div>
              </div>

              <!-- Chinese and Pinyin Display -->
              <div class="line-container">
                <div class="text-line relative">
                  <div class="line-characters-and-pinyin" :style="{ fontFamily: getFontFamily, fontSize: `${fontSize}px` }">
                  <span v-for="(pair, pairIndex) in flattenBlockLines(block)" :key="pairIndex">
                    <span class="character" :style="{fontWeight: '600' }">
                      {{ showPinyin ? pair[0] : (pair[0] === ' ' && pair[1] === ' ' ? ' ' : pair[0]) }}
                    </span>
                    <span class="pinyin" :style="{fontSize: `${fontSize * 0.8}px`, display: showPinyin ? 'inline' : 'none' }">
                      {{ pair[1] }}
                    </span>
                  </span>

                  </div>
                </div>
              </div>

            </div>
            <div 
              class="scroll-spacer"
              :style="{
                minHeight: `calc(66vh - ${fontSize * 2}px)`  // Adjust based on your font size
              }"
            ></div>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import FloatingControls from './FloatingControls.vue';
import { ref, computed, watch, reactive} from 'vue';
import { pinyin } from 'pinyin-pro';
import FontControls from './FontControls.vue';




export default {
  components: {
    FloatingControls,
    FontControls,
  },
  name: 'FontConverter',
  setup() {
    const inputText = ref('');
    const englishText = ref('');
    const fontSize = ref(15);
    const selectedFont = ref('Han_Sans_CN_Light');
    const chineseTextarea = ref(null);
    const englishTextarea = ref(null);
    const activeTextarea = ref('chinese'); // Track which textarea is active
    const copiedStates = reactive({});
    const COPIED_ICON_DURATION = 3000;
    const showPinyin = ref(true);


    const togglePinyin = () => {
      showPinyin.value = !showPinyin.value;
    };

    const setActiveTextarea = (type) => {
      activeTextarea.value = type;
    };

    const fonts = {
      kaiti: "'Kaiti', serif",
      tegakizatsu: "'tegakizatsu', serif",
      regular: "'SimSun', serif",
      cwTeXMing_Medium: "'cwTeXMing_Medium', serif",
      Han_Sans_CN_Light: "'Han_Sans_CN_Light', serif",
      GenJyuuGothic: "'GenJyuuGothic', serif",
    };

    const getFontFamily = computed(() => fonts[selectedFont.value]);

    // Function to break English text into paragraphs that match Chinese paragraphs
    // const breakEnglishText = (englishText, chineseSegments) => {
    //   if (!englishText.trim()) return {};
      
    //   // Split English text by paragraphs (double line breaks or single line breaks)
    //   const englishParagraphs = englishText
    //     .split(/\n\s*\n|\r\n\s*\r\n/) // Split by double line breaks first
    //     .flatMap(para => para.split(/\n|\r\n/)) // Then split by single line breaks
    //     .map(para => para.trim())
    //     .filter(para => para);
      
    //   // Create mapping between Chinese and English paragraphs
    //   const result = {};
    //   const chineseSegmentKeys = Object.keys(chineseSegments);
      
    //   englishParagraphs.forEach((paragraph, index) => {
    //     if (index < chineseSegmentKeys.length) {
    //       result[chineseSegmentKeys[index]] = paragraph;
    //     }
    //   });
      
    //   return result;
    // };


    const breakEnglishText = (englishText, chineseSegments) => {
      if (!englishText.trim()) return {};
      
      // First, normalize all line breaks and replace multiple empty lines with single empty lines
      const normalizedText = englishText
        .replace(/\r\n/g, '\n') // Normalize to Unix line breaks
        .replace(/\n\s*\n(\s*\n)*/g, '\n\n'); // Replace multiple empty lines with single empty lines
      
      // Then split by double line breaks to get paragraphs
      const englishParagraphs = normalizedText
        .split(/\n\n/)
        .map(para => para.trim())
        .filter(para => para);
      
      // Create mapping between Chinese and English paragraphs
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

      const sentences =
        inputText.value.match(/[^。!?！？]+[。!?！？]+/g) || [];
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
        // If empty, paste from clipboard
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
      
      // First, normalize all line breaks and replace multiple empty lines with single empty lines
      const normalizedText = inputText.value
        .replace(/\r\n/g, '\n') // Normalize to Unix line breaks
        .replace(/\n\s*\n(\s*\n)*/g, '\n\n'); // Replace multiple empty lines with single empty lines
      
      // Then split by double line breaks to get paragraphs
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
        let current_type = null; // 'chinese', 'english', or 'symbol'

        const isChinese = char => /[\u4e00-\u9fa5]/.test(char);
        const isEnglish = char => /[a-zA-Z0-9]/.test(char);
        const isSpace = char => /\s/.test(char);
        const isSymbol = char => /[。，？%#@*&^$!-><()_.""''=[\]:《》【】（）！。，、：;'"『』「」]/.test(char);

        for (const char of sentence) {
            if (isChinese(char)) {
                // If we were building an english or symbol segment, push it first
                if (current_type && current_type !== 'chinese') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                // Push individual Chinese characters as separate segments
                if (current_segment) {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                preprocessed_sentence.push([char]);
                current_type = 'chinese';
            } 
            else if (isEnglish(char) || isSpace(char)) {
                // If we were building a symbol segment, push it first
                if (current_type === 'symbol') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                current_segment += char;
                current_type = 'english';
            }
            else if (isSymbol(char)) {
                // If we were building an english segment, push it first
                if (current_type === 'english') {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                // Push individual symbols as separate segments
                if (current_segment) {
                    preprocessed_sentence.push([current_segment]);
                    current_segment = '';
                }
                preprocessed_sentence.push([char]);
                current_type = 'symbol';
            }
        }

        // Push any remaining segment
        if (current_segment) {
            preprocessed_sentence.push([current_segment]);
        }

        return preprocessed_sentence;
    }

    function getPinyin(sentence) {
        const pinyinObj = [];
        const preprocessedSentence = preprocessing(sentence);
        
        const chineseOnly = sentence.split('').filter(c => /[\u4e00-\u9fa5]/.test(c)).join('');
        const chinesePinyin = pinyin(chineseOnly); // Get pinyin for Chinese only
        
        const pinyinParts = chinesePinyin.split(' ');
        
        let pinyinIndex = 0;
        
        for (const [text] of preprocessedSentence) {
            if (/[\u4e00-\u9fa5]/.test(text)) {
                // For Chinese characters, get the next pinyin
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
          // Set this specific button to "copied" state
          copiedStates[buttonId] = true;
          
          // Set a timeout to revert back to the copy icon after COPIED_ICON_DURATION
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
      togglePinyin,
      setActiveTextarea,
      activeTextarea,
    };
  },
};
</script>
<style scoped>
.line-characters-and-pinyin{
 /* padding: 5px 10px; */
 text-wrap: wrap;
 width: 100%;
 display: flex;
 flex-wrap: wrap;
}

.english-translation-box {
  background-color: rgba(255, 255, 255, 0.3); 
}

.english-text {
  color: #2c3e50;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  white-space: pre-wrap; /* Preserve line breaks within paragraphs */
}

.english-input {
  border-color: #5dade2 !important;
  outline-color: #5dade2 !important;
}

.english-input::placeholder {
  color: #1f1f20 !important;
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
  /* outline-color: #7a91ff;  */
  /* background: rgba(102,126,234,0.05); */

  /* background: rgba(255, 255, 255, 0.3); */
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
  /* border: 1px solid rgba(135, 206, 235, 0.4); */
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
  /* opacity: 1; */
}

/* These are needed for cross-browser compatibility */
textarea::-webkit-input-placeholder { /* Chrome/Safari/Opera */
  border-color: #7a91ff;
  color: #1f1f20;
}

textarea::-moz-placeholder { /* Firefox */
  border-color: #7a91ff;
  color: #1f1f20;
  opacity: 1;
}

textarea:-ms-input-placeholder { /* IE/Edge */
  border-color: #7a91ff;
  color: #1f1f20;
}

textarea:-moz-placeholder { /* Firefox older versions */
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

  .toggle-pinyin-btn:not(.mobile) {
    top: auto;
    left: auto;
    bottom: 20px;
    right: 10px;
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

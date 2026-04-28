<template>
  <div style="max-width: 1200px;" class="speaker mx-auto">
    <div>
      <button @click="toggleSpeech" 
              class="text-white rounded-lg disabled:opacity-50 transition"
              :disabled="!canSpeak">
        <component :is="isSpeaking ? 'StopIcon' : 'SpeakerIcon'" width="24" height="24" />
      </button>
    </div>

    <div v-if="errorMessage" class="hidden">
      {{ errorMessage }}
    </div>

    <div v-if="!isSpeechSupported">
      您的浏览器不支持语音合成。(Your browser doesn't support speech synthesis.)
    </div>
  </div>
</template>


<script>
import SpeakerIcon from './icons/SpeakerIcon.vue';
import StopIcon from './icons/StopIcon.vue';

export default {
  name: 'ChineseTextToSpeech',
  props: {
    text: {
      type: String,
      required: true
    }
  },
  components: {
    SpeakerIcon,
    StopIcon,
  },
  
  data() {
    return {
      currentWordIndex: 0,
      isSpeaking: false,
      errorMessage: '',
      isSpeechSupported: 'speechSynthesis' in window,
      speechSynthesis: window.speechSynthesis,
    }
  },

  computed: {
    canSpeak() {
      return this.isSpeechSupported && this.text.trim().length > 0;
    }
  },

  methods: {
    toggleSpeech() {
      if (this.isSpeaking) {
        this.stop();
      } else {
        this.speak();
      }
    },

    speak() {
      try {
        this.errorMessage = '';
        
        this.speechSynthesis.cancel();

        
        const currentUtterance = new SpeechSynthesisUtterance(this.text);
        currentUtterance.lang = 'zh-CN';

        currentUtterance.onstart = () => {
          this.isSpeaking = true;
        };

        currentUtterance.onend = () => {
          this.isSpeaking = false;
        };

        currentUtterance.onerror = (event) => {
          this.errorMessage = `Speech synthesis error: ${event.error}`;
          this.isSpeaking = false;
        };

        this.speechSynthesis.speak(currentUtterance);

      } catch (error) {
        this.errorMessage = `Error: ${error.message}`;
      }
    },

    stop() {
      try {
        this.speechSynthesis.cancel();
        this.isSpeaking = false;
      } catch (error) {
        console.error('Error stopping speech:', error);
      }
    }
  },

  mounted() {
    if (!this.isSpeechSupported) {
      this.errorMessage = "您的浏览器不支持语音合成。";
    }
  },

  beforeDestroy() {
    if (this.isSpeechSupported) {
      this.stop();
    }
  }
}
</script>
<style scoped>
.speaker{
  padding-left: 1.5rem;
}

@media (max-width: 1024px) {
.speaker{
  padding-left: 1.5rem;
 }
}

@media (max-width: 768px) {
 .speaker{
  padding-left: 1.5rem;
 }
}
</style>
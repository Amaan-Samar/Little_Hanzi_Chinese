<template>
  <div class="floating-controls" :class="{ 'mobile': isMobile }">
    <button
      class="clear-text-btn"
      :class="{ 'mobile': isMobile }"
      @click="$emit('clear')"
    >
    <ClearScreen />
    </button>
    <!-- <button
      class="toggle-pinyin-btn"
      :class="{ 'mobile': isMobile }"
      role="button"
      @click="$emit('toggle-pinyin')"
    >
      {{ showPinyin ? 'Hide' : 'Show' }}
    </button> -->
  </div>
</template>

<script>
import ClearScreen from './icons/ClearScreen.vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';

export default {
  components: {
    ClearScreen,
  },
  name: 'FloatingControls',
  props: {
    showPinyin: {
      type: Boolean,
      required: true
    }
  },
  emits: ['clear', 'toggle-pinyin'],
  setup() {
    const isMobile = ref(false);

    const checkScreenSize = () => {
      isMobile.value = window.innerWidth <= 768;
    };

    onMounted(() => {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', checkScreenSize);
    });

    return {
      isMobile
    };
  }
}
</script>

<style scoped>
.floating-controls {
  position: fixed;
  width: 80px;
  height: auto;
  display: flex;
  flex-direction: column;
  padding: 5px;
  position: fixed;
  top: 50%;
  left: auto;
  right: 16.66vw;
  z-index: 1000;
}

.floating-controls {
  top: auto;
  bottom: 10px;
  right: -10px;
}

.toggle-pinyin-btn {
  background-color: white;
  box-shadow: rgb(179, 178, 178) 0 10px 20px -10px;
  border-radius: 50%;
  color: black;
  font-weight: 800;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  outline: 0 solid transparent;
  padding: 10px;
  margin: 10px;
  text-align: center;
  text-decoration: none;
  transition: all 250ms;
  border: 0;
  font-size: 10px;  
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

</style>
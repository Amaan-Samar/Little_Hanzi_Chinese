<template>
  <div class="font-controls" :class="{ 'mobile': isMobile }">
    <div class="control-group">
      <label for="font-select">Font:</label>
      <select 
        id="font-select"
        :value="selectedFont" 
        @change="$emit('update:selectedFont', $event.target.value)" 
        class="font-select"
      >
        <option value="NotoSansSC">Noto Sans SC</option>
        <option value="NotoSerifSC">Noto Serif SC</option>
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
        <option value="Poppins">Poppins</option>
        <option value="ZCOOLKuaiLe">ZCOOL KuaiLe</option>
        <option value="MaShanZheng">Ma Shan Zheng</option>
      </select>
    </div>

    <div class="control-group">
      <label for="font-size">Size:</label>
      <input
        id="font-size"
        type="range"
        :value="fontSize"
        @input="$emit('update:fontSize', parseInt($event.target.value))"
        min="12"
        max="32"
        step="1"
        class="font-size-slider"
      />
      <span class="font-size-value">{{ fontSize }}px</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  fontSize: {
    type: Number,
    required: true
  },
  selectedFont: {
    type: String,
    required: true
  }
})

defineEmits(['update:fontSize', 'update:selectedFont'])

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.font-controls {
  max-width: 1200px;
  margin: 10px auto;
  padding: 12px 20px;
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  background: #f8f9fa;
  border-radius: 12px;
}

.font-controls.mobile {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin: 10px;
  padding: 12px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.font-controls.mobile .control-group {
  justify-content: space-between;
}

.control-group label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.font-select {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.font-size-slider {
  width: 150px;
  cursor: pointer;
}

.font-controls.mobile .font-size-slider {
  flex: 1;
}

.font-size-value {
  min-width: 45px;
  font-size: 14px;
  color: #495057;
}
</style>
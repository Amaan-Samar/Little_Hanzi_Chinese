<template>
  <Teleport to="body">
    <div v-if="isOpen" class="edit-modal-overlay" @click="handleOverlayClick">
      <div class="edit-modal" :class="{ 'mobile': isMobile }" @click.stop>
        <div class="edit-modal-header">
          <h3>Edit {{ title }}</h3>
          <button class="close-btn" @click="close">×</button>
        </div>
        <div class="edit-modal-body">
          <textarea
            ref="textareaRef"
            v-model="editText"
            :placeholder="`Edit ${title} text...`"
            class="edit-textarea"
            :style="{ fontSize: `${fontSize}px`, fontFamily: fontFamily }"
          ></textarea>
        </div>
        <div class="edit-modal-footer">
          <button class="cancel-btn" @click="close">Cancel</button>
          <button class="save-btn" @click="save">Save Changes</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  fontSize: {
    type: Number,
    default: 15
  },
  fontFamily: {
    type: String,
    default: "'Noto Sans SC', sans-serif"
  }
})

const emit = defineEmits(['close', 'save'])

const editText = ref(props.content)
const textareaRef = ref(null)
const isMobile = ref(false)

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
  emit('save', editText.value)
  close()
}

// Handle escape key
const handleEscape = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

// Auto-focus textarea when opened
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    editText.value = props.content
    await nextTick()
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  }
})

// Update editText when content prop changes
watch(() => props.content, (newVal) => {
  if (props.isOpen) {
    editText.value = newVal
  }
})

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
.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.edit-modal {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 700px;
  height: 70vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.edit-modal.mobile {
  width: 95%;
  height: 80vh;
  border-radius: 16px;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.edit-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #333;
}

.edit-modal-body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

.edit-textarea {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  font-family: inherit;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  background: #fafbfc;
}

.edit-textarea:focus {
  border-color: #4a6cf7;
  background: white;
}

.edit-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #495057;
}

.cancel-btn:hover {
  background: #e9ecef;
}

.save-btn {
  background: #4a6cf7;
  color: white;
}

.save-btn:hover {
  background: #3a5ce8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(74, 108, 247, 0.3);
}

@media (max-width: 768px) {
  .edit-modal {
    width: 95%;
    height: 85vh;
  }
  
  .edit-modal-header {
    padding: 12px 16px;
  }
  
  .edit-modal-body {
    padding: 12px;
  }
  
  .edit-modal-footer {
    padding: 12px 16px;
  }
  
  .cancel-btn,
  .save-btn {
    padding: 8px 16px;
  }
}
</style>
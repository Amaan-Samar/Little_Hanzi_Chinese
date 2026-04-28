<template>
  <Teleport to="body">
    <div v-if="isOpen" class="confirm-modal-overlay" @click="handleOverlayClick">
      <div class="confirm-modal" :class="{ 'mobile': isMobile }" @click.stop>
        <div class="confirm-modal-header">
          <div class="icon-wrapper">
            <AlertTriangle :size="32" />
          </div>
          <h3>{{ title }}</h3>
        </div>
        
        <div class="confirm-modal-body">
          <p>{{ message }}</p>
        </div>
        
        <div class="confirm-modal-footer">
          <button class="cancel-btn" @click="cancel">
            {{ cancelText }}
          </button>
          <button class="confirm-btn" @click="confirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

// Props to customize the modal
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    default: 'Are you sure you want to proceed?'
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  }
})

// Emit events to parent component
const emit = defineEmits(['confirm', 'cancel'])

// Mobile detection
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// Close modal when clicking overlay
const handleOverlayClick = () => {
  cancel()
}

// Emit confirm event
const confirm = () => {
  emit('confirm')
}

// Emit cancel event
const cancel = () => {
  emit('cancel')
}

// Close modal on Escape key
const handleEscape = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    cancel()
  }
}

// Lifecycle hooks
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
.confirm-modal-overlay {
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

.confirm-modal {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.confirm-modal.mobile {
  width: 95%;
  border-radius: 16px;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-modal-header {
  padding: 24px 24px 16px;
  text-align: center;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  color: #f59e0b;
}

.confirm-modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.confirm-modal-body {
  padding: 0 24px 24px;
  text-align: center;
}

.confirm-modal-body p {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
}

.confirm-modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 14px;
}

.cancel-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.cancel-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.confirm-btn {
  background: #ef4444;
  color: white;
}

.confirm-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

@media (max-width: 768px) {
  .confirm-modal-header {
    padding: 20px 20px 12px;
  }
  
  .confirm-modal-body {
    padding: 0 20px 20px;
  }
  
  .confirm-modal-footer {
    padding: 12px 20px 20px;
  }
  
  .cancel-btn,
  .confirm-btn {
    padding: 10px;
  }
}
</style>
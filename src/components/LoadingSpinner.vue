<template>
  <Transition name="loading-fade">
    <div
      v-if="isLoading"
      class="loading-overlay"
      role="status"
      aria-live="polite"
    >
      <div class="loading-container">
        <div class="loading-emblem">
          <div class="loading-spinner"></div>
          <span class="loading-mark">汉</span>
        </div>
        <p class="loading-text">{{ text }}</p>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    isLoading: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: 'Loading...'
    }
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #f8faff 0%, #eef1ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 24px;
}

.loading-emblem {
  position: relative;
  width: 78px;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  position: absolute;
  inset: 0;
  border: 3px solid #dbe2ff;
  border-top-color: #4a6cf7;
  border-right-color: #4a6cf7;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.loading-mark {
  font-size: 28px;
  font-weight: 700;
  color: #4a6cf7;
  line-height: 1;
}

.loading-text {
  margin: 0;
  font-size: 15px;
  color: #475569;
  font-weight: 600;
  letter-spacing: 0.2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.18s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>

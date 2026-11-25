<template>
  <nav class="bottom-nav" aria-label="Main navigation">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="nav-tab"
      :class="{ active: modelValue === tab.id }"
      @click="$emit('update:modelValue', tab.id)"
    >
      <span class="nav-icon">
        <img
          v-if="tab.id === 'profile' && profilePhoto"
          :src="profilePhoto"
          alt="Profile"
          class="nav-avatar"
        />
        <component v-else :is="tab.icon" :size="21" />
      </span>
      <span class="nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { Home, BookOpen, User } from 'lucide-vue-next'

defineProps({
  modelValue: {
    type: String,
    default: 'home',
  },
  profilePhoto: {
    type: String,
    default: '',
  },
})

defineEmits(['update:modelValue'])

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'history', label: 'History', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
]
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  width: min(92vw, 390px);
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e9ecef;
  border-radius: 18px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.nav-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 7px 8px 6px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.18s ease;
}

.nav-tab:hover {
  background: #f8f9fa;
  color: #64748b;
}

.nav-tab.active {
  background: #eef1ff;
  border-color: #d8defb;
  color: #4a6cf7;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
}

.nav-avatar {
  width: 23px;
  height: 23px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  border: 1px solid #d8defb;
}

.nav-tab.active .nav-avatar {
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.28);
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

@media (max-width: 480px) {
  .bottom-nav {
    bottom: 10px;
    width: 94vw;
  }
}
</style>

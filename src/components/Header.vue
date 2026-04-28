<template>
  <header class="header">
    <nav class="nav-container">
      <div class="logo_wrapper">
        <RouterLink to="/" class="logo">
          <img class="logo_img"
            src="/pen.svg"
            alt="Company Logo"
          />
          <span 
              style="color: #656ee0"
            > Little</span>Hanzi
        </RouterLink>
      </div>
      <button class="settings-icon-btn" @click="$emit('open-settings')" title="Settings">
        <Settings :size="24" />
      </button>
    </nav>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { Settings } from 'lucide-vue-next'

defineEmits(['open-settings'])
</script>

<style scoped>
.header {
  width: 100%;
  z-index: 12;
  background: white;
  border-bottom: 1px solid #e9ecef;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
}

.logo_img {
  width: 30px;
  height: 30px;
}

.logo_wrapper {
  width: 100%; 
}

.logo {
  font-size: 1.8rem;
  font-weight: bold;
  color: black;
  text-decoration: none;
  display: flex;
  align-items: center; 
  gap: .5rem; 
  transition: transform 0.3s;
}

.logo:hover {
  transform: scale(1.05);
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

@media (max-width: 1024px) {
  .logo_wrapper {
    width: auto; 
    display: flex; 
    justify-content: center; 
    padding: .5rem; 
    border-radius: .5rem; 
    transition: background-color .3s; 
    cursor: pointer; 
  }
  .logo {
    font-size: 1rem;
    display: inline-flex;
    gap: .5rem; 
  }
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column; 
    align-items: center;
    gap: 10px;
  }
  .logo_wrapper {
    display: flex;
  }
}
</style>
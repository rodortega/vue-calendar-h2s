<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import LoginForm from '@/components/LoginForm.vue'
import CalendarView from '@/components/CalendarView.vue'

const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)

const handleLogout = (): void => {
  authStore.logout()
}
</script>

<template>
  <div class="app">
    <LoginForm v-if="!isAuthenticated" />
    <CalendarView v-else @logout="handleLogout" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f8f9fa;
}

/* Reset and base styles */
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f8f9fa;
}

:global(#app) {
  min-height: 100vh;
}
</style>

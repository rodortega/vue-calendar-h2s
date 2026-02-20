<template>
  <div class="login-container">
    <Card class="login-card">
      <template #content>
        <h2 class="text-center mb-4">Calendar Login</h2>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <FloatLabel>
              <InputText
                id="email"
                v-model="credentials.email"
                type="email"
                required
                class="w-full"
                :disabled="authStore.isLoading"
              />
              <label for="email">Email</label>
            </FloatLabel>
          </div>

          <div class="form-group">
            <FloatLabel>
              <Password
                id="password"
                v-model="credentials.password"
                required
                class="w-full"
                :disabled="authStore.isLoading"
                :feedback="false"
                toggleMask
              />
              <label for="password">Password</label>
            </FloatLabel>
          </div>

          <Message v-if="authStore.error" severity="error" :closable="false">
            {{ authStore.error }}
          </Message>

          <Button
            type="submit"
            class="w-full login-button"
            :disabled="authStore.isLoading || !isFormValid"
            :loading="authStore.isLoading"
            loadingIcon="pi pi-spin pi-spinner"
            icon="pi pi-sign-in"
          >
            {{ authStore.isLoading ? 'Logging in...' : 'Login' }}
          </Button>
        </form>
        
        <Divider />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { LoginCredentials } from '@/services/api'

const authStore = useAuthStore()

const credentials = ref<LoginCredentials>({
  email: '',
  password: ''
})

const isFormValid = computed(() => {
  return credentials.value.email.trim() !== '' && credentials.value.password.trim() !== ''
})

const handleLogin = async (): Promise<void> => {
  if (!isFormValid.value) return

  try {
    await authStore.login(credentials.value)
    // Login successful - the parent component will handle the redirect
  } catch (error) {
    // Error is handled by the store
    console.error('Login error:', error)
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.login-button {
  margin-top: 1rem;
}

/* Utility classes for PrimeVue */
.w-full {
  width: 100%;
}

.text-center {
  text-align: center;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.mt-3 {
  margin-top: 1rem;
}

.m-0 {
  margin: 0;
}

.mb-2 {
  margin-bottom: 0.5rem;
}
</style>
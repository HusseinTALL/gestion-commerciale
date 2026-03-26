<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <h1>🏭 Gestion Commerciale</h1>
        <p>Connectez-vous pour accéder à votre espace</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="votre@email.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block mt-4" :disabled="loading">
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>

      <p style="text-align:center; margin-top:1.5rem; font-size:.8rem; color:var(--gray-400)">
        Comptes de démo : admin@gestion.local / Admin@1234
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    await auth.login(form.email, form.password);
    router.push('/');
  } catch (err: unknown) {
    error.value = (err as { response?: { data?: { error?: string } } })
      ?.response?.data?.error ?? 'Erreur de connexion';
  } finally {
    loading.value = false;
  }
}
</script>

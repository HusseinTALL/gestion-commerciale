import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type User } from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') ?? 'null'));

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isCashier  = computed(() => user.value?.role === 'CASHIER');
  const isCommercial = computed(() => user.value?.role === 'COMMERCIAL');
  const isManager  = computed(() => ['MANAGER', 'DIRECTOR', 'ADMIN'].includes(user.value?.role ?? ''));

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password);
    token.value = data.token;
    user.value  = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  function logout() {
    token.value = null;
    user.value  = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { token, user, isAuthenticated, isCashier, isCommercial, isManager, login, logout };
});

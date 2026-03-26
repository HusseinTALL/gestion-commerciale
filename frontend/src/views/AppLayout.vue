<template>
  <div class="layout">
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="sidebar-logo">🏭 GestCom</div>
      <div class="sidebar-nav">
        <RouterLink v-if="auth.isCashier || auth.isManager" to="/sales" :class="{ active: $route.path === '/sales' }">
          <span class="icon">🛒</span> Saisie Ventes
        </RouterLink>
        <RouterLink v-if="auth.isCashier || auth.isManager" to="/sales/summary" :class="{ active: $route.path === '/sales/summary' }">
          <span class="icon">📊</span> Récap du Jour
        </RouterLink>
        <RouterLink v-if="auth.isManager" to="/sales/import" :class="{ active: $route.path === '/sales/import' }">
          <span class="icon">📥</span> Import Excel
        </RouterLink>
        <RouterLink v-if="auth.isCommercial || auth.isManager" to="/commissions" :class="{ active: $route.path === '/commissions' }">
          <span class="icon">💰</span> Commissions
        </RouterLink>
        <RouterLink v-if="auth.isManager" to="/dashboard" :class="{ active: $route.path === '/dashboard' }">
          <span class="icon">📈</span> Dashboard Équipe
        </RouterLink>
      </div>
      <div class="sidebar-user">
        <div style="font-weight:600; color:#d1d5db">{{ auth.user?.name }}</div>
        <div>{{ auth.user?.role }}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:.5rem; color:#9ca3af" @click="logout">
          Déconnexion
        </button>
      </div>
    </nav>

    <!-- Content -->
    <div class="main-content">
      <div class="topbar">
        <h1>{{ $route.meta.title ?? 'Gestion Commerciale' }}</h1>
        <div style="font-size:.85rem; color:var(--gray-400)">{{ today }}</div>
      </div>
      <div class="page-body">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

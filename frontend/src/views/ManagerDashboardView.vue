<template>
  <div>
    <div class="stats-grid">
      <div class="stat-card" style="border-left:4px solid var(--blue-600)">
        <div class="stat-label">Ventes du Jour</div>
        <div class="stat-value">{{ summary?.totalSales ?? '—' }}</div>
        <div class="stat-sub">{{ summary?.date }}</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--green-600)">
        <div class="stat-label">CA du Jour</div>
        <div class="stat-value" style="font-size:1.1rem">{{ fmt(summary?.totalGross ?? 0) }}</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--yellow-500)">
        <div class="stat-label">Encaissé du Jour</div>
        <div class="stat-value" style="font-size:1.1rem">{{ fmt(summary?.totalCollected ?? 0) }}</div>
      </div>
    </div>

    <!-- Classement équipe par commissions du mois -->
    <div class="card mb-4">
      <div class="card-title">🏆 Classement Équipe — Commissions du Mois</div>
      <div v-if="teamLoading" class="loading">Chargement...</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Commercial ID</th>
              <th class="text-right">Ventes</th>
              <th class="text-right">CA</th>
              <th class="text-right">Commission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in teamRanking" :key="r.salespersonId">
              <td>
                <span v-if="i === 0">🥇</span>
                <span v-else-if="i === 1">🥈</span>
                <span v-else-if="i === 2">🥉</span>
                <span v-else>{{ i + 1 }}</span>
              </td>
              <td class="font-mono">{{ r.salespersonId.slice(0,12) }}…</td>
              <td class="text-right">{{ r.saleCount }}</td>
              <td class="text-right">{{ fmt(r.totalSales) }}</td>
              <td class="text-right font-bold" style="color:var(--green-600)">{{ fmt(r.totalCommission) }}</td>
            </tr>
            <tr v-if="teamRanking.length === 0">
              <td colspan="5" class="text-center" style="color:var(--gray-400); padding:1.5rem">Aucune donnée ce mois</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Dernières ventes -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <span class="card-title" style="margin-bottom:0">Dernières Ventes</span>
        <button class="btn btn-ghost btn-sm" @click="loadAll">🔄</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Date/Heure</th><th>Acheteur</th>
              <th class="text-right">Net</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in recentSales" :key="String(s.id)">
              <td class="font-mono" style="font-size:.8rem">{{ s.saleCode }}</td>
              <td>{{ new Date(s.createdAt!).toLocaleString('fr-FR', { hour:'2-digit', minute:'2-digit' }) }}</td>
              <td>{{ s.buyerName }}</td>
              <td class="text-right font-bold">{{ fmt(s.totalCollected ?? 0) }}</td>
              <td><span :class="statusBadge(s.status ?? '')">{{ s.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { salesApi, commissionsApi, type DailySummary, type Sale } from '@/api';

const summary     = ref<DailySummary | null>(null);
const teamRanking = ref<{ salespersonId:string; totalCommission:number; totalSales:number; saleCount:number }[]>([]);
const recentSales = ref<Partial<Sale>[]>([]);
const teamLoading = ref(true);

function fmt(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function statusBadge(s: string) {
  return { badge: true, 'badge-yellow': s==='DRAFT', 'badge-green': s==='VALIDATED', 'badge-red': s==='CANCELLED' };
}

async function loadAll() {
  const [sRes, tRes, salesRes] = await Promise.all([
    salesApi.todaySummary().catch(() => null),
    commissionsApi.team().catch(() => null),
    salesApi.list().catch(() => null),
  ]);
  summary.value = sRes?.data ?? null;
  teamRanking.value = tRes?.data ?? [];
  recentSales.value = (salesRes?.data ?? []).slice(0, 15);
  teamLoading.value = false;
}

onMounted(loadAll);
</script>

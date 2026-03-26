<template>
  <div>
    <div v-if="loading" class="loading">Chargement des commissions...</div>
    <div v-else-if="dashboard">

      <!-- KPI Cards -->
      <div class="stats-grid">
        <div class="stat-card" style="border-left:4px solid var(--blue-600)">
          <div class="stat-label">💰 Commission Aujourd'hui</div>
          <div class="stat-value" style="color:var(--blue-600)">{{ fmtFCFA(dashboard.today.commission) }}</div>
          <div class="stat-sub">{{ dashboard.today.saleCount }} vente(s) — {{ fmtFCFA(dashboard.today.sales) }} de CA</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--yellow-500)">
          <div class="stat-label">📅 Cette Semaine</div>
          <div class="stat-value">{{ fmtFCFA(dashboard.week.commission) }}</div>
          <div class="stat-sub">{{ dashboard.week.saleCount }} vente(s)</div>
        </div>
        <div class="stat-card" style="border-left:4px solid var(--green-600)">
          <div class="stat-label">📆 Ce Mois</div>
          <div class="stat-value" style="color:var(--green-600)">{{ fmtFCFA(dashboard.month.commission) }}</div>
          <div class="stat-sub">{{ dashboard.month.saleCount }} vente(s) — CA {{ fmtFCFA(dashboard.month.sales) }}</div>
        </div>
      </div>

      <!-- Détail des entrées récentes -->
      <div class="card">
        <div class="card-title">Historique des Commissions</div>
        <div v-if="dashboard.recentEntries.length === 0" class="loading">
          Aucune commission enregistrée pour le moment.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vente</th>
                <th class="text-right">Base</th>
                <th class="text-right">Taux</th>
                <th class="text-right">Commission</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in dashboard.recentEntries" :key="e.id">
                <td>{{ new Date(e.calculationDate).toLocaleDateString('fr-FR') }}</td>
                <td class="font-mono" style="font-size:.8rem">{{ e.saleId.slice(0,8) }}…</td>
                <td class="text-right">{{ fmtFCFA(e.baseAmount) }}</td>
                <td class="text-right">{{ e.rateApplied }}%</td>
                <td class="text-right font-bold" style="color:var(--green-600)">{{ fmtFCFA(e.commissionAmount) }}</td>
                <td>
                  <span :class="statusBadge(e.status)">{{ e.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { commissionsApi, type CommissionDashboard } from '@/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const dashboard = ref<CommissionDashboard | null>(null);
const loading = ref(true);

function fmtFCFA(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function statusBadge(status: string) {
  return {
    badge: true,
    'badge-yellow': status === 'PENDING',
    'badge-green':  status === 'VALIDATED',
    'badge-blue':   status === 'PAID',
  };
}

onMounted(async () => {
  try {
    const res = await commissionsApi.dashboard(auth.user!.id);
    dashboard.value = res.data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <div v-if="loading" class="loading">Chargement...</div>
    <div v-else-if="summary">

      <!-- Stats KPI -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Ventes du Jour</div>
          <div class="stat-value">{{ summary.totalSales }}</div>
          <div class="stat-sub">{{ summary.date }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Brut</div>
          <div class="stat-value" style="font-size:1.2rem">{{ fmt(summary.totalGross) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Encaissé</div>
          <div class="stat-value" style="font-size:1.2rem; color:var(--green-600)">{{ fmt(summary.totalCollected) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Remises accordées</div>
          <div class="stat-value" style="font-size:1.2rem; color:var(--red-600)">{{ fmt(summary.totalDiscount) }}</div>
        </div>
      </div>

      <!-- Répartition par commercial -->
      <div class="card mb-4">
        <div class="card-title">Répartition par Commercial</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Commercial ID</th>
                <th class="text-right">Ventes</th>
                <th class="text-right">Total Brut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sp in summary.bySalesperson" :key="sp.salespersonId">
                <td class="font-mono">{{ sp.salespersonId.slice(0,12) }}…</td>
                <td class="text-right">{{ sp.count }}</td>
                <td class="text-right font-bold">{{ fmt(sp.totalGross) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Clôture de journée -->
      <div class="card">
        <div class="card-title">Clôture de Journée</div>
        <p style="font-size:.875rem; color:var(--gray-600); margin-bottom:1rem">
          La clôture valide toutes les ventes en statut DRAFT et génère le récapitulatif final.
        </p>
        <div v-if="closeResult" class="alert alert-success">{{ closeResult }}</div>
        <button class="btn btn-primary" :disabled="closing" @click="closeDay">
          {{ closing ? 'Clôture en cours...' : '🔒 Clôturer la journée' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { salesApi, type DailySummary } from '@/api';

const summary = ref<DailySummary | null>(null);
const loading = ref(true);
const closing = ref(false);
const closeResult = ref('');

function fmt(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }

async function closeDay() {
  closing.value = true;
  try {
    const res = await salesApi.closeDay();
    closeResult.value = res.data.message;
    await loadSummary();
  } finally {
    closing.value = false;
  }
}

async function loadSummary() {
  const res = await salesApi.todaySummary();
  summary.value = res.data;
}

onMounted(async () => {
  await loadSummary();
  loading.value = false;
});
</script>

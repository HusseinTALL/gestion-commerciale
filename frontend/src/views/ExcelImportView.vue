<template>
  <div>
    <div class="card">
      <div class="card-title">📥 Import Excel — Historique des Ventes</div>
      <p style="font-size:.875rem; color:var(--gray-600); margin-bottom:1.5rem">
        Importez le fichier Excel existant (Détail des Revenus). Le système normalisera les noms de vendeurs
        et calculera automatiquement les commissions pour chaque ligne importée.
      </p>

      <div v-if="result" :class="result.summary.errors > 0 ? 'alert alert-error' : 'alert alert-success'">
        ✓ {{ result.summary.imported }} importée(s) &nbsp;|&nbsp;
        ⏭ {{ result.summary.skipped }} ignorée(s) &nbsp;|&nbsp;
        ✗ {{ result.summary.errors }} erreur(s)
      </div>

      <form @submit.prevent="runImport">
        <!-- Fichier -->
        <div class="form-group">
          <label class="form-label">Fichier Excel (.xlsx) *</label>
          <input type="file" accept=".xlsx,.xls" class="form-input" @change="onFile" required />
        </div>

        <!-- Mapping vendeurs -->
        <div class="card" style="background:var(--gray-50); margin-bottom:1rem">
          <div class="card-title">Mapping Vendeurs → Comptes</div>
          <p style="font-size:.82rem; color:var(--gray-600); margin-bottom:.875rem">
            Associez chaque nom de vendeur du fichier Excel à un commercial du système.
          </p>
          <div v-for="(entry, i) in mapping" :key="i" class="form-row" style="margin-bottom:.5rem">
            <div class="form-group" style="margin-bottom:0">
              <input v-model="entry.name" class="form-input" placeholder="Nom dans Excel (ex: DIALLO)" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <select v-model="entry.userId" class="form-select">
                <option value="">— Commercial —</option>
                <option v-for="c in commercials" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" @click="mapping.splice(i,1)">✕</button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm mt-4" @click="mapping.push({ name:'', userId:'' })">
            + Ajouter un vendeur
          </button>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="importing || !file">
          {{ importing ? 'Import en cours...' : '📤 Lancer l\'import' }}
        </button>
      </form>

      <!-- Résultats détaillés -->
      <div v-if="result && result.errors.length > 0" style="margin-top:1.5rem">
        <div class="card-title">Erreurs à corriger ({{ result.errors.length }})</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ligne</th><th>Erreur</th></tr></thead>
            <tbody>
              <tr v-for="e in result.errors" :key="e.row">
                <td>{{ e.row }}</td>
                <td style="color:var(--red-600)">{{ e.error }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { salesApi, usersApi, type User } from '@/api';

const commercials = ref<User[]>([]);
const file = ref<File | null>(null);
const importing = ref(false);
const result = ref<{ summary: { total:number; imported:number; skipped:number; errors:number }; errors:{row:number;error:string}[] } | null>(null);
const mapping = reactive<{ name: string; userId: string }[]>([
  { name: 'DIALLO',     userId: '' },
  { name: 'KERE',       userId: '' },
  { name: 'LANKOUANDE', userId: '' },
]);

function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

async function runImport() {
  if (!file.value) return;
  importing.value = true;
  result.value = null;
  try {
    const mappingObj: Record<string, string> = {};
    for (const m of mapping) {
      if (m.name && m.userId) mappingObj[m.name.toUpperCase()] = m.userId;
    }
    const res = await salesApi.importExcel(file.value, mappingObj);
    result.value = res.data;
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  commercials.value = await usersApi.getCommercials();
});
</script>

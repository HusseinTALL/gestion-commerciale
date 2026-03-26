<template>
  <div>
    <!-- ─── Formulaire de saisie (M0) ─────────────────────────────────── -->
    <div class="card mb-4">
      <div class="card-title">➕ Nouvelle Vente</div>

      <div v-if="formError" class="alert alert-error">{{ formError }}</div>
      <div v-if="formSuccess" class="alert alert-success">{{ formSuccess }}</div>

      <form @submit.prevent="submitSale">
        <!-- Vendeur & Acheteur -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Vendeur (Commercial) *</label>
            <select v-model="form.salespersonId" class="form-select" required>
              <option value="">— Sélectionner —</option>
              <option v-for="c in commercials" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Téléphone acheteur *</label>
            <input v-model="form.buyerPhone" class="form-input" placeholder="+224 6XX XXX XXX" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nom acheteur *</label>
            <input v-model="form.buyerName" class="form-input" placeholder="Nom du client" required />
          </div>
        </div>

        <!-- Lignes de vente -->
        <div style="margin-bottom:.875rem">
          <div class="flex items-center justify-between mb-4">
            <span style="font-weight:600; font-size:.9rem">Lignes de vente</span>
            <button type="button" class="btn btn-ghost btn-sm" @click="addLine">+ Ajouter ligne</button>
          </div>

          <div
            v-for="(line, i) in form.lines"
            :key="i"
            style="border:1px solid var(--gray-200); border-radius:var(--radius); padding:.875rem; margin-bottom:.625rem; background:var(--gray-50)"
          >
            <div class="flex items-center justify-between mb-4">
              <span style="font-size:.85rem; font-weight:600; color:var(--gray-600)">Ligne {{ i + 1 }}</span>
              <button v-if="form.lines.length > 1" type="button" class="btn btn-danger btn-sm" @click="removeLine(i)">✕</button>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Produit *</label>
                <select v-model="line.productId" class="form-select" required @change="onProductChange(i)">
                  <option value="">— Produit —</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Variante (épaiss./couleur) *</label>
                <select v-model="line.productVariantId" class="form-select" required @change="onVariantChange(i)">
                  <option value="">— Variante —</option>
                  <option
                    v-for="v in getVariants(line.productId)"
                    :key="v.id"
                    :value="v.id"
                  >
                    {{ v.thickness }}mm — {{ v.color }} ({{ fmt(v.defaultPrice) }} FCFA/ml)
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Métrage unitaire (ml) *</label>
                <input v-model.number="line.unitLength" type="number" step="0.01" min="0.01" class="form-input" required @input="calcLine(i)" />
              </div>
              <div class="form-group">
                <label class="form-label">Quantité *</label>
                <input v-model.number="line.quantity" type="number" min="1" class="form-input" required @input="calcLine(i)" />
              </div>
              <div class="form-group">
                <label class="form-label">Métrage total</label>
                <input :value="fmtNum(line.totalMetrage)" class="form-input" readonly style="background:var(--blue-50)" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Prix unitaire (FCFA/ml) *</label>
                <input v-model.number="line.unitPrice" type="number" min="0" class="form-input" required @input="calcLine(i)" />
              </div>
              <div class="form-group">
                <label class="form-label">Remise (FCFA)</label>
                <input v-model.number="line.discount" type="number" min="0" class="form-input" @input="calcLine(i)" />
              </div>
              <div class="form-group">
                <label class="form-label">Montant net</label>
                <input :value="fmtNum(line.netAmount)" class="form-input font-bold" readonly style="background:var(--green-50)" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Sortie réelle (ml) — laisser vide si = métrage total</label>
              <input v-model.number="line.actualOutput" type="number" step="0.01" min="0" class="form-input"
                :placeholder="`= ${fmtNum(line.totalMetrage)} ml`" />
              <span v-if="line.actualOutput && line.actualOutput !== line.totalMetrage"
                style="font-size:.8rem; color:var(--yellow-500); font-weight:500">
                ⚠️ Écart détecté : sortie réelle ≠ métrage total
              </span>
            </div>
          </div>
        </div>

        <!-- Totaux -->
        <div style="background:var(--blue-50); border-radius:var(--radius); padding:1rem; margin-bottom:1rem">
          <div class="form-row">
            <div>
              <div style="font-size:.8rem; color:var(--gray-600)">Total Brut</div>
              <div style="font-size:1.3rem; font-weight:700">{{ fmt(totals.gross) }}</div>
            </div>
            <div>
              <div style="font-size:.8rem; color:var(--gray-600)">Total Remises</div>
              <div style="font-size:1.3rem; font-weight:700; color:var(--red-600)">−{{ fmt(totals.discount) }}</div>
            </div>
            <div>
              <div style="font-size:.8rem; color:var(--gray-600)">Total Net</div>
              <div style="font-size:1.3rem; font-weight:700; color:var(--green-600)">{{ fmt(totals.net) }}</div>
            </div>
          </div>
          <!-- Paiement partiel -->
          <div class="form-group mt-4" style="margin-top:.875rem">
            <label class="form-label">Montant encaissé (laisser vide si = total net)</label>
            <input v-model.number="form.amountCollected" type="number" min="0" class="form-input"
              :placeholder="`= ${fmtNum(totals.net)} FCFA`" style="max-width:280px" />
            <span v-if="form.amountCollected && form.amountCollected < totals.net"
              style="font-size:.82rem; color:var(--yellow-500); font-weight:500">
              ⚠️ Paiement partiel — Créance : {{ fmt(totals.net - form.amountCollected) }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Remarques</label>
          <input v-model="form.notes" class="form-input" placeholder="Notes optionnelles..." />
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn btn-success" :disabled="submitting">
            {{ submitting ? 'Enregistrement...' : '✓ Enregistrer la vente' }}
          </button>
          <button type="button" class="btn btn-ghost" @click="resetForm">Réinitialiser</button>
        </div>
      </form>
    </div>

    <!-- ─── Dernières ventes du jour ──────────────────────────────────── -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <span class="card-title" style="margin-bottom:0">Ventes du Jour</span>
        <button class="btn btn-ghost btn-sm" @click="loadTodaySales">🔄 Actualiser</button>
      </div>

      <div v-if="todaySales.length === 0" class="loading">Aucune vente aujourd'hui</div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Heure</th>
              <th>Acheteur</th>
              <th>Vendeur ID</th>
              <th class="text-right">Total Brut</th>
              <th class="text-right">Encaissé</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in todaySales" :key="s.id">
              <td class="font-mono" style="font-size:.8rem">{{ s.saleCode }}</td>
              <td>{{ new Date(s.createdAt!).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) }}</td>
              <td>{{ s.buyerName }}<br><span style="font-size:.78rem;color:var(--gray-400)">{{ s.buyerPhone }}</span></td>
              <td style="font-size:.8rem; color:var(--gray-400)">{{ s.salespersonId?.slice(0,8) }}…</td>
              <td class="text-right font-bold">{{ fmt(s.totalGross ?? 0) }}</td>
              <td class="text-right">{{ fmt(s.totalCollected ?? 0) }}</td>
              <td>
                <span :class="statusBadge(s.status ?? '')">{{ s.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { productsApi, usersApi, salesApi, type Product, type User, type Sale } from '@/api';

// ── Data ─────────────────────────────────────────────────────────────
const products   = ref<Product[]>([]);
const commercials = ref<User[]>([]);
const todaySales  = ref<Partial<Sale>[]>([]);
const submitting  = ref(false);
const formError   = ref('');
const formSuccess = ref('');

// ── Form ──────────────────────────────────────────────────────────────
const defaultLine = () => ({
  productId: '',
  productVariantId: '',
  unitLength: 0,
  quantity: 1,
  totalMetrage: 0,
  unitPrice: 0,
  discount: 0,
  netAmount: 0,
  actualOutput: undefined as number | undefined,
});

const form = reactive({
  salespersonId: '',
  buyerPhone: '',
  buyerName: '',
  notes: '',
  amountCollected: undefined as number | undefined,
  lines: [defaultLine()],
});

// ── Computed totaux ───────────────────────────────────────────────────
const totals = computed(() => {
  const gross    = form.lines.reduce((s, l) => s + l.unitPrice * l.totalMetrage, 0);
  const discount = form.lines.reduce((s, l) => s + (l.discount ?? 0), 0);
  return { gross, discount, net: gross - discount };
});

// ── Helpers ───────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function fmtNum(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
function statusBadge(status: string) {
  return {
    'badge badge-yellow': status === 'DRAFT',
    'badge badge-green':  status === 'VALIDATED',
    'badge badge-red':    status === 'CANCELLED',
  };
}

function getVariants(productId: string) {
  return products.value.find((p) => p.id === productId)?.variants?.filter((v) => v.isActive) ?? [];
}

function calcLine(i: number) {
  const l = form.lines[i];
  l.totalMetrage = +(l.unitLength * l.quantity).toFixed(2);
  l.netAmount = +(l.unitPrice * l.totalMetrage - (l.discount ?? 0)).toFixed(2);
}

function onProductChange(i: number) {
  form.lines[i].productVariantId = '';
  form.lines[i].unitPrice = 0;
  calcLine(i);
}

function onVariantChange(i: number) {
  const line = form.lines[i];
  const variant = getVariants(line.productId).find((v) => v.id === line.productVariantId);
  if (variant) {
    line.unitPrice = variant.defaultPrice;
    calcLine(i);
  }
}

function addLine() { form.lines.push(defaultLine()); }
function removeLine(i: number) { form.lines.splice(i, 1); }

function resetForm() {
  form.salespersonId = '';
  form.buyerPhone = '';
  form.buyerName = '';
  form.notes = '';
  form.amountCollected = undefined;
  form.lines = [defaultLine()];
  formError.value = '';
  formSuccess.value = '';
}

// ── Submit ────────────────────────────────────────────────────────────
async function submitSale() {
  formError.value = '';
  formSuccess.value = '';
  submitting.value = true;
  try {
    await salesApi.create({
      salespersonId: form.salespersonId,
      buyerPhone: form.buyerPhone,
      buyerName: form.buyerName,
      notes: form.notes || undefined,
      amountCollected: form.amountCollected,
      lines: form.lines.map((l) => ({
        productVariantId: l.productVariantId,
        unitLength: l.unitLength,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount ?? 0,
        actualOutput: l.actualOutput,
      })),
    });
    formSuccess.value = `✓ Vente enregistrée — Total net : ${fmt(totals.value.net)}`;
    resetForm();
    await loadTodaySales();
  } catch (err: unknown) {
    formError.value = (err as { response?: { data?: { error?: string } } })
      ?.response?.data?.error ?? 'Erreur lors de l\'enregistrement';
  } finally {
    submitting.value = false;
  }
}

// ── Load data ─────────────────────────────────────────────────────────
async function loadTodaySales() {
  try {
    const summary = await salesApi.todaySummary();
    todaySales.value = summary.data.sales;
  } catch { /* silent */ }
}

onMounted(async () => {
  const [p, c] = await Promise.all([productsApi.list(), usersApi.getCommercials()]);
  products.value = p.data;
  commercials.value = c;
  await loadTodaySales();
});
</script>

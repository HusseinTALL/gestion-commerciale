import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Injecter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rediriger vers login si 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get<User[]>('/users'),
  getCommercials: () =>
    api.get<User[]>('/users').then((r) =>
      r.data.filter((u) => u.role === 'COMMERCIAL' && u.isActive)
    ),
};

// ── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  list: () => api.get<Product[]>('/products'),
  getVariants: (productId: string) =>
    api.get<Product[]>('/products').then((r) => {
      const p = r.data.find((p) => p.id === productId);
      return p?.variants ?? [];
    }),
};

// ── Sales ─────────────────────────────────────────────────────────────────────
export const salesApi = {
  list: (params?: Record<string, string>) => api.get<Sale[]>('/sales', { params }),
  get: (id: string) => api.get<Sale>(`/sales/${id}`),
  create: (data: CreateSalePayload) => api.post<Sale>('/sales', data),
  validate: (id: string) => api.patch<Sale>(`/sales/${id}/validate`),
  cancel: (id: string) => api.patch<Sale>(`/sales/${id}/cancel`),
  todaySummary: () => api.get<DailySummary>('/sales/summary/today'),
  closeDay: () => api.post('/sales/close-day'),
  importExcel: (file: File, mapping: Record<string, string>) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('salespersonMapping', JSON.stringify(mapping));
    return api.post('/sales/import-excel', fd);
  },
};

// ── Commissions ───────────────────────────────────────────────────────────────
export const commissionsApi = {
  dashboard: (salespersonId: string) =>
    api.get<CommissionDashboard>(`/commissions/dashboard/${salespersonId}`),
  team: () => api.get('/commissions/team'),
  history: (salespersonId: string, month?: number, year?: number) =>
    api.get(`/commissions/history/${salespersonId}`, { params: { month, year } }),
  grids: () => api.get('/commissions/grids'),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string; name: string; email: string; role: string; isActive: boolean;
}

export interface Product {
  id: string; name: string; category: string; isActive: boolean;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string; productId: string; thickness: number; color: string;
  defaultPrice: number; isActive: boolean;
}

export interface SaleLine {
  productVariantId: string;
  unitLength: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  actualOutput?: number;
}

export interface CreateSalePayload {
  salespersonId: string;
  buyerPhone: string;
  buyerName: string;
  notes?: string;
  amountCollected?: number;
  lines: SaleLine[];
}

export interface Sale {
  id: string; saleCode: string; saleDate: string; salespersonId: string;
  buyerPhone: string; buyerName: string; totalGross: number;
  totalCollected: number; totalDiscount: number; status: string;
  notes?: string; createdAt: string;
  lines: SaleLineDetail[];
}

export interface SaleLineDetail extends SaleLine {
  id: string; saleId: string; totalMetrage: number; actualOutput: number;
  grossAmount: number; netAmount: number;
  productVariant?: ProductVariant & { product: Product };
}

export interface DailySummary {
  date: string; totalSales: number; totalGross: number;
  totalCollected: number; totalDiscount: number;
  bySalesperson: Array<{ salespersonId: string; totalGross: number; count: number }>;
  sales: Partial<Sale>[];
}

export interface CommissionDashboard {
  salespersonId: string;
  today: { commission: number; sales: number; saleCount: number };
  week:  { commission: number; sales: number; saleCount: number };
  month: { commission: number; sales: number; saleCount: number };
  recentEntries: CommissionEntry[];
}

export interface CommissionEntry {
  id: string; salespersonId: string; saleId: string; saleLineId: string;
  baseAmount: number; rateApplied: number; commissionAmount: number;
  calculationDate: string; status: string;
}

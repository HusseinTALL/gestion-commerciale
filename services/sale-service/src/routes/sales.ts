import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { publishSaleCreated, SaleCreatedEvent } from '../events/producer';

export const salesRouter = Router();

salesRouter.use(requireAuth);

const saleLineSchema = z.object({
  productVariantId: z.string().uuid(),
  unitLength: z.number().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
  actualOutput: z.number().positive().optional(),
});

const createSaleSchema = z.object({
  salespersonId: z.string().uuid(),
  buyerPhone: z.string(),
  buyerName: z.string(),
  notes: z.string().optional(),
  amountCollected: z.number().min(0).optional(),
  lines: z.array(saleLineSchema).min(1),
});

function generateSaleCode(date: Date): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VTE-${datePart}-${rand}`;
}

// GET /api/sales
salesRouter.get('/', requireRole('CASHIER', 'MANAGER', 'DIRECTOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { date, salespersonId, status } = req.query as Record<string, string>;
  const sales = await prisma.sale.findMany({
    where: {
      ...(date && { saleDate: new Date(date) }),
      ...(salespersonId && { salespersonId }),
      ...(status && { status: status as 'DRAFT' | 'VALIDATED' | 'CANCELLED' }),
    },
    include: {
      lines: {
        include: { productVariant: { include: { product: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sales);
});

// GET /api/sales/summary/today — récapitulatif journalier
salesRouter.get('/summary/today', requireRole('CASHIER', 'MANAGER', 'DIRECTOR', 'ADMIN'), async (_req, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [sales, agg] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true, saleCode: true, buyerName: true, buyerPhone: true,
        salespersonId: true, totalGross: true, totalCollected: true,
        totalDiscount: true, status: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalGross: true, totalCollected: true, totalDiscount: true },
      _count: { id: true },
    }),
  ]);

  // Regrouper par commercial
  const bySalesperson: Record<string, { salespersonId: string; totalGross: number; count: number }> = {};
  for (const s of sales) {
    if (!bySalesperson[s.salespersonId]) {
      bySalesperson[s.salespersonId] = { salespersonId: s.salespersonId, totalGross: 0, count: 0 };
    }
    bySalesperson[s.salespersonId].totalGross += Number(s.totalGross);
    bySalesperson[s.salespersonId].count += 1;
  }

  res.json({
    date: today.toISOString().slice(0, 10),
    totalSales: agg._count.id,
    totalGross: Number(agg._sum.totalGross ?? 0),
    totalCollected: Number(agg._sum.totalCollected ?? 0),
    totalDiscount: Number(agg._sum.totalDiscount ?? 0),
    bySalesperson: Object.values(bySalesperson),
    sales,
  });
});

// GET /api/sales/:id
salesRouter.get('/:id', async (req, res: Response) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: { lines: { include: { productVariant: { include: { product: true } } } } },
  });
  if (!sale) {
    res.status(404).json({ error: 'Vente introuvable' });
    return;
  }
  res.json(sale);
});

// POST /api/sales — créer une vente (M0 core)
salesRouter.post('/', requireRole('CASHIER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lines, amountCollected, ...saleData } = parsed.data;
  const now = new Date();

  // Récupérer les variantes pour avoir la catégorie et épaisseur
  const variantIds = lines.map((l) => l.productVariantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: true },
  });
  const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));

  const computedLines = lines.map((l) => {
    const totalMetrage = l.unitLength * l.quantity;
    const grossAmount = l.unitPrice * totalMetrage;
    const netAmount = grossAmount - l.discount;
    return {
      ...l,
      totalMetrage,
      actualOutput: l.actualOutput ?? totalMetrage,
      grossAmount,
      netAmount,
    };
  });

  const totalGross = computedLines.reduce((s, l) => s + l.grossAmount, 0);
  const totalDiscount = computedLines.reduce((s, l) => s + l.discount, 0);
  const totalCollected = amountCollected ?? (totalGross - totalDiscount);

  const sale = await prisma.sale.create({
    data: {
      ...saleData,
      saleCode: generateSaleCode(now),
      saleDate: now,
      totalGross,
      totalDiscount,
      totalCollected,
      createdBy: req.user!.sub,
      lines: { create: computedLines.map(({ actualOutput, ...l }) => ({ ...l, actualOutput })) },
    },
    include: {
      lines: { include: { productVariant: { include: { product: true } } } },
    },
  });

  // Publier l'événement Kafka SALE_CREATED
  const event: SaleCreatedEvent = {
    saleId: sale.id,
    saleCode: sale.saleCode,
    saleDate: sale.saleDate.toISOString(),
    salespersonId: sale.salespersonId,
    buyerPhone: sale.buyerPhone,
    totalGross: Number(sale.totalGross),
    totalCollected: Number(sale.totalCollected),
    totalDiscount: Number(sale.totalDiscount),
    status: sale.status,
    lines: sale.lines.map((l) => ({
      id: l.id,
      productVariantId: l.productVariantId,
      productCategory: variantMap[l.productVariantId]?.product.category ?? '',
      thickness: Number(variantMap[l.productVariantId]?.thickness ?? 0),
      unitLength: Number(l.unitLength),
      quantity: l.quantity,
      totalMetrage: Number(l.totalMetrage),
      actualOutput: Number(l.actualOutput),
      unitPrice: Number(l.unitPrice),
      grossAmount: Number(l.grossAmount),
      discount: Number(l.discount),
      netAmount: Number(l.netAmount),
    })),
  };

  publishSaleCreated(event).catch((err) =>
    console.error('[sale-service] Kafka publish error:', err)
  );

  res.status(201).json(sale);
});

// PATCH /api/sales/:id/validate
salesRouter.patch('/:id/validate', requireRole('MANAGER', 'DIRECTOR', 'ADMIN'), async (req, res: Response) => {
  const sale = await prisma.sale.update({
    where: { id: req.params.id },
    data: { status: 'VALIDATED' },
  });
  res.json(sale);
});

// PATCH /api/sales/:id/cancel
salesRouter.patch('/:id/cancel', requireRole('MANAGER', 'DIRECTOR', 'ADMIN'), async (req, res: Response) => {
  const sale = await prisma.sale.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });
  res.json(sale);
});

// POST /api/sales/close-day — clôture journalière
salesRouter.post('/close-day', requireRole('CASHIER', 'MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Valider toutes les ventes DRAFT du jour
  const { count } = await prisma.sale.updateMany({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      status: 'DRAFT',
    },
    data: { status: 'VALIDATED' },
  });

  const agg = await prisma.sale.aggregate({
    where: {
      createdAt: { gte: today, lt: tomorrow },
      status: 'VALIDATED',
    },
    _sum: { totalGross: true, totalCollected: true },
    _count: { id: true },
  });

  res.json({
    message: `Clôture effectuée — ${count} vente(s) validée(s)`,
    date: today.toISOString().slice(0, 10),
    totalValidated: agg._count.id,
    totalGross: Number(agg._sum.totalGross ?? 0),
    totalCollected: Number(agg._sum.totalCollected ?? 0),
    closedBy: req.user!.sub,
    closedAt: new Date().toISOString(),
  });
});

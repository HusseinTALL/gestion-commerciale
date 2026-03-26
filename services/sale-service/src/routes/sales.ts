import { Router, Response } from 'express';
import { z } from 'zod';
import { format } from 'util';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const salesRouter = Router();

salesRouter.use(requireAuth);

const saleLineSchema = z.object({
  productVariantId: z.string().uuid(),
  unitLength: z.number().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
});

const createSaleSchema = z.object({
  salespersonId: z.string().uuid(),
  buyerPhone: z.string(),
  buyerName: z.string(),
  notes: z.string().optional(),
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
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(sales);
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

// POST /api/sales
salesRouter.post('/', requireRole('CASHIER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lines, ...saleData } = parsed.data;
  const now = new Date();

  const computedLines = lines.map((l) => {
    const totalMetrage = l.unitLength * l.quantity;
    const grossAmount = l.unitPrice * totalMetrage;
    const netAmount = grossAmount - l.discount;
    return { ...l, totalMetrage, actualOutput: totalMetrage, grossAmount, netAmount };
  });

  const totalGross = computedLines.reduce((s, l) => s + l.grossAmount, 0);
  const totalDiscount = computedLines.reduce((s, l) => s + l.discount, 0);
  const totalCollected = totalGross - totalDiscount;

  const sale = await prisma.sale.create({
    data: {
      ...saleData,
      saleCode: generateSaleCode(now),
      saleDate: now,
      totalGross,
      totalDiscount,
      totalCollected,
      createdBy: req.user!.sub,
      lines: { create: computedLines },
    },
    include: { lines: true },
  });
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

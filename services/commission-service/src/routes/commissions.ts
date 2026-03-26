import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const commissionsRouter = Router();

commissionsRouter.use(requireAuth);

// GET /api/commissions/dashboard/:salespersonId
// Tableau de bord des commissions d'un commercial
commissionsRouter.get('/dashboard/:salespersonId', async (req: AuthRequest, res: Response) => {
  const { salespersonId } = req.params;

  // Un commercial ne peut voir que son propre dashboard
  if (req.user!.role === 'COMMERCIAL' && req.user!.sub !== salespersonId) {
    res.status(403).json({ error: 'Accès refusé' });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  const [todaySummary, weekAgg, monthAgg, recentEntries] = await Promise.all([
    prisma.commissionDailySummary.findUnique({
      where: { salespersonId_summaryDate: { salespersonId, summaryDate: today } },
    }),
    prisma.commissionEntry.aggregate({
      where: { salespersonId, calculationDate: { gte: startOfWeek } },
      _sum: { commissionAmount: true, baseAmount: true },
      _count: { id: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { salespersonId, calculationDate: { gte: startOfMonth } },
      _sum: { commissionAmount: true, baseAmount: true },
      _count: { id: true },
    }),
    prisma.commissionEntry.findMany({
      where: { salespersonId },
      orderBy: { calculationDate: 'desc' },
      take: 20,
      include: { grid: true },
    }),
  ]);

  res.json({
    salespersonId,
    today: {
      commission: Number(todaySummary?.totalCommission ?? 0),
      sales: Number(todaySummary?.totalSales ?? 0),
      saleCount: todaySummary?.saleCount ?? 0,
    },
    week: {
      commission: Number(weekAgg._sum.commissionAmount ?? 0),
      sales: Number(weekAgg._sum.baseAmount ?? 0),
      saleCount: weekAgg._count.id,
    },
    month: {
      commission: Number(monthAgg._sum.commissionAmount ?? 0),
      sales: Number(monthAgg._sum.baseAmount ?? 0),
      saleCount: monthAgg._count.id,
    },
    recentEntries,
  });
});

// GET /api/commissions/team — Vue manager : classement équipe
commissionsRouter.get('/team', requireRole('MANAGER', 'DIRECTOR', 'ADMIN'), async (_req, res: Response) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const ranking = await prisma.commissionEntry.groupBy({
    by: ['salespersonId'],
    where: { calculationDate: { gte: startOfMonth } },
    _sum: { commissionAmount: true, baseAmount: true },
    _count: { id: true },
    orderBy: { _sum: { commissionAmount: 'desc' } },
  });

  res.json(ranking.map((r) => ({
    salespersonId: r.salespersonId,
    totalCommission: Number(r._sum.commissionAmount ?? 0),
    totalSales: Number(r._sum.baseAmount ?? 0),
    saleCount: r._count.id,
  })));
});

// GET /api/commissions/history/:salespersonId
commissionsRouter.get('/history/:salespersonId', async (req: AuthRequest, res: Response) => {
  const { salespersonId } = req.params;
  const { month, year } = req.query as Record<string, string>;

  if (req.user!.role === 'COMMERCIAL' && req.user!.sub !== salespersonId) {
    res.status(403).json({ error: 'Accès refusé' });
    return;
  }

  const startDate = month && year
    ? new Date(Number(year), Number(month) - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

  const entries = await prisma.commissionEntry.findMany({
    where: {
      salespersonId,
      calculationDate: { gte: startDate, lte: endDate },
    },
    include: { grid: true },
    orderBy: { calculationDate: 'desc' },
  });

  const total = entries.reduce((s, e) => s + Number(e.commissionAmount), 0);

  res.json({ salespersonId, period: { month: startDate.getMonth() + 1, year: startDate.getFullYear() }, total, entries });
});

// PATCH /api/commissions/:id/validate
commissionsRouter.patch('/:id/validate', requireRole('MANAGER', 'DIRECTOR', 'ADMIN'), async (req, res: Response) => {
  const entry = await prisma.commissionEntry.update({
    where: { id: req.params.id },
    data: { status: 'VALIDATED' },
  });
  res.json(entry);
});

// PATCH /api/commissions/:id/pay
commissionsRouter.patch('/:id/pay', requireRole('DIRECTOR', 'ADMIN'), async (req, res: Response) => {
  const entry = await prisma.commissionEntry.update({
    where: { id: req.params.id },
    data: { status: 'PAID' },
  });
  res.json(entry);
});

// GET /api/commissions/grids — Grilles de commissions
commissionsRouter.get('/grids', requireRole('DIRECTOR', 'ADMIN', 'MANAGER'), async (_req, res: Response) => {
  const grids = await prisma.commissionGrid.findMany({
    where: { isActive: true },
    orderBy: [{ productCategory: 'asc' }, { thicknessMin: 'asc' }, { monthlyVolumeMin: 'asc' }],
  });
  res.json(grids);
});

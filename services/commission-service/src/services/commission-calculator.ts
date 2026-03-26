import { prisma } from '../lib/prisma';
import { SaleCreatedEvent } from '../events/consumer';

/**
 * Calcule et enregistre les commissions pour chaque ligne d'une vente.
 * Logique : pour chaque ligne, chercher la grille active correspondant à
 * (productCategory, thickness, monthlyVolume cumulé du commercial).
 */
export async function calculateCommissionsForSale(event: SaleCreatedEvent): Promise<void> {
  const saleDate = new Date(event.saleDate);
  const startOfMonth = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1);
  const endOfMonth = new Date(saleDate.getFullYear(), saleDate.getMonth() + 1, 0, 23, 59, 59);

  // Calculer le volume mensuel courant du commercial (avant cette vente)
  const monthlyVolumeAgg = await prisma.commissionEntry.aggregate({
    where: {
      salespersonId: event.salespersonId,
      calculationDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { baseAmount: true },
  });
  let cumulativeMonthlyVolume = Number(monthlyVolumeAgg._sum.baseAmount ?? 0);

  for (const line of event.lines) {
    // Chercher la grille de commission correspondante
    const grid = await prisma.commissionGrid.findFirst({
      where: {
        productCategory: line.productCategory,
        thicknessMin: { lte: line.thickness },
        thicknessMax: { gte: line.thickness },
        monthlyVolumeMin: { lte: cumulativeMonthlyVolume + line.grossAmount },
        monthlyVolumeMax: { gte: cumulativeMonthlyVolume },
        isActive: true,
        effectiveFrom: { lte: saleDate },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!grid) {
      console.warn(
        `[commission-service] Aucune grille pour cat=${line.productCategory}, ` +
        `thickness=${line.thickness}, volume=${cumulativeMonthlyVolume}`
      );
      continue;
    }

    const commissionAmount = (line.netAmount * Number(grid.ratePercent)) / 100;

    await prisma.commissionEntry.create({
      data: {
        salespersonId: event.salespersonId,
        saleId: event.saleId,
        saleLineId: line.id,
        gridId: grid.id,
        baseAmount: line.netAmount,
        rateApplied: grid.ratePercent,
        commissionAmount,
        calculationDate: saleDate,
        status: 'PENDING',
      },
    });

    cumulativeMonthlyVolume += line.grossAmount;
  }

  // Mettre à jour ou créer le résumé journalier
  await upsertDailySummary(event.salespersonId, saleDate);
}

async function upsertDailySummary(salespersonId: string, date: Date): Promise<void> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const [dayAgg, monthAgg] = await Promise.all([
    prisma.commissionEntry.aggregate({
      where: {
        salespersonId,
        calculationDate: { gte: dayStart, lte: dayEnd },
      },
      _sum: { commissionAmount: true, baseAmount: true },
      _count: { id: true },
    }),
    prisma.commissionEntry.aggregate({
      where: {
        salespersonId,
        calculationDate: { gte: startOfMonth, lte: dayEnd },
      },
      _sum: { commissionAmount: true },
    }),
  ]);

  await prisma.commissionDailySummary.upsert({
    where: { salespersonId_summaryDate: { salespersonId, summaryDate: dayStart } },
    update: {
      totalSales: dayAgg._sum.baseAmount ?? 0,
      totalCommission: dayAgg._sum.commissionAmount ?? 0,
      saleCount: dayAgg._count.id,
      cumulMonth: monthAgg._sum.commissionAmount ?? 0,
    },
    create: {
      salespersonId,
      summaryDate: dayStart,
      totalSales: dayAgg._sum.baseAmount ?? 0,
      totalCommission: dayAgg._sum.commissionAmount ?? 0,
      saleCount: dayAgg._count.id,
      cumulMonth: monthAgg._sum.commissionAmount ?? 0,
    },
  });
}

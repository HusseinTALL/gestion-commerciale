import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding commission-service...');

  const grids = [
    { productCategory: 'TOLE_COLOREE', thicknessMin: 0.3, thicknessMax: 0.45, monthlyVolumeMin: 0, monthlyVolumeMax: 500000, ratePercent: 1.5 },
    { productCategory: 'TOLE_COLOREE', thicknessMin: 0.3, thicknessMax: 0.45, monthlyVolumeMin: 500001, monthlyVolumeMax: 2000000, ratePercent: 2.0 },
    { productCategory: 'TOLE_COLOREE', thicknessMin: 0.5, thicknessMax: 0.7, monthlyVolumeMin: 0, monthlyVolumeMax: 500000, ratePercent: 2.0 },
    { productCategory: 'TOLE_COLOREE', thicknessMin: 0.5, thicknessMax: 0.7, monthlyVolumeMin: 500001, monthlyVolumeMax: 2000000, ratePercent: 2.5 },
    { productCategory: 'TOLE_ALUZINC', thicknessMin: 0.3, thicknessMax: 0.45, monthlyVolumeMin: 0, monthlyVolumeMax: 500000, ratePercent: 1.8 },
    { productCategory: 'TOLE_ALUZINC', thicknessMin: 0.5, thicknessMax: 0.7, monthlyVolumeMin: 0, monthlyVolumeMax: 500000, ratePercent: 2.2 },
  ];

  for (const grid of grids) {
    await prisma.commissionGrid.create({
      data: { ...grid, effectiveFrom: new Date('2024-01-01'), isActive: true },
    });
  }

  console.log(`Seed commission-service terminé: ${grids.length} grilles créées`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

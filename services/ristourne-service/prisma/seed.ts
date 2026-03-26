import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ristourne-service...');

  await prisma.partnerTierConfig.upsert({
    where: { tier: 'BRONZE' },
    update: {},
    create: {
      tier: 'BRONZE',
      volumeThreshold: 1000000,
      discountRate: 2,
      freeDeliveryPriority: false,
      dedicatedSupport: false,
      exclusiveOffersAccess: false,
      effectiveFrom: new Date('2024-01-01'),
    },
  });

  await prisma.partnerTierConfig.upsert({
    where: { tier: 'SILVER' },
    update: {},
    create: {
      tier: 'SILVER',
      volumeThreshold: 3000000,
      discountRate: 4,
      freeDeliveryPriority: true,
      dedicatedSupport: false,
      exclusiveOffersAccess: false,
      effectiveFrom: new Date('2024-01-01'),
    },
  });

  await prisma.partnerTierConfig.upsert({
    where: { tier: 'GOLD' },
    update: {},
    create: {
      tier: 'GOLD',
      volumeThreshold: 7000000,
      discountRate: 7,
      freeDeliveryPriority: true,
      dedicatedSupport: true,
      exclusiveOffersAccess: true,
      effectiveFrom: new Date('2024-01-01'),
    },
  });

  console.log('Seed ristourne-service terminé (BRONZE, SILVER, GOLD)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

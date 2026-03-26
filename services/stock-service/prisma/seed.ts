import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding stock-service...');

  const depot = await prisma.depot.upsert({
    where: { id: '00000000-0000-0000-0000-100000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-100000000001',
      name: 'Dépôt Principal',
      location: 'Conakry - Zone Industrielle',
    },
  });

  // Référence aux variantes créées dans sale-service (IDs partagés via convention)
  const variantIds = [
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0001-000000000003',
  ];

  for (const variantId of variantIds) {
    await prisma.stockItem.upsert({
      where: { productVariantId_depotId: { productVariantId: variantId, depotId: depot.id } },
      update: {},
      create: {
        productVariantId: variantId,
        depotId: depot.id,
        quantityAvailable: 500,
        unit: 'ML',
      },
    });
  }

  console.log('Seed stock-service terminé');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

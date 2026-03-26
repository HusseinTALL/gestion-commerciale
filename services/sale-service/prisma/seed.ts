import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sale-service...');

  const toleColoree = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Tôle Colorée',
      category: 'TOLE_COLOREE',
    },
  });

  const toleAluzinc = await prisma.product.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Tôle Aluzinc',
      category: 'TOLE_ALUZINC',
    },
  });

  await prisma.productVariant.upsert({
    where: { id: '00000000-0000-0000-0001-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000001',
      productId: toleColoree.id,
      thickness: 0.45,
      color: 'Rouge',
      defaultPrice: 4500,
    },
  });

  await prisma.productVariant.upsert({
    where: { id: '00000000-0000-0000-0001-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000002',
      productId: toleColoree.id,
      thickness: 0.55,
      color: 'Vert',
      defaultPrice: 5200,
    },
  });

  await prisma.productVariant.upsert({
    where: { id: '00000000-0000-0000-0001-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000003',
      productId: toleAluzinc.id,
      thickness: 0.45,
      color: 'Naturel',
      defaultPrice: 5800,
    },
  });

  console.log('Seed sale-service terminé');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

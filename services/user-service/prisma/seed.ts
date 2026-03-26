import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding user-service...');

  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gestion.local' },
    update: {},
    create: {
      name: 'Administrateur',
      email: 'admin@gestion.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const directorPassword = await bcrypt.hash('Director@1234', 12);
  const director = await prisma.user.upsert({
    where: { email: 'directeur@gestion.local' },
    update: {},
    create: {
      name: 'Directeur Commercial',
      email: 'directeur@gestion.local',
      passwordHash: directorPassword,
      role: 'DIRECTOR',
    },
  });

  const managerPassword = await bcrypt.hash('Manager@1234', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@gestion.local' },
    update: {},
    create: {
      name: 'Responsable Ventes',
      email: 'manager@gestion.local',
      passwordHash: managerPassword,
      role: 'MANAGER',
    },
  });

  const commercialPassword = await bcrypt.hash('Commercial@1234', 12);
  const commercial = await prisma.user.upsert({
    where: { email: 'commercial@gestion.local' },
    update: {},
    create: {
      name: 'Alpha Diallo',
      email: 'commercial@gestion.local',
      passwordHash: commercialPassword,
      role: 'COMMERCIAL',
    },
  });

  await prisma.commercialProfile.upsert({
    where: { userId: commercial.id },
    update: {},
    create: {
      userId: commercial.id,
      zone: 'Zone Nord',
      monthlyTarget: 5000000,
      phone: '+224600000001',
      hireDate: new Date('2023-01-15'),
    },
  });

  const cashierPassword = await bcrypt.hash('Cashier@1234', 12);
  await prisma.user.upsert({
    where: { email: 'caissier@gestion.local' },
    update: {},
    create: {
      name: 'Fatoumata Bah',
      email: 'caissier@gestion.local',
      passwordHash: cashierPassword,
      role: 'CASHIER',
    },
  });

  console.log('Seed terminé:', { admin: admin.id, director: director.id, manager: manager.id, commercial: commercial.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

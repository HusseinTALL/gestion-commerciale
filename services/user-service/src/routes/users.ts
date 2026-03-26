import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const userRouter = Router();

userRouter.use(requireAuth);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['CASHIER', 'COMMERCIAL', 'MANAGER', 'DIRECTOR', 'ADMIN']),
});

const createProfileSchema = z.object({
  zone: z.string(),
  monthlyTarget: z.number().positive(),
  phone: z.string(),
  hireDate: z.string().datetime(),
});

// GET /api/users
userRouter.get('/', requireRole('MANAGER', 'DIRECTOR', 'ADMIN'), async (_req, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  res.json(users);
});

// GET /api/users/:id
userRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (req.user!.sub !== id && !['MANAGER', 'DIRECTOR', 'ADMIN'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Accès refusé' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
    omit: { passwordHash: true },
  });
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable' });
    return;
  }
  res.json(user);
});

// POST /api/users
userRouter.post('/', requireRole('ADMIN'), async (req, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  res.status(201).json(user);
});

// PUT /api/users/:id/profile
userRouter.put('/:id/profile', requireRole('ADMIN', 'MANAGER'), async (req, res: Response) => {
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.commercialProfile.upsert({
    where: { userId: req.params.id },
    update: parsed.data,
    create: { userId: req.params.id, ...parsed.data },
  });
  res.json(profile);
});

// PATCH /api/users/:id/deactivate
userRouter.patch('/:id/deactivate', requireRole('ADMIN'), async (req, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  });
  res.json(user);
});

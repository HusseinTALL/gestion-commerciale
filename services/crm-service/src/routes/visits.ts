import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const visitsRouter = Router();

visitsRouter.use(requireAuth);

const createVisitSchema = z.object({
  clientId: z.string().uuid(),
  visitDate: z.string().datetime(),
  visitType: z.enum(['GROSSISSEMENT', 'CONQUETE', 'RELANCE', 'FIDELISATION']),
  result: z.enum(['ORDER', 'INTEREST', 'REFUSAL', 'ABSENT']),
  notes: z.string().optional(),
});

// GET /api/visits
visitsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { clientId, commercialId } = req.query as Record<string, string>;
  const visits = await prisma.clientVisit.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(commercialId && { commercialId }),
      ...(req.user!.role === 'COMMERCIAL' && { commercialId: req.user!.sub }),
    },
    include: { client: { select: { id: true, name: true, phone: true } } },
    orderBy: { visitDate: 'desc' },
  });
  res.json(visits);
});

// POST /api/visits
visitsRouter.post('/', requireRole('COMMERCIAL', 'MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = createVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const commercialId = req.user!.role === 'COMMERCIAL' ? req.user!.sub : (req.body.commercialId ?? req.user!.sub);

  const visit = await prisma.clientVisit.create({
    data: { ...parsed.data, commercialId },
  });

  // Mettre à jour la date de dernière visite du client
  await prisma.client.update({
    where: { id: parsed.data.clientId },
    data: { lastVisit: new Date(parsed.data.visitDate) },
  });

  res.status(201).json(visit);
});

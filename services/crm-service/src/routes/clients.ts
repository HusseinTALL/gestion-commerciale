import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

const createClientSchema = z.object({
  name: z.string().min(2),
  phone: z.string(),
  address: z.string().optional(),
  zone: z.string(),
  assignedCommercialId: z.string().uuid().optional(),
  status: z.enum(['NEW', 'ACTIVE', 'INACTIVE', 'PROSPECT']).default('NEW'),
});

// GET /api/clients
clientsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { zone, status, commercialId } = req.query as Record<string, string>;
  const clients = await prisma.client.findMany({
    where: {
      ...(zone && { zone }),
      ...(status && { status: status as 'NEW' | 'ACTIVE' | 'INACTIVE' | 'PROSPECT' }),
      ...(commercialId && { assignedCommercialId: commercialId }),
      // Commerciaux ne voient que leurs clients
      ...(req.user!.role === 'COMMERCIAL' && { assignedCommercialId: req.user!.sub }),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(clients);
});

// GET /api/clients/:id
clientsRouter.get('/:id', async (req, res: Response) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: { visits: { orderBy: { visitDate: 'desc' }, take: 10 } },
  });
  if (!client) {
    res.status(404).json({ error: 'Client introuvable' });
    return;
  }
  res.json(client);
});

// POST /api/clients
clientsRouter.post('/', requireRole('COMMERCIAL', 'MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  if (req.user!.role === 'COMMERCIAL') {
    data.assignedCommercialId = req.user!.sub;
  }
  const client = await prisma.client.create({ data });
  res.status(201).json(client);
});

// PATCH /api/clients/:id
clientsRouter.patch('/:id', requireRole('COMMERCIAL', 'MANAGER', 'ADMIN'), async (req, res: Response) => {
  const { status, partnerTier, assignedCommercialId } = req.body;
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(partnerTier && { partnerTier }),
      ...(assignedCommercialId && { assignedCommercialId }),
    },
  });
  res.json(client);
});

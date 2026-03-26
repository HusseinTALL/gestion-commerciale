import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

export const depotsRouter = Router();

depotsRouter.use(requireAuth);

const createDepotSchema = z.object({
  name: z.string().min(2),
  location: z.string(),
});

// GET /api/depots
depotsRouter.get('/', async (_req, res: Response) => {
  const depots = await prisma.depot.findMany({ where: { isActive: true } });
  res.json(depots);
});

// POST /api/depots
depotsRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res: Response) => {
  const parsed = createDepotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const depot = await prisma.depot.create({ data: parsed.data });
  res.status(201).json(depot);
});

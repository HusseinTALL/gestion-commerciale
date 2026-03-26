import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

export const stockRouter = Router();

stockRouter.use(requireAuth);

const movementSchema = z.object({
  stockItemId: z.string().uuid(),
  movementType: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().positive(),
  saleId: z.string().uuid().optional(),
  reason: z.string().optional(),
});

// GET /api/stock
stockRouter.get('/', async (req, res: Response) => {
  const { depotId, productVariantId } = req.query as Record<string, string>;
  const items = await prisma.stockItem.findMany({
    where: {
      ...(depotId && { depotId }),
      ...(productVariantId && { productVariantId }),
    },
    include: { depot: true },
    orderBy: { lastUpdated: 'desc' },
  });
  res.json(items);
});

// POST /api/stock/movement
stockRouter.post('/movement', requireRole('CASHIER', 'MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = movementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { stockItemId, movementType, quantity, saleId, reason } = parsed.data;

  const movement = await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) throw new Error('Stock item introuvable');

    const delta = movementType === 'IN' ? quantity : movementType === 'OUT' ? -quantity : quantity;
    await tx.stockItem.update({
      where: { id: stockItemId },
      data: { quantityAvailable: { increment: delta }, lastUpdated: new Date() },
    });

    return tx.stockMovement.create({
      data: {
        stockItemId,
        movementType,
        quantity,
        saleId,
        reason,
        createdBy: req.user!.sub,
      },
    });
  });

  res.status(201).json(movement);
});

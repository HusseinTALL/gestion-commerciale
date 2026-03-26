import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

export const productsRouter = Router();

productsRouter.use(requireAuth);

const createProductSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['TOLE_COLOREE', 'TOLE_ALUZINC', 'TOLE_PRELAQUE', 'CROCHET', 'TUBE_RECT']),
});

const createVariantSchema = z.object({
  thickness: z.number().positive(),
  color: z.string(),
  defaultPrice: z.number().positive(),
});

// GET /api/products
productsRouter.get('/', async (_req, res: Response) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { variants: { where: { isActive: true } } },
  });
  res.json(products);
});

// GET /api/products/:id
productsRouter.get('/:id', async (req, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: true },
  });
  if (!product) {
    res.status(404).json({ error: 'Produit introuvable' });
    return;
  }
  res.json(product);
});

// POST /api/products
productsRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const product = await prisma.product.create({ data: parsed.data });
  res.status(201).json(product);
});

// POST /api/products/:id/variants
productsRouter.post('/:id/variants', requireRole('ADMIN', 'MANAGER'), async (req, res: Response) => {
  const parsed = createVariantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const variant = await prisma.productVariant.create({
    data: { ...parsed.data, productId: req.params.id },
  });
  res.status(201).json(variant);
});

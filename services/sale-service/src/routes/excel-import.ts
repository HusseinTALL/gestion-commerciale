import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { publishSaleCreated } from '../events/producer';

export const excelImportRouter = Router();

excelImportRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Mapping des noms de vendeurs (normalisation)
const VENDOR_ALIASES: Record<string, string> = {
  'lankouande': 'LANKOUANDE',
  'lankaounde': 'LANKOUANDE',
  'kere': 'KERE',
  'diallo': 'DIALLO',
};

function normalizeVendorName(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
  return VENDOR_ALIASES[key] ?? raw.trim().toUpperCase();
}

function generateSaleCode(date: Date): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VTE-${datePart}-${rand}`;
}

interface ExcelRow {
  date?: string | number;
  product?: string;
  thickness?: string | number;
  color?: string;
  unitLength?: number;
  quantity?: number;
  totalMetrage?: number;
  actualOutput?: number;
  unitPrice?: number;
  grossAmount?: number;
  amountCollected?: number;
  discount?: number;
  notes?: string;
  saleCode?: string;
  vendorName?: string;
  buyerPhone?: string;
}

// POST /api/sales/import-excel
// Multipart: file (xlsx), salespersonMapping (JSON string: { "DIALLO": "uuid", ... })
excelImportRouter.post('/', requireRole('ADMIN', 'MANAGER'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Fichier Excel requis' });
    return;
  }

  let salespersonMapping: Record<string, string> = {};
  try {
    salespersonMapping = JSON.parse(req.body.salespersonMapping ?? '{}');
  } catch {
    res.status(400).json({ error: 'salespersonMapping doit être un JSON valide' });
    return;
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  // Colonnes attendues (supporte les noms chinois/français)
  const COLUMN_MAP: Record<string, keyof ExcelRow> = {
    '日期': 'date', 'Date': 'date',
    '品名': 'product', 'Produit': 'product',
    '规格': 'thickness', 'Spéc.': 'thickness',
    '颜色': 'color', 'Couleur': 'color',
    '米数': 'unitLength', 'Métrage': 'unitLength',
    'QT': 'quantity', 'Quantité': 'quantity',
    '总米数': 'totalMetrage', 'Métrage tot.': 'totalMetrage',
    '实际出库': 'actualOutput', 'Sortie réelle': 'actualOutput',
    '单价': 'unitPrice', 'Prix unit.': 'unitPrice',
    '销售总额': 'grossAmount', 'Total ventes': 'grossAmount',
    '实收金额': 'amountCollected', 'Encaissé': 'amountCollected',
    '优惠': 'discount', 'Remise': 'discount',
    '备注': 'notes', 'Remarques': 'notes',
    '销售编码': 'saleCode', 'Code': 'saleCode',
    '销售人员': 'vendorName', 'Vendeur': 'vendorName',
    '购买方电话': 'buyerPhone', 'Tél. acheteur': 'buyerPhone',
  };

  const imported: string[] = [];
  const errors: Array<{ row: number; error: string }> = [];
  const skipped: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const row: ExcelRow = {};
    for (const [col, value] of Object.entries(rawRow)) {
      const mapped = COLUMN_MAP[col];
      if (mapped) (row as Record<string, unknown>)[mapped] = value;
    }

    if (!row.vendorName || !row.buyerPhone || !row.product) {
      skipped.push({ row: i + 2, reason: 'Ligne incomplète (vendeur, téléphone ou produit manquant)' });
      continue;
    }

    const normalizedVendor = normalizeVendorName(String(row.vendorName));
    const salespersonId = salespersonMapping[normalizedVendor];

    if (!salespersonId) {
      errors.push({ row: i + 2, error: `Vendeur "${normalizedVendor}" non mappé — ajoutez-le à salespersonMapping` });
      continue;
    }

    // Chercher la variante produit correspondante
    const variant = await prisma.productVariant.findFirst({
      where: {
        product: { name: { contains: String(row.product), mode: 'insensitive' } },
        ...(row.thickness && { thickness: Number(row.thickness) }),
        ...(row.color && { color: { equals: String(row.color), mode: 'insensitive' } }),
      },
      include: { product: true },
    });

    if (!variant) {
      errors.push({ row: i + 2, error: `Produit "${row.product}" (${row.thickness}, ${row.color}) introuvable dans le catalogue` });
      continue;
    }

    try {
      const saleDate = row.date
        ? (typeof row.date === 'number' ? new Date((row.date - 25569) * 86400 * 1000) : new Date(String(row.date)))
        : new Date();

      const unitLength = Number(row.unitLength ?? 0);
      const quantity = Number(row.quantity ?? 1);
      const totalMetrage = Number(row.totalMetrage ?? unitLength * quantity);
      const actualOutput = Number(row.actualOutput ?? totalMetrage);
      const unitPrice = Number(row.unitPrice ?? variant.defaultPrice);
      const grossAmount = Number(row.grossAmount ?? unitPrice * totalMetrage);
      const discount = Number(row.discount ?? 0);
      const netAmount = grossAmount - discount;
      const totalCollected = Number(row.amountCollected ?? netAmount);

      const sale = await prisma.sale.create({
        data: {
          saleCode: row.saleCode ? String(row.saleCode) : generateSaleCode(saleDate),
          saleDate,
          salespersonId,
          buyerPhone: String(row.buyerPhone),
          buyerName: String(row.buyerPhone),
          totalGross: grossAmount,
          totalDiscount: discount,
          totalCollected,
          notes: row.notes ? String(row.notes) : null,
          status: 'VALIDATED',
          createdBy: req.user!.sub,
          lines: {
            create: [{
              productVariantId: variant.id,
              unitLength,
              quantity,
              totalMetrage,
              actualOutput,
              unitPrice,
              grossAmount,
              discount,
              netAmount,
            }],
          },
        },
        include: { lines: true },
      });

      // Publier l'événement pour le calcul des commissions
      publishSaleCreated({
        saleId: sale.id,
        saleCode: sale.saleCode,
        saleDate: sale.saleDate.toISOString(),
        salespersonId,
        buyerPhone: sale.buyerPhone,
        totalGross: grossAmount,
        totalCollected,
        totalDiscount: discount,
        status: 'VALIDATED',
        lines: [{
          id: sale.lines[0].id,
          productVariantId: variant.id,
          productCategory: variant.product.category,
          thickness: Number(variant.thickness),
          unitLength,
          quantity,
          totalMetrage,
          actualOutput,
          unitPrice,
          grossAmount,
          discount,
          netAmount,
        }],
      }).catch(console.error);

      imported.push(sale.saleCode);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ row: i + 2, error: message });
    }
  }

  res.json({
    summary: {
      total: rows.length,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
    },
    imported,
    skipped,
    errors,
  });
});

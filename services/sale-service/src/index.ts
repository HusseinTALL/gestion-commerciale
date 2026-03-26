import express from 'express';
import { productsRouter } from './routes/products';
import { salesRouter } from './routes/sales';
import { excelImportRouter } from './routes/excel-import';
import { getProducer } from './events/producer';

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sale-service' });
});

app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/sales/import-excel', excelImportRouter);

app.listen(PORT, async () => {
  console.log(`[sale-service] Running on port ${PORT}`);
  // Initialiser le producteur Kafka au démarrage
  try {
    await getProducer();
  } catch (err) {
    console.warn('[sale-service] Kafka non disponible au démarrage — les events seront réessayés', err);
  }
});

export default app;

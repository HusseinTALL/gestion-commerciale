import express from 'express';
import { productsRouter } from './routes/products';
import { salesRouter } from './routes/sales';

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sale-service' });
});

app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);

app.listen(PORT, () => {
  console.log(`[sale-service] Running on port ${PORT}`);
});

export default app;

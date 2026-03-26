import express from 'express';
import { depotsRouter } from './routes/depots';
import { stockRouter } from './routes/stock';

const app = express();
const PORT = process.env.PORT ?? 3007;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'stock-service' });
});

app.use('/api/depots', depotsRouter);
app.use('/api/stock', stockRouter);

app.listen(PORT, () => {
  console.log(`[stock-service] Running on port ${PORT}`);
});

export default app;

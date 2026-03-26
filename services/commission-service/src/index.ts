import express from 'express';
import { commissionsRouter } from './routes/commissions';
import { startConsumer } from './events/consumer';

const app = express();
const PORT = process.env.PORT ?? 3004;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'commission-service' });
});

app.use('/api/commissions', commissionsRouter);

app.listen(PORT, async () => {
  console.log(`[commission-service] Running on port ${PORT}`);
  // Démarrer le consommateur Kafka
  try {
    await startConsumer();
  } catch (err) {
    console.error('[commission-service] Kafka consumer failed to start:', err);
  }
});

export default app;

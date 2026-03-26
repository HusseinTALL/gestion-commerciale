import express from 'express';
import { clientsRouter } from './routes/clients';
import { visitsRouter } from './routes/visits';

const app = express();
const PORT = process.env.PORT ?? 3003;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crm-service' });
});

app.use('/api/clients', clientsRouter);
app.use('/api/visits', visitsRouter);

app.listen(PORT, () => {
  console.log(`[crm-service] Running on port ${PORT}`);
});

export default app;

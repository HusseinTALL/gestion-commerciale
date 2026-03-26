import express from 'express';

const app = express();
const PORT = process.env.PORT ?? 3009;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// TODO: importer et monter les routes ici
// import { router } from './routes';
// app.use('/api', router);

app.listen(PORT, () => {
  console.log(`[notification-service] Running on port ${PORT}`);
});

export default app;

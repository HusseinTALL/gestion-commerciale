import express from 'express';
import { userRouter } from './routes/users';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

app.listen(PORT, () => {
  console.log(`[user-service] Running on port ${PORT}`);
});

export default app;

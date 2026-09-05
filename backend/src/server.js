import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspace.js';

const app = express();
const port = process.env.PORT || 4000;
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', async (_req, res) => { try { await query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); } catch { res.status(503).json({ status: 'degraded', database: 'unavailable' }); } });
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Unexpected server error.' }); });
app.listen(port, () => console.log(`DealFlow360 API listening on http://localhost:${port}`));
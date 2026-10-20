import dotenv from 'dotenv';
dotenv.config();

// Ensure minimum 32 character JWT_SECRET for secure tokens
process.env.JWT_SECRET = process.env.JWT_SECRET || 'matara-university-erp-production-hardening-secret-key-2026-v426';
process.env.PORT = process.env.PORT || '3000';

import express from 'express';
import path from 'path';
import fs from 'fs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { app } = require('./backend/server.js');

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: express.Request, res: express.Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  🎓  Matara University ERP v4.2.6 Premium Hardening');
    console.log(`  ➜  Running at http://localhost:${PORT}`);
    console.log('  ➜  Health check: /api/health');
    console.log('');
  });
}

startServer().catch((err) => {
  console.error('Failed to start Matara University ERP server:', err);
  process.exit(1);
});

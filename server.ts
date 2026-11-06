import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // AI Studio requires dev server to run on port 3000
  const PORT = 3000;

  // CORS Middleware for iframe proxy and browser requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // 1. Backend API Routes
  // GET /api/values -> All items
  app.get('/api/values', (_req: Request, res: Response) => {
    try {
      const items = db.getItems();
      const status = db.getStatus();
      res.json({
        success: true,
        count: items.length,
        status,
        items,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/values/fruits -> Fruits only
  app.get('/api/values/fruits', (_req: Request, res: Response) => {
    try {
      const items = db.getItems('Fruits');
      res.json({
        success: true,
        count: items.length,
        category: 'Fruits',
        items,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/values/gamepasses -> Gamepasses only
  app.get('/api/values/gamepasses', (_req: Request, res: Response) => {
    try {
      const items = db.getItems('Gamepasses');
      res.json({
        success: true,
        count: items.length,
        category: 'Gamepasses',
        items,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/values/limiteds -> Limiteds and skins
  app.get('/api/values/limiteds', (_req: Request, res: Response) => {
    try {
      const items = db.getItems('Limiteds');
      res.json({
        success: true,
        count: items.length,
        category: 'Limiteds',
        items,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/status -> Synchronization status & item counts
  app.get('/api/status', (_req: Request, res: Response) => {
    try {
      const status = db.getStatus();
      res.json({
        success: true,
        ...status,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/refresh -> Triggers fresh synchronization
  app.post('/api/refresh', async (_req: Request, res: Response) => {
    try {
      const result = await db.syncNow();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /api/changes -> Recently changed values
  app.get('/api/changes', (_req: Request, res: Response) => {
    try {
      const changes = db.getChanges();
      res.json({
        success: true,
        count: changes.length,
        changes,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start background periodic scraping (every 5 minutes)
  db.startAutoSync();

  // 2. Vite / Static Frontend Integration
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Blox Fruits Values Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

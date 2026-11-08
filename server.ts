import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { db, IMAGES_DIR } from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  // AI Studio development requires port 3000 for preview.
  // In production (Render.com), use the dynamically allocated process.env.PORT.
  const PORT = isProduction ? (Number(process.env.PORT) || 3000) : 3000;

  // CORS Middleware for iframe proxy and external client requests
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

  // GET /api/bloxfruits/item-image/:id -> Serves synced real fruit/item image
  app.get('/api/bloxfruits/item-image/:id', async (req: Request, res: Response) => {
    try {
      const itemId = req.params.id;
      const localFile = path.join(IMAGES_DIR, `${itemId}.webp`);

      // 1. Serve immediately from local cache if already synced
      if (fs.existsSync(localFile)) {
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        return res.sendFile(localFile);
      }

      // 2. Fetch on the fly from official source and cache to local disk
      const remoteUrl = `https://bloxfruitsvalues.com/api/bloxfruits/item-image/${itemId}`;
      const response = await axios.get(remoteUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });

      try {
        fs.writeFileSync(localFile, response.data);
      } catch {}

      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.send(response.data);
    } catch {
      res.status(404).send('Image not available');
    }
  });

  // GET /api/image-proxy -> Proxies external fruit/item images so they reliably load anywhere
  app.get('/api/image-proxy', async (req: Request, res: Response) => {
    try {
      const rawUrl = req.query.url as string;
      if (!rawUrl || !rawUrl.startsWith('http')) {
        return res.status(400).send('Invalid image URL');
      }

      const response = await axios.get(rawUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      const contentType = String(response.headers['content-type'] || 'image/png');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.send(response.data);
    } catch (err: any) {
      res.status(404).send('Failed to proxy image');
    }
  });

  // Health check endpoints for Render zero-downtime health probes
  app.get(['/healthz', '/api/health'], (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Explicit 404 handler for unmatched API routes to prevent fallback to SPA index.html in both dev and prod
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

  // Start background periodic scraping (every 5 minutes)
  db.startAutoSync();

  // Static image route (dynamically resolves across dev and production locations)
  const candidateImageDirs = [
    path.resolve(process.cwd(), 'dist', 'images'),
    path.resolve(__dirname, 'dist', 'images'),
    path.resolve(process.cwd(), 'public', 'images'),
    path.resolve(__dirname, 'public', 'images'),
    path.resolve(process.cwd(), 'data', 'images'),
    path.resolve(__dirname, 'data', 'images'),
    path.resolve(__dirname, 'images'),
  ];

  for (const dir of candidateImageDirs) {
    if (fs.existsSync(dir)) {
      app.use('/images', express.static(dir, {
        maxAge: '30d',
        immutable: true,
      }));
    }
  }

  const publicPath = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // 2. Vite / Static Frontend Integration
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Dynamically resolve production distribution directory
    const possibleDistPaths = [
      path.resolve(process.cwd(), 'dist'),
      path.resolve(__dirname, 'dist'),
      __dirname,
      path.resolve(__dirname, '..', 'dist'),
    ];
    let distPath = path.resolve(process.cwd(), 'dist');
    for (const p of possibleDistPaths) {
      if (fs.existsSync(path.join(p, 'index.html'))) {
        distPath = p;
        break;
      }
    }
    console.log(`[Server] Serving production static assets from: ${distPath}`);

    // Immutable long-term caching for hashed client assets (JS/CSS)
    const assetsDir = path.join(distPath, 'assets');
    if (fs.existsSync(assetsDir)) {
      app.use(
        '/assets',
        express.static(assetsDir, {
          maxAge: '1y',
          immutable: true,
        })
      );
    }

    // General static files with 1h cache and conditional ETag
    app.use(
      express.static(distPath, {
        maxAge: '1h',
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );

    // SPA fallback: Serve index.html without caching so users immediately see updates
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
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

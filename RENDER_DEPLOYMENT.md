# How to Deploy to Render.com (Step-by-Step)

This application is 100% pre-configured and production-ready for **Render.com Web Services**.

---

## Option 1: Automatic Blueprint Deployment (Recommended)
1. Push your repository to **GitHub**.
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically read `render.yaml` and configure everything.
6. Click **Apply**! Your app will build and go live in ~1-2 minutes.

---

## Option 2: Manual Web Service Deployment
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Fill in the following settings:
   - **Name**: `blox-fruits-values` (or any name you prefer)
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`
5. Under **Advanced**:
   - **Health Check Path**: `/healthz`
   - **Environment Variables**:
     - `NODE_ENV`: `production`
6. Click **Deploy Web Service**!

---

## Why It Runs Perfectly on Render
- **Dynamic Port**: Binds automatically to `process.env.PORT` assigned by Render.
- **Fast Build**: Vite compiles client bundle into `dist/` in under 1 second.
- **Embedded Real Images**: All 93 Blox Fruits `.webp` images are bundled in `public/images/` and copied to `dist/images/`, serving instantly with 30-day immutable cache headers.
- **Self-Contained Data & Auto-Sync**: Initial verified data is pre-seeded in `src/data/initial_values.json`, while background synchronization checks `bloxfruitsvalues.com` every 5 minutes and saves to `./data/bloxfruits_store.json`.
- **Zero-Downtime Health Checks**: Built-in `/healthz` probe returns HTTP 200 OK immediately for Render health monitoring.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const distDataDir = path.resolve(distDir, 'data');
const srcSeedPath = path.resolve(rootDir, 'src', 'data', 'initial_values.json');

console.log('[Build] Starting unified client & server production build...');

// 1. Build Vite frontend
console.log('[Build] Compiling React client with Vite...');
execSync('npx vite build', { stdio: 'inherit', cwd: rootDir });

// 2. Build Server with esbuild
console.log('[Build] Bundling Node.js server with esbuild...');
execSync(
  'npx esbuild server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server.js',
  { stdio: 'inherit', cwd: rootDir }
);

// 3. Ensure initial seed data is copied to dist for standalone runtime hydration
if (!fs.existsSync(distDataDir)) {
  fs.mkdirSync(distDataDir, { recursive: true });
}

if (fs.existsSync(srcSeedPath)) {
  fs.copyFileSync(srcSeedPath, path.join(distDir, 'initial_values.json'));
  fs.copyFileSync(srcSeedPath, path.join(distDataDir, 'initial_values.json'));
  console.log('[Build] Copied seed initial_values.json to dist/ and dist/data/');
}

// 4. Verify images directory in dist/images
const distImagesDir = path.join(distDir, 'images');
const publicImagesDir = path.join(rootDir, 'public', 'images');
if (!fs.existsSync(distImagesDir) && fs.existsSync(publicImagesDir)) {
  fs.cpSync(publicImagesDir, distImagesDir, { recursive: true });
  console.log('[Build] Mirrored public images into dist/images/');
}

console.log('[Build] Production build completed successfully and verified!');

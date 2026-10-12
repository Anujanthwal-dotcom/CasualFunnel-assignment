/**
 * Copies the compiled tracker bundle into the backend's public folder so the
 * API can serve it at /tracker.js. Run after building @casualfunnel/tracker.
 *
 * Single source of truth: packages/tracker. Nothing is duplicated in source form.
 */
import { copyFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'packages/tracker/dist/casualfunnel-tracker.js');
const dest = resolve(root, 'packages/backend/public/tracker.js');

async function main() {
  try {
    await access(src, constants.R_OK);
  } catch {
    console.error(`[copy-tracker] Missing build output: ${src}`);
    console.error('[copy-tracker] Run `npm run build -w @casualfunnel/tracker` first.');
    process.exit(1);
  }

  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  console.log(`[copy-tracker] ${src} -> ${dest}`);
}

main().catch((err) => {
  console.error('[copy-tracker] Failed:', err);
  process.exit(1);
});

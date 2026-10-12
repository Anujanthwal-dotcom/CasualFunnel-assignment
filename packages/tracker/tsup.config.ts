import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { 'casualfunnel-tracker': 'src/index.ts' },
  format: ['iife'],
  globalName: 'CausalFunnelBundle',
  outDir: 'dist',
  target: 'es2019',
  platform: 'browser',
  minify: true,
  sourcemap: true,
  clean: true,
  // Force a stable filename (`casualfunnel-tracker.js`) instead of tsup's
  // default `.global.js` suffix for IIFE builds.
  outExtension: () => ({ js: '.js' }),
  footer: {
    js: '/* CausalFunnel analytics tracker (IIFE build) */',
  },
});

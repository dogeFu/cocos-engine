#!/usr/bin/env node
/**
 * Captures the complete key set from a built engine file and compares
 * against a baseline (or another build).
 *
 * Usage:
 *   node capture-keys.mjs --capture <vite|iife>
 *   node capture-keys.mjs --compare <vite|iife>
 *   node capture-keys.mjs --diff <vite> <iife>
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(__dirname, '../../..');
const BASELINE_FILE = resolve(__dirname, 'baseline-keys.json');

const HEADED = process.argv.includes('--headed');
const isCapture = process.argv.includes('--capture');
const isCompare = process.argv.includes('--compare');
const isDiff = process.argv.includes('--diff');
const MODE = isCapture ? 'capture' : isCompare ? 'compare' : isDiff ? 'diff' : 'help';
const BUILD_A = isCapture ? process.argv[process.argv.indexOf('--capture') + 1] : isCompare ? process.argv[process.argv.indexOf('--compare') + 1] : isDiff ? process.argv[process.argv.indexOf('--diff') + 1] : 'vite';
const BUILD_B = isDiff ? process.argv[process.argv.indexOf('--diff') + 2] || 'iife' : null;

const ENGINE_URLS = {
    vite: "/bin/vite/web/dev/cc.js",
    "vite-full": "/bin/vite/web/dev/full/cc.js",
    aligned: "/bin/vite/web/dev/aligned/cc.js",
    iife: "/bin/test-iife/cc.js",
};

// Serve HTML with embedded script
function startServer(root) {
  return new Promise((resolve_) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const params = new URL(req.url, 'http://localhost').searchParams;
      const engineUrl = params.get('engine');

      if (urlPath === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<div id="GameDiv"><canvas id="GameCanvas" width="960" height="640"></canvas></div>
<script src="${engineUrl}"></script>
<script>
setTimeout(function wait() {
  if (window.cc && window.cc.Vec3) {
    window.__KEYS__ = Object.keys(window.cc).sort();
    window.__DONE__ = true;
  } else setTimeout(wait, 200);
}, 1000);
</script></body></html>`);
        return;
      }
      // Serve static files
      const filePath = resolve(root, urlPath.slice(1));
      try {
        const content = readFileSync(filePath);
        const ext = filePath.split('.').pop();
        const mime = { js: 'application/javascript', json: 'application/json', wasm: 'application/wasm', html: 'text/html', png: 'image/png', mem: 'application/octet-stream' }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
        res.end(content);
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    server.listen(0, '127.0.0.1', () => resolve_({ server, port: server.address().port }));
  });
}

async function captureKeys(buildType) {
  const { server, port } = await startServer(ENGINE_ROOT);
  const engineUrl = ENGINE_URLS[buildType];
  const url = new URL(`http://127.0.0.1:${port}/`);
  url.searchParams.set('engine', engineUrl);

  const browser = await chromium.launch({ headless: !HEADED, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.error('  [browser]', msg.text()); });
  page.on('pageerror', err => console.error('  [page error]', err.message));

  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.__DONE__ === true, { timeout: 30000 });
  const keys = await page.evaluate(() => window.__KEYS__);
  // Also capture type info
  const typeInfo = await page.evaluate(() => {
    const info = {};
    Object.keys(window.cc).forEach(k => { try { info[k] = typeof window.cc[k]; } catch(e) {} });
    return info;
  });

  await browser.close();
  server.close();
  return { keys, typeInfo };
}

async function main() {
  if (MODE === 'capture') {
    console.log(`[capture] Capturing keys from ${BUILD_A}...`);
    const { keys, typeInfo } = await captureKeys(BUILD_A);
    writeFileSync(BASELINE_FILE, JSON.stringify({ keys, types: typeInfo }, null, 2));
    console.log(`[capture] Saved ${keys.length} keys to ${BASELINE_FILE}`);
  } else if (MODE === 'compare') {
    if (!existsSync(BASELINE_FILE)) { console.error(`No baseline at ${BASELINE_FILE}`); process.exit(1); }
    const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
    console.log(`[compare] Capturing keys from ${BUILD_A}...`);
    const { keys: actual, typeInfo: actualTypes } = await captureKeys(BUILD_A);
    const baselineKeys = baseline.keys;
    const baselineTypes = baseline.types || {};
    const baselineSet = new Set(baselineKeys);
    const actualSet = new Set(actual);

    const missing = baselineKeys.filter(k => !actualSet.has(k));
    const extra = actual.filter(k => !baselineSet.has(k));
    const total = actual.length;

    console.log(`\n=== Key Comparison: ${BUILD_A} vs baseline (${baselineKeys.length} keys) ===`);
    console.log(`Total: ${total} | Matching: ${total - missing.length - extra.length}`);
    console.log(`Missing: ${missing.length} | Extra: ${extra.length}`);

    if (missing.length > 0) {
      console.log('\n--- MISSING (baseline key not in build) ---');
      missing.forEach(k => {
        const bt = baselineTypes[k] || '?';
        console.log(`  - ${k} (baseline type: ${bt})`);
      });
    }
    if (extra.length > 0) {
      console.log('\n--- EXTRA (build key not in baseline) ---');
      extra.forEach(k => {
        const at = actualTypes[k] || '?';
        console.log(`  + ${k} (type: ${at})`);
      });
    }
  } else if (MODE === 'diff') {
    if (!BUILD_B) { console.error('Need two builds'); process.exit(1); }
    console.log(`[diff] ${BUILD_A}...`);
    const { keys: keysA, typeInfo: typesA } = await captureKeys(BUILD_A);
    console.log(`[diff] ${BUILD_B}...`);
    const { keys: keysB, typeInfo: typesB } = await captureKeys(BUILD_B);
    const setA = new Set(keysA);
    const setB = new Set(keysB);
    const aOnly = keysA.filter(k => !setB.has(k));
    const bOnly = keysB.filter(k => !setA.has(k));

    console.log(`\n=== Diff: ${BUILD_A} (${keysA.length}) vs ${BUILD_B} (${keysB.length}) ===`);
    console.log(`Only in ${BUILD_A}: ${aOnly.length}  |  Only in ${BUILD_B}: ${bOnly.length}`);

    if (aOnly.length > 0) {
      console.log(`\n--- ONLY IN ${BUILD_A.toUpperCase()} ---`);
      aOnly.forEach(k => console.log(`  + ${k} (${typesA[k] || '?'})`));
    }
    if (bOnly.length > 0) {
      console.log(`\n--- ONLY IN ${BUILD_B.toUpperCase()} ---`);
      bOnly.forEach(k => console.log(`  + ${k} (${typesB[k] || '?'})`));
    }
    if (aOnly.length === 0 && bOnly.length === 0) {
      console.log('\n✅ No differences found — builds expose identical API surface!');
    }
  } else {
    console.log('Usage: node capture-keys.mjs');
    console.log('  --capture <vite|iife>   Save key set as baseline');
    console.log('  --compare <vite|iife>   Compare against baseline');
    console.log('  --diff <vite> <iife>    Diff two builds');
    console.log('  --headed                Visible browser');
  }
}

main().catch(err => { console.error(err); process.exit(1); });

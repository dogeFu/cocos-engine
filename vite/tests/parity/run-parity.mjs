/**
 * Playwright runner for Cocos Engine Build Parity Tests.
 *
 * Usage:
 *   node vite/tests/parity/run-parity.mjs [--headed]
 *
 * Steps:
 *   1. Build the test bundle (TS → JS)
 *   2. Start a local file server for the test HTML
 *   3. Launch Playwright Chromium, load runner.html
 *   4. Wait for tests to complete, extract report
 *   5. Print results and exit with appropriate code
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, statSync, createReadStream } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { buildTests } from './build-tests.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(__dirname, '../../..');
const HEADED = process.argv.includes('--headed');
const TIMEOUT = 30_000;

// ===== Minimal static file server =====
const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
};

function startFileServer(root) {
    return new Promise((resolve_) => {
        const server = createServer((req, res) => {
            let urlPath = decodeURIComponent(req.url.split('?')[0]);
            if (urlPath === '/') urlPath = '/index.html';

            const filePath = resolve(root, urlPath.slice(1));
            try {
                const stat = statSync(filePath);
                if (stat.isFile()) {
                    const ext = extname(filePath);
                    res.writeHead(200, {
                        'Content-Type': MIME[ext] || 'application/octet-stream',
                        'Content-Length': stat.size,
                        'Access-Control-Allow-Origin': '*',
                    });
                    createReadStream(filePath).pipe(res);
                    return;
                }
            } catch {}
            res.writeHead(404);
            res.end('Not found');
        });
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve_({ server, port });
        });
    });
}

// ===== Main =====
async function main() {
    console.log('[parity] Building test bundle...');
    await buildTests();

    console.log('[parity] Starting file server...');
    const { server, port } = await startFileServer(ENGINE_ROOT);
    const url = `http://127.0.0.1:${port}/vite/tests/parity/runner.html`;
    console.log(`[parity] URL: ${url}`);

    const browser = await chromium.launch({
        headless: !HEADED,
        args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages for debugging
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') console.error(`  [browser] ${text}`);
    });

    page.on('pageerror', err => {
        console.error(`  [page error] ${err.message}`);
    });

    console.log('[parity] Loading test page...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for tests to complete
    console.log('[parity] Waiting for tests...');
    try {
        await page.waitForFunction(() => window.__PARITY_DONE__ === true, { timeout: TIMEOUT });
    } catch {
        console.error('[parity] Timeout waiting for tests to complete');
        const status = await page.$eval('#status', el => el.textContent).catch(() => 'unknown');
        console.error(`[parity] Page status: ${status}`);
        await browser.close();
        server.close();
        process.exit(1);
    }

    // Extract report
    const report = await page.evaluate(() => window.__PARITY_REPORT__);
    if (!report) {
        console.error('[parity] No report returned from page');
        await browser.close();
        server.close();
        process.exit(1);
    }

    // Print results
    const s = report.summary;
    console.log('\n=== Build Parity Test Report ===');
    console.log(`Time: ${report.timestamp}`);
    console.log(`Total: ${s.total} | Passed: ${s.passed} | Failed: ${s.failed}`);

    for (const mod of report.modules) {
        const icon = mod.failed > 0 ? 'FAIL' : mod.tests.length === 0 ? 'WARN' : 'OK';
        console.log(`\n[${icon}] ${mod.name} (${mod.passed}/${mod.tests.length})`);
        for (const t of mod.tests) {
            const prefix = t.status === 'pass' ? '  + ' : '  X ';
            let line = `${prefix}${t.name}`;
            if (t.detail) line += ` — ${t.detail}`;
            console.log(line);
        }
    }

    // Cleanup
    await browser.close();
    server.close();

    // Exit code: 1 if any failures
    if (s.failed > 0) {
        console.log(`\n[parity] FAILED — ${s.failed} test(s) failed`);
        process.exit(1);
    } else {
        console.log(`\n[parity] PASSED — ${s.passed} passed`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('[parity] Fatal error:', err);
    process.exit(1);
});

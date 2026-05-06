#!/usr/bin/env node
/**
 * Multi-Configuration Parity Test Matrix Runner
 *
 * Builds the Cocos Engine with multiple feature culling configurations,
 * runs the full parity test suite against each, and cross-compares results.
 *
 * Usage:
 *   node vite/tests/parity/run-parity-matrix.mjs [--headed]
 *
 * Configurations tested:
 *   minimal   — core + 2d + 3d + animation + tween + audio (no optional modules)
 *   default   — the vite/user.config.ts defaults
 *   full      — all features enabled
 *
 * Exit code: 0 if all configs pass, 1 if any config has failures.
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, statSync, createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { buildTests } from './build-tests.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(__dirname, '../../..');
const HEADED = process.argv.includes('--headed');
const TIMEOUT = 60_000;

// ===== Configuration Matrix =====
const CONFIGS = {
    minimal: {
        description: 'Minimal build: core + 2d + 3d + animation + tween + audio',
        env: {
            VITE_ENGINE_FEATURES: JSON.stringify({
                spine: false,
                dragonBones: false,
                marionette: false,
                proceduralAnimation: false,
                vendorGoogle: false,
                physics: false,
                physics2D: false,
                particle: false,
                particle2D: false,
                skeletalAnimation: false,
            }),
        },
        expectedFeatures: {
            spine: false,
            dragonBones: false,
            marionette: false,
            proceduralAnimation: false,
            vendorGoogle: false,
            physics: false,
            physics2D: false,
            particle: false,
            particle2D: false,
            skeletalAnimation: false,
        },
    },
    default: {
        description: 'Default build: vite/user.config.ts settings',
        env: {},
        expectedFeatures: undefined, // use the actual user.config.ts
    },
    'full': {
        description: 'Full build: all features enabled',
        env: {
            VITE_ENGINE_FEATURES: JSON.stringify({
                spine: true,
                spineVersion: '4.2',
                dragonBones: true,
                marionette: true,
                proceduralAnimation: true,
                vendorGoogle: false,
                physics: true,
                physics2D: true,
                particle: true,
                particle2D: true,
                skeletalAnimation: true,
            }),
        },
        expectedFeatures: {
            spine: true,
            spineVersion: '4.2',
            dragonBones: true,
            marionette: true,
            proceduralAnimation: true,
            vendorGoogle: false,
            physics: true,
            physics2D: true,
            particle: true,
            particle2D: true,
            skeletalAnimation: true,
        },
    },
};

// ===== Minimal static file server (shared) =====
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

// ===== Build engine with specific config =====
function buildEngine(configName, config) {
    const outputDir = resolve(ENGINE_ROOT, `bin/vite/web/test-${configName}`);
    console.log(`\n[matrix] Building "${configName}" → ${outputDir}`);

    const env = {
        ...process.env,
        VITE_PLATFORM: 'web',
        VITE_ENGINE_OUTPUT_DIR: outputDir,
        ...config.env,
    };

    try {
        execSync('npx vite build --config vite/config/vite.config.ts', {
            cwd: ENGINE_ROOT,
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120_000,
        });
        console.log(`[matrix] Build "${configName}" complete`);
        return outputDir;
    } catch (e) {
        console.error(`[matrix] Build "${configName}" FAILED:`, e.stderr?.toString() || e.message);
        return null;
    }
}

// ===== Run parity tests against a specific build =====
async function runTests(configName, config, enginePath, server, port) {
    console.log(`\n[matrix] Running parity tests for "${configName}"...`);

    const browser = await chromium.launch({
        headless: !HEADED,
        args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') console.error(`  [browser] ${text}`);
    });

    page.on('pageerror', err => {
        console.error(`  [page error] ${err.message}`);
    });

    // Build the runner URL with engine path and features
    const engineRelPath = resolve(enginePath, 'cc.js');
    const featuresParam = config.expectedFeatures
        ? `&features=${encodeURIComponent(JSON.stringify(config.expectedFeatures))}`
        : '';
    const engineServerPath = '/' + (engineRelPath.replace(ENGINE_ROOT, '').replace(/^\//, ''));
    const url = `http://127.0.0.1:${port}/vite/tests/parity/runner.html?engine=${encodeURIComponent(engineServerPath)}${featuresParam}`;

    console.log(`[matrix] URL: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    try {
        await page.waitForFunction(() => window.__PARITY_DONE__ === true, { timeout: TIMEOUT });
    } catch {
        console.error(`[matrix] Timeout waiting for tests for "${configName}"`);
        const status = await page.$eval('#status', el => el.textContent).catch(() => 'unknown');
        console.error(`[matrix] Page status: ${status}`);
        await browser.close();
        return null;
    }

    const report = await page.evaluate(() => window.__PARITY_REPORT__);
    await browser.close();
    return report;
}

// ===== Print matrix summary =====
function printMatrixReport(results) {
    console.log('\n\n========================================');
    console.log('  PARITY TEST MATRIX RESULTS');
    console.log('========================================\n');

    let allPassed = true;

    for (const [name, result] of Object.entries(results)) {
        const config = CONFIGS[name];
        if (!result) {
            console.log(`[FAIL] "${name}" — build or test execution failed`);
            allPassed = false;
            continue;
        }

        const s = result.summary;
        const status = s.failed > 0 ? 'FAIL' : 'PASS';
        if (s.failed > 0) allPassed = false;

        console.log(`[${status}] "${name}": ${config.description}`);
        console.log(`       Total: ${s.total} | Passed: ${s.passed} | Failed: ${s.failed}`);

        for (const mod of result.modules) {
            const icon = mod.failed > 0 ? 'FAIL' : mod.tests.length === 0 ? 'WARN' : 'OK';
            console.log(`       [${icon}] ${mod.name}: ${mod.passed}/${mod.tests.length}`);
            for (const t of mod.tests) {
                if (t.status === 'fail') {
                    console.log(`         X ${t.name}${t.detail ? ` — ${t.detail}` : ''}`);
                }
            }
        }
        console.log('');
    }

    // Comparative analysis across configurations
    console.log('----------------------------------------');
    console.log('  CROSS-CONFIG COMPARISON');
    console.log('----------------------------------------\n');

    const configNames = Object.keys(results).filter(k => results[k] != null);
    if (configNames.length >= 2) {
        const first = results[configNames[0]].summary;
        const last = results[configNames[configNames.length - 1]].summary;

        // Compare minimal vs full: full should have more tests (more features to test)
        if (configNames.includes('minimal') && configNames.includes('full')) {
            const minTotal = results['minimal'].summary.total;
            const fullTotal = results['full'].summary.total;
            console.log(`   Minimal build: ${minTotal} assertions executed`);
            console.log(`   Full build:    ${fullTotal} assertions executed`);
            console.log(`   Difference:    ${fullTotal - minTotal} more assertions for full build`);
            console.log(`   (More features should produce more test assertions)\n`);

            if (fullTotal <= minTotal) {
                console.log(`   ⚠ WARNING: Full build has ${fullTotal - minTotal} more assertions than minimal`);
            }
        }

        // Check if all passing configs have 0 failures
        const failing = configNames.filter(k => results[k].summary.failed > 0);
        if (failing.length > 0) {
            console.log(`   FAILURES in: ${failing.join(', ')}`);
        } else {
            console.log(`   All configs: 0 failures ✓`);
        }
    }

    console.log('========================================\n');
    return allPassed;
}

// ===== Main =====
async function main() {
    console.log('[matrix] Building parity test bundle...');
    await buildTests();

    console.log('[matrix] Starting file server...');
    const { server, port } = await startFileServer(ENGINE_ROOT);

    const results = {};

    try {
        for (const [name, config] of Object.entries(CONFIGS)) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`  Configuration: "${name}"`);
            console.log(`  ${config.description}`);
            console.log(`${'='.repeat(60)}`);

            // Build
            const enginePath = buildEngine(name, config);
            if (!enginePath || !existsSync(resolve(enginePath, 'cc.js'))) {
                console.error(`[matrix] Build output not found for "${name}"`);
                results[name] = null;
                continue;
            }

            // Run tests
            const report = await runTests(name, config, enginePath, server, port);
            results[name] = report;

            if (report) {
                const failed = report.summary.failed;
                console.log(`[matrix] "${name}": ${failed > 0 ? `FAILED (${failed})` : 'PASSED'}`);
            }
        }

        // Print matrix report
        const allPassed = printMatrixReport(results);

        // Cleanup
        server.close();

        if (allPassed) {
            console.log('[matrix] ALL CONFIGS PASSED');
            process.exit(0);
        } else {
            console.log('[matrix] SOME CONFIGS FAILED');
            process.exit(1);
        }
    } catch (err) {
        console.error('[matrix] Fatal error:', err);
        server.close();
        process.exit(1);
    }
}

main();

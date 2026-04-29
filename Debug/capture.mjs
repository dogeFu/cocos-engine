import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || '18080';
const URL = `http://localhost:${PORT}`;
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'Debug', 'screenshots');
const CONSOLE_LOG_PATH = path.join(PROJECT_ROOT, 'Debug', 'console.log');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const consoleEntries = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

page.on('console', (msg) => {
  const type = msg.type();
  consoleEntries.push(`[${type.toUpperCase()}] ${msg.text()}`);
});

page.on('pageerror', (err) => {
  consoleEntries.push(`[PAGE_ERROR] ${err.message}`);
});

// Log failed network requests
page.on('requestfailed', (request) => {
  consoleEntries.push(`[NETWORK_FAIL] ${request.method()} ${request.url()} — ${request.failure()?.errorText || 'unknown'}`);
});

// Intercept all responses to capture 404 URLs
page.on('response', (response) => {
  if (response.status() === 404) {
    consoleEntries.push(`[HTTP_404] ${response.url()}`);
  }
});

// Intercept XHR/fetch 404s
await context.addInitScript(() => {
  const origFetch = window.fetch;
  window.fetch = async function() {
    const args = arguments;
    const resp = await origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || String(args[0]);
    if (resp.status === 404) {
      console.error('[FETCH_404] ' + url);
    }
    return resp;
  };
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    const args = arguments;
    const url = args[1];
    this.addEventListener('loadend', function() {
      if (this.status === 404) {
        console.error('[XHR_404] ' + url);
      }
    });
    return origOpen.apply(this, args);
  };
});

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
} catch (navError) {
  consoleEntries.push(`[NAV_ERROR] ${navError.message}`);
}

await mkdir(SCREENSHOTS_DIR, { recursive: true });
const screenshotPath = path.join(SCREENSHOTS_DIR, `${timestamp}.png`);
await page.screenshot({ path: screenshotPath, fullPage: true });

const logContent = consoleEntries.length > 0
  ? consoleEntries.join('\n')
  : '(no errors or warnings)';
await writeFile(CONSOLE_LOG_PATH, logContent, 'utf8');

await browser.close();

console.log(`SCREENSHOT: ${screenshotPath}`);
console.log(`CONSOLE_LOG: ${CONSOLE_LOG_PATH}`);
console.log(`TOTAL_ENTRIES: ${consoleEntries.length}`);
console.log(`ERROR_COUNT: ${consoleEntries.filter(e => e.startsWith('[ERROR]') || e.startsWith('[PAGE_ERROR]')).length}`);
console.log(`WARN_COUNT: ${consoleEntries.filter(e => e.startsWith('[WARNING]')).length}`);

// Output structured log content for parsing
console.log('---CONSOLE_LOG_CONTENT---');
console.log(logContent);
console.log('---END_CONSOLE_LOG---');

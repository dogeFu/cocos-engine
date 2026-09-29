#!/usr/bin/env node
/**
 * Capture legacy SystemJS build API surface.
 * Uses a robust module loader that handles the
 * System.register(setters/execute) protocol used by @cocos/ccbuild.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(__dirname, '../../..');
const CC_BUILD = resolve(ENGINE_ROOT, 'bin/dev/cc');
const HEADED = process.argv.includes('--headed');

function startServer() {
  return new Promise((resolve_) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = resolve(ENGINE_ROOT, urlPath.slice(1));
      try {
        const s = statSync(filePath);
        if (s.isFile()) {
          const ext = filePath.split('.').pop();
          const mime = { js:'application/javascript', json:'application/json', wasm:'application/wasm', html:'text/html', png:'image/png', bin:'application/octet-stream', mem:'application/octet-stream' }[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
          res.end(readFileSync(filePath));
        }
      } catch { res.writeHead(404); res.end('Not found'); }
    });
    server.listen(0, '127.0.0.1', () => resolve_({ server, port: server.address().port }));
  });
}

async function main() {
  const { server, port } = await startServer();
  const allFiles = readdirSync(CC_BUILD).filter(f => f.endsWith('.js')).sort();
  const scriptTags = allFiles.map(f => `<script src="/bin/dev/cc/${f}"></script>`).join('\n    ');

  // Best effort SystemJS shim:
  // 1. Collect all registrations (factory functions)
  // 2. Execute each factory to get setters/execute declarations
  // 3. Create proper exports objects
  // 4. Call setters in dependency order
  // 5. Execute modules in dependency order
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<div id="GameDiv"><canvas id="GameCanvas" width="960" height="640"></canvas></div>
<script>
window.System = (function() {
  var mods = []; // { deps: [string], factory: fn, executors: [], exported: {} }
  var nameToDep = {}; // fileBasename -> index
  var allFileNames = ${JSON.stringify(allFiles.map(f => f.replace(/\.js$/, '')))};
  
  return {
    register: function(deps, factory) {
      var idx = mods.length;
      var name = allFileNames[idx] || '_anon_' + idx;
      nameToDep[name] = idx;
      mods.push({ 
        deps: deps.map(function(d) { return d.replace(/^\\.\\//,'').replace(/\\.js$/,''); }), 
        factory: factory, 
        executeFn: null,
        exported: {} 
      });
    },
    
    boot: function() {
      console.log('[sys] Modules registered:', mods.length);
      
      // Phase 1: call factories to get setters/execute, create exports
      var errors = [];
      for (var i = 0; i < mods.length; i++) {
        var m = mods[i];
        var _export = function(exportsObj) {
          for (var k in exportsObj) {
            if (exportsObj.hasOwnProperty(k)) mods[i].exported[k] = exportsObj[k];
          }
        }.bind(null, i); // Hmm, need proper binding
        // Actually, use closure
        break;
      }
      
      // Better approach: use a proxy
      var exportFns = mods.map(function(m, i) {
        return function(obj) {
          for (var k in obj) m.exported[k] = obj[k];
        };
      });
      
      for (var i = 0; i < mods.length; i++) {
        try {
          var ret = mods[i].factory(exportFns[i]);
          if (ret && ret.setters) {
            mods[i].setters = ret.setters;
          }
          if (ret && ret.execute) {
            mods[i].executeFn = ret.execute;
          }
        } catch(e) {
          errors.push({ idx: i, name: allFileNames[i], phase: 'factory', msg: e.message });
        }
      }
      
      if (errors.length > 0) {
        console.log('[sys] Factory errors:', errors.length);
        errors.slice(0,3).forEach(function(e) { console.log('  Error:', e.name, e.msg); });
      }
      
      // Phase 2: build dependency index & call setters
      for (var i = 0; i < mods.length; i++) {
        var m = mods[i];
        if (!m.setters) continue;
        for (var s = 0; s < m.setters.length; s++) {
          if (typeof m.setters[s] !== 'function') continue;
          var depName = m.deps[s];
          var depIdx = nameToDep[depName];
          if (depIdx !== undefined && mods[depIdx]) {
            try { m.setters[s](mods[depIdx].exported); } catch(e) {
              console.log('[sys] Setter error:', allFileNames[i], '->', depName, e.message.substring(0,80));
            }
          }
        }
      }
      
      // Phase 3: execute in topological order
      var executed = {};
      function execOrder(name) {
        if (executed[name]) return;
        executed[name] = true;
        var idx = nameToDep[name];
        if (idx === undefined) return;
        var m = mods[idx];
        for (var d = 0; d < m.deps.length; d++) {
          execOrder(m.deps[d]);
        }
        if (m.executeFn) {
          try { m.executeFn(); } catch(e) {
            console.log('[sys] Execute error:', name, e.message.substring(0,80));
          }
        }
      }
      
      // Execute from root (base module)
      var baseIdx = nameToDep['base'];
      if (baseIdx !== undefined) {
        execOrder('base');
      } else {
        // Execute all modules in reverse order (most dependent first)
        for (var i = mods.length - 1; i >= 0; i--) {
          execOrder(allFileNames[i]);
        }
      }
      
      console.log('[sys] Boot complete');
      window.__SYS_DONE__ = true;
    }
  };
})();

// Load all scripts then boot
window.addEventListener('load', function() {
  setTimeout(function() {
    console.log('[legacy] Booting engine...');
    window.System.boot();
    
    function poll() {
      if (window.cc && window.cc.Vec3) {
        window.__KEYS__ = Object.keys(window.cc).sort();
        window.__DONE__ = true;
        console.log('[legacy] Engine ready, keys:', window.__KEYS__.length);
      } else if (window.__SYS_DONE__) {
        // Engine might need another frame
        setTimeout(poll, 1000);
      } else {
        setTimeout(poll, 500);
      }
    }
    setTimeout(poll, 3000);
  }, 500);
});
</script>
    ${scriptTags}
</body></html>`;

  writeFileSync(resolve(__dirname, 'legacy-loader.html'), html);
  const url = `http://127.0.0.1:${port}/vite/tests/parity/legacy-loader.html`;
  console.log(`[legacy] Loading at ${url}`);

  const browser = await chromium.launch({ headless: !HEADED, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log(`  [browser] ${msg.type()}: ${msg.text().substring(0,200)}`));
  page.on('pageerror', err => console.error(`  [page error]: ${err.message}`));

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  
  try {
    await page.waitForFunction(() => window.__DONE__ === true, { timeout: 60000 });
  } catch(e) {
    const state = await page.evaluate(() => ({
      cc: window.cc ? Object.keys(window.cc).length : 'undefined',
      done: window.__DONE__,
      sysDone: window.__SYS_DONE__
    })).catch(() => ({}));
    console.error('[legacy] Final state:', JSON.stringify(state));
    await browser.close(); server.close(); process.exit(1);
  }

  const keys = await page.evaluate(() => window.__KEYS__ || []);
  writeFileSync(resolve(__dirname, 'legacy-baseline.json'), JSON.stringify(keys, null, 2));
  console.log(`\n[legacy] Captured ${keys.length} keys → legacy-baseline.json`);

  const typeInfo = await page.evaluate(() => {
    const info = {};
    if (window.cc) Object.keys(window.cc).forEach(k => { try { info[k] = typeof window.cc[k]; } catch(e) {} });
    return info;
  });
  writeFileSync(resolve(__dirname, 'legacy-types.json'), JSON.stringify(typeInfo, null, 2));

  await browser.close(); server.close();
  console.log('[legacy] Done');
}

main().catch(err => { console.error(err); process.exit(1); });

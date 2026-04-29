---
name: debug-validate
description: Post-development validation. Builds engine with Vite, starts static server, loads engine in browser, captures screenshot (path-only for cloud docs) and console logs via Playwright, produces a summary report.
---

# Debug Validation — Cocos Engine

## Purpose

After feature development in the cocos-engine project, this skill validates that:
- The engine builds successfully with Vite
- The engine loads in a browser without console errors
- WASM modules (spine, etc.) are correctly loaded and functional
- A screenshot is captured (file path collected for cloud document embedding)

**Important:** The model does not support multimodal/image input. Screenshots are captured solely for inclusion in cloud documents. Never attempt to read or view screenshot files.

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `VITE_PLATFORM` | `web` | Target platform (web, wechat, xiaomi, etc.) |
| `PORT` | `18080` | HTTP port for the static server |

## Workflow

### Step 0: Check Prerequisites

Ensure the engine can be built. Verify Vite is available:

```bash
npx vite --version
```

### Step 1: Build the Engine

```bash
npm run vite:dev:${VITE_PLATFORM}
```

This builds the engine to `bin/vite/${VITE_PLATFORM}/dev/cc.js`.

Capture stdout and stderr. If the build exits with a non-zero code, jump to **Step 8 (Report)** with status **FAIL**.

### Step 2: Verify Build Output

Confirm the build output exists and contains expected artifacts:

```bash
ls -la bin/vite/${VITE_PLATFORM}/dev/cc.js
ls -la bin/vite/${VITE_PLATFORM}/dev/*.wasm 2>/dev/null || echo "(no wasm files — may be expected depending on NATIVE_CODE_BUNDLE_MODE)"
```

### Step 3: Prepare Test HTML

Write the test page to `/tmp/cocos-engine-test.html`:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Cocos Engine Test</title></head>
<body>
<canvas id="GameCanvas" width="1280" height="720"></canvas>
<script src="/cc.js"></script>
<script>
  if (typeof cc !== 'undefined') {
    console.log('[TEST] Engine loaded successfully.');
    var game = cc.game;
    if (game) {
      game.on(cc.Game.EVENT_GAME_INITED, function() {
        console.log('[TEST] Game initialized.');
      });
      var config = {
        debugMode: 1 /* INFO */,
        overrideSettings: { rendering: { renderMode: 3 /* HEADLESS */ } }
      };
      game.init(config).then(function() {
        console.log('[TEST] init complete.');
        return game.run();
      }).then(function() {
        console.log('[TEST] run complete.');
      }).catch(function(err) {
        console.error('[TEST] Engine init/run failed: ' + err.message);
      });
    } else {
      console.error('[TEST] cc.game not found.');
    }
  } else {
    console.error('[TEST] cc namespace not found — engine failed to load.');
  }
</script>
</body>
</html>
```

### Step 4: Launch Static Server

```bash
npx serve bin/vite/${VITE_PLATFORM}/dev -l ${PORT} > /tmp/cocos-engine-server.log 2>&1 &
echo $! > /tmp/cocos-engine-server.pid

# Wait for serve to be ready (max 15s)
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:${PORT}/cc.js; then
    echo "[debug-validate] Static server ready on port ${PORT}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[debug-validate] ERROR: Static server did not start within 15s"
    exit 1
  fi
  sleep 0.5
done
```

### Step 5: Prepare Playwright

```bash
npx playwright --version 2>/dev/null
if [ $? -ne 0 ]; then
  npm install --no-save playwright 2>&1 | tail -1
  npx playwright install chromium 2>&1 | tail -5
fi
```

### Step 6: Capture Screenshot & Console Logs

Use the capture script at `Debug/capture.mjs`. Run it:

```bash
PORT=${PORT} PROJECT_ROOT=$(pwd) node Debug/capture.mjs
```

### Step 7: Analyze Results from Step 6 Output

Parse the Step 6 Bash output to collect results. **Do NOT use the Read tool on any generated files.**

From the output, extract:
- `SCREENSHOT:` line — the screenshot file path (for cloud document embedding)
- `CONSOLE_LOG:` line — the console log file path
- `ERROR_COUNT:` line — number of errors
- `WARN_COUNT:` line — number of warnings

From the console log content (embedded in stdout):
- If `ERROR_COUNT > 0`: **errors detected** — report FAIL
- If `WARN_COUNT > 0` but `ERROR_COUNT == 0`: **warnings only** — report PASS with warnings
- If both are 0: **clean** — report PASS

### Step 8: Cleanup

```bash
kill $(cat /tmp/cocos-engine-server.pid) 2>/dev/null || true
rm -f /tmp/cocos-engine-server.pid /tmp/cocos-engine-server.log /tmp/cocos-engine-test.html
```

### Step 9: Report

Assemble the final report using data already collected from Step 6 stdout.

```
---VALIDATION---
截图路径: <screenshotPath from Step 6>
控制台错误: 
<console log content from Step 6, or "无错误">
最终状态: <通过 / 失败>
```

- **通过 (PASS)**: Build succeeded, server started, no console errors
- **失败 (FAIL)**: Build failed, server didn't start, or errors persist

## Rules

- **Image files are NEVER read.** The model cannot process images. Screenshots are captured only for cloud document embedding via the file path.
- **The Read tool is only used on text source code files** (.ts, .js, .json, .md, .yaml, etc.). Never use Read on: .png, .jpg, .webp, .bin, or any binary file.
- **Console log content comes from Step 6 stdout**, not from reading `Debug/console.log`.
- **Screenshot path comes from Step 6 stdout**, not from reading the file.
- **WebGL-related warnings** from Cocos engine running in headless Chromium are expected and should not be treated as errors.
- **Network-related warnings** (404s for missing files) should be treated as errors if they reference critical engine modules.
- The engine test page uses `renderMode: 3` (Headless) for compatibility with headless Chromium.

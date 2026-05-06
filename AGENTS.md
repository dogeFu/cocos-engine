# AGENTS.md — Cocos Engine (3.8.8)

## Project overview

Cross-platform 2D/3D game engine runtime for Cocos Creator editor. TypeScript engine core + C++ native layer + rendering + platform adapters.

## Source layout

| Path | Purpose |
|---|---|
| `cocos/` | Engine TS source — core, 2d, 3d, animation, physics, gfx, rendering, scene-graph |
| `exports/` | Module entrypoints — one file per feature module (42 files). `exports/base.ts` is the core entry. |
| `pal/` | Platform Abstraction Layer — web/native/minigame implementations per capability |
| `native/` | C++ engine, CMake build, emscripten-wasm wrapper code |
| `vite/` | Vite build system: `config/`, `plugins/`, `platforms/`, `scripts/`, `tests/parity/` |
| `tests/` | Jest unit tests |
| `editor/` | Editor integration assets/features/exports |
| `@types/` | Ambient type declarations (globals, jsb, webgl, pal types) |
| `cc.config.json` | Feature flags, build-time constants, module overrides, tree-shake config |
| `Rag/` | Integrated project knowledge base (reference for engine-specific patterns) |

## Key commands

```sh
npm test                          # tsc --noEmit + jest (CI gate)
npx jest --testPathPattern tests/core/some.test.ts  # single test
npm run build                     # legacy build (min + declaration)
npm run build:dev                 # legacy dev build (debug-infos + h5 source)
npm run vite:dev:web              # Vite dev build → bin/vite/web/dev/cc.js
npm run vite:build:web            # Vite production build → bin/vite/web/prod/cc.js
npm run vite:dev:native           # Vite dev build for native platform
npm run vite:clean                # rm -rf bin/vite
node vite/tests/parity/run-parity.mjs          # parity tests (Playwright)
node vite/tests/parity/run-parity-matrix.mjs   # multi-config parity tests
npx eslint <file>                 # lint single file
npx tsc --noEmit                  # typecheck only
```

Platforms via `VITE_PLATFORM=xxx`: `web`, `native`, `wechat`, `xiaomi`, `alipay`, `bytedance`, `baidu`, `cli`.

Vite env vars: `VITE_MODULE_CULLING=false` (disable tree-shaking), `VITE_ENGINE_FEATURES=<json>`, `VITE_ENGINE_OUTPUT_DIR=<path>`.

## Build system

Two build systems coexist:
- **Legacy** (`@cocos/ccbuild`, `npm run build`) — browserify + gulp, SystemJS output, slow. Used for type declaration generation.
- **Vite** (`npm run vite:*`) — Vite 6 + Rollup, IIFE output, preferred for all development.

`cc.config.json` drives both: feature selection, build-time constants, module overrides (platform-specific file swapping), tree-shaking config, decorator optimization.

## Testing

- **Jest tests** (`tests/`) use custom JSDOM environment (`tests/test-environment.ts`). Init (`tests/init.ts`) mocks `internal:constants`, `internal:native`, all `pal/` modules, and emscripten wasm glue.
- **Per-test config**: `*.test.ts.config.json` files can override constants via `constantOverrides`.
- **Optional modules** (physics, spine, dragon-bones) are NOT in the default Jest build. Only test default modules in `tests/`.
- **Parity tests** (`vite/tests/parity/`) use Playwright + Chromium. Run against Vite-built engine (`bin/vite/web/dev/cc.js`). Supports `--build` and `--features` CLI args. Matrix runner (`run-parity-matrix.mjs`) builds engines with 3 culling configs (minimal/default/full) and cross-compares results.
- **Test integrity rules**: Read `CLAUDE.md` before writing tests. No `assert(true)`, no `skip()`, no tautological conditions, no conditional guards on core features. Parity tests must compare against a baseline.

## Engine conventions

- **Decorators**: `import { ccclass, property } from 'cc.decorator';`
- **Constants**: `import { DEV, EDITOR } from 'internal:constants';`
- **Type-only imports**: `import type { Scene } from './scene';`
- **Uninitialized class props**: Use `declare` (`public declare x: number;`)
- **Math out-parameter**: `public static add<Out extends IVec3Like>(out: Out, a: IVec3Like, b: IVec3Like): Out`
- **Math perf**: Cache `Math.*` at module scope (`const sqrt = Math.sqrt;`)
- **legacyCC export**: Register at file end (`legacyCC.Vec3 = Vec3;`)
- **Bilingual JSDoc**: `@en`/`@zh` tags for public API
- **Dictionary objects**: Use `Object.create(null)` for hot dictionaries

## Prohibitions

- No `console.log` — use `errorID`/`warnID`/`log` from `core/platform/debug`
- No `ts-expect-error`/`ts-ignore`/`ts-nocheck`
- No angle-bracket type assertions — use `as`

## Module removal checklist

When removing a module (e.g., XR, terrain, marionette):
1. Search ALL references to its conditional constant (`USE_XR`) across `pal/`, `cocos/`, `exports/`, `cc.config.json`
2. PAL has 3 platform implementations (`web/`/`native/`/`minigame/`) — keep interface shape, stub implementation
3. When removing `if (USE_XR) { ... } else { ... }`, keep only the `else` body, fix indentation, remove constant import
4. When simplifying enums, keep only generic values, update JSDoc, search for all usages
5. Verify in order: `npx eslint <files>` → `npm run build` → `npx tsc --noEmit` → `git diff`

## Dev workflow

1. Before starting: write a devLog to `devLog/<task-title>.md` with problem analysis and solution design
2. After completing: append Final Conclusions (code functionality, mechanism design, problem causes, solution design)
3. Verify: lint → build → parity tests → typecheck → `git diff`

## Quick reference

- `npm test` = tsc + jest (CI gate)
- New feature: add entry in `exports/`, register in `cc.config.json#features`
- New pal capability: implement in all 3 variants: `web/`, `native/`, `minigame/`
- `bin/`, `native/external/`, `@types/consts.d.ts` are gitignored build artifacts
- Module removal info in `Rag/build/module-removal.md`

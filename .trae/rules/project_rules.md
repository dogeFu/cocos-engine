# Cocos Engine Project Rules

Cocos Creator engine v3.8.8 — cross-platform 2D/3D game engine (C++ + TypeScript, Babel + Rollup).

## Build & Test

- Type check: `npx tsc --noEmit`
- Test: `npm test` (tsc + jest)
- Jest only: `npx jest`

## Engine-Specific Patterns (NOT enforced by linting)

- **Decorator imports:** `import { ccclass, property } from 'cc.decorator';`
- **Engine constants:** `import { DEV, EDITOR } from 'internal:constants';`
- **Type-only imports:** `import type { Scene } from './scene';`
- **Uninitialized class props:** Use `declare` (`public declare x: number;`)
- **Math out-parameter pattern:** `public static add<Out extends IVec3Like> (out: Out, a: IVec3Like, b: IVec3Like): Out`
- **Math perf caching:** Cache `Math.*` at module scope (`const sqrt = Math.sqrt;`)
- **legacyCC export:** Register at file end (`legacyCC.Vec3 = Vec3;`)
- **Bilingual JSDoc:** Use `@en`/`@zh` tags for public API
- **Dictionary objects:** Use `Object.create(null)` for hot dictionaries

## Critical Prohibitions

- No `console.log` — use `errorID`/`warnID`/`log` from `core/platform/debug`
- No `ts-expect-error`/`ts-ignore`/`ts-nocheck`
- No angle-bracket type assertions — use `as`

## Structure

`cocos/` = engine TS source (core, 2d, 3d, gfx, scene-graph, animation, ui...), `pal/` = platform abstraction, `exports/` = public API, `tests/` = Jest tests (`*.test.ts`), `native/` = C++ code

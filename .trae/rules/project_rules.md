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

## Module Removal Rules

When removing a module (e.g. XR) from the engine, follow these rules strictly:

### 1. Comprehensive Reference Search
- Search ALL references to the module's conditional constant (e.g. `USE_XR`) across the entire codebase before starting
- Check `pal/` platform implementations (web/, native/, minigame/) — they share a common interface type
- Check `cocos/` for imports, runtime checks, conditional blocks, and type references
- Check `exports/` for public API re-exports
- Check `cc.config.json` and `editor/engine-features/render-config.json` for feature flags

### 2. Cross-Platform Interface Compatibility
- `pal/` has three platform implementations: `web/`, `native/`, `minigame/` — they must expose the **same public interface**
- When removing module logic from one platform, **keep interface properties as stubs** (returning default values) rather than deleting them, to maintain type compatibility with the shared `pal/` type declarations
- Example: After removing XR from `pal/input/web/gamepad-input.ts`, keep `gripLeft`, `handLeftPosition` etc. as stubs returning `0`/`Vec3.ZERO`/`Quat.IDENTITY`, because `native/` and `minigame/` still expose these properties

### 3. Safe Editing Strategy
- **NEVER use multiple sequential SearchReplace operations on the same large file** — concurrent editing conflicts can corrupt the file (e.g. identifier splitting like `con||st`, `t ype`, `N earPlane`)
- For complex multi-point refactoring on a single file, use a **Python script** or the **Write tool** to apply all changes atomically
- After editing, always run `npx eslint --fix <file>` to auto-fix formatting issues (indentation, operator placement)
- Verify with `npx eslint <file>` that no new errors were introduced

### 4. Conditional Compilation Blocks
- When removing `if (USE_XR) { ... }` blocks, also remove the corresponding `else` branch wrapper, keeping only the `else` body
- When removing `if (USE_XR) { ... } else { ... }`, keep the `else` body and adjust its indentation
- Remove the module's constant import (e.g. `USE_XR`) from `internal:constants` import statements
- Remove module-specific variable declarations (e.g. `const xr = globalThis.__globalXR;`)

### 5. Enum Simplification
- When simplifying enums that had module-specific values, keep only the generic values
- Update JSDoc to remove module-specific descriptions (e.g. remove "in XR" from descriptions)
- Search for all usages of removed enum values across the codebase before deletion

### 6. Verification Checklist
After all changes, verify in this order:
1. `npx eslint <modified-files>` — no new errors
2. `npm run build` — must pass (exit code 0)
3. `npx tsc --noEmit` — no new type errors
4. `git diff` — review all changes for unintended modifications

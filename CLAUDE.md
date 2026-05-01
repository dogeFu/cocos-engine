# CLAUDE.md — Project Rules for AI Assistants

This file defines hard constraints that AI assistants MUST follow when working in this repository.

---

## Test Integrity Rules (MANDATORY)

These rules apply to ALL test files under `vite/tests/`, `tests/`, and any `*.test.ts` / `*.spec.ts` files. Violations are blocking — do not submit code that breaks these rules.

### Core Principle: Verify or Don't Test

Every test must do exactly one of two things:
1. **Assert a real condition** — the test passes or fails based on actual behavior
2. **Not exist** — if you can't verify something, don't write a test for it

There is no third option. `skip()`, `assert(true)`, tautological conditions, and `if (x) { assert }` without failure paths are all forbidden. They all hide the same thing: the absence of verification.

### Rule 1: No Unconditional Passes

`assert(true, ...)` is **forbidden**. Every assertion must verify a real condition.

### Rule 2: No Tautological Conditions

An assertion condition that is always true is equivalent to `assert(true)`. Check your boolean logic.

```typescript
// WRONG — always true (A || !A)
assert(cc[name] != null || cc[name] === undefined, 'accessible');

// RIGHT — actually tests for existence
assert(cc[name] != null, `${name} exists`);
```

### Rule 3: No Skip

`skip()` is **forbidden**. It is functionally identical to not testing — both produce 0 verification.

- If a feature is in the build → `assert` it
- If a feature is NOT in the build → don't write a test for it
- If you're unsure whether something should be in the build → write the `assert` and let it fail. A failing test tells you something. A skip tells you nothing.

```typescript
// WRONG — skip hides whether the feature should exist
if (cc.spine) {
    assert(cc.spine.wasmUtil != null, 'spine.wasmUtil exists');
} else {
    skip('Spine module', 'spine not included in build');
}

// RIGHT — only test what's in the build. If spine isn't included, don't test spine.
// (Simply remove the test block entirely)

// RIGHT — if you believe spine SHOULD be in the build, assert it and let it fail
assert(cc.spine != null, 'spine module exported');
```

### Rule 4: No Conditional Guards on Core Features

If a feature is part of the default build, do NOT wrap it in `if (cc.xxx)`. Assert it directly. Wrapping in `if` turns a failure into a silent skip.

```typescript
// WRONG — if Vec3 is missing, test silently passes with 0 assertions
if (cc.Vec3) {
    assert(cc.Vec3.prototype.add != null, 'Vec3.add exists');
}

// RIGHT — Vec3 is a core feature, always assert it
assert(cc.Vec3 != null, 'Vec3 exported');
assert(typeof cc.Vec3.prototype.add === 'function', 'Vec3.add exists');
```

### Rule 5: Only Test What's in the Default Build

Do not write tests for optional modules (physics, spine, dragon-bones, etc.) unless you are specifically testing a build that includes them. Testing optional features in the default build produces either:
- Skips (useless) if the module isn't included
- Passes (misleading) if you guard with `if`

If you need to verify optional modules, create a separate test configuration that enables them.

### Rule 6: Baseline Engine Load Check

Every test module that operates on `cc` MUST begin with a baseline check that the engine loaded correctly. If this check fails, the test **fails** — it does not skip.

```typescript
export function runXxxTest(cc: any) {
    startModule('Xxx');

    // BASELINE — engine must have loaded
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return; // Don't crash, but the assert above already recorded a failure
    }

    // ... actual tests ...
    endModule();
}
```

### Rule 7: Parity Tests Must Compare Against a Baseline

A "parity test" that only checks one build is not a parity test. When comparing Vite output against original output:

1. Load both builds (e.g., `bin/systemjs/cc.js` and `bin/vite/web/dev/cc.js`)
2. Compare key sets, types, and behavior
3. Report differences as failures, not skips

```typescript
// WRONG — only checks Vite build
assert(cc.Vec3 != null, 'Vec3 exists');

// RIGHT — compares both builds
const viteKeys = Object.keys(viteCC).sort();
const origKeys = Object.keys(origCC).sort();
const missing = origKeys.filter(k => !viteKeys.includes(k));
assert(missing.length === 0, `Vite build missing exports: ${missing.join(', ')}`);
```

### Rule 8: Test Report Accuracy

A module with 0 assertions executed MUST NOT report as `[OK]`. The reporting logic must distinguish between "all tests passed" and "no tests ran".

```typescript
const executed = mod.passed + mod.failed;
const icon = mod.failed > 0 ? 'FAIL' : executed === 0 ? 'WARN' : 'OK';
```

### Rule 9: Reasonable Tolerance

Math assertion tolerance must be justified. Default tolerance for floating-point comparisons is `0.001`. If you need a wider tolerance (e.g., quaternion roundtrip), add a comment explaining why.

```typescript
// Quaternion→Euler roundtrip accumulates ~0.05° error due to gimbal singularity
assertClose(euler.y, 90, 0.05, 'Quat roundtrip');
```

---

## Code Modification Rules

### Rule 10: Do Not Delete Without Understanding

Before removing or modifying existing code, run `git log --follow <file>` and `git blame` to understand its history. If unsure about a change, ask.

### Rule 11: Test Before Marking Done

After modifying engine source code:
1. Build with `npm run vite:dev:web`
2. Run parity tests: `node vite/tests/parity/run-parity.mjs`
3. If `Debug/SKILL.md` exists, run its validation workflow

Never mark a task as complete without running the relevant tests.

---

## Quick Reference: Anti-Patterns

| Anti-Pattern | Rule | Fix |
|---|---|---|
| `assert(true, ...)` | #1 | Write a real assertion or delete the test |
| `A \|\| !A` in condition | #2 | Simplify to actual check |
| `skip(...)` anywhere | #3 | Delete the test or write a real assertion |
| `if (x) { assert }` no failure path | #4 | Assert directly, no `if` guard |
| Testing optional modules | #5 | Only test default build features |
| No `cc` baseline check | #6 | Add assertion at module start |
| Skip for baseline failure | #6 | `assert` failure, don't skip |
| Single-build "parity" | #7 | Load and compare both builds |
| 0 assertions = OK | #8 | Report WARN for empty modules |
| Unexplained wide tolerance | #9 | Document the reason |

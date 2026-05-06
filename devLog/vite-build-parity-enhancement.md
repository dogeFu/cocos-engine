# Vite Build Parity Enhancement

## Requirement / Problem Analysis

The Vite build system needs to be on par with the legacy `@cocos/ccbuild` build in three areas:
1. **Module culling configuration**: Vite must support the same feature/module culling capabilities as defined in `cc.config.json`
2. **Consistent unit tests**: The same parity tests must work correctly regardless of which culling configuration the engine was built with
3. **Multi-configuration test pipeline**: A complete validation flow that builds engines with different culling configs, runs parity tests against each, and cross-compares results

## Solution Design

### Phase 1: Feature Configuration Enhancement
- Add `vendor-google` module to `MODULE_EXPORTS` in `vite-plugin-cocos-modules.ts`
- Ensure all `cc.config.json` features are representable in Vite's `features` config

### Phase 2: Configurable Parity Tests
- Add `FeatureManifest` interface to define expected features per test run
- Update all test modules (`api-surface.ts`, `wasm-modules.ts`, etc.) to accept feature manifests
- Parameterize assertions based on expected features instead of hardcoding

### Phase 3: Cross-Build Comparison Tests  
- Create `cross-config.ts` test module that validates key count, missing exports, and type consistency
- Compare Vite build keys against expected baselines

### Phase 4: Multi-Configuration Test Pipeline
- Create `run-parity-matrix.mjs` script that:
   1. Defines 3 test configurations (minimal, default, full)
   2. Builds Vite engine with each configuration
   3. Runs all parity tests against each build
   4. Compares and reports results

## Final Conclusions

### Code functionality
Implemented four groups of changes across the Vite build system and parity test infrastructure:

1. **Feature/constant handling** (`vite/utils/constants.ts`, `vite/plugins/vite-plugin-cocos-modules.ts`):
   - Added `vendor-google` to `MODULE_EXPORTS`
   - Added `proceduralAnimation` and `vendorGoogle` to feature interfaces
   - Extended `featuresToConstants()` to emit `MARIONETTE`, `PROCEDURAL_ANIMATION`, `USE_VENDOR_GOOGLE`, `CULL_MESHOPT`, `LOAD_SPINE_MANUALLY`, `LOAD_BOX2D_MANUALLY`, `WASM_SUBPACKAGE`
   - Updated `UserConfig` interface with new feature fields

2. **Module replacement** (`vite/plugins/vite-plugin-cocos-external-modules.ts`):
   - Added `cullMeshopt` support — when `CULL_MESHOPT` is true, meshopt decoder modules return empty stubs
   - Passed `CULL_MESHOPT` constant through from `vite.config.ts`

3. **Configurable parity tests** (`vite/tests/parity/`):
   - Added `FeatureManifest` interface describing expected features per test run
   - Updated `api-surface.ts` and `wasm-modules.ts` to accept `FeatureManifest` and adapt assertions accordingly
   - Created `cross-config.ts` — new test module validating core keys presence, type consistency, GFX device classes
   - Updated `entry.ts` to wire all modules and pass features through
   - Updated `runner.html` to accept `?engine=` and `?features=` query params 
   - Updated `run-parity.mjs` to support `--build` and `--features` CLI args
   - Created `run-parity-matrix.mjs` — multi-config test runner (minimal/default/full configs)

4. **User config expansion** (`vite/user.config.ts`, `vite/platforms/base.ts`):
   - Added `proceduralAnimation`, `vendorGoogle`, `skeletalAnimation` feature fields to both env-based and file-based config loading

### Mechanism design

**FeatureManifest pattern**: Test modules now accept an optional `FeatureManifest` that declares which features are expected. Feature-gated assertions (spine, physics2D) check the manifest first; if a feature is expected but absent, the assertion fails. If a feature is not expected, its assertions are skipped. This allows the same test bundle to work across arbitrary culling configurations.

**Cross-config test module**: `cross-config.ts` maintains a comprehensive `CORE_KEYS` set of API keys guaranteed to exist in every build (math types, scene graph, core systems, etc.), plus feature-gated key sets (KEYS_2D, KEYS_3D, etc.). It validates that all core keys are present and that feature-gated keys match the manifest.

**Matrix runner**: `run-parity-matrix.mjs` defines 3 configurations (minimal, default, full), builds each via Vite's CLI API, runs the full parity test suite against each build via Playwright, and prints a comparative summary.

### Problem causes

The original Vite build had several gaps compared to the legacy build:
1. `vendor-google` module was missing from `MODULE_EXPORTS`, so it couldn't be culled via the module system
2. Feature-related constants (`PROCEDURAL_ANIMATION`, `USE_VENDOR_GOOGLE`, `CULL_MESHOPT`) were not emitted through `featuresToConstants()`, making them unavailable as `define` replacements
3. `cullMeshopt` was not implemented in the external modules plugin; meshopt modules were always included regardless of `CULL_MESHOPT` constant
4. Parity tests had hardcoded assumptions about which features were enabled (spine, physics2D), making them fail when the engine was built with different culling configs
5. The `runner.html` hardcoded the engine script URL, preventing test execution against different builds

### Solution design

**Principle**: Share test logic across all culling configurations by parameterizing the test expectations rather than duplicating test suites per config.

The `FeatureManifest` approach was chosen over:
- **Separate test suites per config**: Would require maintaining N parallel test files with near-identical assertions
- **Dynamic feature detection** (`if (cc.X) assert(...)`): Violates CLAUDE.md Rule 4 (no conditional guards)
- **Skipping** (`skip()`): Violates CLAUDE.md Rule 3

By passing expected features as a parameter, the test module explicitly declares what it expects. If a feature is expected but missing, the assertion fails loudly. If a feature is absent and not expected, no assertion runs — which is correct behavior.

**`cullMeshopt`** was implemented by adding a simple path-name check in the external modules plugin. When enabled, any module whose path contains `meshopt` returns an empty throw stub. This matches the legacy build's `cullArray` mechanism.

**Test matrix** uses the existing `VITE_ENGINE_FEATURES` env var mechanism to pass feature configs to Vite builds, avoiding the need to modify `user.config.ts` at runtime.

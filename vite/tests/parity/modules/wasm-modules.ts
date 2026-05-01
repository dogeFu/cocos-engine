/**
 * WASM Module Parity Test
 *
 * Verifies that WASM modules included in the current build are correctly
 * bundled, loaded, and functional in the Vite build output.
 *
 * WASM modules tested (must be enabled in user.config.ts features):
 *   - Spine (skeletal animation) — requires features.spine = true
 *   - Meshopt (mesh compression decoder) — always included via 3d module
 *   - Box2D (2D physics WASM) — requires features.physics2D = true
 *
 * WASM modules NOT tested here:
 *   - WebGPU (glslang + twgsl + webgpu_wasm) — requires WEBGPU = true
 *   - PhysX / Bullet — native-only, no web TS loading path
 *
 * Also tests the 2D physics framework API surface (shapes, joints, selector).
 *
 * Requires game.init() to have been called before running (triggers WASM loading).
 * Rule 3: No skip(). Rule 4: No conditional guards on core features.
 */

import { startModule, endModule, assert, assertEqual } from '../test-utils';

export function runWASMParityTest(cc: any) {
    startModule('WASM Modules');

    // BASELINE — engine must have loaded
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    // ===== Spine =====
    assert(cc.sp != null, 'spine module (cc.sp) exists');
    assert(cc.sp.spine != null, 'spine core library (cc.sp.spine) exists');

    const spine = cc.sp.spine;
    assert(spine.wasmUtil != null, 'spine.wasmUtil exists');

    const spineWasm = spine.wasmUtil?.wasm;
    assert(spineWasm != null, 'spine.wasmUtil.wasm (Emscripten instance) exists');

    assert(spineWasm.HEAPU8 != null, 'spine WASM HEAPU8 exists');
    assert(spineWasm.HEAPU8.buffer != null, 'spine WASM HEAPU8.buffer exists');
    assertEqual(spineWasm.HEAPU8.BYTES_PER_ELEMENT, 1, 'spine HEAPU8 BYTES_PER_ELEMENT=1');

    assert(spineWasm.HEAPU32 != null, 'spine WASM HEAPU32 exists');
    assertEqual(spineWasm.HEAPU32.BYTES_PER_ELEMENT, 4, 'spine HEAPU32 BYTES_PER_ELEMENT=4');

    // Memory size: 32 MiB (PAGESIZE=64KiB * PAGECOUNT=32*16)
    assert(
        spineWasm.HEAPU8.byteLength >= 32 * 1024 * 1024,
        'spine WASM memory >= 32 MiB',
        `actual: ${(spineWasm.HEAPU8.byteLength / 1024 / 1024).toFixed(1)} MiB`,
    );

    assert(typeof spineWasm.SpineWasmUtil === 'function', 'SpineWasmUtil constructor exists');

    // ===== Meshopt decoder =====
    assert(cc.MeshoptDecoder != null, 'MeshoptDecoder exported on cc');
    const decoder = cc.MeshoptDecoder;
    assert(decoder.supported === true, 'MeshoptDecoder.supported is true (WASM loaded)');
    assert(typeof decoder.decodeVertexBuffer === 'function', 'MeshoptDecoder.decodeVertexBuffer exists');
    assert(typeof decoder.decodeIndexBuffer === 'function', 'MeshoptDecoder.decodeIndexBuffer exists');
    assert(typeof decoder.decodeGltfBuffer === 'function', 'MeshoptDecoder.decodeGltfBuffer exists');

    // ===== Box2D (2D physics WASM) =====
    assert(cc.selector != null, 'physics selector exported');
    assert(cc.selector.backend != null, 'physics selector.backend exists');
    assert(cc.selector.backend['box2d-wasm'] != null, 'box2d-wasm backend registered');
    assert(cc.selector.backend['box2d-wasm'].PhysicsWorld != null, 'box2d-wasm.PhysicsWorld exists');
    assert(cc.selector.backend['box2d-wasm'].RigidBody != null, 'box2d-wasm.RigidBody exists');

    // Verify Box2D classes are available
    assert(cc.BoxCollider2D != null, 'BoxCollider2D component exported');
    assert(cc.CircleCollider2D != null, 'CircleCollider2D component exported');
    assert(cc.RigidBody2D != null, 'RigidBody2D component exported');
    assert(cc.PhysicsSystem2D != null, 'PhysicsSystem2D exported');

    // ===== 2D Physics framework API surface =====
    const box2dWrapper = cc.selector.backend['box2d-wasm'];
    if (box2dWrapper) {
        // Box2D shapes registered in the backend wrapper
        assert(box2dWrapper.BoxShape != null, 'box2d-wasm.BoxShape registered');
        assert(box2dWrapper.CircleShape != null, 'box2d-wasm.CircleShape registered');
        assert(box2dWrapper.PolygonShape != null, 'box2d-wasm.PolygonShape registered');

        // Box2D joints registered in the backend wrapper
        assert(box2dWrapper.DistanceJoint != null, 'box2d-wasm.DistanceJoint registered');
        assert(box2dWrapper.FixedJoint != null, 'box2d-wasm.FixedJoint registered');
        assert(box2dWrapper.MouseJoint != null, 'box2d-wasm.MouseJoint registered');
        assert(box2dWrapper.SpringJoint != null, 'box2d-wasm.SpringJoint registered');
        assert(box2dWrapper.HingeJoint != null, 'box2d-wasm.HingeJoint registered');
    }

    // Note: cc.internal namespace is populated by module side-effects but those
    // assignments are tree-shaken in the Vite build. The 2D physics selector is
    // only accessible via ESM imports, not on the global cc object.

    endModule();
}

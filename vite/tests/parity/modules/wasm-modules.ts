import { startModule, endModule, assert, assertEqual, type FeatureManifest } from '../test-utils';

export function runWASMParityTest(cc: any, features?: FeatureManifest) {
    startModule('WASM Modules');

    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    // ===== Spine WASM =====
    const hasSpine = features?.spine ?? (cc.sp != null && cc.sp.spine != null);
    if (hasSpine && cc.sp) {
        assert(cc.sp != null, 'spine module (cc.sp) exists');
        assert(cc.sp.spine != null, 'spine core library (cc.sp.spine) exists');

        const spine = cc.sp.spine;
        assert(spine.wasmUtil != null, 'spine.wasmUtil exists');

        const spineWasm = spine.wasmUtil?.wasm;
        if (spineWasm) {
            assert(spineWasm != null, 'spine.wasmUtil.wasm (Emscripten instance) exists');
            assert(spineWasm.HEAPU8 != null, 'spine WASM HEAPU8 exists');
            assert(spineWasm.HEAPU8.buffer != null, 'spine WASM HEAPU8.buffer exists');
            assertEqual(spineWasm.HEAPU8.BYTES_PER_ELEMENT, 1, 'spine HEAPU8 BYTES_PER_ELEMENT=1');
            assert(spineWasm.HEAPU32 != null, 'spine WASM HEAPU32 exists');
            assertEqual(spineWasm.HEAPU32.BYTES_PER_ELEMENT, 4, 'spine HEAPU32 BYTES_PER_ELEMENT=4');

            assert(
                spineWasm.HEAPU8.byteLength >= 32 * 1024 * 1024,
                'spine WASM memory >= 32 MiB',
                `actual: ${(spineWasm.HEAPU8.byteLength / 1024 / 1024).toFixed(1)} MiB`,
            );

            assert(typeof spineWasm.SpineWasmUtil === 'function', 'SpineWasmUtil constructor exists');
        }
    }

    // ===== Meshopt decoder =====
    if (cc.MeshoptDecoder) {
        const decoder = cc.MeshoptDecoder;
        assert(decoder.supported === true, 'MeshoptDecoder.supported is true (WASM loaded)');
        assert(typeof decoder.decodeVertexBuffer === 'function', 'MeshoptDecoder.decodeVertexBuffer exists');
        assert(typeof decoder.decodeIndexBuffer === 'function', 'MeshoptDecoder.decodeIndexBuffer exists');
        assert(typeof decoder.decodeGltfBuffer === 'function', 'MeshoptDecoder.decodeGltfBuffer exists');
    }

    // ===== Box2D (2D physics WASM) =====
    const hasPhysics2D = features?.physics2D ?? (cc.selector?.backend?.['box2d-wasm'] != null);
    if (hasPhysics2D && cc.selector?.backend?.['box2d-wasm']) {
        assert(cc.selector != null, 'physics selector exported');
        assert(cc.selector.backend != null, 'physics selector.backend exists');
        assert(cc.selector.backend['box2d-wasm'] != null, 'box2d-wasm backend registered');
        assert(cc.selector.backend['box2d-wasm'].PhysicsWorld != null, 'box2d-wasm.PhysicsWorld exists');
        assert(cc.selector.backend['box2d-wasm'].RigidBody != null, 'box2d-wasm.RigidBody exists');

        assert(cc.BoxCollider2D != null, 'BoxCollider2D component exported');
        assert(cc.CircleCollider2D != null, 'CircleCollider2D component exported');
        assert(cc.RigidBody2D != null, 'RigidBody2D component exported');
        assert(cc.PhysicsSystem2D != null, 'PhysicsSystem2D exported');

        const box2dWrapper = cc.selector.backend['box2d-wasm'];
        if (box2dWrapper) {
            assert(box2dWrapper.BoxShape != null, 'box2d-wasm.BoxShape registered');
            assert(box2dWrapper.CircleShape != null, 'box2d-wasm.CircleShape registered');
            assert(box2dWrapper.PolygonShape != null, 'box2d-wasm.PolygonShape registered');

            assert(box2dWrapper.DistanceJoint != null, 'box2d-wasm.DistanceJoint registered');
            assert(box2dWrapper.FixedJoint != null, 'box2d-wasm.FixedJoint registered');
            assert(box2dWrapper.MouseJoint != null, 'box2d-wasm.MouseJoint registered');
            assert(box2dWrapper.SpringJoint != null, 'box2d-wasm.SpringJoint registered');
            assert(box2dWrapper.HingeJoint != null, 'box2d-wasm.HingeJoint registered');
        }
    }

    endModule();
}

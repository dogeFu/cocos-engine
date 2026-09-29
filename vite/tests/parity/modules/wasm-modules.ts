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

        const wrapper = cc.selector.backend['box2d-wasm'];
        assert(wrapper.PhysicsWorld != null, 'box2d-wasm.PhysicsWorld exists');
        assert(wrapper.RigidBody != null, 'box2d-wasm.RigidBody exists');
        assert(wrapper.BoxShape != null, 'box2d-wasm.BoxShape registered');
        assert(wrapper.CircleShape != null, 'box2d-wasm.CircleShape registered');
        assert(wrapper.PolygonShape != null, 'box2d-wasm.PolygonShape registered');
        assert(wrapper.DistanceJoint != null, 'box2d-wasm.DistanceJoint registered');
        assert(wrapper.FixedJoint != null, 'box2d-wasm.FixedJoint registered');
        assert(wrapper.MouseJoint != null, 'box2d-wasm.MouseJoint registered');
        assert(wrapper.SpringJoint != null, 'box2d-wasm.SpringJoint registered');
        assert(wrapper.HingeJoint != null, 'box2d-wasm.HingeJoint registered');

        assert(cc.BoxCollider2D != null, 'BoxCollider2D component exported');
        assert(cc.CircleCollider2D != null, 'CircleCollider2D component exported');
        assert(cc.RigidBody2D != null, 'RigidBody2D component exported');
        assert(cc.PhysicsSystem2D != null, 'PhysicsSystem2D exported');

        // --- Functional: create physics world (validates B2.World loaded) ---
        let world: any = null;
        let createErr: string | undefined;
        try {
            world = new wrapper.PhysicsWorld();
        } catch (e: any) {
            createErr = e.message;
        }
        assert(world != null, 'B2PhysicsWorld instantiated (B2.World loaded)', createErr);
        if (world) {
            assert(world.impl != null, 'B2PhysicsWorld.impl is B2.World instance');

            // B2.World API
            assert(typeof world.setGravity === 'function', 'B2PhysicsWorld.setGravity exists');
            assert(typeof world.setAllowSleep === 'function', 'B2PhysicsWorld.setAllowSleep exists');
            assert(typeof world.step === 'function', 'B2PhysicsWorld.step exists');

            // Functional: set gravity via B2.World
            try {
                world.setGravity({ x: 0, y: -10 });
                assert(true, 'B2PhysicsWorld.setGravity({0,-10}) succeeded');
            } catch (e: any) {
                assert(false, 'B2PhysicsWorld.setGravity({0,-10}) succeeded', `Error: ${e.message}`);
            }

            // Functional: call step
            try {
                world.step(1 / 60, 10, 10);
                assert(true, 'B2PhysicsWorld.step(1/60) succeeded');
            } catch (e: any) {
                assert(false, 'B2PhysicsWorld.step(1/60) succeeded', `Error: ${e.message}`);
            }

            // Body creation via groundBodyImpl (created in constructor)
            assert(world.groundBodyImpl != null, 'B2PhysicsWorld.groundBodyImpl exists');
            const groundBody = world.groundBodyImpl;
            assert(typeof groundBody.GetPosition === 'function', 'B2.Body.GetPosition exists');
            assert(typeof groundBody.SetTransform === 'function', 'B2.Body.SetTransform exists');
            assert(typeof groundBody.GetAngle === 'function', 'B2.Body.GetAngle exists');

            const pos = groundBody.GetPosition();
            assert(typeof pos.x === 'number' && typeof pos.y === 'number', 'B2.Body.GetPosition returns Vec2');

            // Sync methods
            assert(typeof world.syncSceneToPhysics === 'function', 'B2PhysicsWorld.syncSceneToPhysics exists');
            assert(typeof world.syncPhysicsToScene === 'function', 'B2PhysicsWorld.syncPhysicsToScene exists');

            // Cleanup: destroy the world to free WASM memory
            try {
                const worldImpl = world.impl;
                if (worldImpl && typeof worldImpl.DestroyBody === 'function') {
                    worldImpl.DestroyBody(world.groundBodyImpl);
                }
            } catch (_e) { /* best-effort cleanup */ }
        }
    }

    endModule();
}

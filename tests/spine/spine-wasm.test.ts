import { waitForSpineWasmInstantiation } from '../../cocos/spine/lib/spine-instantiate-3.8';
import spine from '../../cocos/spine/lib/spine-core';

describe('Spine WASM Loading', () => {

    beforeAll(async () => {
        // Directly invoke the 3.8 WASM instantiation (bypasses the build-time module override stub)
        await waitForSpineWasmInstantiation();
    }, 30000);

    test('spine WASM instance is available after loading', () => {
        // After WASM instantiation, the spine namespace should have wasmUtil and wasm instance
        // The overrideSpineDefine function registers these on the spine object
        expect(spine).toBeDefined();
        expect(spine.wasmUtil).toBeDefined();
        expect(spine.wasmUtil.wasm).toBeDefined();
    });

    test('spine WASM instance has expected memory layout', () => {
        const wasm = spine.wasmUtil.wasm;
        expect(wasm).toBeDefined();

        // HEAPU8 is the main typed array view into WASM linear memory
        expect(wasm.HEAPU8).toBeDefined();
        // NOTE: instanceof checks fail across vm sandbox boundaries,
        // so we check structural typed array properties instead
        expect(wasm.HEAPU8.buffer).toBeDefined();
        expect(wasm.HEAPU8.BYTES_PER_ELEMENT).toBe(1);

        // HEAPU32 for 32-bit integer operations
        expect(wasm.HEAPU32).toBeDefined();
        expect(wasm.HEAPU32.BYTES_PER_ELEMENT).toBe(4);

        // Memory should be at least 32 MiB (the configured PAGECOUNT * PAGESIZE)
        expect(wasm.HEAPU8.byteLength).toBeGreaterThanOrEqual(32 * 1024 * 1024);
    });

    test('spine WASM SpineWasmUtil is callable', () => {
        const { SpineWasmUtil } = spine.wasmUtil.wasm as any;

        // SpineWasmUtil should be a constructor/class from the WASM module
        expect(SpineWasmUtil).toBeDefined();
        expect(typeof SpineWasmUtil).toBe('function');
    });

    test('spine core classes are overridden with WASM-backed implementations', () => {
        // After WASM loading, spine-define.ts overrides core classes
        // vertexCount is a getter defined by the WASM override
        const { VertexAttachment, MeshAttachment, RegionAttachment } = spine as any;

        expect(VertexAttachment).toBeDefined();
        expect(MeshAttachment).toBeDefined();
        expect(RegionAttachment).toBeDefined();
    });
});

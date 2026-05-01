/**
 * Rendering Parity Test
 *
 * Verifies that the rendering subsystem initializes correctly and
 * that GFX device classes, render pipeline, and basic render components work.
 * Uses headless mode (renderMode: 3) to avoid WebGL dependency.
 *
 * Rule 3: No skip(). Rule 4: No conditional guards on core features.
 * Rule 5: Only test default build features.
 */

import { startModule, endModule, assert } from '../test-utils';

export function runRenderingParityTest(cc: any) {
    startModule('Rendering');

    // BASELINE — engine must have loaded
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    // ===== Game init =====
    assert(cc.game != null, 'cc.game singleton exists');
    assert(typeof cc.game.init === 'function', 'game.init() exists');
    assert(typeof cc.game.run === 'function', 'game.run() exists');

    // ===== Director =====
    assert(cc.director != null, 'cc.director singleton exists');
    assert(typeof cc.director.getScene === 'function', 'director.getScene() exists');
    assert(typeof cc.director.loadScene === 'function', 'director.loadScene() exists');

    // ===== Render pipeline (API shape only — root requires game.run()) =====
    assert(cc.RenderPipeline != null, 'RenderPipeline class exists');
    assert(typeof cc.RenderPipeline === 'function', 'RenderPipeline is a constructor');

    assert(cc.RenderFlow != null, 'RenderFlow class exists');
    assert(typeof cc.RenderFlow === 'function', 'RenderFlow is a constructor');

    assert(cc.RenderStage != null, 'RenderStage class exists');
    assert(typeof cc.RenderStage === 'function', 'RenderStage is a constructor');

    // ===== Component types renderable =====
    assert(cc.Sprite != null, 'Sprite component exists');
    assert(typeof cc.Sprite === 'function', 'Sprite is a constructor');

    assert(cc.Label != null, 'Label component exists');
    assert(typeof cc.Label === 'function', 'Label is a constructor');

    assert(cc.MeshRenderer != null, 'MeshRenderer component exists');
    assert(typeof cc.MeshRenderer === 'function', 'MeshRenderer is a constructor');

    // ===== Camera component =====
    assert(cc.Camera != null, 'Camera component exists');
    assert(typeof cc.Camera === 'function', 'Camera is a constructor');

    // ===== Light components =====
    assert(cc.DirectionalLight != null, 'DirectionalLight exists');
    assert(cc.SphereLight != null, 'SphereLight exists');
    assert(cc.SpotLight != null, 'SpotLight exists');
    assert(cc.PointLight != null, 'PointLight exists');

    // ===== Material system =====
    assert(cc.Material != null, 'Material exists');
    assert(typeof cc.Material === 'function', 'Material is a constructor');
    assert(cc.Material.prototype.setProperty != null, 'Material.setProperty exists');
    assert(cc.Material.prototype.getProperty != null, 'Material.getProperty exists');

    assert(cc.EffectAsset != null, 'EffectAsset exists');
    assert(typeof cc.EffectAsset.get === 'function', 'EffectAsset.get() static exists');

    // ===== GFX device classes (always in default build) =====
    assert(cc.WebGLDevice != null, 'WebGLDevice class exists');
    assert(typeof cc.WebGLDevice === 'function', 'WebGLDevice is a constructor');

    assert(cc.WebGL2Device != null, 'WebGL2Device class exists');
    assert(typeof cc.WebGL2Device === 'function', 'WebGL2Device is a constructor');

    assert(cc.EmptyDevice != null, 'EmptyDevice class exists');
    assert(typeof cc.EmptyDevice === 'function', 'EmptyDevice is a constructor');

    // ===== GFX module namespace =====
    assert(cc.gfx != null, 'cc.gfx namespace exists');
    assert(cc.gfx.deviceManager != null, 'gfx.deviceManager exists');
    assert(typeof cc.gfx.deviceManager === 'object' || typeof cc.gfx.deviceManager === 'function', 'gfx.deviceManager is accessible');

    endModule();
}

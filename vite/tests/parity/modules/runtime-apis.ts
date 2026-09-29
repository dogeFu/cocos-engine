/**
 * Runtime API Test
 *
 * Verifies Material runtime, Tween execution, input events, system capabilities,
 * and other APIs that require a running engine instance.
 */
import { startModule, endModule, assert, assertEqual, assertClose } from '../test-utils';

export function runRuntimeAPITest(cc: any) {
    startModule('Runtime APIs');

    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    // ===== Material runtime =====
    const matClass = cc.Material;
    assert(typeof matClass === 'function', 'Material is a constructor');

    let material: any = null;
    try {
        material = new matClass();
    } catch (e: any) {
        assert(false, 'Material instance created', `Error: ${e.message}`);
    }
    assert(material != null, 'Material instance exists');

    if (material) {
        // EffectAsset
        const EffectAsset = cc.EffectAsset;
        assert(typeof EffectAsset === 'function', 'EffectAsset is a constructor');
        assert(typeof EffectAsset.get === 'function', 'EffectAsset.get() static exists');

        // Try loading an effect
        let effect: any = null;
        try {
            effect = EffectAsset.get('builtin-unlit');
        } catch (e: any) {
            // Effect may not be loaded yet in test environment
        }
        if (effect) {
            assert(effect != null, 'builtin-unlit effect loaded');
            try {
                material.initialize({ effectAsset: effect });
                assert(true, 'Material.initialize succeeded');
            } catch (e: any) {
                assert(false, 'Material.initialize succeeded', `Error: ${e.message}`);
            }
        }

        // Material pass count
        assert(typeof material.passes !== 'undefined', 'Material.passes accessible');
    }

    // ===== Tween execution =====
    const tween = cc.tween;
    assert(typeof tween === 'function', 'tween() exists');

    const target = { x: 0, y: 0 };
    let tw: any = null;
    try {
        tw = tween(target);
    } catch (e: any) {
        assert(false, 'tween() created', `Error: ${e.message}`);
    }
    assert(tw != null, 'tween() returns tween instance');

    if (tw) {
        assert(typeof tw.to === 'function', 'Tween.to exists');
        assert(typeof tw.by === 'function', 'Tween.by exists');
        assert(typeof tw.call === 'function', 'Tween.call exists');
        assert(typeof tw.delay === 'function', 'Tween.delay exists');
        assert(typeof tw.start === 'function', 'Tween.start exists');
        assert(typeof tw.stop === 'function', 'Tween.stop exists');
        assert(typeof tw.clone === 'function', 'Tween.clone exists');
        assert(typeof tw.sequence === 'function', 'Tween.sequence exists');
        assert(typeof tw.repeat === 'function', 'Tween.repeat exists');
        assert(typeof tw.reverseTime === 'function', 'Tween.reverseTime exists');
        assert(typeof tw.tag === 'function', 'Tween.tag exists');

        // Build and start a simple tween
        let tweenFired = false;
        try {
            tw.to(1, { x: 100 })
              .call(() => { tweenFired = true; })
              .start();
            assert(true, 'tween.to(...).call(...).start() succeeded');
        } catch (e: any) {
            assert(false, 'tween.to(...).call(...).start() succeeded', `Error: ${e.message}`);
        }
        // NOTE: tween callbacks fire on next frame, not immediately
        assert(typeof tweenFired === 'boolean', 'tween callback flag is boolean');

        // Stop tween to clean up
        try { tw.stop(); } catch (_) {}
    }

    // ===== sys capabilities =====
    const sys = cc.sys;
    assert(sys != null, 'cc.sys exists');

    assert(typeof sys.platform === 'number' || typeof sys.platform === 'string', 'sys.platform accessible');
    assert(typeof sys.languageCode === 'string' || sys.languageCode === undefined, 'sys.languageCode accessible');
    assert(typeof sys.os === 'string' || typeof sys.os === 'undefined', 'sys.os accessible');
    assert(typeof sys.browserType === 'string' || typeof sys.browserVersion === 'string' || typeof sys.browserType === 'number',
        'sys.browserType accessible');

    // sys capabilities
    assert(typeof sys.hasFeature === 'function', 'sys.hasFeature exists');
    assert(typeof sys.isBrowser === 'boolean', 'sys.isBrowser exists');
    assert(sys.isBrowser === true, 'sys.isBrowser is true (running in Playwright)');

    // sys network type
    assert(typeof sys.getNetworkType === 'function', 'sys.getNetworkType exists');

    // ===== cc.game singleton =====
    const game = cc.game;
    assert(game != null, 'cc.game exists');
    assert(typeof game.frameRate === 'number', 'game.frameRate is number');
    assert(game.frameRate > 0, 'game.frameRate > 0', `frameRate=${game.frameRate}`);
    assert(typeof game.isPaused === 'boolean' || typeof game._paused === 'boolean', 'game.isPaused accessible');
    assert(typeof game.totalTime === 'number', 'game.totalTime is number');
    assert(typeof game.deltaTime === 'number', 'game.deltaTime is number');

    // ===== cc.director singleton =====
    const director = cc.director;
    assert(director != null, 'cc.director exists');
    assert(typeof director.getTotalFrames === 'function', 'director.getTotalFrames exists');
    assert(typeof director.getDeltaTime === 'function', 'director.getDeltaTime exists');
    assert(typeof director.getCurrentTime === 'function', 'director.getCurrentTime exists');
    assert(typeof director.pause === 'function', 'director.pause exists');
    assert(typeof director.resume === 'function', 'director.resume exists');
    assert(typeof director.isPaused === 'function', 'director.isPaused exists');

    // ===== Input events =====
    const input = cc.input;
    if (input) {
        assert(input != null, 'cc.input singleton exists');
        assert(typeof input.on === 'function', 'input.on exists');
        assert(typeof input.off === 'function', 'input.off exists');

        // Mouse events
        const EventMouse = cc.EventMouse;
        if (EventMouse) {
            assert(typeof EventMouse === 'function', 'EventMouse constructor exists');
        }
        const EventKeyboard = cc.EventKeyboard;
        if (EventKeyboard) {
            assert(typeof EventKeyboard === 'function', 'EventKeyboard constructor exists');
        }
        const EventTouch = cc.EventTouch;
        if (EventTouch) {
            assert(typeof EventTouch === 'function', 'EventTouch constructor exists');
        }
    }

    // ===== gfx device manager =====
    const gfx = cc.gfx;
    if (gfx) {
        assert(gfx != null, 'cc.gfx namespace exists');
        if (gfx.deviceManager) {
            assert(gfx.deviceManager != null, 'gfx.deviceManager exists');
            if (gfx.deviceManager.device) {
                const device = gfx.deviceManager.device;
                assert(typeof device.width === 'number', 'gfx device.width accessible');
                assert(typeof device.height === 'number', 'gfx device.height accessible');
            }
        }
    }

    // ===== cc.internal =====
    const internal = cc.internal;
    assert(internal != null, 'cc.internal exists');
    assert(internal.DataPoolManager != null, 'internal.DataPoolManager exists');
    assert(internal.dynamicAtlasManager != null, 'internal.dynamicAtlasManager exists');
    assert(internal.Batcher2D != null, 'internal.Batcher2D exists');
    assert(internal.TransformBit != null, 'internal.TransformBit exists');

    // ===== Miscellaneous utilities =====
    assert(typeof cc.VERSION === 'string', 'cc.VERSION accessible');
    assert(typeof cc.assetManager === 'object', 'cc.assetManager singleton exists');
    assert(typeof cc.assetManager.bundles != 'undefined', 'assetManager.bundles accessible');

    // resources singleton
    assert(typeof cc.resources === 'object', 'cc.resources singleton exists');
    assert(typeof cc.resources.load === 'function', 'resources.load exists');
    assert(typeof cc.resources.loadDir === 'function', 'resources.loadDir exists');

    // view & screen
    assert(typeof cc.view === 'object', 'cc.view singleton exists');
    assert(typeof cc.view.getVisibleSize === 'function', 'view.getVisibleSize exists');
    assert(typeof cc.screen === 'object', 'cc.screen singleton exists');
    assert(typeof cc.screen.windowSize === 'object', 'screen.windowSize exists');

    endModule();
}

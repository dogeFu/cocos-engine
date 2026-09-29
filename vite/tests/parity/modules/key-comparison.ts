/**
 * Key-Subset Comparison Test
 *
 * Validates that the Vite build has ALL the API keys that the
 * legacy IIFE build has. This ensures no API surface regression.
 *
 * For the default Vite web build, the key set is larger than the
 * legacy minimal build because Vite exposes all named ES module
 * exports directly on `cc`. This test verifies the subset.
 */

import { startModule, endModule, assert, type FeatureManifest } from '../test-utils';

/**
 * Baseline keyset captured from `bin/test-iife/cc.js` (legacy minimal build).
 * These are the keys that exist on `window.cc` in the legacy build.
 * The Vite build must have ALL of these.
 */
const LEGACY_BASELINE_KEYS = new Set([
    // Core objects
    'cclegacy', 'game', 'director', 'sys', 'screen', 'view', 'input', 'assetManager', 'resources',
    'math', 'gfx', 'js', 'settings', 'macro', 'path', 'url', 'bits', 'memop', 'misc', 'geometry',
    'selector', 'easing', 'pipeline', 'preTransforms', 'native', 'utils', 'loader',

    // Math value types
    'Vec2', 'Vec3', 'Vec4', 'Mat3', 'Mat4', 'Quat', 'Color', 'Size', 'Rect',

    // Math utility functions
    'clamp01', 'clamp', 'lerp', 'toRadian', 'toDegree', 'random', 'nextPow2', 'repeat', 'pingPong',
    'EPSILON', 'equals', 'approx', 'absMax', 'absMaxComponent', 'inverseLerp',
    'randomRange', 'randomRangeInt', 'pseudoRandom', 'pseudoRandomRange', 'setRandGenerator',
    'binarySearch', 'binarySearchBy', 'binarySearchEpsilon', 'bezier', 'bezierByTime',

    // Shorthand constructors
    'v2', 'v3', 'v4', 'quat', 'mat4', 'color', 'size', 'rect',

    // Scene graph
    'Node', 'Scene', 'Component', 'Director', 'Game',

    // Value types
    'ValueType', 'CCObject',

    // Assets
    'Asset', 'Texture2D', 'TextureCube', 'SpriteFrame', 'RenderTexture',
    'JsonAsset', 'TextAsset', 'BufferAsset', 'ImageAsset', 'SceneAsset',
    'Material', 'EffectAsset', 'Prefab',

    // Events
    'Event', 'EventTarget', 'EventTouch', 'EventMouse', 'EventKeyboard', 'EventGamepad',
    'EventAcceleration', 'KeyCode', 'Touch', 'SystemEvent', 'SystemEventType',
    'Eventify', 'CallbacksInvoker',

    // Debug
    'error', 'warn', 'log', 'errorID', 'warnID', 'debug', 'debugID',
    'setDefaultLogTimes', '_resetDebugSetting',

    // Rendering
    'RenderPipeline', 'RenderFlow', 'RenderStage',

    // Utilities
    'instantiate', 'deserialize', 'Scheduler', 'NodePool',
    'isValid', 'isCCObject', 'isCCClassOrFastDefined',
    'editorExtrasTag', 'EditorExtendable',

    // internal
    'internal',

    // Version
    'VERSION',

    // Widget
    'Widget',

    // Layers
    'Layers',

    // GCObject
    'garbageCollectionManager', 'GCObject',

    // Decorators
    '_decorator', '__checkObsolete__', '__checkObsoleteInNamespace__',

    // Deprecated
    'deprecateModuleExportedName',

    // Built-in res
    'builtinResMgr',

    // Hash
    'murmurhash2_32_gc',

    // Serialization
    'serializeTag', 'deserializeTag',

    // Data
    'find',

    // Root
    'Root',

    // Misc
    'WorldNode3DToLocalNodeUI', 'WorldNode3DToWorldNodeUI',
    'visibleRect',

    // Engine-specific types
    'SkyboxInfo', 'SkinInfo', 'Size', 'System',
    'TWO_PI', 'HALF_PI',
    'TypeScript', 'BatchingUtility',

    // UI
    'Widget',

    // Enums
    'DebugMode', 'Enum', 'BitMask', 'SettingsCategory',

    // System info
    'NodeActivator',

    // Prefab
    'PrefabLink',

    // Texture

    // Scene
    'SceneGlobals', 'Scene',

    // Misc

    // Float/Half
    'floatToHalf', 'halfToFloat',

    // Node
    'NodeEventType', 'NodeSpace',

    // Phases
    'getPhaseID',

    // Curves
    'RatioSampler', 'RealCurve',

    // Loader

    // Animation
    'animation',

    // Sorting
    'SortingLayers',

    // CCObject
    'CCObjectFlags',
]);

export function runKeyComparisonTest(cc: any, features?: FeatureManifest) {
    startModule('Key Subset Comparison');

    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded');
    if (!cc || Object.keys(cc).length < 10) { endModule(); return; }

    const allKeys = new Set(Object.keys(cc));
    const missing: string[] = [];

    // Legacy baseline keys that should also resolve via cc.math.X or direct cc.X
    for (const key of LEGACY_BASELINE_KEYS) {
        // Check both direct and via math
        let exists = allKeys.has(key);
        if (!exists) {
            // Check math namespace
            if (cc.math && key in cc.math) exists = true;
        }
        if (!exists) {
            missing.push(key);
        }
    }

    assert(missing.length === 0,
        `Vite build has ALL legacy baseline keys`,
        missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined
    );

    endModule();
}

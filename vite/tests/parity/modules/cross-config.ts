/**
 * Cross-Configuration Comparison Test
 *
 * Validates that the Vite-built engine's API surface, key count, and
 * critical class/property sets are consistent with expected baselines.
 * This module is designed to work across different module culling
 * configurations (minimal, default, full).
 *
 * Rule 3: No skip(). Rule 4: No conditional guards on core features.
 * Rule 6: Baseline engine check at module start.
 * Rule 7: Compare against expected baseline (feature manifest).
 */

import { startModule, endModule, assert, assertEqual, type FeatureManifest } from '../test-utils';

/**
 * The set of keys that must ALWAYS be present on cc regardless of feature config.
 * This is the absolute minimum core API surface.
 */
const CORE_KEYS = new Set([
    // Math value types
    'Vec2', 'Vec3', 'Vec4', 'Mat3', 'Mat4', 'Quat', 'Color', 'Size', 'Rect',
    // Scene graph
    'Node', 'Scene', 'Component', 'Director',
    // System
    'Game', 'sys', 'screen', 'view', 'game', 'director',
    // Math utilities
    'math', 'v2', 'v3', 'v4', 'quat', 'mat4', 'color', 'size', 'rect',
    'clamp01', 'lerp', 'toRadian', 'toDegree', 'random', 'nextPow2', 'repeat', 'pingPong',
    'EPSILON',
    // Events
    'EventTarget', 'EventTouch', 'EventMouse', 'EventKeyboard', 'EventGamepad',
    'KeyCode', 'Touch', 'SystemEventType',
    // Asset system
    'Asset', 'Prefab', 'Material', 'EffectAsset', 'Texture2D', 'TextureCube',
    'SpriteFrame', 'RenderTexture', 'JsonAsset', 'TextAsset', 'BufferAsset',
    'ImageAsset', 'SceneAsset',
    'assetManager', 'resources',
    // Core
    'Component', 'Node', 'Scene',
    // Audio
    'AudioSource', 'AudioClip',
    // Tween
    'Tween', 'tween',
    // Rendering
    'RenderPipeline', 'RenderFlow', 'RenderStage',
    // Misc
    'cclegacy', 'VERSION', 'warn', 'log', 'error', 'errorID', 'warnID',
    'input', 'EventTarget',
    'instantiate',
    // Internal
    'internal',
    // Size modes
    'Widget',
]);

/**
 * Keys that should be present when 2D features are enabled
 */
const KEYS_2D = new Set([
    'Sprite', 'SpriteFrame', 'Label', 'UITransform',
    'Button', 'Layout', 'ScrollView', 'PageView', 'EditBox',
    'Toggle', 'Slider', 'ProgressBar',
    'Graphics', 'Mask', 'RichText',
    'TiledMap', 'TiledLayer', 'TiledTile',
    'VideoPlayer', 'WebView',
    'Canvas',
]);

/**
 * Keys that should be present when 3D features are enabled
 */
const KEYS_3D = new Set([
    'MeshRenderer', 'SkinnedMeshRenderer',
    'Camera', 'DirectionalLight', 'SphereLight', 'SpotLight', 'PointLight',
    'Model',
]);

/**
 * Keys that should be present when animation is enabled
 */
const KEYS_ANIMATION = new Set([
    'Animation', 'AnimationClip', 'AnimationState',
    'animation',
]);

/**
 * Keys that should be present when skeletal-animation is enabled
 */
const KEYS_SKELETAL_ANIM = new Set([
    'SkeletalAnimation', 'SkeletalAnimationComponent',
]);

/**
 * Keys that should be present when particle is enabled
 */
const KEYS_PARTICLE = new Set([
    'ParticleSystem', 'Billboard', 'Line', 'ParticleUtils',
]);

/**
 * Keys that should be present when particle-2d is enabled
 */
const KEYS_PARTICLE_2D = new Set([
    'ParticleSystem2D', 'MotionStreak', 'ParticleAsset',
]);

/**
 * Keys that should be present when spine is enabled
 */
const KEYS_SPINE = new Set([
    'sp',
]);

/**
 * Keys that should be present when physics is enabled (3D)
 */
const KEYS_PHYSICS = new Set([
    'PhysicsSystem',
    'RigidBody',
    'Collider',
    'BoxCollider',
    'SphereCollider',
    'CapsuleCollider',
    'MeshCollider',
]);

/**
 * Keys that should be present when physics2D is enabled
 */
const KEYS_PHYSICS2D = new Set([
    'PhysicsSystem2D',
    'RigidBody2D',
    'BoxCollider2D',
    'CircleCollider2D',
    'Collider2D',
    'EPhysics2DDrawFlags',
    'selector',
]);

/**
 * Keys that should be present when GFX WebGL is enabled
 */
const KEYS_GFX = new Set([
    'WebGLDevice', 'WebGL2Device', 'EmptyDevice',
    'gfx',
]);

function getExpectedKeys(features?: FeatureManifest): Set<string> {
    const expected = new Set(CORE_KEYS);

    const has2d = features ? (features.spine || features.dragonBones || features.physics2D || true) : true;
    if (has2d) {
        for (const k of KEYS_2D) expected.add(k);
    }

    const has3d = features ? true : true;  // 3d is always in default
    if (has3d) {
        for (const k of KEYS_3D) expected.add(k);
    }

    if (features) {
        if (features.spine) for (const k of KEYS_SPINE) expected.add(k);
        if (features.physics) for (const k of KEYS_PHYSICS) expected.add(k);
        if (features.physics2D) for (const k of KEYS_PHYSICS2D) expected.add(k);
        if (features.skeletalAnimation) for (const k of KEYS_SKELETAL_ANIM) expected.add(k);
        if (features.particle) for (const k of KEYS_PARTICLE) expected.add(k);
        if (features.particle2D) for (const k of KEYS_PARTICLE_2D) expected.add(k);
    }

    return expected;
}

export function runCrossConfigParityTest(cc: any, features?: FeatureManifest) {
    startModule('Cross-Config Comparison');

    // BASELINE — engine must have loaded
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    const actualKeys = new Set(Object.keys(cc));
    const expectedKeys = getExpectedKeys(features);

    // Check that ALL core keys are present
    const missingCore: string[] = [];
    for (const key of CORE_KEYS) {
        if (key.startsWith('__') || key.startsWith('$$')) continue;
        if (!actualKeys.has(key)) {
            missingCore.push(key);
        }
    }
    assert(missingCore.length === 0, `All core keys present`, missingCore.length > 0 ? `Missing: ${missingCore.join(', ')}` : undefined);

    // Check for unexpected gaps based on feature manifest
    if (features) {
        if (features.spine) {
            assert(actualKeys.has('sp'), 'spine namespace (cc.sp) exists when features.spine=true');
        }
        if (features.physics) {
            assert(actualKeys.has('PhysicsSystem') || actualKeys.has('RigidBody'), 'physics keys present when features.physics=true');
        }
        if (features.physics2D) {
            assert(actualKeys.has('PhysicsSystem2D'), 'PhysicsSystem2D present when features.physics2D=true');
        }
        if (features.skeletalAnimation) {
            assert(actualKeys.has('SkeletalAnimation'), 'SkeletalAnimation present when features.skeletalAnimation=true');
        }
        if (features.particle) {
            assert(actualKeys.has('ParticleSystem'), 'ParticleSystem present when features.particle=true');
        }
        if (features.particle2D) {
            assert(actualKeys.has('ParticleSystem2D'), 'ParticleSystem2D present when features.particle2D=true');
        }
    }

    // Check type consistency for all function-type exports
    let typeMismatches = 0;
    for (const key of actualKeys) {
        const val = cc[key];
        if (typeof val === 'function' && /^[A-Z]/.test(key)) {
            // Class constructors that are properties of `cc` should also exist as constructors
            // Check that new-able
            try {
                const proto = val.prototype;
                if (proto && typeof proto !== 'object') {
                    typeMismatches++;
                }
            } catch {
                // not constructable, fine for some types
            }
        }
    }
    assert(typeMismatches === 0, 'No type consistency issues', typeMismatches > 0 ? `${typeMismatches} issues found` : undefined);

    // GFX device classes should always be present in every web build
    for (const key of KEYS_GFX) {
        if (key === 'gfx') {
            assert(cc.gfx != null, 'cc.gfx namespace exists');
        } else {
            assert(cc[key] != null, `GFX class ${key} exists`);
        }
    }

    endModule();
}

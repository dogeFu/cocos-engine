/**
 * API Surface Parity Test
 *
 * Verifies that the Vite-built engine exports all expected classes, functions,
 * constants, and enums. This is a static check — no runtime behavior tested.
 *
 * Rule 3: No skip(). Rule 4: No conditional guards on core features.
 * Rule 5: Only test default build features.
 */

import { startModule, endModule, assert, assertEqual } from '../test-utils';

/** Core classes that must always exist on `cc` */
const REQUIRED_CLASSES = [
    // Math
    'Vec2', 'Vec3', 'Vec4', 'Mat3', 'Mat4', 'Quat', 'Color', 'Size', 'Rect',
    // Scene graph
    'Node', 'Scene', 'Component', 'Director',
    // 2D (core)
    'Sprite', 'Label', 'UITransform',
    'Button', 'Layout', 'ScrollView', 'PageView', 'EditBox', 'Toggle', 'Slider', 'ProgressBar',
    // 3D
    'MeshRenderer', 'Camera', 'DirectionalLight', 'SphereLight', 'SpotLight', 'PointLight',
    'SkinnedMeshRenderer',
    // Animation
    'Animation', 'SkeletalAnimation', 'AnimationClip', 'AnimationState',
    // Audio
    'AudioSource', 'AudioClip',
    // Asset
    'Asset', 'Prefab', 'Material', 'EffectAsset', 'Texture2D', 'TextureCube',
    'SpriteFrame', 'RenderTexture', 'JsonAsset', 'TextAsset', 'BufferAsset',
    'ImageAsset', 'SceneAsset',
    // Input
    'EventTarget', 'EventTouch', 'EventMouse', 'EventKeyboard', 'EventGamepad',
    // Tween
    'Tween',
    // Rendering
    'RenderPipeline', 'RenderFlow', 'RenderStage',
    // Misc
    'Game',
];

/** Singleton / module-level objects */
const REQUIRED_SINGLETONS = [
    'game', 'director', 'assetManager', 'resources', 'input', 'tween',
    'view', 'screen', 'sys', 'math', 'cclegacy',
];

/** Key prototype methods on Node */
const NODE_METHODS = [
    'setPosition', 'getPosition', 'setRotation', 'getRotation',
    'setScale', 'getScale', 'setWorldPosition', 'getWorldPosition',
    'addChild', 'removeChild', 'removeFromParent', 'setParent',
    'getComponent', 'getComponents', 'addComponent', 'removeComponent',
    'getComponentsInChildren', 'getComponentInChildren',
    'on', 'off', 'once', 'emit', 'dispatchEvent',
    'walk', 'destroy',
];

/** Key prototype methods on Component */
const COMPONENT_METHODS = [
    'schedule', 'scheduleOnce', 'unschedule', 'unscheduleAllCallbacks',
    'getComponent', 'getComponents',
];

/** Key prototype methods on Vec3 */
const VEC3_METHODS = [
    'add', 'subtract', 'multiply', 'normalize', 'cross', 'dot',
    'length', 'lengthSqr', 'lerp', 'clone', 'set', 'equals',
];

/** Key static methods on Vec3 */
const VEC3_STATIC = [
    'add', 'subtract', 'multiply', 'cross', 'dot', 'normalize',
    'distance', 'squaredDistance', 'lerp', 'transformMat4',
];

/** Key math utilities */
const MATH_UTILITIES = [
    'EPSILON', 'clamp01', 'lerp', 'toRadian', 'toDegree',
    'random', 'nextPow2', 'repeat', 'pingPong',
];

/** Spine module classes (default build includes spine-3.8) */
const SPINE_CLASSES = [
    'Skeleton', 'SkeletonData', 'VertexEffectDelegate',
];

/** Spine core library classes (inside cc.sp.spine namespace, provided by WASM) */
const SPINE_CORE_CLASSES = [
    'Skeleton', 'SkeletonData', 'AnimationState', 'Animation',
    'RegionAttachment', 'MeshAttachment', 'BoundingBoxAttachment', 'VertexAttachment',
    'Bone', 'Slot', 'Skin',
];

export function runAPIParityTest(cc: any) {
    startModule('API Surface');

    // BASELINE — engine must have loaded
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded (cc has >= 10 keys)');
    if (!cc || Object.keys(cc).length < 10) {
        endModule();
        return;
    }

    // --- Core Classes ---
    for (const name of REQUIRED_CLASSES) {
        assert(typeof cc[name] === 'function', `Class ${name} exists`, `type: ${typeof cc[name]}`);
    }

    // --- Singletons ---
    for (const name of REQUIRED_SINGLETONS) {
        assert(cc[name] != null, `Singleton ${name} exists`, `type: ${typeof cc[name]}`);
    }

    // --- Node prototype ---
    assert(cc.Node != null, 'Node class exists');
    for (const m of NODE_METHODS) {
        assert(typeof cc.Node.prototype[m] === 'function', `Node.${m}() exists`);
    }
    const activeDesc = Object.getOwnPropertyDescriptor(cc.Node.prototype, 'active');
    assert(activeDesc != null && (typeof activeDesc.get === 'function' || typeof activeDesc.set === 'function'), 'Node.active getter/setter exists');

    // --- Component prototype ---
    assert(cc.Component != null, 'Component class exists');
    for (const m of COMPONENT_METHODS) {
        assert(typeof cc.Component.prototype[m] === 'function', `Component.${m}() exists`);
    }

    // --- Vec3 prototype and static ---
    assert(cc.Vec3 != null, 'Vec3 class exists');
    for (const m of VEC3_METHODS) {
        assert(typeof cc.Vec3.prototype[m] === 'function', `Vec3.${m}() exists`);
    }
    for (const m of VEC3_STATIC) {
        assert(typeof cc.Vec3[m] === 'function', `Vec3.${m}() static exists`);
    }

    // --- Math utilities ---
    for (const m of MATH_UTILITIES) {
        const val = cc.math?.[m] ?? cc[m];
        assert(val !== undefined, `math.${m} exists`);
    }

    // --- Version ---
    assert(typeof cc.VERSION === 'string' || cc.cclegacy?.VERSION != null, 'VERSION accessible');

    // --- Spine module (requires features.spine = true in user.config.ts) ---
    assert(cc.sp != null, 'spine namespace (cc.sp) exists');
    if (cc.sp) {
        for (const name of SPINE_CLASSES) {
            assert(typeof cc.sp[name] === 'function', `sp.${name} class exists`);
        }
        // Spine core library namespace
        assert(cc.sp.spine != null, 'sp.spine core library exists');
        if (cc.sp.spine) {
            for (const name of SPINE_CORE_CLASSES) {
                assert(cc.sp.spine[name] != null, `sp.spine.${name} exists`);
            }
        }
        // Spine enums
        assert(cc.sp.ATTACHMENT_TYPE != null, 'sp.ATTACHMENT_TYPE enum exists');
        assert(cc.sp.AnimationEventType != null, 'sp.AnimationEventType enum exists');
    }

    // --- Skeletal animation module (requires features.skeletalAnimation = true) ---
    assert(cc.SkeletalAnimationComponent != null, 'SkeletalAnimationComponent (deprecated alias) exists');
    assert(typeof cc.SkeletalAnimationComponent === 'function', 'SkeletalAnimationComponent is a constructor');

    // --- cc.internal namespace (populated by module side-effects) ---
    assert(cc.internal != null, 'cc.internal namespace exists');
    if (cc.internal) {
        assert(cc.internal.DataPoolManager != null, 'internal.DataPoolManager exists');
        assert(cc.internal.dynamicAtlasManager != null, 'internal.dynamicAtlasManager exists');
        assert(cc.internal.Batcher2D != null, 'internal.Batcher2D exists');
        assert(cc.internal.TransformBit != null, 'internal.TransformBit exists');
        assert(cc.internal.physics2d != null, 'internal.physics2d exists');
    }

    endModule();
}

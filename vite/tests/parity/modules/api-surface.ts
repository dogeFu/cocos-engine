import { startModule, endModule, assert, assertEqual, type FeatureManifest } from '../test-utils';

/** Core classes that must always exist on `cc` regardless of feature config */
const CORE_CLASSES = [
    'Vec2', 'Vec3', 'Vec4', 'Mat3', 'Mat4', 'Quat', 'Color', 'Size', 'Rect',
    'Node', 'Scene', 'Component', 'Director', 'Game',
    'EventTarget', 'EventTouch', 'EventMouse', 'EventKeyboard', 'EventGamepad',
    'Asset', 'Prefab', 'Material', 'EffectAsset', 'Texture2D', 'TextureCube',
    'SpriteFrame', 'RenderTexture', 'JsonAsset', 'TextAsset', 'BufferAsset',
    'ImageAsset', 'SceneAsset',
    'RenderPipeline', 'RenderFlow', 'RenderStage',
    'Tween', 'AudioSource', 'AudioClip',
];

/** Core classes gated behind 2d feature */
const CLASSES_2D = [
    'Sprite', 'Label', 'UITransform',
    'Button', 'Layout', 'ScrollView', 'PageView', 'EditBox',
    'Toggle', 'Slider', 'ProgressBar',
];

/** Core classes gated behind 3d feature */
const CLASSES_3D = [
    'MeshRenderer', 'SkinnedMeshRenderer',
    'Camera', 'DirectionalLight', 'SphereLight', 'SpotLight', 'PointLight',
];

/** Core classes gated behind animation feature */
const CLASSES_ANIMATION = [
    'Animation', 'AnimationClip', 'AnimationState',
];

/** Core classes gated behind skeletal-animation feature */
const CLASSES_SKELETAL_ANIM = [
    'SkeletalAnimation',
];

/** Core classes gated behind particle feature */
const CLASSES_PARTICLE = [
    'ParticleSystem', 'Billboard', 'Line', 'ParticleUtils',
];

/** Core classes gated behind particle-2d feature */
const CLASSES_PARTICLE_2D = [
    'ParticleSystem2D', 'MotionStreak', 'ParticleAsset',
];

/** Core classes gated behind 2d extras */
const CLASSES_2D_EXTRAS = [
    'Graphics', 'Mask', 'RichText', 'TiledMap', 'TiledLayer', 'TiledTile',
    'VideoPlayer', 'WebView',
];

/** Expected minimum number of exported keys on cc object (default build with core + 2d + 3d + anim + tween + audio + ui) */
const MIN_EXPORT_COUNT_DEFAULT = 80;

/** Expected minimum number of exported keys for a minimal build */
const MIN_EXPORT_COUNT_MINIMAL = 50;

/** Singletons / module-level objects that should always exist */
const CORE_SINGLETONS = [
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

/** Spine module classes */
const SPINE_CLASSES = [
    'Skeleton', 'SkeletonData', 'VertexEffectDelegate',
];

/** Spine core library classes (in cc.sp.spine namespace) */
const SPINE_CORE_CLASSES = [
    'Skeleton', 'SkeletonData', 'AnimationState', 'Animation',
    'RegionAttachment', 'MeshAttachment', 'BoundingBoxAttachment', 'VertexAttachment',
    'Bone', 'Slot', 'Skin',
];

export function runAPIParityTest(cc: any, features?: FeatureManifest) {
    startModule('API Surface');

    const keyCount = Object.keys(cc).length;
    const minExpected = features ? MIN_EXPORT_COUNT_MINIMAL : MIN_EXPORT_COUNT_DEFAULT;
    assert(cc != null && keyCount >= minExpected, `engine loaded (cc has ${keyCount} keys, expected >= ${minExpected})`);
    if (!cc || keyCount < minExpected) {
        endModule();
        return;
    }

    // --- Core Classes (always expected) ---
    for (const name of CORE_CLASSES) {
        assert(typeof cc[name] === 'function', `Class ${name} exists`, `type: ${typeof cc[name]}`);
    }

    // --- Feature-gated Classes ---
    const has2d = cc.Sprite != null;
    const has3d = cc.MeshRenderer != null;
    const hasAnim = cc.Animation != null;
    const hasSkeletalAnim = cc.SkeletalAnimation != null;
    const hasParticle = cc.ParticleSystem != null;
    const hasParticle2D = cc.ParticleSystem2D != null;

    if (has2d) {
        for (const name of CLASSES_2D) {
            assert(typeof cc[name] === 'function', `2D class ${name} exists`);
        }
        for (const name of CLASSES_2D_EXTRAS) {
            if (cc[name] != null) {
                assert(typeof cc[name] === 'function', `2D extra class ${name} exists`);
            }
        }
    }

    if (has3d) {
        for (const name of CLASSES_3D) {
            assert(typeof cc[name] === 'function', `3D class ${name} exists`);
        }
    }

    if (hasAnim) {
        for (const name of CLASSES_ANIMATION) {
            assert(typeof cc[name] === 'function', `Animation class ${name} exists`);
        }
    }

    if (hasSkeletalAnim) {
        for (const name of CLASSES_SKELETAL_ANIM) {
            assert(typeof cc[name] === 'function', `SkeletalAnimation class ${name} exists`);
        }
    }

    if (hasParticle) {
        for (const name of CLASSES_PARTICLE) {
            assert(typeof cc[name] === 'function', `Particle class ${name} exists`);
        }
    }

    if (hasParticle2D) {
        for (const name of CLASSES_PARTICLE_2D) {
            assert(typeof cc[name] === 'function', `Particle2D class ${name} exists`);
        }
    }

    // --- Singletons ---
    for (const name of CORE_SINGLETONS) {
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

    // --- Spine module ---
    const hasSpine = features?.spine ?? (cc.sp != null && cc.sp.spine != null);
    if (hasSpine && cc.sp) {
        assert(cc.sp != null, 'spine namespace (cc.sp) exists');
        for (const name of SPINE_CLASSES) {
            assert(typeof cc.sp[name] === 'function', `sp.${name} class exists`);
        }
        if (cc.sp.spine) {
            assert(cc.sp.spine != null, 'sp.spine core library exists');
            for (const name of SPINE_CORE_CLASSES) {
                assert(cc.sp.spine[name] != null, `sp.spine.${name} exists`);
            }
        }
        assert(cc.sp.ATTACHMENT_TYPE != null, 'sp.ATTACHMENT_TYPE enum exists');
        assert(cc.sp.AnimationEventType != null, 'sp.AnimationEventType enum exists');
    }

    // --- SkeletalAnimationComponent (deprecated alias) ---
    if (cc.SkeletalAnimationComponent) {
        assert(typeof cc.SkeletalAnimationComponent === 'function', 'SkeletalAnimationComponent is a constructor');
    }

    // --- cc.internal namespace ---
    assert(cc.internal != null, 'cc.internal namespace exists');
    if (cc.internal) {
        assert(cc.internal.DataPoolManager != null, 'internal.DataPoolManager exists');
        assert(cc.internal.dynamicAtlasManager != null, 'internal.dynamicAtlasManager exists');
        assert(cc.internal.Batcher2D != null, 'internal.Batcher2D exists');
        assert(cc.internal.TransformBit != null, 'internal.TransformBit exists');
        if (cc.internal.physics2d) {
            assert(cc.internal.physics2d != null, 'internal.physics2d exists');
        }
    }

    endModule();
}

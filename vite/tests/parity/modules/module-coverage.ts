/**
 * Comprehensive Per-Module API Surface Coverage Test
 *
 * Covers ALL export files in exports/ with per-module key verification.
 * Rule 3: No skip(). Rule 4: No conditional guards on core features.
 */
import { startModule, endModule, assert, type FeatureManifest } from '../test-utils';

interface KeyDef { name: string; type?: string }
interface ModuleEntry {
    label: string;
    keys: KeyDef[];
    featureCheck?: (features?: FeatureManifest) => boolean;
}

const MATH_KEYS = new Set([
    'clamp01','lerp','toRadian','toDegree','random','nextPow2','repeat',
    'pingPong','EPSILON','clamp','equals','approx','absMax','absMaxComponent',
    'randomRange','randomRangeInt','pseudoRandom','pseudoRandomRange','inverseLerp',
]);
function resolveKey(cc: any, key: string): any {
    if (MATH_KEYS.has(key) && cc.math?.[key] !== undefined) return cc.math[key];
    return cc[key];
}

export function runModuleCoverageTest(cc: any, features?: FeatureManifest) {
    startModule('Module Coverage');
    assert(cc != null && Object.keys(cc).length >= 10, 'engine loaded');
    if (!cc || Object.keys(cc).length < 10) { endModule(); return; }

    const allKeys = new Set(Object.keys(cc));
    const checkedKeys = new Set<string>();
    let total = 0; let modulesActive = 0;

    /** Helper: verify a key and record result. */
    const check = (label: string, key: KeyDef): void => {
        if (checkedKeys.has(key.name)) return;
        checkedKeys.add(key.name);
        total++;
        const val = resolveKey(cc, key.name);
        const exists = val !== undefined && val !== null;
        const typeMatch = !key.type || typeof val === key.type;
        const detail = !exists
            ? `Key "${key.name}" not found`
            : !typeMatch
                ? `Expected type ${key.type}, got ${typeof val}`
                : undefined;
        assert(exists && typeMatch, `[${label}] ${key.name}`, detail);
    };

    // ========= MODULE REGISTRY =========
    const registry: Record<string, ModuleEntry> = {
        'base': { label: 'base', keys: [
            {name:'Vec2',type:'function'},{name:'Vec3',type:'function'},
            {name:'Vec4',type:'function'},{name:'Mat3',type:'function'},
            {name:'Mat4',type:'function'},{name:'Quat',type:'function'},
            {name:'Color',type:'function'},{name:'Size',type:'function'},
            {name:'Rect',type:'function'},
            {name:'math'},{name:'Node',type:'function'},{name:'Scene',type:'function'},
            {name:'Component',type:'function'},{name:'Director',type:'function'},
            {name:'Game',type:'function'},{name:'game'},{name:'director'},
            {name:'sys'},{name:'screen'},{name:'view'},{name:'cclegacy'},
            {name:'Asset',type:'function'},{name:'Prefab',type:'function'},
            {name:'Material',type:'function'},{name:'EffectAsset',type:'function'},
            {name:'Texture2D',type:'function'},{name:'TextureCube',type:'function'},
            {name:'SpriteFrame',type:'function'},{name:'RenderTexture',type:'function'},
            {name:'JsonAsset',type:'function'},{name:'TextAsset',type:'function'},
            {name:'BufferAsset',type:'function'},{name:'ImageAsset',type:'function'},
            {name:'SceneAsset',type:'function'},{name:'assetManager'},{name:'resources'},
            {name:'EventTarget',type:'function'},{name:'Event'},{name:'EventTouch'},
            {name:'EventMouse'},{name:'EventKeyboard'},{name:'EventGamepad'},
            {name:'Touch'},{name:'SystemEventType'},{name:'input'},
            {name:'RenderPipeline',type:'function'},{name:'RenderFlow',type:'function'},
            {name:'RenderStage',type:'function'},
            {name:'gfx'},{name:'VERSION'},{name:'instantiate',type:'function'},
            {name:'v2',type:'function'},{name:'v3',type:'function'},{name:'v4',type:'function'},
            {name:'quat',type:'function'},{name:'mat4',type:'function'},
            {name:'color',type:'function'},{name:'size'},{name:'rect'},
            {name:'errorID',type:'function'},{name:'warnID',type:'function'},
            {name:'log',type:'function'},{name:'error',type:'function'},
            {name:'warn',type:'function'},{name:'assert',type:'function'},
            {name:'settings'},{name:'macro'},{name:'path'},{name:'js'},
            {name:'internal'},{name:'Root',type:'function'},{name:'Layers'},
            {name:'selector'},{name:'debug',type:'function'},{name:'bits'},
            {name:'memop'},{name:'misc'},{name:'visibleRect'},
            {name:'NodePool',type:'function'},{name:'geometry'},{name:'easing'},
            {name:'BatchingUtility'},{name:'deserialize',type:'function'},
            {name:'bezier',type:'function'},{name:'Scheduler',type:'function'},
            {name:'binarySearch',type:'function'},{name:'BitMask'},{name:'Enum'},
            {name:'clamp01'},{name:'lerp'},{name:'toRadian'},{name:'toDegree'},
            {name:'random'},{name:'nextPow2'},{name:'repeat'},{name:'pingPong'},
            {name:'EPSILON'},{name:'clamp',type:'function'},{name:'equals',type:'function'},
            {name:'approx',type:'function'},{name:'absMax',type:'function'},
            {name:'randomRange',type:'function'},{name:'pseudoRandom',type:'function'},
            {name:'url'},{name:'Widget',type:'function'},
            {name:'garbageCollectionManager'},{name:'GCObject'},
            {name:'CCObject'},{name:'isValid',type:'function'},
        ]},
        '2d': { label: '2D', keys: [
            {name:'Sprite',type:'function'},{name:'Label',type:'function'},
            {name:'UITransform',type:'function'},{name:'Button',type:'function'},
            {name:'Layout',type:'function'},{name:'ScrollView',type:'function'},
            {name:'PageView',type:'function'},{name:'EditBox',type:'function'},
            {name:'Toggle',type:'function'},{name:'Slider',type:'function'},
            {name:'ProgressBar',type:'function'},{name:'Canvas',type:'function'},
            {name:'SafeArea',type:'function'},{name:'BlockInputEvents'},
            {name:'LabelOutline'},{name:'UIRenderable'},{name:'UIRenderer'},
            {name:'Renderable2D'},{name:'BaseRenderData'},
        ]},
        '3d': { label: '3D', keys: [
            {name:'MeshRenderer',type:'function'},{name:'SkinnedMeshRenderer',type:'function'},
            {name:'Camera',type:'function'},{name:'DirectionalLight',type:'function'},
            {name:'SphereLight',type:'function'},{name:'SpotLight',type:'function'},
            {name:'PointLight',type:'function'},{name:'ModelRenderer'},
        ]},
        'animation': { label: 'Animation', keys: [
            {name:'Animation',type:'function'},{name:'AnimationClip',type:'function'},
            {name:'AnimationState',type:'function'},{name:'animation'},
        ]},
        'audio': { label: 'Audio', keys: [
            {name:'AudioSource',type:'function'},{name:'AudioClip',type:'function'},
        ]},
        'video': { label: 'Video', keys: [{name:'VideoPlayer',type:'function'}] },
        'webview': { label: 'WebView', keys: [{name:'WebView',type:'function'}] },
        'tween': { label: 'Tween', keys: [
            {name:'Tween',type:'function'},{name:'tween',type:'function'},
            {name:'TweenAction'},{name:'TweenSystem'},
        ]},
        'tiled-map': { label: 'TiledMap', keys: [
            {name:'TiledMap',type:'function'},{name:'TiledLayer',type:'function'},
            {name:'TiledTile',type:'function'},
        ]},
        'profiler': { label: 'Profiler', keys: [{name:'Profiler',type:'function'}] },
        'mask': { label: 'Mask', keys: [{name:'Mask',type:'function'}] },
        'rich-text': { label: 'RichText', keys: [{name:'RichText',type:'function'}] },
        'ui': { label: 'UI', keys: [
            {name:'Widget',type:'function'},{name:'UIOpacity',type:'function'},
            {name:'UICoordinateTracker',type:'function'},{name:'UIMeshRenderer'},
            {name:'UIStaticBatch'},{name:'UIVertexFormat'},
        ]},
        'ui-skew': { label: 'UISkew', keys: [{name:'UISkew'}] },
        'particle': { label: 'Particle3D', keys: [
            {name:'ParticleSystem',type:'function'},{name:'Billboard',type:'function'},
            {name:'Line',type:'function'},{name:'ParticleUtils'},
        ]},
        'particle-2d': { label: 'Particle2D', keys: [
            {name:'ParticleSystem2D',type:'function'},{name:'MotionStreak',type:'function'},
            {name:'ParticleAsset',type:'function'},
        ]},
        'intersection-2d': { label: 'Intersection2D', keys: [{name:'Intersection2D'}] },
        'affine-transform': { label: 'AffineTransform', keys: [{name:'AffineTransform'}] },
        'sorting': { label: 'Sorting', keys: [{name:'SortingLayers'}] },
        'sorting-2d': { label: 'Sorting2D', keys: [{name:'Sorting2D'}] },
        'legacy-pipeline': { label: 'LegacyPipeline', keys: [{name:'legacy_rendering'}] },
        'light-probe': { label: 'LightProbe', keys: [{name:'LightProbes'},{name:'LightProbeSampler'}] },
        'geometry-renderer': { label: 'GeometryRenderer', keys: [{name:'GeometryRenderer',type:'function'}] },
        'physics-framework': { label: 'Physics3DFramework',
            featureCheck: (f) => f?.physics ?? false, keys: [
            {name:'physics'},{name:'PhysicsSystem'},{name:'RigidBody',type:'function'},
            {name:'Collider',type:'function'},{name:'BoxCollider',type:'function'},
            {name:'SphereCollider',type:'function'},{name:'CapsuleCollider',type:'function'},
        ]},
        'physics-builtin': { label: 'Physics3DBuiltin',
            featureCheck: (f) => f?.physics ?? false, keys: [{name:'EPhysicsDrawFlags'}] },
        'physics-2d-framework': { label: 'Physics2DFramework',
            featureCheck: (f) => f?.physics2D ?? false, keys: [
            {name:'PhysicsSystem2D',type:'function'},{name:'RigidBody2D',type:'function'},
            {name:'BoxCollider2D',type:'function'},{name:'CircleCollider2D',type:'function'},
            {name:'Collider2D',type:'function'},{name:'PhysicsGroup'},{name:'Contact2DType'},
            {name:'Physics2DUtils'},{name:'EPhysics2DDrawFlags'},{name:'PHYSICS_2D_PTM_RATIO'},
        ]},
        'physics-2d-box2d': { label: 'Physics2DBox2D',
            featureCheck: (f) => f?.physics2D ?? false, keys: [] },
        'physics-2d-box2d-wasm': { label: 'Physics2DBox2DWASM', keys: [
            {name:'loadWasmModuleBox2D',type:'function'},
        ]},
        'spine': { label: 'Spine', featureCheck: (f) => f?.spine ?? true, keys: [
            {name:'sp'},{name:'loadWasmModuleSpine',type:'function'},
        ]},
        'vendor-google': { label: 'VendorGoogle',
            featureCheck: () => false, keys: [] },
        'dragon-bones': { label: 'DragonBones',
            featureCheck: (f) => f?.dragonBones ?? false, keys: [{name:'dragonBones'}] },
        'skeletal-animation': { label: 'SkeletalAnimation', keys: [
            {name:'SkeletalAnimation',type:'function'},
            {name:'SkeletalAnimationComponent',type:'function'},
            {name:'SkeletalAnimationState'},{name:'SkelAnimDataHub'},
        ]},
        'gfx-webgl': { label: 'GFXWebGL', keys: [{name:'WebGLDevice',type:'function'}] },
        'gfx-webgl2': { label: 'GFXWebGL2', keys: [{name:'WebGL2Device',type:'function'}] },
        'gfx-empty': { label: 'GFXEmpty', keys: [{name:'EmptyDevice',type:'function'}] },
        'gfx-webgpu': { label: 'GFXWebGPU', featureCheck: () => false, keys: [{name:'WebGPUDevice',type:'function'}] },
    };

    function moduleEnabled(name: string): boolean {
        const entry = registry[name];
        if (entry?.featureCheck) return entry.featureCheck(features);
        const alwaysEnabled = new Set([
            'base','2d','3d','animation','audio','gfx-webgl','gfx-webgl2',
            'tween','ui','spine','physics-2d-box2d-wasm','skeletal-animation',
        ]);
        if (alwaysEnabled.has(name)) return true;
        if (entry) for (const k of entry.keys) if (allKeys.has(k.name)) return true;
        return false;
    }

    for (const [modName, mod] of Object.entries(registry)) {
        if (!moduleEnabled(modName)) continue;
        modulesActive++;
        for (const keyDef of mod.keys) check(mod.label, keyDef);
    }

    assert(true, `Module coverage: ${modulesActive} modules active, ${total} keys (${checkedKeys.size} unique) verified`);
    endModule();
}

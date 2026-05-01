# Cocos Creator Engine — AI RAG Reference Index

> Comprehensive module reference for AI-assisted engine scripting. Each document covers key classes, APIs, internal mechanisms, hidden knowledge, and file path indexes.

---

## Module Map

| Document | Modules Covered | Lines | Description |
|---|---|---|---|
| [core-infra.md](core-infra.md) | `core`, `game`, `gfx`, `scene-graph`, `render-scene` | 776 | Game lifecycle, Director tick loop, Node/Component system, GFX abstraction, scene rendering |
| [rendering.md](rendering.md) | `rendering`, `webgpu`, `gi`, `sorting` | 824 | Render pipelines (forward/deferred), shadow system, pipeline UBOs, light probes, sorting |
| [2d-ui.md](2d-ui.md) | `2d`, `ui`, `tiledmap`, `particle-2d` | 1107 | Sprite/Label/Mask, UI layout/scroll/button, batching2D, dynamic atlas, TiledMap |
| [3d-physics.md](3d-physics.md) | `3d`, `physics`, `physics-2d`, `primitive`, `particle` | 730 | Mesh/Model, lights, cameras, rigid body, colliders, raycasting, particle system |
| [animation-audio.md](animation-audio.md) | `animation`, `audio`, `tween` | 729 | Animation clips/states/tracks, skeletal animation, audio source, tween API |
| [asset-input.md](asset-input.md) | `asset`, `input`, `serialization` | 729 | Asset loading/releasing, bundles, SpriteFrame, Material, touch/mouse/keyboard events, CCON format |
| [extras.md](extras.md) | `spine`, `dragon-bones`, `video`, `web-view`, `profiler`, `misc` | 619 | Spine/DragonBones runtime, video/WebView, profiler, native bindings, MissingScript |
| [vite-build.md](vite-build.md) | `vite`, `rollup`, `build`, `plugins` | ~250 | Vite/Rollup 构建架构、插件体系、IIFE 输出格式、与 SystemJS 行为差异 |

**Total: ~5764 lines across 8 documents covering all 31 `cocos/` sub-modules + Vite 构建系统.**

---

## Quick Reference: Common Scripting Patterns

### Game Lifecycle

```
Game.init() → EVENT_GAME_INITED → EVENT_PROJECT_INITED → Game.run()
  → Director.mainLoop (per frame):
    → EVENT_BEGIN_FRAME
    → ComponentScheduler.updateAll (update → lateUpdate)
    → Director.emit(EVENT_AFTER_UPDATE)
    → Director.emit(EVENT_BEFORE_COMMIT)
    → RenderScene.render()
    → Director.emit(EVENT_AFTER_DRAW)
    → EVENT_END_FRAME
```

- **File:** `cocos/game/game.ts` (Game), `cocos/core/director.ts` (Director)

### Component Lifecycle

```
preload() → onLoad() → onEnable() → start() → update() → lateUpdate() → onDisable() → onDestroy()
```

- `start()` runs only once, on the first active frame after `onLoad()`
- `update(dt)` / `lateUpdate(dt)` receive delta time in seconds
- **File:** `cocos/scene-graph/component.ts`

### Node Hierarchy

- `node.parent = otherNode` — reparents the node
- `node.addChild(child)` / `node.removeChild(child)`
- `node.getComponent(ClassName)` — returns first matching component
- `node.getComponentsInChildren(ClassName)` — recursive search
- `node.active = false` — disables all components (triggers `onDisable`)
- **File:** `cocos/scene-graph/node.ts`

### Asset Loading

```ts
// From resources bundle
resources.load('textures/bg', SpriteFrame, (err, asset) => { ... });

// From custom bundle
assetManager.loadBundle('myBundle', (err, bundle) => {
    bundle.load('hero', SpriteFrame, (err, sf) => { ... });
});

// Remote URL
assetManager.loadRemote('https://example.com/img.png', (err, asset) => { ... });
```

- **File:** `cocos/asset/asset-manager/asset-manager.ts`

### Input Events

```ts
// Global input
input.on(InputEventType.TOUCH_START, (event: EventTouch) => {
    const touch = event.touch!;
    const pos = touch.getLocation(); // OpenGL coords
    const uiPos = touch.getUILocation(); // UI coords
}, this);

// Node-level input
node.on(Node.EventType.TOUCH_START, (event: EventTouch) => { ... }, this);

// Keyboard
input.on(InputEventType.KEY_DOWN, (event: EventKeyboard) => {
    if (event.keyCode === KeyCode.SPACE) { ... }
}, this);
```

- **File:** `cocos/input/input.ts`, `cocos/input/types/event-enum.ts`

### Tween

```ts
tween(node)
    .to(1.0, { position: new Vec3(100, 0, 0) }, { easing: 'bounceOut' })
    .delay(0.5)
    .call(() => console.log('done'))
    .start();
```

- `start()` must be called
- `to()` is absolute, `by()` is relative
- **File:** `cocos/tween/tween.ts`

### Material Properties

```ts
const mat = renderer.material; // or meshRenderer.material
mat.setProperty('mainColor', new Color(255, 0, 0, 255));
mat.setProperty('albedo', texture);
mat.recompileShaders({ USE_INSTANCING: true }); // only on instanced copies
```

- **File:** `cocos/asset/assets/material.ts`

### Physics Raycasting

```ts
const ray = new Ray(origin, direction);
const results: RaycastResult[] = [];
physicsWorld.raycast(results, ray, PhysicsSystem.PhysicsGroup.DEFAULT, maxDistance);
```

- **File:** `cocos/physics/framework/physics-system.ts`

---

## Key Singletons

| Singleton | Access | File |
|---|---|---|
| `game` | `import { game } from 'cc'` | `cocos/game/game.ts` |
| `director` | `import { director } from 'cc'` | `cocos/core/director.ts` |
| `assetManager` | `import { assetManager } from 'cc'` | `cocos/asset/asset-manager/asset-manager.ts` |
| `resources` | `import { resources } from 'cc'` | `cocos/asset/asset-manager/bundle.ts` |
| `input` | `import { input } from 'cc'` | `cocos/input/input.ts` |
| `PhysicsSystem` | `PhysicsSystem.instance` | `cocos/physics/framework/physics-system.ts` |
| `PhysicsSystem2D` | `PhysicsSystem2D.instance` | `cocos/physics-2d/framework/physics-system.ts` |
| `tween` (module) | `import { tween } from 'cc'` | `cocos/tween/tween.ts` |
| `view` | `import { view } from 'cc'` | `cocos/core/platform/view.ts` |
| `screen` | `import { screen } from 'cc'` | `cocos/core/platform/screen.ts` |
| `sys` | `import { sys } from 'cc'` | `cocos/core/platform/sys.ts` |
| `cclegacy` | `import { cclegacy } from 'cc'` | `cocos/core/global-exports.ts` |

---

## Common Gotchas (Cross-Module)

1. **Assets are never cloned on instantiate** — `instantiate()` references assets, not clones them. (`asset-input.md` §3.3)
2. **`node.active = false` triggers `onDisable`** — Components are deactivated recursively. (`core-infra.md` §2.2)
3. **Touch events are dispatched one-at-a-time** — Between each changed touch, propagation is reset. (`asset-input.md` §2.8)
4. **Material.initialize() only works once** — Re-initializing logs a warning and is rejected. (`asset-input.md` §1.6)
5. **Phase mismatch = invisible** — Render objects must match the pipeline's phase bitmask or they are silently culled. (`rendering.md` §1)
6. **`to()` is absolute, `by()` is relative** — Common tween confusion. (`animation-audio.md` §3.1)
7. **SpriteFrame texture null is rejected** — Setting `spriteFrame.texture = null` warns and is ignored. (`asset-input.md` §1.5)
8. **`getTouches()` vs `getAllTouches()`** — Different sets for multi-touch events. (`asset-input.md` §2.3)
9. **WebGL mipmaps need power-of-two** — Non-POT textures won't auto-generate mipmaps. (`asset-input.md` §1.4)
10. **Prefab JIT threshold = 3** — First 3 instantiations use standard clone, then switches to JIT codegen. (`asset-input.md` §3.4)

---

*Generated from cocos-engine source. All file paths and line numbers reference the current checkout.*

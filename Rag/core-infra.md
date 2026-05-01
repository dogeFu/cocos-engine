# Cocos Creator Engine -- Core Infrastructure Documentation

> Reference document for AI-assisted scripting. Covers the five foundational modules of the Cocos Creator v3.x engine.

---

## Table of Contents

1. [cocos/game/ -- Game Lifecycle](#1-cocosgame--game-lifecycle)
2. [cocos/scene-graph/ -- Scene Graph and Node System](#2-cocosscene-graph--scene-graph-and-node-system)
3. [cocos/core/ -- Core Engine Infrastructure](#3-cocoscore--core-engine-infrastructure)
4. [cocos/gfx/ -- Graphics Abstraction Layer](#4-cocosgfx--graphics-abstraction-layer)
5. [cocos/render-scene/ -- Render Scene Management](#5-cocosrender-scene--render-scene-management)

---

## 1. cocos/game/ -- Game Lifecycle

### 1.1 Game (`cocos/game/game.ts`)

The `Game` class is the top-level entry point for the engine. It extends `EventTarget` and is responsible for bootstrapping the entire engine, managing the main loop via a `Pacer`, and coordinating initialization across all subsystems.

**Singleton**: `game` -- exported as a module-level constant (line 1264). Also available via `cclegacy.game`.

#### Key Events (Static Constants)

| Constant | String Value | When Fired |
|---|---|---|
| `EVENT_PRE_BASE_INIT` | `"pre_base_init"` | Before logging/sys/settings init |
| `EVENT_POST_BASE_INIT` | `"post_base_init"` | After logging/sys/settings init |
| `EVENT_PRE_INFRASTRUCTURE_INIT` | `"pre_infrastructure_init"` | Before assetManager/gfx/screen init |
| `EVENT_POST_INFRASTRUCTURE_INIT` | `"post_infrastructure_init"` | After assetManager/gfx/screen init |
| `EVENT_PRE_SUBSYSTEM_INIT` | `"pre_subsystem_init"` | Before physics/animation/rendering init |
| `EVENT_POST_SUBSYSTEM_INIT` | `"post_subsystem_init"` | After physics/animation/rendering init |
| `EVENT_ENGINE_INITED` | `"engine_inited"` | Engine fully initialized |
| `EVENT_PRE_PROJECT_INIT` | `"pre_project_init"` | Before project data load |
| `EVENT_POST_PROJECT_INIT` | `"post_project_init"` | After project data load |
| `EVENT_GAME_INITED` | `"game_inited"` | Game fully initialized |
| `EVENT_RENDERER_INITED` | `"renderer_inited"` | GFX device ready |
| `EVENT_HIDE` / `EVENT_SHOW` | `"game_on_hide"` / `"game_on_show"` | App background/foreground |
| `EVENT_PAUSE` / `EVENT_RESUME` | `"game_on_pause"` / `"game_on_resume"` | Game pause/resume |
| `EVENT_LOW_MEMORY` | `"game_on_low_memory"` | Low memory (native only) |
| `EVENT_RESTART` | `"game_on_restart"` | After `game.restart()` |
| `EVENT_CLOSE` | `"game_on_close"` | Game closing |

#### Initialization Flow (`game.init()`)

`game.init(config)` (line 798) returns a `Promise<void>` and executes the following sequence strictly in order:

1. **Base**: debug settings, `sys.init()`, platform events, `settings.init()`
2. **Infrastructure**: `macro.init()`, canvas/frame discovery, `screen.init()`, `deviceManager.init()` (creates GFX device), `assetManager.init()`, `builtinResMgr.init()`, `Layers.init()`, Pacer creation
3. **Subsystem**: `effectSettings.init()`, script packages loading, `director.init()`, builtin assets loading
4. **Engine Inited**: emits `EVENT_ENGINE_INITED`
5. **Project**: loads JS plugins, project bundles, CCE scripts, render pipeline setup, preload assets, splash screen, compiles builtin materials
6. **Game Inited**: emits `EVENT_GAME_INITED`

Each phase fires pre/post delegate events (`onPreBaseInitDelegate`, etc.) that accept `AsyncDelegate` callbacks returning `Promise<void> | void`.

#### Key Properties

- `game.deltaTime` (line 462): Delta time in seconds since last frame. Returns fixed `frameTime/1000` when `_useFixedDeltaTime` is true.
- `game.totalTime` (line 472): Total elapsed time in ms since game start.
- `game.frameStartTime` (line 480): Timestamp of current frame start.
- `game.frameTime` (line 488): Expected frame duration in ms (default `1000/60`).
- `game.frameRate` (line 443): Get/set target frame rate.
- `game.renderType` (line 405): Current render backend type (-1 initially).

#### Key Methods

- `game.step()` (line 599): Advances one frame with fixed delta time. Useful for deterministic testing.
- `game.pause()` / `game.resume()` (lines 641, 655): Pauses/resumes the entire game loop (logic + rendering + input).
- `game.restart()` (line 677): Waits for END_FRAME, resets director, deferred-destroy, shows splash, emits EVENT_RESTART.
- `game.end()` (line 705): Closes the game via `systemInfo.close()`.

#### Internal: The Main Loop (`_updateCallback`, line 1124)

The Pacer calls `_updateCallback` each frame. The flow is:

1. If splash screen is active, update splash and return.
2. If `_shouldLoadLaunchScene` is true, load the launch scene from settings, then call `director.startAnimation()` and `game.onStart()`.
3. Otherwise, call `director.tick(game._calculateDT(false))`.

`_calculateDT` (line 1106): If delta time exceeds `DEBUG_DT_THRESHOLD` (1 second), it clamps to `frameTime/1000` -- this prevents huge jumps when the browser tab is backgrounded and then foregrounded.

#### Hidden Knowledge

- The `game.on()` override (line 723) **immediately invokes** the callback if the corresponding event has already fired (e.g., if you register for `EVENT_ENGINE_INITED` after it has already been emitted, your callback fires immediately). This is non-standard EventTarget behavior.
- `game.frame` and `game.container` are deprecated since v3.4.0; use the `screen` module instead.
- `game._isCloning` (line 494) is set during deserialization/instantiation; do not rely on it.

---

### 1.2 Director (`cocos/game/director.ts`)

The `Director` class manages the game logic flow: scene management, the frame tick, and component lifecycle scheduling. It extends `EventTarget`.

**Singleton**: `director` -- exported as a module-level constant (line 986). Also available via `cclegacy.director`.

#### DirectorEvent Enum (line 66)

All frame-level events in order of emission during `director.tick()`:

`BEGIN_FRAME` -> `BEFORE_UPDATE` -> (start/update/lateUpdate) -> `AFTER_UPDATE` -> `BEFORE_DRAW` -> `AFTER_DRAW` -> `END_FRAME`

Additional events: `INIT`, `RESET`, `BEFORE_SCENE_LOADING`, `BEFORE_SCENE_LAUNCH`, `AFTER_SCENE_LAUNCH`, `BEFORE_PHYSICS`, `AFTER_PHYSICS`, `BEFORE_RENDER`, `AFTER_RENDER`, `BEFORE_COMMIT`.

#### The Tick Loop (`director.tick(dt)`, line 821)

This is the heart of the engine. Each frame:

1. Emit `BEGIN_FRAME`
2. Dispatch input events (`input._frameDispatchEvents()`)
3. If not paused:
   a. Emit `BEFORE_UPDATE`
   b. `ComponentScheduler.startPhase()` -- call `start()` on newly-enabled components
   c. `ComponentScheduler.updatePhase(dt)` -- call `update(dt)` on all components
   d. Update all registered systems (sorted by priority)
   e. `ComponentScheduler.lateUpdatePhase(dt)` -- call `lateUpdate(dt)`
   f. Emit `AFTER_UPDATE`
   g. `CCObject._deferredDestroy()` -- actually destroy objects marked for destruction
   h. Post-update all systems
4. Emit `BEFORE_DRAW`
5. `uiRendererManager.updateAllDirtyRenderers()`
6. `director.root.frameMove(dt)` -- submit render commands
7. Emit `AFTER_DRAW`
8. `Node.resetHasChangedFlags()` and `Node.clearNodeArray()`
9. `scalableContainerManager.update(dt)`
10. Emit `END_FRAME`
11. Increment `_totalFrames`

#### Scene Management

- `director.loadScene(sceneName, onLaunched?, onUnloaded?)` (line 560): Loads a scene by name from any loaded bundle. Returns false if already loading another scene. Prevents concurrent loads via `_loadingScene` guard.
- `director.preloadScene(sceneName, onProgress?, onLoaded?)` (line 633): Preloads scene data without launching.
- `director.runSceneImmediate(scene, onBeforeLoadScene?, onLaunched?)` (line 413): Immediately launches a scene. Handles persistent node reattachment, old scene destruction, auto-release of assets, and scene activation.
- `director.runScene(scene, ...)` (line 537): Defers `runSceneImmediate` to `END_FRAME`.
- `director.getScene()` (line 684): Returns the current logical Scene node.

#### Persistent Root Nodes

- `director.addPersistRootNode(node)` (line 902): Makes a node survive scene transitions. Node must be a direct child of a Scene.
- `director.removePersistRootNode(node)` (line 935): Cancels persistence.
- `director.isPersistRootNode(node)` (line 950): Checks persistence status.

#### Pause/Resume

- `director.pause()` (line 352): Pauses only game logic (update/lateUpdate). Rendering continues.
- `director.resume()` (line 666): Resumes game logic.
- This is different from `game.pause()` which also stops rendering and input.

#### Systems

- `director.registerSystem(name, sys, priority)` (line 755): Registers a System with priority (lower = earlier).
- Systems are called in priority order during `update(dt)` and `postUpdate(dt)` of the tick loop.
- The Scheduler is registered at priority 200.

#### Hidden Knowledge

- `director.init()` (line 875) creates the `Root` with `deviceManager.gfxDevice` and initializes it. The Root is the bridge to the GFX layer.
- `game.restart()` calls `director.reset()` which purges everything, removes all persistent nodes, and starts animation again.
- During scene transition in `runSceneImmediate`, old persistent nodes emit `SCENE_CHANGED_FOR_PERSISTS` with the new render scene.

---

## 2. cocos/scene-graph/ -- Scene Graph and Node System

### 2.1 Node (`cocos/scene-graph/node.ts`)

The `Node` class is the fundamental entity in Cocos Creator's scene graph. It extends `CCObject` and implements `ISchedulable` and `CustomSerializable`.

#### Core Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Node name. Cannot contain `/`. |
| `uuid` | `string` (readonly) | Unique identifier |
| `active` | `boolean` | Local active state. Setting triggers activation/deactivation. |
| `activeInHierarchy` | `boolean` (readonly) | Whether the node is truly active considering parent chain |
| `parent` | `Node \| null` | Parent node |
| `children` | `Node[]` (readonly) | Direct children array |
| `components` | `ReadonlyArray<Component>` | Attached components |
| `scene` | `Scene` (readonly) | The scene this node belongs to |
| `siblingIndex` | `number` | Index in parent's children array |

#### Transform Methods

All transform setters have overloads accepting either a vector/quat or individual scalar components. They operate in **local space** by default.

- `setPosition(val: Vec3)` or `setPosition(x, y, z?)` (line 2422): Sets local position. Marks `TransformBit.POSITION` dirty and calls `invalidateChildren()`.
- `setRotation(val: Quat)` or `setRotation(x, y, z, w)` (line 2473): Sets local rotation (quaternion). Marks `TransformBit.ROTATION` dirty.
- `setRotationFromEuler(x, y, z?)` (line 2503): Converts euler angles to quaternion, sets local rotation.
- `setScale(val: Vec3)` or `setScale(x, y, z?)` (line 2550): Sets local scale. Marks `TransformBit.SCALE` dirty.
- `setWorldPosition(val: Vec3)` or `setWorldPosition(x, y, z)` (line 2621): Sets world position by computing inverse parent world transform.
- `setWorldRotation(val: Quat)` or `setWorldRotation(x, y, z, w)` (line 2681): Sets world rotation.
- `setWorldScale(val: Vec3)` or `setWorldScale(x, y, z)` (line 2745): Sets world scale.

- `updateWorldTransform()` (line 2311): Recursively walks up the parent chain collecting dirty nodes, then recomputes world matrices bottom-up. Short-circuits if `_transformFlags` is zero.

#### Hierarchy Management

- `setParent(value, keepWorldTransform?)` (line 492): Changes parent. If `keepWorldTransform` is true, updates world transform first. Emits `PARENT_CHANGED`, `CHILD_ADDED`, `CHILD_REMOVED` events. Triggers activation/deactivation if needed.
- `addChild(child)` (line 624): Calls `child.setParent(this)`.
- `insertChild(child, siblingIndex)` (line 638): Sets parent then sibling index.
- `removeChild(child)` (line 805): Sets child's parent to null.
- `removeAllChildren()` (line 816): Iterates children in reverse, setting parent to null.
- `removeFromParent()` (line 794): Calls parent's removeChild.
- `getChildByName(name)` (line 576): Linear search by name.
- `getChildByUuid(uuid)` (line 551): Linear search by uuid.
- `getChildByPath(path)` (line 601): Splits path by `/` and traverses downward.
- `isChildOf(parent)` (line 833): Walks up the parent chain.

#### Tree Traversal

- `walk(preFunc, postFunc?)` (line 702): Stack-based (non-recursive) traversal. Calls `preFunc` when first visiting a node (before children) and `postFunc` after all children. Uses a shared static stack (`Node._stacks`) with stack-id nesting.

**Gotcha**: Do not call `walk` on any other node inside a walk callback -- the shared stack does not support nested walks.

#### Component Management

- `addComponent(typeOrClassName)` (line 1062): Creates a new component instance, pushes it to `_components`, emits `COMPONENT_ADDED`. If node is active in hierarchy, immediately activates the component. Also auto-adds required components (`_requireComponent`).
- `getComponent(typeOrClassName)` (line 896): Searches `_components` with `===` for sealed classes, `instanceof` otherwise.
- `getComponents(typeOrClassName)` (line 933): Returns all matching.
- `getComponentInChildren(typeOrClassName)` (line 975): Depth-first search into children (does NOT search self).
- `getComponentsInChildren(typeOrClassName)` (line 1016): Searches self AND all children recursively.
- `removeComponent(component)` (line 1183): Deprecated -- calls `component.destroy()`.

#### Node Events (`NodeEventType`)

Defined in `cocos/scene-graph/node-event.ts`. Key events:

| Event | Description |
|---|---|
| `TRANSFORM_CHANGED` | Position/rotation/scale changed. Callback receives `TransformBit`. |
| `ACTIVE_CHANGED` | Active state changed |
| `ACTIVE_IN_HIERARCHY_CHANGED` | Emitted from topmost node whose active value changed |
| `CHILD_ADDED` / `CHILD_REMOVED` | Child node added/removed |
| `PARENT_CHANGED` | Parent changed |
| `COMPONENT_ADDED` / `COMPONENT_REMOVED` | Component added/removed |
| `NODE_DESTROYED` | Node being destroyed |
| `TOUCH_START` / `TOUCH_MOVE` / `TOUCH_END` / `TOUCH_CANCEL` | Touch events (bubble via scene graph) |
| `MOUSE_DOWN` / `MOUSE_MOVE` / `MOUSE_UP` / `MOUSE_WHEEL` | Mouse events |
| `MOUSE_ENTER` / `MOUSE_LEAVE` | Mouse hover events |

**Critical**: Touch and mouse events use `dispatchEvent()` with capturing/bubbling phases through the scene graph. Custom events use `emit()` which only dispatches to listeners on the same node (no bubbling).

#### Event Mask Optimization (lines 1240-1251)

Node maintains a `_eventMask` bitmask. When you register a `TRANSFORM_CHANGED` listener, the `TRANSFORM_ON` bit (1 << 0) is set. This is checked during transform updates to avoid unnecessary event dispatch. Similarly, `ACTIVE_ON` (1 << 1) is used for `ACTIVE_CHANGED`.

#### Node Active/Inactive Behavior

Setting `node.active = true/false` (line 194) triggers `director._nodeActivator.activateNode(this, isActive)`. The activator recursively walks the subtree, calling `__preload`, `onLoad`, `onEnable`/`onDisable` on components.

**Important**: A node's `activeInHierarchy` is true only if the node AND all its ancestors are active. A child of an inactive parent remains inactive regardless of its own `active` property.

#### Node Destruction (line 1367, _onPreDestroyBase line 1493)

When `node.destroy()` is called:
1. Sets `Destroying` flag
2. Deactivates the node (triggers `onDisable` on all components)
3. Removes from parent's children array
4. Emits `NODE_DESTROYED`
5. Destroys event processor
6. Recursively destroys all children (immediate)
7. Destroys all components (immediate)

Actual destruction is deferred: `node.destroy()` marks the node, and `CCObject._deferredDestroy()` runs at end of frame (after `AFTER_UPDATE`) to perform the actual cleanup.

#### Node Enumerations (`cocos/scene-graph/node-enum.ts`)

- `NodeSpace`: `LOCAL` (0), `WORLD` (1)
- `TransformBit`: `NONE` (0), `POSITION` (1<<0), `ROTATION` (1<<1), `SCALE` (1<<2), `SKEW` (1<<3), `RS`, `RSS`, `TRS`, `TRS_MASK`
- `MobilityMode`: `Static` (0), `Stationary` (1), `Movable` (2)

---

### 2.2 Component (`cocos/scene-graph/component.ts`)

Base class for all user scripts. Extends `CCObject`.

#### Lifecycle Methods (in call order)

1. **`__preload()`** (line 566): Internal. Called before every `onLoad`. Used by built-in components for internal initialization.
2. **`onLoad()`** (line 585): Called when attached to an active node or when the node first becomes active. All `onLoad` calls complete before any `start`.
3. **`onEnable()`** (line 620): Called when the component is enabled AND its node is active in hierarchy.
4. **`start()`** (line 604): Called once before the first `update` after all components' `onLoad` have completed.
5. **`update(dt)`** (line 529): Called every frame. `dt` is in seconds.
6. **`lateUpdate(dt)`** (line 546): Called every frame after all `update` calls.
7. **`onDisable()`** (line 636): Called when the component is disabled or its node becomes inactive.
8. **`onDestroy()`** (line 652): Called when the component is being destroyed.

#### Key Properties

- `node` (line 188): The node this component is attached to. Set by the engine, not the user.
- `enabled` (line 129): Whether the component is enabled. Setting this triggers `enableComp`/`disableComp` on the component scheduler.
- `enabledInHierarchy` (line 156): Returns `this._enabled && this.node && this.node.activeInHierarchy`.
- `_id` (line 211): Auto-generated unique ID with prefix "Comp".
- `uuid` (line 105): Same as `_id`.

#### Scheduler Integration

- `schedule(callback, interval?, repeat?, delay?)` (line 450): Schedules a repeating callback. Uses `director.getScheduler()`.
- `scheduleOnce(callback, delay?)` (line 483): Schedules a one-shot callback.
- `unschedule(callback_fn)` (line 496): Removes a scheduled callback.
- `unscheduleAllCallbacks()` (line 512): Removes all scheduled callbacks for this component.

#### Hidden Knowledge

- Lifecycle methods are `protected` and optional. The engine accesses them through `internalOnLoad`, `internalStart`, `internalUpdate`, etc. (getter properties, lines 534-658). This means if your method does not exist on the prototype, the engine safely skips it.
- `Component._executionOrder` (line 64): Static property defaulting to 0. Can be set via `executionOrder` in the `@executeInEditMode` decorator options. Controls the order of `start`, `update`, and `lateUpdate` calls (negative = earlier).
- `Component._requireComponent` (line 69): Auto-adds dependent components when this component is added.
- `destroy()` (line 379): If the component has dependent components in the editor, destruction is blocked.
- `_onPreDestroy()` (line 405): Unschedules all callbacks, calls `onDestroy` via node activator, removes component from node.
- In the **editor**, lifecycle methods are wrapped in try-catch to prevent editor crashes. In runtime, errors propagate normally.

---

### 2.3 ComponentScheduler (`cocos/scene-graph/component-scheduler.ts`)

Manages the execution of lifecycle methods across all components, sorted by `_executionOrder`.

**Key class**: `ComponentScheduler` (line 351), owned by `director._compScheduler`.

#### Invoker Types

- `OneOffInvoker` (line 137): Sorts components by `_executionOrder` once, invokes them all, then clears. Used for `start` and `onLoad`.
- `ReusableInvoker` (line 175): Maintains sorted order using binary insertion. Used for `update` and `lateUpdate`.

Both use three buckets: `_neg` (order < 0), `_zero` (order == 0), `_pos` (order > 0). Within `_zero`, components execute in insertion order.

#### Frame Phases

- `startPhase()` (line 473): Calls `startInvoker.invoke()` then `_startForNewComps()`.
- `updatePhase(dt)` (line 503): Calls `updateInvoker.invoke(dt)`.
- `lateUpdatePhase(dt)` (line 512): Calls `lateUpdateInvoker.invoke(dt)`, then processes deferred components.

**Deferred scheduling**: When a component is enabled during an update loop (`_updating == true`), it is pushed to `_deferredComps` rather than immediately scheduled. These are processed after `lateUpdatePhase` via `_deferredSchedule()`.

#### Hidden Knowledge

- `invokeStart`, `invokeUpdate`, `invokeLateUpdate` (lines 274-315) use JIT-compiled functions (`createInvokeImplJit`) when `SUPPORT_JIT` is true. These generate optimized loop code as strings. Falls back to `createInvokeImpl` which wraps a fast path + try-catch slow path.
- When a component throws in a lifecycle callback, the engine catches it, reports it via `legacyCC._throw(e)`, and continues with the next component. The `ensureFlag` mechanism prevents re-calling a lifecycle method on a component that already threw.

---

### 2.4 NodeActivator (`cocos/scene-graph/node-activator.ts`)

Handles recursive activation/deactivation of nodes and their components.

**Key method**: `activateNode(node, active)` (line 158).

#### Activation Flow

When activating a node:
1. Gets an `ActivateTask` from the pool (containing `preload`, `onLoad`, `onEnable` invokers).
2. Calls `_activateNodeRecursively` which:
   - Sets `_activeInHierarchy = true`
   - For each component: calls `activateComp` which adds to preload/onLoad/onEnable invokers
   - For each active child: recurses
3. Invokes all `preload`, `onLoad`, `onEnable` in order.

#### Deactivation Flow

When deactivating a node:
1. Sets `Deactivating` flag.
2. Sets `_activeInHierarchy = false`.
3. Calls `disableComp` on all enabled components (triggers `onDisable`).
4. Recursively deactivates active children.
5. If any component's `onDisable` causes reactivation (node becomes active again during deactivation), the process aborts gracefully.
6. Emits `ACTIVE_IN_HIERARCHY_CHANGED`.

**Critical gotcha**: You cannot reactivate a node during its own deactivation. The `Deactivating` flag prevents this (line 250-258, error 3816).

#### Hidden Knowledge

- `ActivateTask` objects are pooled (max 4) to reduce GC pressure.
- During activation, `originCount` is captured before activating components, because new components may be added during `onEnable` callbacks.
- During deactivation, `cancelInactive` is called on all pending activation tasks in the stack to debounce -- a node deactivated during another node's activation will have its pending lifecycle calls cancelled.

---

### 2.5 Scene (`cocos/scene-graph/scene.ts`)

`Scene` extends `Node`. It is the root of the scene graph and is managed by `Director`.

#### Key Properties

- `renderScene` (line 50): The corresponding `RenderScene` from the render-scene module.
- `globals` (line 55): `SceneGlobals` containing ambient, shadows, fog, skybox, octree, skin settings.
- `autoReleaseAssets` (line 65): If true, statically referenced assets are auto-released on scene transition.

#### Key Methods

- `_load()` (line 175): Called before scene activation. Expands prefab instances, applies target overrides, batch-creates nodes, sets scene references via `walk(Node._setScene)`.
- `_activate(active = true)` (line 194): Calls `director._nodeActivator.activateNode(this, active)` then `this._globals.activate(this)`.
- `destroy()` (line 101): Destroys all children (sets them inactive), then destroys the `RenderScene`.
- `addComponent()` is overridden to throw an error (line 125) -- you cannot add components directly to a Scene.

#### Hidden Knowledge

- Scene sets `_activeInHierarchy = false` in its constructor (line 90), meaning it starts inactive.
- Scene's `_updateScene()` is a no-op (line 84) -- it sets `_scene = this` directly.
- Scene's `updateWorldTransform()` is a no-op (line 160) -- scenes have no parent transform.
- Scene's `_onHierarchyChanged` and `_onPostActivated` are no-ops (lines 132, 139).

---

### 2.6 Layers (`cocos/scene-graph/layers.ts`)

Layer management for raycasting, physics, and rendering culling. Stored as bitmasks on `Node.layer`.

#### Built-in Layers (bits 20-31 are reserved)

| Name | Bit | Value |
|---|---|---|
| `NONE` | - | 0 |
| `IGNORE_RAYCAST` | 20 | 1 << 20 |
| `GIZMOS` | 21 | 1 << 21 |
| `EDITOR` | 22 | 1 << 22 |
| `UI_3D` | 23 | 1 << 23 |
| `SCENE_GIZMO` | 24 | 1 << 24 |
| `UI_2D` | 25 | 1 << 25 |
| `PROFILER` | 28 | 1 << 28 |
| `DEFAULT` | 30 | 1 << 30 |
| `ALL` | - | 0xffffffff |

User layers use bits 0-19. `Layers.addLayer(name, bitNum)` adds a custom layer at runtime. `Layers.makeMaskInclude([layers])` and `Layers.makeMaskExclude([layers])` create filter masks.

---

## 3. cocos/core/ -- Core Engine Infrastructure

### 3.1 Module Overview

`cocos/core/` provides the foundational utilities, data structures, and abstractions used by all other modules. It is re-exported from `cocos/core/index.ts`.

Key submodules:
- **math/** -- Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color, Rect, Size
- **geometry/** -- AABB, OBB, Sphere, Frustum, Ray, Plane, Intersect
- **data/** -- CCObject, CCClass, decorators (`@ccclass`, `@property`, `@serializable`)
- **event/** -- EventTarget, Eventify, CallbacksInvoker, AsyncDelegate
- **scheduler/** -- Scheduler for time-based callbacks
- **memop/** -- CachedArray, ScalableContainer, Pool
- **utils/** -- js (type utilities, array helpers), misc
- **platform/** -- sys, screen, settings, debug
- **curves/** -- Animation curves, keyframes, easing
- **algorithm/** -- Binary search, easing, murmurhash

### 3.2 CCObject (`cocos/core/data/object.ts`)

The base class for all engine objects (Node, Component, Asset, etc.).

#### CCObjectFlags (line 35)

Bitmask flags for object state tracking:

| Flag | Bit | Purpose |
|---|---|---|
| `Destroyed` | 1 << 0 | Object has been destroyed |
| `RealDestroyed` | 1 << 1 | Object has been fully destroyed |
| `ToDestroy` | 1 << 2 | Queued for deferred destruction |
| `DontSave` | 1 << 3 | Not serialized (e.g., runtime-added children) |
| `EditorOnly` | 1 << 4 | Only exists in editor |
| `Dirty` | 1 << 5 | Needs recalculation |
| `DontDestroy` | 1 << 6 | Persistent across scene loads |
| `Destroying` | 1 << 7 | Currently in destroy process |
| `Deactivating` | 1 << 8 | Currently being deactivated |
| `IsOnEnableCalled` | 1 << 11 | onEnable has been called |
| `IsPreloadStarted` | 1 << 13 | __preload has started |
| `IsOnLoadCalled` | 1 << 14 | onLoad has been called |
| `IsOnLoadStarted` | 1 << 15 | onLoad has started |
| `IsStartCalled` | 1 << 16 | start has been called |

`PersistentMask` (line 65) defines which flags survive cloning/serialization.

#### Deferred Destruction

`CCObject._deferredDestroy()` (called during `director.tick` after `AFTER_UPDATE`) processes all objects in the `objectsToDestroy` queue. This means `node.destroy()` does not immediately free memory -- the actual cleanup happens at end of frame.

### 3.3 EventTarget (`cocos/core/event/event-target.ts`)

`EventTarget` is created via `Eventify(Empty)` (line 42). It provides:

- `on(type, callback, target?, once?)`: Register listener
- `once(type, callback, target?)`: Register one-shot listener
- `off(type, callback?, target?)`: Remove listener
- `emit(type, ...args)`: Dispatch event to all listeners
- `hasEventListener(type)`: Check if listeners exist
- `targetOff(target)`: Remove all listeners for a target
- `dispatchEvent(event)`: Dispatch with capture/bubble phases

`AsyncDelegate` (in `cocos/core/event/async-delegate.ts`) extends this pattern for async callbacks, returning `Promise<void[]>` from `dispatch()`.

### 3.4 Decorators

Key decorators from `cocos/core/data/decorators/`:

- `@ccclass(name)`: Registers a class with the CCClass system (required for serialization, editor integration).
- `@property(typeOrOptions)`: Declares a serializable/editable property.
- `@serializable`: Marks a property for serialization (shorthand).
- `@editable`: Makes a property visible in the editor inspector.
- `@tooltip(text)`: Adds tooltip text in editor.
- `@type(constructor)`: Specifies the type for the property.
- `@visible(bool | () => boolean)`: Controls visibility in editor.
- `@range([min, max, step])`: Constrains numeric property ranges.

### 3.5 Scheduler (`cocos/core/scheduler/`)

The `Scheduler` provides time-based callback scheduling. It is registered as a system with `director` at priority 200.

- `schedule(callback, target, interval, repeat, delay, paused)`: Schedule a callback.
- `unschedule(callback, target)`: Remove a specific callback.
- `unscheduleAllForTarget(target)`: Remove all callbacks for a target.
- `pauseTarget(target)` / `resumeTarget(target)`: Pause/resume all callbacks for a target.

Components use this internally for `schedule()`/`unschedule()` methods.

---

## 4. cocos/gfx/ -- Graphics Abstraction Layer

### 4.1 Architecture

The GFX module provides a hardware-agnostic abstraction over graphics APIs. It supports multiple backends:

| Backend | Directory | API Target |
|---|---|---|
| WebGL 1.0 | `cocos/gfx/webgl/` | `API.WEBGL` |
| WebGL 2.0 | `cocos/gfx/webgl2/` | `API.WEBGL2` |
| WebGPU | `cocos/gfx/webgpu/` | `API.WEBGPU` |
| Native (Vulkan/Metal/GL) | via JSB bindings | `API.VULKAN`, `API.METAL`, `API.GLES2`, `API.GLES3` |
| Empty (headless) | `cocos/gfx/empty/` | `API.UNKNOWN` |

### 4.2 Device (`cocos/gfx/base/device.ts`)

Abstract base class for the graphics device.

#### Key Properties

- `gfxAPI` (line 61): Current rendering API (`API` enum).
- `queue` (line 69): Default command queue.
- `commandBuffer` (line 77): Default command buffer.
- `swapchainFormat` (line 85): Format of the swapchain (default `RGBA8`).
- `renderer` (line 93): Renderer name string (e.g., "WebGL 2.0").
- `vendor` (line 99): GPU vendor string.
- `numDrawCalls` (line 109): Current draw call count.
- `numInstances` (line 117): Current instance count.
- `numTris` (line 125): Current triangle count.
- `memoryStatus` (line 133): GPU memory allocation stats.
- `capabilities` (line 141): Device capabilities (`DeviceCaps`).
- `bindingMappingInfo` (line 149): Descriptor binding layout.

#### Abstract Factory Methods

All GFX resources are created through the device:

- `createCommandBuffer(info)` -> `CommandBuffer`
- `createSwapchain(info)` -> `Swapchain`
- `createBuffer(info)` -> `Buffer`
- `createTexture(info)` -> `Texture`
- `createShader(info)` -> `Shader`
- `createInputAssembler(info)` -> `InputAssembler`
- `createRenderPass(info)` -> `RenderPass`
- `createFramebuffer(info)` -> `Framebuffer`
- `createDescriptorSet(info)` -> `DescriptorSet`
- `createDescriptorSetLayout(info)` -> `DescriptorSetLayout`
- `createPipelineLayout(info)` -> `PipelineLayout`
- `createPipelineState(info)` -> `PipelineState`
- `createQueue(info)` -> `Queue`
- `getSampler(info)` -> `Sampler` (cached)
- `getGeneralBarrier(info)` -> `GeneralBarrier` (cached)
- `getTextureBarrier(info)` -> `TextureBarrier` (cached)
- `getBufferBarrier(info)` -> `BufferBarrier` (cached)

#### Feature Detection

- `hasFeature(feature: Feature)` (line 372): Checks GPU feature support.
- `getFormatFeatures(format: Format)` (line 381): Checks format support level.
- `getMaxSampleCount(format, usage, flags)` (line ~397): Gets maximum MSAA sample count.

### 4.3 API Enum (`cocos/gfx/base/define.ts`, line 88)

```
UNKNOWN, GLES2, GLES3, METAL, VULKAN, NVN, WEBGL, WEBGL2, WEBGPU
```

### 4.4 Feature Enum (`cocos/gfx/base/define.ts`, line 107)

```
ELEMENT_INDEX_UINT, INSTANCED_ARRAYS, MULTIPLE_RENDER_TARGETS, BLEND_MINMAX,
COMPUTE_SHADER, INPUT_ATTACHMENT_BENEFIT (deprecated), SUBPASS_COLOR_INPUT,
SUBPASS_DEPTH_STENCIL_INPUT, RASTERIZATION_ORDER_NOCOHERENT,
MULTI_SAMPLE_RESOLVE_DEPTH_STENCIL, COUNT
```

### 4.5 DeviceManager (`cocos/gfx/device-manager.ts`)

Singleton `deviceManager` (line 243) that manages device initialization and the primary swapchain.

#### `deviceManager.init(canvas, bindingMappingInfo)` (line 143)

1. Determines render type from `settings.querySettings('rendering', 'renderMode')`.
2. Render type priority in AUTO mode: WebGPU (if available and not editor) > WebGL2 > WebGL > Empty.
3. UC browser is forced to WebGL1 (line 160) due to non-conformant WebGL2 implementation.
4. WebGPU initialization is async (returns `Promise<boolean>`).
5. Creates the primary swapchain sized to `screen.windowSize`.

#### Render Modes (`LegacyRenderMode` enum)

| Value | Name | Description |
|---|---|---|
| 0 | AUTO | Engine chooses (WebGPU > WebGL2 > WebGL) |
| 1 | CANVAS | Canvas 2D (software rendering) |
| 2 | WEBGL | Force WebGL |
| 3 | HEADLESS | Empty device for testing |
| 4 | WEBGPU | Force WebGPU |

### 4.6 Key GFX Concepts

**Swapchain**: Represents the on-screen render target. Created from the canvas element. Provides front/back buffer management.

**CommandBuffer**: Records rendering commands (draw, dispatch, copy, etc.) for later execution on a Queue.

**Queue**: Executes recorded command buffers. Types: GRAPHICS (default), COMPUTE, TRANSFER.

**Render Pass**: Describes color/depth/stencil attachment configurations and load/store operations.

**Framebuffer**: A collection of texture attachments bound to a Render Pass.

**Pipeline State**: Combines shader, render pass, vertex input, blend, depth/stencil, and rasterization states.

**Descriptor Set / Layout**: Manages uniform buffer, texture, and sampler bindings for shaders.

**Input Assembler**: Manages vertex buffer(s) and index buffer for draw calls.

#### Hidden Knowledge

- `Device.canvas` is a static property (line 191) used as a hack for WebGL device initialization -- the canvas is set on the class rather than per-instance.
- Samplers, barriers are cached (deduplicated) via `Map<number, ...>` on the device. `getSampler` does not create new instances for identical configs.
- The empty backend (`cocos/gfx/empty/`) implements all interfaces as no-ops, useful for headless/server-side testing.
- `enableAutoBarrier(en)` (line 390) is a no-op on web backends.

---

## 5. cocos/render-scene/ -- Render Scene Management

### 5.1 RenderScene (`cocos/render-scene/core/render-scene.ts`)

The `RenderScene` is created by the `Root` and provides all rendering elements: cameras, lights, models, and 2D draw batches.

**Created via**: `director.root.createScene({})` (called in `Scene` constructor, `cocos/scene-graph/scene.ts:92`).

#### Key Properties

| Property | Type | Description |
|---|---|---|
| `root` | `Root` | The root renderer |
| `name` | `string` | Scene name |
| `cameras` | `Camera[]` | All cameras |
| `mainLight` | `DirectionalLight \| null` | Primary directional light |
| `sphereLights` | `SphereLight[]` | Sphere light sources |
| `spotLights` | `SpotLight[]` | Spot light sources |
| `pointLights` | `PointLight[]` | Point light sources |
| `rangedDirLights` | `RangedDirectionalLight[]` | Ranged directional lights |
| `models` | `Model[]` | All renderable models |
| `batches` | `DrawBatch2D[]` | 2D draw batches |
| `lodGroups` | `LODGroup[]` | LOD groups |

#### Key Methods

- `addCamera(cam)` (line 262): Attaches camera and registers with LOD cache.
- `removeCamera(camera)` (line 272): Detaches camera.
- `setMainLight(dl)` (line ~297): Sets the primary directional light.
- `addSphereLight(light)` / `addSpotLight(light)` / etc.: Register light sources.
- `addModel(model)`: Registers a renderable model.
- `addLODGroup(lodGroup)`: Registers a LOD group.
- `update(stamp)` (line 198): Updates all lights and models. For each enabled model: `updateTransform(stamp)` then `updateUBOs(stamp)`. Also updates LOD state cache.
- `destroy()` (line 244): Removes all cameras, lights, models, LOD groups.
- `isCulledByLod(camera, model)` (line 254): Checks if a model is culled by LOD for a given camera.

#### Raycast

- `raycast Results: IRaycastResult[]` -- interface with `node: Node` and `distance: number`.

### 5.2 Camera (`cocos/render-scene/scene/camera.ts`)

The rendering camera. Manages projection, viewport, clear settings, and post-processing.

#### Key Enums

- `CameraFOVAxis`: `VERTICAL` (0), `HORIZONTAL` (1)
- `CameraProjection`: `ORTHO` (0), `PERSPECTIVE` (1)
- `CameraAperture`: F1.8 through F22.0 (f-number stops)
- `CameraISO`: ISO100, ISO200, ISO400, ISO800

#### Key Properties (from partial read)

- `width` / `height`: Viewport dimensions.
- `nearClip` / `farClip`: Clipping planes.
- `fov`: Field of view (in degrees for perspective).
- `orthoHeight`: Half-height for orthographic projection.
- `clearColor`: Background clear color.
- `clearFlags`: Which buffers to clear (`ClearFlagBit`).
- `visibility`: Layer mask for culling.
- `priority`: Rendering order.
- `window`: The `RenderTarget` (typically the screen's `RenderWindow`).

### 5.3 RenderWindow (`cocos/render-scene/core/render-window.ts`)

Represents a render target -- either on-screen (swapchain-backed) or off-screen (framebuffer).

#### Key Properties

- `width` / `height`: Pre-rotated dimensions (portrait mode).
- `swapchain`: The associated swapchain (if on-screen).
- `framebuffer`: The underlying framebuffer.
- `cameras`: Cameras rendering to this window.

**Note**: Width/height return pre-rotated values. Use `Camera.width`/`Camera.height` for oriented dimensions.

### 5.4 Scene Globals (`cocos/scene-graph/scene-globals.ts`)

`SceneGlobals` is serialized as part of the Scene and contains per-scene rendering configuration:

- `AmbientInfo`: Sky color, ground albedo, sky illuminance (HDR/LDR separate).
- `ShadowsInfo`: Shadow type, shadow distance, shadow color, shadow map size.
- `SkyboxInfo`: Environment map, environment lighting type, convolution maps.
- `FogInfo`: Fog type, fog color, fog density, fog start/end.
- `OctreeInfo`: Octree min/max bounds, depth.
- `SkinInfo`: Skin weight, blur radius.
- `LightProbeInfo`: Light probe data.
- `PostSettingsInfo`: Tone mapping type, etc.

All these are activated via `globals.activate(scene)` during `Scene._activate()`.

### 5.5 Model (`cocos/render-scene/scene/model.ts`)

Represents a renderable object in the render scene. Each model has:

- Transform matrices (world, normal)
- Material(s) and SubModel(s)
- Bounding volume (AABB)
- Visibility mask
- Enabled state

`updateTransform(stamp)`: Recalculates world matrix from the scene-graph Node's transform.
`updateUBOs(stamp)`: Uploads uniform buffer data to GPU.

### 5.6 SubModel (`cocos/render-scene/scene/submodel.ts`)

Each Model contains one or more SubModels. A SubModel holds:

- A `RenderPipeline` sub-state
- Input assembler (vertex/index data)
- Descriptor sets
- A `Pass` object for draw call configuration

### 5.7 Light Types

All lights extend a base `Light` class (`cocos/render-scene/scene/light.ts`):

| Class | File | Description |
|---|---|---|
| `DirectionalLight` | `scene/directional-light.ts` | Infinite directional light (sun). Only one "main light" per scene. |
| `SphereLight` | `scene/sphere-light.ts` | Point-like light with range falloff |
| `SpotLight` | `scene/spot-light.ts` | Conical spotlight |
| `PointLight` | `scene/point-light.ts` | Omnidirectional point light |
| `RangedDirectionalLight` | `scene/ranged-directional-light.ts` | Directional light with range bounds |

### 5.8 Hidden Knowledge

- `RenderScene.registerCreateFunc(root)` (line 173) is a static factory registration pattern. The Root uses this to create scenes without direct dependency on RenderScene.
- `LodStateCache` is an internal class that caches LOD state per camera per frame, updated in `RenderScene.update()`.
- The render scene's `update()` must be called with a timestamp (`stamp`) that matches the frame time. Models use this for animation and transform updates.
- During scene transitions, the old RenderScene is destroyed via `director.root.destroyScene(renderScene)`.
- `DrawBatch2D` is a 2D-specific renderable, managed separately from 3D `Model` objects.

# Cocos Creator Engine: Asset, Input & Serialization Module Reference

Comprehensive reference for AI-assisted scripting. Covers asset loading/releasing, input event handling, and serialization internals.

---

## Table of Contents

1. [Asset System](#1-asset-system)
   - 1.1 [Asset Base Class](#11-asset-base-class)
   - 1.2 [AssetManager](#12-assetmanager)
   - 1.3 [Bundle & Resources](#13-bundle--resources)
   - 1.4 [Texture2D](#14-texture2d)
   - 1.5 [SpriteFrame](#15-spriteframe)
   - 1.6 [Material](#16-material)
   - 1.7 [EffectAsset](#17-effectasset)
   - 1.8 [Other Asset Types](#18-other-asset-types)
   - 1.9 [Release Management](#19-release-management)
2. [Input System](#2-input-system)
   - 2.1 [Input Singleton](#21-input-singleton)
   - 2.2 [Event Types & Enums](#22-event-types--enums)
   - 2.3 [EventTouch](#23-eventtouch)
   - 2.4 [EventMouse](#24-eventmouse)
   - 2.5 [EventKeyboard](#25-eventkeyboard)
   - 2.6 [Touch Class](#26-touch-class)
   - 2.7 [SystemEvent (Deprecated)](#27-systemevent-deprecated)
   - 2.8 [Input Dispatching Internals](#28-input-dispatching-internals)
3. [Serialization System](#3-serialization-system)
   - 3.1 [CCON Format](#31-ccon-format)
   - 3.2 [Deserializer](#32-deserializer)
   - 3.3 [Instantiate](#33-instantiate)
   - 3.4 [Instantiate-JIT](#34-instantiate-jit)
4. [File Path Index](#4-file-path-index)

---

## 1. Asset System

### 1.1 Asset Base Class

**File:** `cocos/asset/assets/asset.ts`

`Asset` extends `Eventify(CCObject)` and is the root class for all loadable resources in Cocos Creator. Every asset has a UUID, a reference count, and optional native file dependency.

**Key properties:**

- `uuid: string` (line 160) -- The unique identifier. Non-enumerable by default.
- `nativeUrl: string` (line 133, read-only) -- Resolved URL of the native dependency. Returns empty string if none.
- `nativeAsset: any` (line 185, read-only) -- The underlying native object (e.g., HTMLImageElement for textures).
- `refCount: number` (line 301, read-only) -- Current reference count. Reaching zero triggers auto-release.

**Key methods:**

- `addRef(): Asset` (line 316) -- Increments reference count. Prevents auto-release. Returns self for chaining.
- `decRef(autoRelease = true): Asset` (line 331) -- Decrements reference count. If zero and `autoRelease` is true, triggers release via `AssetManager.getReleaseManager().tryRelease(this)`.
- `destroy(): boolean` (line 387) -- Destroys the asset and its internal data.

**Hidden Knowledge:**

- `Asset.prototype.createNode` is set to `null` at line 399. Only subclasses like `Prefab` override it.
- The `_uuid` property is defined via `Object.defineProperty` with `enumerable: false` (line 193) to prevent UUID serialization during destroy.
- `_native` stores the raw filename. A leading `/` means "not in library" (line 258). A leading `.` means "in same dir as JSON" (line 144).
- The `loaded` property (line 77) is deprecated since v3.3; use `asset.isValid` or listen for `'load'` events instead.

---

### 1.2 AssetManager

**File:** `cocos/asset/asset-manager/asset-manager.ts`

`AssetManager` is the global singleton controlling all asset loading, caching, and releasing. Access it via `assetManager` (exported at line 868).

**Key properties:**

- `pipeline: Pipeline` (line 131) -- Normal loading pipeline: `preprocess -> load`.
- `fetchPipeline: Pipeline` (line 141) -- Preload pipeline (downloads but does not parse): `preprocess -> fetch`.
- `bundles: ICache<Bundle>` (line 162) -- All loaded bundles.
- `assets: ICache<Asset>` (line 171) -- All loaded assets.
- `dependUtil` (line 194) -- Manages asset dependency relationships.
- `cacheAsset: boolean` (line 265) -- Whether to cache loaded assets. Default `true`.
- `force: boolean` (line 204) -- Whether to force-load assets ignoring errors. `true` in EDITOR/PREVIEW.

**Key methods -- Loading:**

- `loadAny(requests, options?, onProgress?, onComplete?)` (line 558) -- General-purpose load. Accepts UUID strings, path objects, or mixed arrays. The most flexible API.
- `preloadAny(requests, options?, onProgress?, onComplete?)` (line 608) -- Downloads without parsing. Call `loadAny` later to complete.
- `loadRemote<T>(url, options?, onComplete?)` (line 649) -- Loads a remote asset by URL. Uses file extension to determine loader. Pass `ext` in options if URL has no extension.
- `loadBundle(nameOrUrl, options?, onComplete?)` (line 707) -- Loads a bundle by name (project) or URL (remote).

**Key methods -- Releasing:**

- `releaseAsset(asset: Asset)` (line 754) -- Releases an asset and its dependencies. May cause black textures if still referenced.
- `releaseUnusedAssets()` (line 768) -- Releases all assets with zero reference count.
- `releaseAll()` (line 782) -- Force-releases all cached assets.

**Hidden Knowledge:**

- On native platforms, events are batched and dispatched once per frame (`dispatchImmediately = false` at line 113). On web, events dispatch immediately.
- Reserved option keywords for `loadAny` include: `uuid`, `url`, `path`, `dir`, `scene`, `type`, `priority`, `preset`. Do not use these for custom options (line 511).
- `loadRemote` checks `this.assets.has(url)` first (line 654); if the URL was already loaded and `reloadAsset` is not set, it returns the cached version immediately.
- The `assetsOverrideMap` (line 176) is used for L10N (localization) asset overrides.

---

### 1.3 Bundle & Resources

**File:** `cocos/asset/asset-manager/bundle.ts`

`Bundle` represents a package of assets. The `resources` singleton (line 655) is a built-in Bundle for `assets/resources/`.

**Key methods on Bundle:**

- `load<T>(paths, type?, onProgress?, onComplete?)` (line 242) -- Loads an asset by relative path within the bundle.
- `preload(paths, type?, onProgress?, onComplete?)` (line 306) -- Preloads without parsing.
- `loadDir<T>(dir, type?, onProgress?, onComplete?)` (line 362) -- Loads all assets under a folder.
- `loadScene(sceneName, options?, onProgress?, onComplete?)` (line 460) -- Loads a scene asset.
- `get<T>(path, type?): T | null` (line 559) -- Gets a cached asset by path. Returns `null` if not loaded.
- `release(path, type?)` (line 591) -- Releases a specific asset by path.
- `releaseAll()` (line 631) -- Releases all assets in this bundle.

**Common loading patterns:**

```ts
// Load from resources bundle
resources.load('textures/bg', SpriteFrame, (err, spriteFrame) => { ... });

// Load from custom bundle
assetManager.loadBundle('myBundle', (err, bundle) => {
    bundle.load('images/hero', SpriteFrame, (err, spriteFrame) => { ... });
});
```

**Hidden Knowledge:**

- Paths always use forward slashes. Backslashes will not work (line 321).
- Path extensions must be omitted: use `'images/hero'` not `'images/hero.png'`.
- When loading SpriteFrame, the engine resolves it from the parent Texture2D automatically.
- `bundle.loadScene` sets `scene.id = sceneAsset._uuid` and `scene.name = sceneAsset.name` (line 475-476).

---

### 1.4 Texture2D

**File:** `cocos/asset/assets/texture-2d.ts`

`Texture2D` extends `SimpleTexture` and represents a 2D texture with mipmap support.

**Key properties:**

- `mipmaps: ImageAsset[]` (line 96) -- All mipmap levels. Setting this resets the texture dimensions and format.
- `image: ImageAsset | null` (line 157) -- Level 0 mipmap. Setting `image = x` is equivalent to `mipmaps = [x]` and clears all previous mipmaps.
- `mipmapLevel: number` (inherited from SimpleTexture, line 96 of simple-texture.ts) -- Number of mipmap levels.
- `width: number`, `height: number` (inherited from TextureBase) -- Pixel dimensions.

**Key methods:**

- `reset(info: ITexture2DCreateInfo)` (line 192) -- Resets the texture with new size, format, and mipmap settings. After reset, call `uploadData` explicitly.
- `uploadData(source, level?, arrayIndex?)` (inherited from SimpleTexture, line 151) -- Uploads pixel data to a specific mipmap level.
- `getGFXTexture(): Texture | null` (inherited from SimpleTexture, line 105) -- Returns the underlying GPU texture.
- `destroy(): boolean` (line 262) -- Clears mipmaps and releases GPU resources.

**ITexture2DCreateInfo interface (line 38):**

- `width: number` -- Required.
- `height: number` -- Required.
- `format?: PixelFormat` -- Default `RGBA8888`.
- `mipmapLevel?: number` -- Default `1`.
- `baseLevel?: number` -- Default `0`.
- `maxLevel?: number` -- Default `1000`.

**Hidden Knowledge:**

- When mipmaps is set with a single ImageAsset, `extractMipmaps()` is called which may split auto-generated mipmaps (line 103-106).
- When mipmaps is set with multiple ImageAssets, only mipmap0 is extracted from each (line 110-111).
- On WebGL, mipmaps are only auto-generated for power-of-two textures (line 47-51 in simple-texture.ts).

---

### 1.5 SpriteFrame

**File:** `cocos/2d/assets/sprite-frame.ts`

`SpriteFrame` extends `Asset` and supports rectangle, sliced-9, and mesh sprite types.

**Key properties:**

- `texture: TextureBase` (line 432) -- The backing texture. Setting a new texture calls `reset()` internally.
- `rect: Rect` (line 357) -- The rectangle within the texture. Setting this recalculates UVs.
- `originalSize: Size` (line 377) -- Original size before trimming.
- `offset: Vec2` (line 400) -- Offset from original center to trimmed center.
- `rotated: boolean` (line 413) -- Whether the sprite is rotated in the atlas.
- `uv: number[]` (line 582) -- Quad UV coordinates (8 floats).
- `uvSliced: IUV[]` (line 593) -- Sliced-9 UV coordinates (16 entries).
- `vertices: IVertices | null` (line 576) -- Mesh vertex data. Call `ensureMeshData()` before using.
- `width: number`, `height: number` (lines 465, 473) -- Delegates to `this._texture.width/height`.
- `insetTop`, `insetBottom`, `insetLeft`, `insetRight` (lines 279-349) -- Nine-slice border insets.
- `flipUVX: boolean` (line 496), `flipUVY: boolean` (line 509) -- UV flip controls.
- `packable: boolean` (line 522) -- Whether this sprite can participate in dynamic atlas packing.

**Key methods:**

- `static createWithImage(imageSourceOrImageAsset): SpriteFrame` (line 259) -- Creates a SpriteFrame from an ImageAsset or HTML element.
- `reset(info?: ISpriteFrameInitInfo, clearData?)` (line 815) -- Resets all sprite frame data.
- `clone(): SpriteFrame` (line 1331) -- Deep clones the sprite frame including vertices and mesh.
- `ensureMeshData()` (line 935) -- Lazily creates mesh data. Must be called before accessing `mesh`.
- `getGFXTexture(): Texture | null` (line 778) -- Returns the GPU texture.
- `getHash(): number` (line 796) -- Texture hash value.

**ISpriteFrameInitInfo interface (line 111):**

- `texture?: TextureBase`
- `originalSize?: Size`
- `rect?: Rect`
- `offset?: Vec2`
- `borderTop/Bottom/Left/Right?: number`
- `isRotate?: boolean`
- `isFlipUv?: boolean`

**Hidden Knowledge:**

- Setting `texture = null` triggers a warning and is rejected (line 438).
- `_refreshTexture` (line 1382) auto-resets rect and originalSize if they are zero or out of bounds.
- Dynamic atlas packing (line 1175) is only available for non-compressed Texture2D instances.
- `checkRect` (line 886) validates that the sprite rect does not exceed texture bounds; error 3300/3301 if it does.
- The `SpriteFrameEvent.UV_UPDATED` event (line 173) is emitted whenever UVs are recalculated, used by render components to update buffers.

---

### 1.6 Material

**File:** `cocos/asset/assets/material.ts`

`Material` extends `Asset` and defines how a model is drawn, referencing an `EffectAsset` and providing shader uniforms/macros.

**Key properties:**

- `effectAsset: EffectAsset | null` (line 150) -- The current effect asset.
- `effectName: string` (line 158) -- Name of the current effect.
- `technique: number` (line 166) -- Current technique index.
- `passes: Pass[]` (line 174) -- Array of rendering passes.
- `hash: number` (line 182) -- Material hash for sorting.

**Key methods:**

- `initialize(info: IMaterialInfo)` (line 207) -- Initializes the material. Must be called before use. Calling on an already-initialized material logs a warning (error 12005).
- `setProperty(name, val, passIdx?)` (line 303) -- Sets a uniform value. If `passIdx` is omitted, sets on all passes.
- `getProperty(name, passIdx?): MaterialPropertyFull` (line 345) -- Gets a uniform value. Returns `null` if not found.
- `resetUniforms(clearPasses?)` (line 280) -- Resets all uniforms to EffectAsset defaults.
- `copy(mat, overrides?)` (line 370) -- Copies another material with optional overrides.
- `recompileShaders(overrides, passIdx?)` (line 253) -- Recompiles shaders with new macro definitions. Only works on material instances.
- `overridePipelineStates(overrides, passIdx?)` (line 263) -- Overrides pipeline states. Only works on material instances.

**IMaterialInfo interface (line 43):**

- `effectAsset?: EffectAsset | null` -- Provide either this or `effectName`.
- `effectName?: string` -- Provide either this or `effectAsset`.
- `technique?: number` -- Default `0`.
- `defines?: MacroRecord | MacroRecord[]` -- Shader macros.
- `states?: PassOverrides | PassOverrides[]` -- Pipeline state overrides.

**Hidden Knowledge:**

- `initialize` only works once; subsequent calls are silently rejected with a warning (line 208-209).
- `setProperty` with `val = null` calls `pass.resetUniform(name)` or `pass.resetTexture(name)` (lines 494-495, 503-504).
- The `linear` flag in effect properties triggers automatic sRGB-to-linear conversion before setting (lines 487-490).
- `_uploadProperty` silently fails if `pass.getHandle(name)` returns null (line 481), which happens when the uniform name does not exist in the shader.
- Default material uses `builtin-unlit` effect with `USE_COLOR: true` and `mainColor: #ff00ff` (lines 543-549).

---

### 1.7 EffectAsset

**File:** `cocos/asset/assets/effect-asset.ts`

`EffectAsset` extends `Asset` and is the base template for Material instantiation. All effects are globally registered in a static map.

**Key static methods:**

- `EffectAsset.register(asset)` (line 246) -- Registers an effect globally by name.
- `EffectAsset.get(name): EffectAsset | null` (line 286) -- Retrieves by name or UUID. Warns (16101) for legacy builtin names.
- `EffectAsset.remove(asset)` (line 257) -- Unregisters an effect.
- `EffectAsset.getAll(): Record<string, EffectAsset>` (line 306) -- Returns all registered effects.

**Key properties:**

- `techniques: ITechniqueInfo[]` (line 338) -- Technique definitions (each contains passes).
- `shaders: IShaderInfo[]` (line 345) -- Compiled shader info including GLSL source.
- `combinations: IPreCompileInfo[]` (line 354) -- Pre-compile macro combinations.

**Hidden Knowledge:**

- `onLoaded` (line 372) automatically registers the effect and triggers shader precompilation.
- Effects are precompiled when `Game.EVENT_RENDERER_INITED` fires (line 383-388).
- If using the new rendering pipeline (`cclegacy.rendering.enableEffectImport`), effects are managed through `programLib` instead (line 373-378).
- Destroying an `EffectAsset` unregisters it from the global map (line 423).

---

### 1.8 Other Asset Types

| Class | File | Description |
|---|---|---|
| `JsonAsset` | `cocos/asset/assets/json-asset.ts` | Parsed JSON. Property `json: Record<string, any> | null` (line 42). |
| `SceneAsset` | `cocos/asset/assets/scene-asset.ts` | Scene wrapper. Property `scene: Scene | null` (line 44). |
| `TextAsset` | `cocos/asset/assets/text-asset.ts` | Raw text. |
| `BufferAsset` | `cocos/asset/assets/buffer-asset.ts` | Raw binary buffer. |
| `ImageAsset` | `cocos/asset/assets/image-asset.ts` | Image data source. Property `data` is the HTML element or ArrayBuffer. |
| `TextureBase` | `cocos/asset/assets/texture-base.ts` | Base for all textures. Provides `width`, `height`, `isCompressed`, `format`, `wrapMode`, `filter`. |
| `SimpleTexture` | `cocos/asset/assets/simple-texture.ts` | Base for Texture2D/TextureCube. Adds `uploadData`, `getGFXTexture`, mipmap management. |
| `RenderTexture` | `cocos/asset/assets/render-texture.ts` | Render-to-texture. |
| `Prefab` | `cocos/scene-graph/prefab/prefab.ts` | Prefab asset. Property `data: Node` (line 90). See section 3.3 for instantiation. |

---

### 1.9 Release Management

**File:** `cocos/asset/asset-manager/release-manager.ts`

The `ReleaseManager` class handles automatic and manual asset release.

**How releasing works (line 208-277):**

1. `tryRelease(asset, force?)` is the entry point. If `force` is true, release immediately. Otherwise, the asset is queued and freed in the next tick.
2. `_free(asset, force?)` checks validity, ignores assets in the `_dontDestroyAssets` list, and handles circular references via `checkCircularReference`.
3. When freed, the asset is removed from the `assets` cache, its dependencies have `decRef(false)` called recursively, and `asset.destroy()` is called (except in EDITOR).

**Hidden Knowledge:**

- Assets with `refCount > 0` are not released unless `force = true` OR there are no circular references keeping them alive (line 238-239).
- The `_autoRelease` method (line 165) is called during scene transitions. It decrements refs on old scene assets and transfers persist node refs to the new scene.
- `addIgnoredAsset(asset)` (line 121) prevents an asset from ever being auto-destroyed.
- In EDITOR mode, destroyed assets are not actually garbage collected; they are only removed from caches (line 258).

---

## 2. Input System

### 2.1 Input Singleton

**File:** `cocos/input/input.ts`

`Input` is the global singleton for all input events. Access it via `input` (line 570).

**Supported input sources:**

- Touch (`TouchInputSource`)
- Mouse (`MouseInputSource`)
- Keyboard (`KeyboardInputSource`)
- Accelerometer (`AccelerometerInputSource`)
- Gamepad (`GamepadInputDevice`)
- Handle/HMD/Handheld (VR/AR controllers)

**Key methods:**

- `on<K>(eventType, callback, target?)` (line 221) -- Registers an input event listener. Returns the callback.
- `once<K>(eventType, callback, target?)` (line 236) -- Registers a one-time listener.
- `off<K>(eventType, callback?, target?)` (line 251) -- Removes a listener. Note: `off` is a no-op in EDITOR_NOT_IN_PREVIEW (line 252).
- `getTouch(touchID): Readonly<Touch> | undefined` (line 264) -- Gets a touch by ID.
- `getAllTouches(): Touch[]` (line 274) -- Gets all active touches.
- `getTouchCount(): number` (line 284) -- Number of active touches.
- `setAccelerometerEnabled(isEnable)` (line 295) -- Enables/disables accelerometer.
- `setAccelerometerInterval(intervalInMileSeconds)` (line 313) -- Sets accelerometer polling interval.

**Hidden Knowledge:**

- Mouse events automatically simulate corresponding touch events (line 320-335). When the mouse is pressed, `TOUCH_START` is simulated; during move, `TOUCH_MOVE`; on release, `TOUCH_END`.
- The `_needSimulateTouchMoveEvent` flag (line 154) ensures touch-move simulation only happens between mouse-down and mouse-up.
- On native platforms, keyboard and accelerometer events are batched per frame via `_frameDispatchEvents` (line 506). On web, they dispatch immediately.
- Touch events are dispatched one touch at a time from the changed touches array (line 493-500), with propagation reset between each.
- An `IEventDispatcher` list (line 157) is sorted by priority. The UI dispatcher has priority 1, the global dispatcher has priority 0 (line 36-37).

---

### 2.2 Event Types & Enums

**File:** `cocos/input/types/event-enum.ts`

**InputEventType enum (line 277):**

| Event | Value | Description |
|---|---|---|
| `TOUCH_START` | `'touch-start'` | Finger touches screen |
| `TOUCH_MOVE` | `'touch-move'` | Finger moves on screen |
| `TOUCH_END` | `'touch-end'` | Finger lifts from screen |
| `TOUCH_CANCEL` | `'touch-cancel'` | Touch interrupted (e.g., system dialog) |
| `MOUSE_DOWN` | `'mouse-down'` | Mouse button pressed |
| `MOUSE_MOVE` | `'mouse-move'` | Mouse moves |
| `MOUSE_UP` | `'mouse-up'` | Mouse button released |
| `MOUSE_WHEEL` | `'mouse-wheel'` | Scroll wheel |
| `MOUSE_LEAVE` | `'mouse-leave-window'` | Mouse leaves window |
| `MOUSE_ENTER` | `'mouse-enter-window'` | Mouse enters window |
| `KEY_DOWN` | `'keydown'` | Key pressed (fires once) |
| `KEY_PRESSING` | `'key-pressing'` | Key held down (continuous) |
| `KEY_UP` | `'keyup'` | Key released |
| `DEVICEMOTION` | `'devicemotion'` | Accelerometer data |
| `GAMEPAD_INPUT` | `'gamepad-input'` | Gamepad button/axis |
| `GAMEPAD_CHANGE` | `'gamepad-change'` | Gamepad connect/disconnect |
| `HANDLE_INPUT` | `'handle-input'` | 6DOF handle input |
| `HANDLE_POSE_INPUT` | `'handle-pose-input'` | Handle pose |
| `HMD_POSE_INPUT` | `'hmd-pose-input'` | HMD pose |
| `HANDHELD_POSE_INPUT` | `'handheld-pose-input'` | Handheld device pose |

**Important:** The deprecated `SystemEventType` (line 34) has the same string values as `InputEventType` for touch/mouse/key events, which is why `SystemEvent` can forward them. However, `SystemEventType` also includes node events (`TRANSFORM_CHANGED`, `SIZE_CHANGED`, etc.) which are now on `Node.EventType`.

---

### 2.3 EventTouch

**File:** `cocos/input/types/event/event-touch.ts`

**Key properties:**

- `touch: Touch | null` (line 51) -- The current touch being processed.
- `simulate: boolean` (line 56) -- Whether this event was simulated from a mouse event.
- `preventSwallow: boolean` (line 75) -- Set to `true` to allow the event to pass through to nodes below. Reduces dispatch efficiency.
- `windowId: number` (line 62) -- The window that triggered the event.

**Key methods:**

- `getTouches(): Touch[]` (line 111) -- Returns only the *changed* touches, not all touches.
- `getAllTouches(): Touch[]` (line 120) -- Returns all active touches. Note: on `TOUCH_END`, the ended finger is NOT in this list.
- `getLocation(out?): Vec2` (line 141) -- Current touch position in OpenGL coordinates.
- `getUILocation(out?): Vec2` (line 150) -- Current touch position in UI coordinates.
- `getDelta(out?): Vec2` (line 203) -- Movement since last event.
- `getID(): number | null` (line 194) -- Touch point identifier for multi-touch tracking.

**Hidden Knowledge:**

- `getTouches()` vs `getAllTouches()`: If you press finger A, then press finger B, the `TOUCH_START` event for B will only contain B in `getTouches()`, but both A and B in `getAllTouches()`.
- For `TOUCH_END`, `getTouches()` returns the ended finger, but `getAllTouches()` does NOT include it (it was already removed).
- `preventSwallow = true` is experimental and reduces event dispatch performance.

---

### 2.4 EventMouse

**File:** `cocos/input/types/event/event-mouse.ts`

**Key properties:**

- `movementX: number` (line 94) -- Movement delta in UI coordinate system.
- `movementY: number` (line 100) -- Movement delta in UI coordinate system.
- `preventSwallow: boolean` (line 119) -- Same as EventTouch.
- `windowId: number` (line 106)

**Button constants:**

- `EventMouse.BUTTON_MISSING = -1` (line 40)
- `EventMouse.BUTTON_LEFT = 0` (line 47)
- `EventMouse.BUTTON_MIDDLE = 1` (line 58)
- `EventMouse.BUTTON_RIGHT = 2` (line 53)

**Key methods:**

- `getLocation(out?): Vec2` (line 203) -- Position relative to bottom-left.
- `getUILocation(out?): Vec2` (line 231) -- Position in UI coordinates.
- `getScrollX(): number` (line 175), `getScrollY(): number` (line 183) -- Scroll wheel values.
- `getButton(): number` (line 343) -- Which mouse button.
- `getDelta(out?): Vec2` (line 275) -- Delta from previous position.
- `getDeltaX(): number` (line 288), `getDeltaY(): number` (line 297)
- `getUILocationX(): number` (line 367), `getUILocationY(): number` (line 377) -- UI-space coordinates accounting for viewport offset and scale.

---

### 2.5 EventKeyboard

**File:** `cocos/input/types/event/event-keyboard.ts`

**Key properties:**

- `keyCode: KeyCode` (line 47) -- The KeyCode enum value (see `cocos/input/types/key-code.ts`).
- `isPressed: boolean` (line 62, read-only) -- Whether the key is being held down.
- `rawEvent?: KeyboardEvent` (line 55) -- Original DOM event. Deprecated since v3.3.

**KeyCode enum** (`cocos/input/types/key-code.ts`):

Common values: `NONE = 0`, `BACKSPACE = 8`, `TAB = 9`, `ENTER = 13`, `SHIFT_LEFT = 16`, `CTRL_LEFT = 17`, `ALT_LEFT = 18`, `ESCAPE = 27`, `SPACE = 32`, `LEFT = 37`, `UP = 38`, `RIGHT = 39`, `DOWN = 40`.

---

### 2.6 Touch Class

**File:** `cocos/input/types/touch.ts`

`Touch` represents a single touch point with position history.

**Key methods:**

- `getLocation(out?): Vec2` (line 60) -- Current position in OpenGL coordinates.
- `getUILocation(out?): Vec2` (line 90) -- Current position in UI coordinates.
- `getPreviousLocation(out?): Vec2` (line 125) -- Previous position.
- `getStartLocation(out?): Vec2` (line 154) -- Position when touch began.
- `getDelta(out?): Vec2` (line 183) -- Delta from previous to current.
- `getUIDelta(out?): Vec2` (line 198) -- UI-space delta.
- `getID(): number` (line 257) -- Touch identifier.
- `clone(): Touch` (line 332) -- Creates a copy of the touch.

**Hidden Knowledge:**

- `getLocation` returns OpenGL coordinates (bottom-left origin). `getUILocation` converts to UI space.
- `getUILocationX/Y` (lines 104-117) manually compute UI coordinates using `view.getViewportRect()` and `view.getScaleX/Y()`, which is different from `getUILocation` that delegates to `View._convertToUISpace`.
- Pass an `out` Vec2 to avoid GC pressure from allocating new Vec2 objects.

---

### 2.7 SystemEvent (Deprecated)

**File:** `cocos/input/system-event.ts`

`SystemEvent` is deprecated since v3.4.0. Use `input` and `InputEventType` instead.

The old `systemEvent.on(SystemEventType.KEY_DOWN, ...)` pattern is replaced by:
```ts
input.on(InputEventType.KEY_DOWN, (event) => { ... });
```

**Critical difference:** In the old SystemEvent, touch callbacks received `(touch, event)` as separate arguments (line 82-85). In the new `input`, the callback receives only `(event: EventTouch)`, and you access the touch via `event.touch`.

---

### 2.8 Input Dispatching Internals

**How events flow:**

1. Platform-specific input sources (TouchInputSource, MouseInputSource, etc.) emit raw events.
2. The `Input` class registers listeners on each source (line 361-468).
3. Events are emitted through `_emitEvent` (line 345), which iterates the `_eventDispatcherList` sorted by priority.
4. The first dispatcher is `InputEventDispatcher` which emits to the `EventTarget`.
5. On native platforms, keyboard/accelerometer/gamepad events are queued and dispatched in `_frameDispatchEvents` (line 506) during the main loop.

**Event propagation on nodes:**

- Input events dispatched through `input.on()` are global (not node-specific).
- For node-level touch/mouse events, use `node.on(Node.EventType.TOUCH_START, ...)` which goes through the scene's `NodeEventProcessor`.
- Events support capture/bubble phases as defined in the `Event` base class (line 98-128 in event.ts).

---

## 3. Serialization System

### 3.1 CCON Format

**File:** `cocos/serialization/ccon.ts`

CCON (Cocos Container) is a binary format for packaging a JSON document with binary chunks.

**Class `CCON` (line 35):**

- `document: unknown` (line 41, read-only) -- The JSON portion.
- `chunks: Uint8Array[]` (line 45, read-only) -- Binary data chunks.

**Key functions:**

- `encodeCCONBinary(ccon: CCON): Uint8Array` (line 53) -- Encodes a CCON to binary.
- `decodeCCONBinary(bytes: Uint8Array): CCON` (line 86) -- Decodes binary to CCON.

**Binary format:**

- Magic: `0x4E4F4343` ("CCON")
- Version: 2 (uses notepack encoding). Version 1 used raw JSON.
- Header (12 bytes): magic(4) + version(4) + totalSize(4)
- JSON section: length(4) + json data
- Chunks: each padded to 8-byte alignment, with length(4) + data

**Hidden Knowledge:**

- Version 1 uses `JSON.parse` on UTF-8 decoded text. Version 2 uses `notepackDecode` (MessagePack variant).
- Minimum binary size is 16 bytes (line 87); smaller inputs throw `InvalidCCONError`.
- CCON is used internally for packed assets and binary serialization.

---

### 3.2 Deserializer

**File:** `cocos/serialization/deserialize.ts`

The deserializer reconstructs objects from the engine's compiled JSON format. This is the core of the asset loading pipeline.

**Main function:**

- `deserialize(data, details?, options?): unknown` (line 938) -- Entry point. Accepts a string (parsed as JSON), compiled JSON array, or dynamic JSON.

**`Details` class (line 446):**

Collects asset dependency information during deserialization.

- `uuidObjList` -- Objects that reference assets.
- `uuidPropList` -- Property names of asset references.
- `uuidList` -- UUIDs of dependent assets.
- `uuidTypeList` -- Types of dependent assets.
- `push(obj, propName, uuid, type?)` (line 536) -- Records a dependency.

**Compiled JSON format (`IFileData`, line 344):**

- `[0]` Version number
- `[1]` Shared UUIDs
- `[2]` Shared strings
- `[3]` Shared classes (type definitions)
- `[4]` Shared masks (object layouts)
- `[5]` Instances (object data)
- `[6]` Instance types
- `[7]` References (cross-references between objects)
- `[8]` Dependency objects
- `[9]` Dependency keys
- `[10]` Dependency UUID indices

**Key internal functions:**

- `isCompiledJson(json): boolean` (line 889) -- Checks if data is compiled format (array with numeric version at index 0).
- `dereference(refs, instances, strings)` (line 567) -- Resolves cross-references between deserialized objects.
- `parseUuidDependencies(serialized): string[]` (line 1057) -- Extracts UUID dependencies from serialized data.

**DataTypeID enum (line 92):**

Defines the type of each serialized field: `SimpleType` (0), `InstanceRef` (1), `Array_InstanceRef` (2), `Class` (4), `ValueTypeCreated` (5), `AssetRefByInnerObj` (6), `TRS` (7), `ValueType` (8), `CustomizedClass` (10), `Dict` (11), `Array` (12).

**Hidden Knowledge:**

- If `data` is a string, it is parsed with `JSON.parse` first (line 939-941).
- `Details` uses an object pool (`Details.pool`, line 477) to avoid allocation overhead.
- Missing classes are handled lazily: a proxy constructor is generated that resolves the actual class on first instantiation (line 809-814).
- The `File.Version` check (line 914-916) requires version >= 1 (`SUPPORT_MIN_FORMAT_VERSION`).
- `FORCE_COMPILED` (line 37) is currently `false`, so both compiled and dynamic paths are available.
- `unpackJSONs` (line 1008) splits packed file data into individual sections for batch deserialization.

---

### 3.3 Instantiate

**File:** `cocos/serialization/instantiate.ts`

The `instantiate` function creates deep clones of nodes and objects, or instantiates Prefabs.

**Main function:**

- `instantiate(prefab: Prefab): Node` (line 84) -- Instantiates a node from a Prefab.
- `instantiate<T>(original: T): T` (line 103) -- Clones any CCObject.

**Instantiation flow (line 105-148):**

1. If `original` is a CCObject with `_instantiate`, it is called directly (line 128). This is the path for Prefabs.
2. If `original` is an Asset, an error is thrown -- you cannot clone Assets directly (line 136).
3. Otherwise, `doInstantiate` creates a new instance by copying all properties.

**Key internal functions:**

- `doInstantiate(obj, parent?)` (line 162) -- Creates a clone using the constructor and copies all properties via `enumerateObject`.
- `enumerateCCClass(klass, obj, clone, parent)` (line 197) -- Copies CCClass properties, using `ValueType.set()` for value types.
- `enumerateObject(obj, clone, parent)` (line 217) -- Walks object properties. Uses `_iN$t` as a temporary marker to handle circular references.
- `instantiateObj(obj, parent)` (line 256) -- Recursively clones sub-objects. Assets are referenced, not cloned (line 262). ValueType instances are cloned (line 258).

**Hidden Knowledge:**

- Assets are **always referenced, never cloned** (line 262). This is a critical behavior.
- The `_iN$t` property (line 220) is used to detect and handle circular references during deep copy. It is cleaned up after instantiation (lines 186-189).
- `game._isCloning` flag (line 127) is set during instantiation to inform the engine.
- Only properties that exist on the source object are copied. `__`-prefixed properties (except `__type__` and `__prefab`) are skipped (line 230-231).
- `persistent` flag on nodes is preserved via `PersistentMask` (line 248).

---

### 3.4 Instantiate-JIT

**File:** `cocos/serialization/instantiate-jit.ts`

Generates optimized JavaScript code for repeated Prefab instantiation. This is the "JIT compilation" path for Prefabs.

Used by `Prefab.compileCreateFunction()` (`cocos/scene-graph/prefab/prefab.ts`, line 137) when `SUPPORT_JIT` is true.

**How Prefab instantiation optimization works (`cocos/scene-graph/prefab/prefab.ts`):**

- `OptimizationPolicy.AUTO` (line 49): First 3 instantiations use standard cloning; after that, switches to JIT.
- `OptimizationPolicy.SINGLE_INSTANCE` (line 55): Always uses standard cloning.
- `OptimizationPolicy.MULTI_INSTANCE` (line 64): Always uses JIT code generation.
- The threshold is `Prefab.OptimizationPolicyThreshold = 3` (line 82).

**Hidden Knowledge:**

- JIT compilation is only available on platforms that support `new Function()` (not available on all mini-game platforms).
- `compile` generates a JavaScript function string that directly constructs the node tree, avoiding the generic property-walking loop.

---

## 4. File Path Index

### Asset Module

| Class | File | Key Lines |
|---|---|---|
| Asset | `cocos/asset/assets/asset.ts` | uuid:160, addRef:316, decRef:331, destroy:387 |
| TextureBase | `cocos/asset/assets/texture-base.ts` | width:64, height:72, isCompressed:47 |
| SimpleTexture | `cocos/asset/assets/simple-texture.ts` | uploadData:151, getGFXTexture:105, mipmapLevel:96 |
| Texture2D | `cocos/asset/assets/texture-2d.ts` | mipmaps:96, image:157, reset:192, destroy:262 |
| SpriteFrame | `cocos/2d/assets/sprite-frame.ts` | texture:432, rect:357, createWithImage:259, reset:815, clone:1331 |
| Material | `cocos/asset/assets/material.ts` | initialize:207, setProperty:303, getProperty:345, copy:370 |
| EffectAsset | `cocos/asset/assets/effect-asset.ts` | register:246, get:286, onLoaded:372, techniques:338 |
| JsonAsset | `cocos/asset/assets/json-asset.ts` | json:42 |
| SceneAsset | `cocos/asset/assets/scene-asset.ts` | scene:44 |
| Prefab | `cocos/scene-graph/prefab/prefab.ts` | data:90, _instantiate:168, createNode:121 |
| AssetManager | `cocos/asset/asset-manager/asset-manager.ts` | loadAny:558, loadRemote:649, loadBundle:707, releaseAsset:754 |
| Bundle | `cocos/asset/asset-manager/bundle.ts` | load:242, loadDir:362, loadScene:460, get:559, release:591, releaseAll:631 |
| ReleaseManager | `cocos/asset/asset-manager/release-manager.ts` | tryRelease:208, _free:231 |

### Input Module

| Class | File | Key Lines |
|---|---|---|
| Input | `cocos/input/input.ts` | on:221, once:236, off:251, getTouch:264, _frameDispatchEvents:506 |
| InputEventType | `cocos/input/types/event-enum.ts` | TOUCH_START:285, KEY_DOWN:367, MOUSE_DOWN:319 |
| Event (base) | `cocos/input/types/event/event.ts` | propagationStopped:189, propagationImmediateStopped:199, bubbles:147 |
| EventTouch | `cocos/input/types/event/event-touch.ts` | touch:51, preventSwallow:75, getTouches:111, getAllTouches:120 |
| EventMouse | `cocos/input/types/event/event-mouse.ts` | getButton:343, getScrollX/Y:175/183, getLocation:203, preventSwallow:119 |
| EventKeyboard | `cocos/input/types/event/event-keyboard.ts` | keyCode:47, isPressed:62 |
| Touch | `cocos/input/types/touch.ts` | getLocation:60, getUILocation:90, getDelta:183, getID:257 |
| SystemEvent | `cocos/input/system-event.ts` | (deprecated) use input instead |
| KeyCode | `cocos/input/types/key-code.ts` | ENTER:58, SPACE:100, ESCAPE:94 |

### Serialization Module

| Class/Function | File | Key Lines |
|---|---|---|
| CCON | `cocos/serialization/ccon.ts` | CCON:35, encodeCCONBinary:53, decodeCCONBinary:86 |
| deserialize | `cocos/serialization/deserialize.ts` | deserialize:938, Details:446, isCompiledJson:889, parseUuidDependencies:1057 |
| instantiate | `cocos/serialization/instantiate.ts` | instantiate:105, doInstantiate:162 |
| instantiate-jit | `cocos/serialization/instantiate-jit.ts` | compile (imported by Prefab at prefab.ts:28) |

---

*Generated from cocos-engine source. All line numbers reference the files as of the current checkout.*

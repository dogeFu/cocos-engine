# Cocos Creator Engine - Extras Module Documentation

This document covers supplementary engine modules: Spine and DragonBones skeletal animation, Video playback, WebView, Profiler, Native Bindings, and Miscellaneous components.

---

## 1. Spine Runtime Integration (`cocos/spine/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `Skeleton` | `cocos/spine/skeleton.ts` | Main component for Spine skeletal animation playback. Extends `UIRenderer`. |
| `SkeletonData` | `cocos/spine/skeleton-data.ts` | Asset class holding Spine skeleton JSON/binary data, atlas text, textures, and scale. |
| `SpineSocket` | `cocos/spine/skeleton.ts:161` | Data class for bone sockets -- attaches a Node to a bone path so it follows bone transforms. |
| `AttachUtil` | `cocos/spine/attach-util.ts` | Internal tool that synchronizes attached Node transforms with bone world matrices each frame. |
| `TrackEntryListeners` | `cocos/spine/track-entry-listeners.ts` | Static registry mapping numeric listener IDs to per-track-entry callback objects (start, end, complete, event, etc.). |
| `VertexEffectDelegate` | `cocos/spine/vertex-effect-delegate.ts` | Wrapper for Spine vertex effects (jitter, swirl). Only functional with Spine 3.8 runtime. |
| `AnimationCache` (spine) | `cocos/spine/skeleton-cache.ts:76` | Pre-computes all frames of an animation for cached playback modes. |
| `SkeletonCache` | `cocos/spine/skeleton-cache.ts` | Manages per-asset animation caches. Has a static `sharedCache` singleton for SHARED_CACHE mode. |

### Important Enums

- **`SpineAnimationCacheMode`** (`skeleton.ts:70`): `UNSET (-1)`, `REALTIME (0)`, `SHARED_CACHE (1)`, `PRIVATE_CACHE (2)`.
- **`SpineMaterialType`** (`skeleton.ts:126`): `COLORED_TEXTURED (0)`, `TWO_COLORED (1)`.

### Important Interfaces & APIs

#### `sp.Skeleton` (Component)

**Core Properties:**
- `skeletonData: SkeletonData | null` -- The skeleton data asset. Setting it resets skin, animation, cache, and rebuilds internals.
- `animation: string` -- Current animation name. Setting it calls `setAnimation(0, value, this.loop)`.
- `defaultSkin: string` -- Default skin name applied on load.
- `defaultAnimation: string` -- Default animation name applied on load.
- `loop: boolean` -- Whether the default animation loops (default `true`).
- `timeScale: number` -- Per-instance time scale multiplier. Applied as `this._timeScale * timeScale` (module-level global).
- `premultipliedAlpha: boolean` -- Texture premultiplied alpha flag (default `true`).
- `useTint: boolean` -- Enable two-color tinting.
- `enableBatch: boolean` -- Enable draw call batching for identical textures.
- `sockets: SpineSocket[]` -- Array of bone sockets.
- `paused: boolean` -- Public field; when true, `updateAnimation` returns early.
- `loop: boolean` -- Public serializable field controlling default animation loop.

**Playback Methods:**
- `setAnimation(trackIndex: number, name: string, loop?: boolean): spine.TrackEntry | null` -- Sets animation on a track. In cached mode, only track 0 is supported.
- `addAnimation(trackIndex: number, name: string, loop: boolean, delay?: number): spine.TrackEntry | null` -- Queues an animation after current. In cached mode, pushes to an internal queue (trackIndex must be 0).
- `clearAnimation(trackIndex?: number): void` -- Clears the specified track and resets to setup pose. Default trackIndex is 0.
- `clearTracks(): void` -- Clears all tracks.
- `setMix(fromAnimation: string, toAnimation: string, duration: number): void` -- Sets cross-fade duration between two animations. NOT supported in cached mode.
- `setSkin(name: string): void` -- Activates a skin by name.
- `setToSetupPose(): void` -- Resets bones and slots to setup pose.
- `setBonesToSetupPose(): void` / `setSlotsToSetupPose(): void` -- Partial reset.
- `setSlotTexture(slotName: string, tex2d: Texture2D, createNew?: boolean): void` -- Replaces a slot's texture at runtime. NOT supported in cached mode.

**Query Methods:**
- `findBone(boneName: string): spine.Bone | null`
- `findSlot(slotName: string): spine.Slot | null`
- `findAnimation(name: string): spine.Animation | null`
- `getCurrent(trackIndex: number): spine.TrackEntry | null` -- Warns in cached mode.
- `getAttachment(slotName: string, attachmentName: string): spine.Attachment | null`
- `setAttachment(slotName: string, attachmentName: string): void` -- Also invalidates animation cache.
- `querySockets(): string[]` -- Returns sorted array of all available bone paths.
- `isAnimationCached(): boolean` -- Returns `true` when mode is SHARED_CACHE or PRIVATE_CACHE.

**Event Listener Methods (per-track-entry):**
- `setStartListener(listener)` / `setEndListener(listener)` / `setCompleteListener(listener)` / `setEventListener(listener)` etc.
- `setTrackStartListener(entry, listener)` / `setTrackCompleteListener(entry, listener)` / `setTrackEventListener(entry, listener)` etc.

**Cache Mode:**
- `setAnimationCacheMode(cacheMode: SpineAnimationCacheMode): void` -- Best called before setting `skeletonData`.
- `invalidAnimationCache(): void` -- Forces cache recomputation.

#### `sp.SkeletonData` (Asset)

- `skeletonJson: spine.SkeletonJson` -- Setter parses JSON string, sets `_uuid` from skeleton hash if empty.
- `atlasText: string` -- Atlas description text.
- `textures: Texture2D[]` -- Array of texture assets.
- `textureNames: string[]` -- Corresponding texture names.
- `scale: number` -- Global scale for bone positions, image sizes, and animation translations (default `1`).
- `getRuntimeData(quiet?: boolean): spine.SkeletonData | null` -- Creates/caches the spine runtime data. Uses WASM utility for binary/json parsing and registers with a merged UUID.
- `getSkinsEnum()` / `getAnimsEnum()` -- Editor-only enum generators for inspector.

### Internal Mechanisms

1. **WASM Integration**: `SkeletonData.getRuntimeData()` delegates to `spine.wasmUtil` for JSON/binary parsing. Data is cached by a UUID that merges the asset UUID with a murmurhash of atlas text + texture IDs (`skeleton-data.ts:282-291`).

2. **Cache System**: In SHARED_CACHE mode, all Skeleton instances share `SkeletonCache.sharedCache`. In PRIVATE_CACHE, each gets its own `SkeletonCache` instance. Animation frames are precomputed at fixed 1/60s intervals and stored as vertex/index arrays.

3. **AttachUtil**: On each frame update (via `syncAttachedNode`), iterates socket nodes and copies bone `a/b/c/d/worldX/worldY` into a `Mat4` that is assigned to the target Node's matrix (`attach-util.ts:88-97`). Spine uses a different matrix layout than DragonBones -- note `m04 = bone.b` and `m05 = bone.d` (no sign flip).

4. **TrackEntryListeners**: Uses a global ID counter system. Listeners are stored in static Maps (`_listenerSet`, `_trackSet`). The `TrackEntryListeners` class is assigned to `globalThis` for WASM callback access (`track-entry-listeners.ts:149`).

5. **Editor Behavior**: In editor (`EDITOR_NOT_IN_PREVIEW`), `__preload` sets `this.paused = true` and skeleton is not added to the SkeletonSystem update loop.

### Hidden Knowledge

- **Skin must be set before animation**: The comment at `skeleton.ts:798` explicitly states that animation depends on skin. Setting animation before skin causes rendering issues with prefabs.
- **Global timeScale**: The module exports a mutable `timeScale = 1.0` at module level. Per-instance `timeScale` multiplies with this global.
- **`setMix` is disabled in cached mode**: Will log warning 16415 and return.
- **`setSlotTexture` is disabled in cached mode**: Will throw an error.
- **`getCurrent` returns null in cached mode** with a warning.
- **Vertex effects only work with Spine 3.8**: `setVertexEffectDelegate` checks `SPINE_VERSION !== '3.8'` and warns (16409).
- **Socket target nodes must be direct children** of the skeleton's node (`_verifySockets` at `skeleton.ts:1563-1583`).
- **Material cache key format**: `${type}/${src}/${dst}` for blend factor combinations.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/spine/skeleton.ts` | `Skeleton` class (line 210), `setAnimation` (947), `addAnimation` (1001), `setMix` (1504), `setSkin` (1061), `setAnimationCacheMode` (1394), `setSlotTexture` (1920), `setStartListener` (1783), `setCompleteListener` (1823) |
| `cocos/spine/skeleton-data.ts` | `SkeletonData` class (line 41), `getRuntimeData` (199), `getSkinsEnum` (242), `getAnimsEnum` (263), `mergedUUID` (282) |
| `cocos/spine/attach-util.ts` | `AttachUtil` class (line 38), `matrixHandle` (88) |
| `cocos/spine/track-entry-listeners.ts` | `TrackEntryListeners` class (line 35), `getListeners` (43), `emitListener` (53), `addListener` (135) |
| `cocos/spine/vertex-effect-delegate.ts` | `VertexEffectDelegate` class (line 34), `initJitter` (71), `initSwirlWithPow` (85) |
| `cocos/spine/skeleton-cache.ts` | `AnimationCache` (line 76), `SkeletonCache` (line 200+), `FrameBoneInfo` (38) |
| `cocos/spine/lib/spine-version.ts` | `SPINE_VERSION = '3.8'` (line 25) |

---

## 2. DragonBones Runtime Integration (`cocos/dragon-bones/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `ArmatureDisplay` | `cocos/dragon-bones/ArmatureDisplay.ts` | Main component for DragonBones skeletal animation. Extends `UIRenderer`. |
| `DragonBonesAsset` | `cocos/dragon-bones/DragonBonesAsset.ts` | Asset holding DragonBones JSON data. |
| `DragonBonesAtlasAsset` | `cocos/dragon-bones/DragonBonesAtlasAsset.ts` | Asset holding atlas JSON + texture for DragonBones. |
| `ArmatureCache` | `cocos/dragon-bones/ArmatureCache.ts:487` | Manages cached armature data and animation caches. Has static `sharedCache`. |
| `AnimationCache` (DB) | `cocos/dragon-bones/ArmatureCache.ts:104` | Pre-computes all animation frames at 1/60s intervals. |
| `AttachUtil` (DB) | `cocos/dragon-bones/AttachUtil.ts` | Synchronizes socket Node transforms with bone matrices. |
| `DragonBoneSocket` | `cocos/dragon-bones/ArmatureDisplay.ts:130` | Data class for bone-to-node socket binding. |
| `CCFactory` | `cocos/dragon-bones/CCFactory.ts` | Singleton factory for building armatures and managing DragonBones data. |
| `CCArmatureDisplay` | `cocos/dragon-bones/CCArmatureDisplay.ts` | Display proxy for armature in REALTIME mode. |

### Important Enums

- **`AnimationCacheMode`** (`ArmatureDisplay.ts:75`): `REALTIME (0)`, `SHARED_CACHE (1)`, `PRIVATE_CACHE (2)`.
- **`ResourceType`** (for video, not DB): `REMOTE (0)`, `LOCAL (1)`.

### Important Interfaces & APIs

#### `dragonBones.ArmatureDisplay` (Component)

**Core Properties:**
- `dragonAsset: DragonBonesAsset | null` -- The skeleton data asset. Setting triggers full rebuild.
- `dragonAtlasAsset: DragonBonesAtlasAsset | null` -- The atlas texture asset. Setting triggers re-parse and rebuild.
- `armatureName: string` -- Name of the armature to display.
- `animationName: string` -- Current animation name.
- `timeScale: number` -- Animation time scale (default `1`).
- `playTimes: number` -- Loop count: `-1` = use config, `0` = infinite, `>0` = repeat count.
- `premultipliedAlpha: boolean` -- Texture premultiplied alpha (default `false`, unlike Spine).
- `debugBones: boolean` -- Show bone debug lines.
- `enableBatch: boolean` -- Enable draw call batching.
- `sockets: DragonBoneSocket[]` -- Bone socket array.

**Playback Methods:**
- `playAnimation(animName: string, playTimes?: number): AnimationState | null` -- Plays specified animation. Returns `AnimationState` in REALTIME mode, `null` in cached mode.
- `setAnimationCacheMode(cacheMode: AnimationCacheMode): void` -- Switch cache mode. Must be set before `dragonAsset` for optimal performance.
- `isAnimationCached(): boolean` -- True if SHARED_CACHE or PRIVATE_CACHE.
- `invalidAnimationCache(): void` -- Invalidates all cached animation frames.
- `updateAnimationCache(animName: string): void` -- Pre-computes all frames for the named animation.

**Query Methods:**
- `getArmatureNames(): string[]` -- All armature names in the DragonBones data.
- `getAnimationNames(armatureName: string): string[]` -- All animation names for a given armature.
- `getArmatureKey(): string` -- Returns the cache key used for armature data. Used for slot display replacement.
- `armature(): Armature | null` -- Returns the underlying DragonBones `Armature` object.
- `querySockets(): string[]` -- All available bone paths.
- `querySocketPathByName(name: string): string[]` -- Filter socket paths by bone/slot name suffix.

**Event Methods (EventTarget-based):**
- `on(eventType: string, listener, target)` / `off(...)` / `once(...)` / `addEventListener(...)` / `removeEventListener(...)`
- Event types: `EventObject.START`, `EventObject.LOOP_COMPLETE`, `EventObject.COMPLETE` (emitted by cache mode).

**Factory Access:**
- `buildArmature(armatureName: string, node?: Node): ArmatureDisplay` -- Creates a new ArmatureDisplay via the factory.

#### `dragonBones.DragonBonesAsset` (Asset)

- `dragonBonesJson: string` -- Setter parses JSON and resets state.
- `init(factory?: CCFactory, atlasUUID?: string): string` -- Parses data into factory, returns armature key (`uuid#atlasUUID`).
- `getArmatureEnum()` / `getAnimsEnum(armatureName)` -- Editor enum generators.

#### `dragonBones.DragonBonesAtlasAsset` (Asset)

- `atlasJson: string` -- Atlas JSON string.
- `texture: Texture2D | null` -- The atlas texture.
- `init(factory: CCFactory): void` -- Parses atlas data into the factory.

### Internal Mechanisms

1. **Factory Pattern**: `CCFactory.getInstance()` provides a singleton factory. `DragonBonesAsset.init()` parses raw JSON into the factory keyed by `${uuid}#${atlasUUID}`. Armatures are built via `factory.buildArmatureDisplay()`.

2. **Cache System**: Similar to Spine. `ArmatureCache.sharedCache` for SHARED_CACHE. Frames are precomputed at 1/60s (`ArmatureCache.FrameTime`). The `AnimationCache._traverseArmature()` method walks all slots, transforms vertices, and stores per-segment texture/blend data.

3. **AttachUtil (DB)**: Unlike Spine's version, DragonBones uses `bone.globalTransformMatrix` with fields `a/b/c/d/tx/ty`. The matrix mapping uses `m04 = -boneMat.c` and `m05 = -boneMat.d` (note the sign flip vs Spine).

4. **Armature Cacheability Check**: `ArmatureCache.canCache()` returns `false` if any slot has a `childArmature` (nested armatures cannot be cached). This falls back to REALTIME mode automatically.

5. **Socket System**: Bones are indexed by walking the bone hierarchy and building full path strings (`parentBone/childBone`). The `_indexBoneSockets()` method at `ArmatureDisplay.ts:1212` handles this recursively, including child armatures.

### Hidden Knowledge

- **Cache mode should be set before dragonAsset**: The doc comment at `ArmatureDisplay.ts:807` explicitly warns about this.
- **Nested armatures fall back to REALTIME**: When cache mode is set but `ArmatureCache.canCache()` returns false, it silently falls back to REALTIME with a warning (`ArmatureDisplay.ts:357-360`).
- **`premultipliedAlpha` defaults to `false`** for DragonBones (unlike Spine which defaults to `true`).
- **Debug bones invalid in cached mode**: Warning 16418 in Spine; for DB, the `_buildArmature` method warns at `ArmatureDisplay.ts:1091`.
- **Socket target nodes must be direct children** of the ArmatureDisplay node.
- **Both DragonBones and Spine use `default-spine-material`** as their builtin material.
- **MaxCacheTime**: Both systems limit cache to 30 seconds of animation data.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/dragon-bones/ArmatureDisplay.ts` | `ArmatureDisplay` class (186), `playAnimation` (1269), `setAnimationCacheMode` (821), `getArmatureKey` (802), `buildArmature` (1457) |
| `cocos/dragon-bones/DragonBonesAsset.ts` | `DragonBonesAsset` class (41), `init` (99), `getArmatureEnum` (136) |
| `cocos/dragon-bones/DragonBonesAtlasAsset.ts` | `DragonBonesAtlasAsset` class (43), `init` (117) |
| `cocos/dragon-bones/ArmatureCache.ts` | `AnimationCache` (104), `ArmatureCache` (487), `canCache` (653), `FrameTime` (664) |
| `cocos/dragon-bones/AttachUtil.ts` | `AttachUtil._syncAttachedNode` (77), `matrixHandle` (91) |

---

## 3. Video Playback (`cocos/video/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `VideoPlayer` | `cocos/video/video-player.ts` | Main component for playing video. Requires `UITransform`. |
| `VideoClip` | `cocos/video/assets/video-clip.ts` | Asset type for local video files. |
| `VideoPlayerImplWeb` | `cocos/video/video-player-impl-web.ts` | Web platform implementation using `<video>` element. |
| `VideoPlayerImpl` | `cocos/video/video-player-impl.ts` | Abstract base class for platform implementations. |
| `VideoPlayerImplManager` | `cocos/video/video-player-impl-manager.ts` | Factory that returns `VideoPlayerImplWeb` for web platform. |

### Important Enums

- **`VideoPlayerEventType`** (`video-player-enums.ts:48`): `NONE`, `PLAYING`, `PAUSED`, `STOPPED`, `COMPLETED`, `META_LOADED`, `READY_TO_PLAY`, `ERROR`, `CLICKED`.
- **`ResourceType`** (`video-player-enums.ts:31`): `REMOTE (0)`, `LOCAL (1)`.
- **`READY_STATE`** (`video-player-enums.ts:97`): `HAVE_NOTHING` through `HAVE_ENOUGH_DATA` (HTML5 video readyState mapping).

### Important APIs

#### `cc.VideoPlayer` (Component)

**Properties:**
- `resourceType: ResourceType` -- `LOCAL` (uses `clip`) or `REMOTE` (uses `remoteURL`).
- `clip: VideoClip | null` -- Local video clip asset.
- `remoteURL: string` -- Remote video URL (http/https).
- `playOnAwake: boolean` -- Auto-play on load (default `true`).
- `volume: number` -- Volume [0.0, 1.0] (default `1.0`).
- `mute: boolean` -- Mute toggle.
- `playbackRate: number` -- Playback speed [0.0, 10.0].
- `loop: boolean` -- Loop toggle.
- `keepAspectRatio: boolean` -- Maintain original aspect ratio (default `true`).
- `fullScreenOnAwake: boolean` -- Full screen on play.
- `stayOnBottom: boolean` -- Video stays behind game canvas. Web only. Requires `ENABLE_TRANSPARENT_CANVAS`.
- `nativeVideo: HTMLVideoElement | null` -- Raw HTML5 video element (web only).
- `currentTime: number` -- Get/set current playback position (seconds). Setter clamps to [0, duration].
- `duration: number` -- Total duration in seconds.
- `state: VideoPlayerEventType` -- Current state.
- `isPlaying: boolean` -- Whether video is currently playing.
- `videoPlayerEvent: ComponentEventHandler[]` -- Event callbacks configured in editor.

**Methods:**
- `play(): void` -- Start or restart playback, or resume if paused.
- `resume(): void` -- Resume paused video.
- `pause(): void` -- Pause playback.
- `stop(): void` -- Stop and reset to beginning.

**Events (emitted on node):**
- `meta-loaded`, `ready-to-play`, `playing`, `paused`, `stopped`, `completed`, `error`, `clicked`.

### Internal Mechanisms

1. **Web Implementation**: Creates an `<video>` element with `playsinline`, `webkit-playsinline`, and `x5-playsinline` attributes. Appended directly to `game.container`. The video element is hidden (`visibility: hidden`) and repositioned via CSS transform matrix each frame via `syncMatrix()`.

2. **Matrix Sync**: `VideoPlayerImplWeb.syncMatrix()` converts the component's world matrix to screen space using the UICamera, then applies CSS `matrix()` transform. Account for device pixel ratio scaling.

3. **stayOnBottom**: When enabled, sets video `z-index` to `MIN_ZINDEX` (-(2^15)) and modifies camera clear color alpha to 0 with `ClearFlagBit.ALL` to make canvas transparent.

4. **Auto-play**: In `__preload`, if `playOnAwake` is true and `_impl.loaded` is true, `play()` is called immediately. Otherwise, `onReadyToPlay` triggers play when metadata loads.

5. **Pause/Resume on Game Events**: The base `VideoPlayerImpl` constructor registers for `Game.EVENT_PAUSE` and `Game.EVENT_RESUME` to auto-pause/resume video when the game is backgrounded.

6. **Platform Limitations**:
   - `keepAspectRatio` is not supported on QQ mobile browser.
   - `playbackRate` is not supported on UC mobile browser.
   - `setJavascriptInterfaceScheme` and `setOnJSCallback` log warnings on web (Android/iOS only).

### Hidden Knowledge

- **playOnAwake fires in `onReadyToPlay`, not `__preload`**: If metadata hasn't loaded yet when `__preload` runs, the play is deferred to the `ready-to-play` event.
- **`currentTime` setter clamps values**: Uses `clamp(val, 0, this.duration)` and warns on NaN.
- **`stop()` uses `setTimeout`**: After setting currentTime=0 and pausing, dispatches STOPPED event asynchronously to avoid browser timing issues.
- **Web video requires user gesture**: `canPlay()` wraps `video.play()` in a Promise catch to handle autoplay prevention by browsers.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/video/video-player.ts` | `VideoPlayer` class (51), `play` (492), `resume` (505), `pause` (517), `stop` (529) |
| `cocos/video/video-player-enums.ts` | `VideoPlayerEventType` (48), `ResourceType` (31), `READY_STATE` (97) |
| `cocos/video/video-player-impl.ts` | `VideoPlayerImpl` abstract class (35), `play` (198), `onLoadedMetadata` (135) |
| `cocos/video/video-player-impl-web.ts` | `VideoPlayerImplWeb` class (45), `createVideoPlayer` (258), `syncMatrix` (331), `canFullScreen` (175) |
| `cocos/video/video-player-impl-manager.ts` | `VideoPlayerImplManager.getImpl` (31) |
| `cocos/video/assets/video-clip.ts` | `VideoClip` asset class |

---

## 4. WebView (`cocos/web-view/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `WebView` | `cocos/web-view/web-view.ts` | Component for displaying web pages in-game. Requires `UITransform`. |
| `WebViewImplWeb` | `cocos/web-view/web-view-impl-web.ts` | Web platform implementation using `<iframe>`. |
| `WebViewImpl` | `cocos/web-view/web-view-impl.ts` | Abstract base class for platform implementations. |
| `WebViewImplManager` | `cocos/web-view/web-view-impl-manager.ts` | Factory for platform implementations. |

### Important Enums

- **`WebViewEventType`** (`web-view-enums.ts:25`): `NONE`, `LOADING`, `LOADED`, `ERROR`.

### Important APIs

#### `cc.WebView` (Component)

**Properties:**
- `url: string` -- URL to load (must have http/https prefix). Default: `'https://cocos.com'`.
- `nativeWebView: HTMLIFrameElement | null` -- Raw iframe element (web only).
- `state: WebViewEventType` -- Current loading state.
- `webviewEvents: ComponentEventHandler[]` -- Event callbacks configured in editor.

**Methods:**
- `setJavascriptInterfaceScheme(scheme: string): void` -- Set JS interface scheme. Android/iOS only; logs warning on web.
- `setOnJSCallback(callback: () => void): void` -- Callback for JS interface. Android/iOS only.
- `evaluateJS(str: string): void` -- Execute JavaScript in the iframe's context.

**Events (emitted on node):**
- `loading`, `loaded`, `error`.

### Internal Mechanisms

1. **Web Implementation**: Creates a `<div>` wrapper and an `<iframe>` element. The wrapper is appended to `game.container`. The iframe's `src` is set directly.

2. **Matrix Sync**: Similar to video, `WebViewImplWeb.syncMatrix()` converts world matrix to screen space and applies CSS transform. Has caching to skip redundant updates.

3. **404 Detection**: In `_bindDomEvent`, the `load` event handler checks if the iframe body contains `'404'` and dispatches an ERROR event if found.

4. **Platform Limitations**:
   - `setJavascriptInterfaceScheme` and `setOnJSCallback` are NOT supported on web platform (log warnings).
   - Only Web, iOS, and Android are supported.
   - Cross-domain issues must be resolved by the developer when using `evaluateJS`.

### Hidden Knowledge

- **URL must have http/https prefix**: The component expects a full URL.
- **iframe is appended to game.container**: This means it sits outside the Canvas/WebGL rendering pipeline and is positioned via CSS transforms.
- **Wrapper uses `-webkit-overflow-scrolling: touch`**: Optimized for iOS scrolling behavior.
- **Error detection is naive**: Only checks for the string '404' in innerHTML.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/web-view/web-view.ts` | `WebView` class (48), `url` (71), `evaluateJS` (162), `setJavascriptInterfaceScheme` (126) |
| `cocos/web-view/web-view-enums.ts` | `WebViewEventType` (25) |
| `cocos/web-view/web-view-impl.ts` | `WebViewImpl` abstract class (33), `UICamera` getter (94) |
| `cocos/web-view/web-view-impl-web.ts` | `WebViewImplWeb` class (40), `createWebView` (71), `syncMatrix` (138), `evaluateJS` (116) |

---

## 5. Performance Profiler (`cocos/profiler/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `Profiler` | `cocos/profiler/profiler.ts` | System class that renders an on-screen FPS/stats overlay. Singleton exported as `profiler`. |
| `Counter` | `cocos/profiler/counter.ts` | Base counter class with averaging, alarm thresholds, and human-readable formatting. |
| `PerfCounter` | `cocos/profiler/perf-counter.ts` | Extends Counter with `start/end/tick/frame` timing methods. |

### Important APIs

#### `profiler` (Singleton System)

- `showStats(): void` -- Shows the FPS overlay. Registers director event listeners.
- `hideStats(): void` -- Hides and destroys the overlay.
- `isShowingStats(): boolean` -- Whether the overlay is visible.
- `get stats(): IProfilerState | null` -- Access to current profiler counters.
- `setBackgroundColor(color: Readonly<Color>): void` -- Set overlay background color.
- `setFontColor(color: Readonly<Color>): void` -- Set overlay text color.

#### `PerfCounter`

- `start(now: number): void` -- Record start time.
- `end(now: number): void` -- Record end time, compute delta.
- `tick(): void` -- Equivalent to `end(); start()`.
- `frame(now: number): void` -- Compute FPS from accumulated frame count.

#### `Counter`

- `value: number` -- Current value.
- `sample(now: number): void` -- Accumulate for averaging.
- `human(): number` -- Return display value (rounded, possibly averaged).
- `alarm(): boolean` -- Returns true if value crosses below/over thresholds.

### Tracked Stats

| ID | Description | Type |
|---|---|---|
| `fps` | Framerate (FPS) | Integer, averaged over 500ms |
| `frame` | Frame time (ms) | Averaged |
| `draws` | Draw call count | Integer |
| `instances` | Instance count | Integer |
| `tricount` | Triangle count | Integer |
| `logic` | Game logic time (ms) | Averaged |
| `physics` | Physics time (ms) | Averaged |
| `render` | Renderer time (ms) | Averaged |
| `present` | Present time (ms) | Averaged |
| `textureMemory` | GFX texture memory (MB) | Raw |
| `bufferMemory` | GFX buffer memory (MB) | Raw |

### Internal Mechanisms

1. **Rendering**: The profiler renders to a 280x280 Canvas2D texture, then uploads it as a GPU texture. A `MeshRenderer` with a custom `util/profiler` shader displays it. The mesh has one quad per stat line and one quad per digit segment.

2. **Director Events**: Hooks into `BEFORE_UPDATE`, `AFTER_UPDATE`, `BEFORE_PHYSICS`, `AFTER_PHYSICS`, `BEFORE_DRAW`, `AFTER_RENDER`, `AFTER_DRAW` to measure each phase.

3. **Layer**: Rendered on `Layers.Enum.PROFILER` layer, with `CCObjectFlags.DontSave | HideInHierarchy` on the root node.

4. **Root Node**: Added as a persistent root node via `game.addPersistRootNode()`.

### Hidden Knowledge

- **Stats update throttled to 500ms**: The `afterPresent` method only updates device stats (draw calls, memory) when `now - lastTime >= _average (500)`.
- **Initialization is lazy**: `generateNode` is called on `Game.EVENT_ENGINE_INITED` or `Game.EVENT_RESTART`.
- **Stats are null when hidden**: Accessing `profiler.stats` when stats are hidden returns `null`.
- **Stats data is read from device**: `device.numDrawCalls`, `device.numInstances`, `device.numTris`, `device.memoryStatus.bufferSize/textureSize`.
- **Surface transform handling**: The profiler adjusts for device orientation via `surfaceTransform` and `clipSpaceSignY`.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/profiler/profiler.ts` | `Profiler` class (137), `showStats` (280), `hideStats` (226), `generateNode` (407), `afterPresent` (661) |
| `cocos/profiler/counter.ts` | `Counter` class (37), `ICounterOption` (25) |
| `cocos/profiler/perf-counter.ts` | `PerfCounter` class (29), `start` (35), `end` (42), `frame` (57) |

---

## 6. Native Binding Helpers (`cocos/native-binding/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `native` (namespace) | `cocos/native-binding/index.ts` | Declares the public TypeScript API for native platform interfaces. |
| `impl.ts` | `cocos/native-binding/impl.ts` | Runtime implementation that wraps `globalThis.jsb` objects into the `native` namespace. |

### Important APIs

All APIs are NATIVE-only. Guard with `import { NATIVE } from 'cc/env'` or `import { NATIVE } from 'internal:constants'`.

#### `native.reflection`
- `callStaticMethod(className: string, methodName: string, methodSignature: string, ...parameters): any`
  - **Android**: `methodSignature` is the Java method signature (e.g., `(Ljava/lang/String;)V`). `parameters` are Java method arguments.
  - **iOS/macOS**: `methodSignature` is the first parameter of the ObjC method. Subsequent params follow.
  - **HarmonyOS Next**: `methodSignature` contains all ArkTS method parameters (JSON string for multiple). `parameters[0]` is a boolean for sync/async.

#### `native.bridge`
- `sendToNative(arg0: string, arg1?: string): void` -- Send message to native.
- `onNative = (arg0: string, arg1?: string) => void` -- Callback for native-to-JS messages. Can only be overridden once.

#### `native.jsbBridgeWrapper` (High-level bridge)
- `addNativeEventListener(event: string, listener: (arg: string) => void): void`
- `dispatchEventToNative(event: string, arg?: string): void`
- `removeAllListenersForEvent(event: string): void`
- `removeNativeEventListener(event: string, listener): void`
- `removeAllListeners(): void`

#### `native.fileUtils`
Comprehensive file system API:
- `getWritablePath(): string` -- Get writable storage path.
- `isFileExist(filename: string): boolean`
- `fullPathForFilename(filename: string): string`
- `getStringFromFile(filename: string): string`
- `readTextFile(filepath, onComplete)` -- Async text read.
- `readJsonFile(filepath, onComplete)` -- Async JSON read.
- `readDataFile(filepath, onComplete)` -- Async binary read.
- `writeStringToFile(dataStr, fullPath): boolean`
- `writeDataToFile(buffer, fullpath): boolean`
- `removeFile(filepath): boolean`
- `createDirectory(dirPath): string`
- `listFiles(filepath): string[]`
- `listFilesRecursively(dirPath, files): void`
- `getFileSize(filepath): number`
- `getFileDir(filepath): string`
- `getFileExtension(filePath): string`
- `isAbsolutePath(path): boolean`
- `setSearchPaths(searchPaths): void`
- `getSearchPaths(): string[]`

#### `native.zipUtils`
- `inflateMemory(input, outLengthHint?): ArrayBuffer | null` -- Decompress zlib/gzip.
- `inflateGZipFile(path): ArrayBuffer | null`
- `inflateCCZFile(path): ArrayBuffer | null`
- `isGZipFile(path): boolean` / `isCCZFile(path): boolean`
- `setPvrEncryptionKey(k1, k2, k3, k4): void` -- Set CCZ encryption key.

#### `native.Downloader`
- `createDownloadTask(requestURL, storagePath, identifier?): DownloadTask`
- `onSuccess` / `onProgress` / `onError` -- Callback setters.
- `abort(task): void` -- Abort download (can be resumed).

#### `native.AssetsManager`
- `create(manifestUrl, storagePath): AssetsManager` -- Static factory.
- `checkUpdate(): void` / `prepareUpdate(): void` / `update(): void`
- `setEventCallback(callback: (event: EventAssetsManager) => void): void`
- `setVersionCompareHandle(handle: (v1, v2) => number): void`
- `setVerifyCallback(callback): void`

#### Other APIs
- `native.copyTextToClipboard(text: string): void`
- `native.garbageCollect(): void`
- `native.saveImageData(data, width, height, filePath): Promise<void>`
- `native.process.argv: Readonly<string[]>`
- `native.adpf` -- Android thermal status (API 31+): `thermalHeadroom`, `thermalStatus`, `onThermalStatusChanged`.
- `native.DebugRenderer.getInstance().addText(text, screenPos, info?)` -- Native debug text overlay.

### Internal Mechanisms

1. **Lazy Bridge Initialization**: `jsb.reflection`, `jsb.bridge`, and `jsb.jsbBridgeWrapper` are defined as lazy getters on `globalThis.jsb`. They create the appropriate bridge object (Java/ObjC/ArkTS) on first access based on `sys.os`.

2. **Platform Detection**: The implementation checks `sys.os` for `ANDROID`, `OHOS`, `IOS`, `OSX`, `OPENHARMONY` to decide which bridge class to instantiate.

3. **saveImageData Promise Wrapper**: The native `jsb.saveImageData` uses callbacks; the `impl.ts` wraps it in a `Promise<void>`.

### Hidden Knowledge

- **Must guard with `NATIVE`**: All native APIs are only available on native platforms. Using them on web will crash.
- **`bridge.onNative` can only be set once**: Overwriting it replaces the previous handler.
- **`jsbBridgeWrapper` is preferred over `bridge`**: If using the wrapper, do not also use the low-level `bridge`.
- **Reflection method signatures differ per platform**: The same API has completely different parameter meanings on Android vs iOS vs HarmonyOS.
- **`adpf` is Android API 31+ only**: Will be undefined on other platforms.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/native-binding/index.ts` | `native` namespace declaration (51), `reflection.callStaticMethod` (1291), `bridge.sendToNative` (1334), `fileUtils` (743), `AssetsManager` (184) |
| `cocos/native-binding/impl.ts` | Lazy bridge setup (31-50), `JsbBridgeWrapper` (67-108), `saveImageData` Promise wrapper (131-142), `native` export (145) |

---

## 7. Miscellaneous Components (`cocos/misc/`)

### Key Classes & Their Roles

| Class | File | Purpose |
|---|---|---|
| `MissingScript` | `cocos/misc/missing-script.ts` | Fallback component when a script class cannot be found during deserialization. |
| `Renderer` | `cocos/misc/renderer.ts` | Base class for components that submit renderable content. Manages shared materials and material instances. |
| `Camera` | `cocos/misc/camera-component.ts` | Camera component (re-exported from here). |
| `ModelRenderer` | `cocos/misc/model-renderer.ts` | Model renderer component (re-exported from here). |
| `PrefabLink` | `cocos/misc/prefab-link.ts` | Legacy prefab system compatibility. Stores reference to a Prefab asset for old-system nodes. |
| `NativeCodeBundleMode` | `cocos/misc/webassembly-support.ts` | Enum: `ASMJS (0)`, `WASM (1)`, `BOTH (2)`. |

### Intersect Utilities

`cocos/misc/intersect.ts` adds geometry intersection functions to `geometry.intersect`:
- `raySubMesh(ray, submesh, options?)` -- Ray-vs-submesh test in model space. Supports `TRIANGLE_LIST`, `TRIANGLE_STRIP`, `TRIANGLE_FAN`.
- `rayMesh(ray, mesh, options?)` -- Ray-vs-mesh test in model space.
- `rayModel(ray, model, options?)` -- Ray-vs-model test in world space. Transforms ray to model space, tests each subModel.

Options: `{ distance, doubleSided, mode: ERaycastMode.ANY|CLOSEST, result?, subIndices? }`.

### `MissingScript` Details

- Auto-generated when the engine encounters a serialized component whose class ID does not map to any registered class.
- `onLoad()` emits warning 4600 for the node name.
- `safeFindClass(id)` -- Static method: tries `js.getClassById()`, reports missing class if not found.
- `_$erialized` -- Stores the original serialized data for potential recovery.

### `Renderer` (Base Class)

Manages the material pipeline for renderable components:
- `sharedMaterial: Material | null` -- Get/set the first shared material.
- `sharedMaterials: (Material | null)[]` -- Get/set all shared materials.
- `material: Material | MaterialInstance | null` -- Get/set material instance (creates on first access).
- `materials: (Material | MaterialInstance)[]` -- All material instances.
- `getSharedMaterial(idx): Material | null`
- `setSharedMaterial(material, idx, forceUpdate?): void` -- Destroys existing instance if present.
- `getMaterialInstance(idx): MaterialInstance | null` -- Lazy-creates instance from shared material.
- `setMaterialInstance(matInst, idx): void`
- `getRenderMaterial(idx): Material | null` -- Returns instance if exists, otherwise shared material.

### Hidden Knowledge

- **`MissingScript` fires warning on every load**: Every time a node with a missing script is loaded, warning 4600 fires.
- **`PrefabLink` is a legacy compatibility shim**: Only exists for old Prefab system nodes that cannot be auto-migrated.
- **`Renderer` material instances are lazy**: Created only when accessed via `material`/`materials` getters. Shared materials are used by default for rendering.
- **`intersect.ts` patches `geometry.intersect`**: Adds `raySubMesh`, `rayMesh`, `rayModel` as monkey-patches to the global `geometry.intersect` namespace.
- **Ray intersection uses closure-based singletons**: `raySubMesh` and `rayMesh` use IIFE closures to avoid allocations per call.

### File Path Index

| File | Key Items |
|---|---|
| `cocos/misc/missing-script.ts` | `MissingScript` class (38), `safeFindClass` (53) |
| `cocos/misc/renderer.ts` | `Renderer` class (57), `getSharedMaterial` (163), `setSharedMaterial` (175), `getMaterialInstance` (196) |
| `cocos/misc/intersect.ts` | `raySubMesh` (63), `rayMesh` (159), `rayModel` (208) |
| `cocos/misc/prefab-link.ts` | `PrefabLink` class (43) |
| `cocos/misc/webassembly-support.ts` | `NativeCodeBundleMode` enum (4) |
| `cocos/misc/index.ts` | Module exports (26) |

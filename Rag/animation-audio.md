# Cocos Creator Engine: Animation, Audio, and Tween Systems

> Comprehensive API reference for AI-assisted scripting. Covers `cocos/animation/`, `cocos/audio/`, and `cocos/tween/`.

---

## Table of Contents

1. [Animation System](#1-animation-system)
   - [Architecture Overview](#11-architecture-overview)
   - [Key Classes](#12-key-classes)
   - [Animation Component API](#13-animation-component-api)
   - [Animation Clip](#14-animation-clip)
   - [Animation State](#15-animation-state)
   - [Cross-Fade / Blending](#16-cross-fade--blending)
   - [Track System](#17-track-system)
   - [Skeletal Animation](#18-skeletal-animation)
   - [Animation Mask](#19-animation-mask)
   - [Animation Events](#110-animation-events)
   - [Wrap Modes](#111-wrap-modes)
   - [Hidden Knowledge and Gotchas](#112-hidden-knowledge-and-gotchas)
2. [Audio System](#2-audio-system)
   - [Architecture Overview](#21-architecture-overview)
   - [AudioClip](#22-audioclip)
   - [AudioSource](#23-audiosource)
   - [AudioManager (Internal)](#24-audiomanager-internal)
   - [Hidden Knowledge and Gotchas](#25-hidden-knowledge-and-gotchas)
3. [Tween System](#3-tween-system)
   - [Architecture Overview](#31-architecture-overview)
   - [Tween Class](#32-tween-class)
   - [tween() Factory Function](#33-tween-factory-function)
   - [ITweenOption](#34-itweenoption)
   - [Easing Functions](#35-easing-functions)
   - [Action Hierarchy](#36-action-hierarchy)
   - [Hidden Knowledge and Gotchas](#37-hidden-knowledge-and-gotchas)
4. [File Path Index](#4-file-path-index)

---

## 1. Animation System

### 1.1 Architecture Overview

The animation system is built on a layered architecture:

```
Animation (Component) --> manages --> AnimationState --> wraps --> AnimationClip
                                                   --> uses --> Track system
                                                               (TrackPath + Curve)
```

Key design principles:
- **AnimationClip** (`cocos/animation/animation-clip.ts`) is the data asset (extends `Asset`). It holds tracks, events, and exotic (skeletal) animation data.
- **AnimationState** (`cocos/animation/animation-state.ts`) is the runtime playback wrapper around a clip. It extends `Playable` and manages time, speed, weight, wrapping, and blending.
- **Animation** (`cocos/animation/animation-component.ts`) is the `Component` users interact with. It manages a map of named states and a `CrossFade` scheduler.
- **AnimationManager** (`cocos/animation/animation-manager.ts`) is a `System` registered at priority `HIGH`. It drives all active `AnimationState` updates and `CrossFade` updates each frame.
- **CrossFade** (`cocos/animation/cross-fade.ts`) handles smooth weight transitions between animation states.

### 1.2 Key Classes

| Class | File | Role |
|---|---|---|
| `Animation` | `cocos/animation/animation-component.ts:52` | Component that manages animation states and clips. Extends `Eventify(Component)`. |
| `AnimationClip` | `cocos/animation/animation-clip.ts:131` | Asset representing a keyframe animation. Holds tracks, events, embedded players. |
| `AnimationState` | `cocos/animation/animation-state.ts:85` | Runtime playback state for a clip. Extends `Playable`. Controls time, speed, weight, wrap mode. |
| `CrossFade` | `cocos/animation/cross-fade.ts:47` | Handles smooth weight-based transitions between animation states. Extends `Playable`. |
| `AnimationManager` | `cocos/animation/animation-manager.ts:41` | System that updates all active animations and cross-fades each frame. Registered at `SystemPriority.HIGH`. |
| `AnimationMask` | `cocos/animation/animation-mask.ts:47` | Asset that filters which joints/bones participate in animation. |
| `Playable` | `cocos/animation/playable.ts:27` | Abstract base for play/pause/stop/resume state machine. |
| `TrackPath` | `cocos/animation/tracks/track.ts:76` | Describes how to find an animation target (hierarchy, component, property). |
| `Track` | `cocos/animation/tracks/track.ts:537` | Abstract base describing how to animate a target attribute over time. |
| `PoseOutput` | `cocos/animation/pose-output.ts:30` | Manages blend state writers for animation blending. |
| `BlendStateBuffer` | `cocos/3d/skeletal-animation/skeletal-animation-blending.ts:29` | Accumulates weighted transform contributions from multiple animation states. |
| `SkeletalAnimation` | `cocos/3d/skeletal-animation/skeletal-animation.ts:102` | Extends `Animation` with baked animation mode and joint socket system. |
| `Socket` | `cocos/3d/skeletal-animation/skeletal-animation.ts:48` | Synchronizes a node's transform with an animated joint. |

### 1.3 Animation Component API

**File:** `cocos/animation/animation-component.ts`

The `Animation` component is decorated with `@ccclass('cc.Animation')` and has execution order 99.

**Properties:**

- `clips: (AnimationClip | null)[]` -- Get/set the list of clips. Setting stops all existing states. (line 63)
- `defaultClip: AnimationClip | null` -- Get/set the default clip. Setting auto-adds to clips if missing. (line 105)
- `playOnLoad: boolean` -- Auto-play default clip on start. (line 133, default `false`)

**Methods:**

- `play(name?: string): void` -- Immediately play named animation (no fade). Uses `crossFade(name, 0)` internally. (line 200)
- `crossFade(name: string, duration?: number): void` -- Smoothly transition to named animation. Default fade duration is 0.3s. (line 219)
- `pause(): void` -- Pause all states and transitions. (line 233)
- `resume(): void` -- Resume all states and transitions. (line 243)
- `stop(): void` -- Stop all states and transitions. (line 253)
- `getState(name: string): AnimationState` -- Get state by clip name, or null. (line 265)
- `createState(clip: AnimationClip, name?: string): AnimationState` -- Create a state for a clip. Existing state with same name is stopped and replaced. (line 284)
- `removeState(name: string): void` -- Stop and remove a state by name. (line 298)
- `addClip(clip: AnimationClip, name?: string): AnimationState` -- Add clip to `clips` and create a state. (line 316)
- `removeClip(clip: AnimationClip, force?: boolean): void` -- Remove a clip. Won't remove if playing or is default, unless `force` is true. (line 335)
- `on(type, callback, thisArg?, once?): TFunction` -- Register event listener. Events: `play`, `stop`, `pause`, `resume`, `lastframe`, `finished`. (line 391)
- `off(type, callback?, thisArg?): void` -- Unregister event listener. (line 421)

**Lifecycle behavior:**

- `start()`: If `playOnLoad` is true and no prior `play()`/`crossFade()` call, plays `defaultClip` via `crossFade(name, 0)`. (line 170)
- `onEnable()`: Calls `_crossFade.resume()`. (line 176)
- `onDisable()`: Calls `_crossFade.pause()` unless root is a persist node. (line 180)
- `onDestroy()`: Stops cross-fade, destroys all states. (line 184)

**Event types** (from `AnimationStateEventType` at `cocos/animation/animation-state.ts:40`):
- `play` -- emitted when animation starts playing
- `stop` -- emitted when animation stops
- `pause` -- emitted when animation is paused
- `resume` -- emitted when animation resumes
- `lastframe` -- emitted at the last frame when `repeatCount > 1`
- `finished` -- emitted when animation completes all iterations

### 1.4 Animation Clip

**File:** `cocos/animation/animation-clip.ts`

The `AnimationClip` extends `Asset` and is decorated with `@ccclass('cc.AnimationClip')`.

**Static factory:**
- `AnimationClip.createWithSpriteFrames(spriteFrames: SpriteFrame[], sample: number): AnimationClip` -- Creates a clip from sprite frame array for frame-by-frame animation. (line 143)

**Key properties:**

- `sample: number` -- Frame rate in FPS (default 60). Used only for editor editing. (line 172)
- `speed: number` -- Playback speed multiplier (default 1). (line 179)
- `wrapMode: WrapMode` -- Loop mode (default `Normal`). (line 186)
- `duration: number` -- Duration in seconds. (line 204)
- `events: AnimationClip.IEvent[]` -- Event data array. Each event has `frame`, `func`, `params`. (line 247)
- `tracks: Iterable<Track>` -- Read-only iterable over tracks. (line 228)
- `tracksCount: number` -- Number of tracks. (line 218)
- `hash: number` -- Hash based on exotic animation data. (line 232)

**Track management:**
- `getTrack(index: number): Track` -- Get track by index. (line 338)
- `addTrack(track: Track): number` -- Add track, returns new index. (line 350)
- `removeTrack(index: number): void` -- Remove track at index. (line 363)
- `clearTracks(): void` -- Remove all tracks. (line 373)
- `range(): Range` -- Get time range {min, max} spanning all tracks. (line 317)

**Auxiliary curves (experimental):**
- `addAuxiliaryCurve_experimental(name: string): RealCurve` -- Add a named auxiliary curve. (line 783)
- `getAuxiliaryCurve_experimental(name: string): RealCurve` -- Get a named auxiliary curve. (line 800)
- `hasAuxiliaryCurve_experimental(name: string): boolean` -- Check existence. (line 772)
- `removeAuxiliaryCurve_experimental(name: string): void` -- Remove by name. (line 828)
- `renameAuxiliaryCurve_experimental(name: string, newName: string): void` -- Rename. (line 812)

**Internal evaluators (not for direct use):**
- `createEvaluator(context: AnimationClipEvalContext): AnimationClipEvaluation` -- Creates the full clip evaluator. (line 424)
- `createEventEvaluator(targetNode: Node): EventEvaluator` -- Creates event evaluator. (line 390)
- `createEmbeddedPlayerEvaluator(targetNode: Node): EmbeddedPlayerEvaluation` -- Creates embedded player evaluator. (line 412)

**Events data format:**
```ts
interface AnimationClip.IEvent {
    frame: number;   // Time in seconds
    func: string;    // Method name on components
    params: string[]; // Parameters passed to the method
}
```

### 1.5 Animation State

**File:** `cocos/animation/animation-state.ts`

`AnimationState` extends `Playable`. Created internally by `Animation` component.

**Key properties:**

- `clip: AnimationClip` -- The clip being played (read-only). (line 90)
- `name: string` -- The state name (read-only). (line 98)
- `duration: number` -- Clip duration in seconds. (line 185)
- `speed: number` -- Playback speed multiplier (default 1). Setting this affects embedded player speed too. (line 219)
- `time: number` -- Current accumulated playback time in seconds. (line 233)
- `current: number` -- Current wrapped time progress. (line 239)
- `ratio: number` -- Current playback ratio (0..1). (line 247)
- `weight: number` -- Blending weight (default 1). (line 257)
- `wrapMode: WrapMode` -- Loop mode. **Gotcha:** Dynamically changing `wrapMode` resets `time` to 0 and `repeatCount`. (line 115)
- `repeatCount: number` -- Iteration count. Set to `Infinity` for loop modes. (line 147)
- `delay: number` -- Start delay in seconds. (line 170)
- `frameRate: number` -- Frame rate from clip. (line 268)
- `playbackRange: {min: number, max: number}` -- Restrict playback to a sub-range. Setting resets accumulated time. (line 202)

**Methods:**
- `initialize(root: Node, blendStateBuffer?: BlendStateBuffer, mask?: AnimationMask): void` -- Initialize the state with a target node. Must be called before use. (line 339)
- `destroy(): void` -- Unregister from animation manager, clean up. (line 414)
- `setTime(time: number): void` -- Set current time, marks current frame as unplayed to ensure first frame renders. (line 492)
- `sample(): WrappedInfo` -- Force sample at current time, returns wrapped info. (line 525)
- `allowLastFrameEvent(allowed: boolean): void` -- Enable/disable lastframe events. (line 480)

**Inherited from Playable** (`cocos/animation/playable.ts`):
- `play(): void` -- If paused, resumes. Otherwise starts. (line 62)
- `stop(): void` -- Stops and resets pause flag. (line 80)
- `pause(): void` -- Pauses playback. (line 94)
- `resume(): void` -- Resumes from pause. (line 105)
- `step(): void` -- Advance by one frame. (line 116)
- `isPlaying: boolean` -- (line 33)
- `isPaused: boolean` -- (line 42)
- `isMotionless: boolean` -- `!isPlaying || isPaused`. (line 50)

### 1.6 Cross-Fade / Blending

**File:** `cocos/animation/cross-fade.ts`

`CrossFade` extends `Playable` and manages smooth weight transitions.

**Method:**
- `crossFade(state: AnimationState | null, duration: number): void` -- Transition to a new state over `duration` seconds. When transitioning from no state, duration is forced to 0. (line 85)
- `clear(): void` -- Stop all managed states and clear transitions. (line 119)

**Weight calculation:** The `_calculateWeights` method (line 171) distributes weights across fading states. Newer fades get higher weight. Once a fade completes, its old state is stopped and removed.

**Implicit behavior:**
- If there is only 1 managed state with 1 fading, the weight is set to 1.0 directly and scheduling is stopped (line 67-78).
- Calling `crossFade` with `duration === 0` calls `clear()` first, immediately stopping all previous states.

### 1.7 Track System

**File:** `cocos/animation/tracks/track.ts`

Tracks define how animation data maps to target properties.

**TrackPath** (line 76): A chainable builder for addressing animation targets:
- `toProperty(name: string): TrackPath` -- Append property segment. (line 91)
- `toElement(index: number): TrackPath` -- Append array index segment. (line 102)
- `toHierarchy(nodePath: string): TrackPath` -- Append child node path. (line 113)
- `toComponent(constructor: Constructor | string): TrackPath` -- Append component lookup. (line 124)
- `append(...trackPaths: TrackPath[]): TrackPath` -- Append other paths. (line 150)
- `slice(beginIndex?, endIndex?): TrackPath` -- Get sub-path. (line 247)

**Example path construction:**
```ts
new TrackPath().toComponent('cc.Sprite').toProperty('spriteFrame')
new TrackPath().toHierarchy('arm').toProperty('position')
```

**Track** (abstract, line 537):
- `path: TrackPath` -- The target path. (line 542)
- `proxy: IValueProxyFactory | undefined` -- Value proxy for non-standard targets. (line 554)
- `channels(): Iterable<Channel>` -- Get channels (each contains a curve). (line 574)
- `range(): Range` -- Time range from all channels. (line 583)

**Concrete Track types** (from `cocos/animation/index.ts`):
- `RealTrack` -- Animates scalar values (float). (`cocos/animation/tracks/real-track.ts:37`)
- `VectorTrack` -- Animates Vec2/Vec3/Vec4. (`cocos/animation/tracks/vector-track.ts`)
- `QuatTrack` -- Animates quaternion rotation. (`cocos/animation/tracks/quat-track.ts`)
- `ColorTrack` -- Animates Color. (`cocos/animation/tracks/color-track.ts`)
- `SizeTrack` -- Animates Size. (`cocos/animation/tracks/size-track.ts`)
- `ObjectTrack<T>` -- Animates arbitrary objects (e.g., SpriteFrame). (`cocos/animation/tracks/object-track.ts`)

**TRS path recognition:** A track path is recognized as a TRS path if it consists of one or more `HierarchyPath` segments followed by exactly one of: `position`, `rotation`, `scale`, `eulerAngles`. This enables the blend state writer path for proper animation blending. (line 269-313, `parseTrsPathTag`)

### 1.8 Skeletal Animation

**File:** `cocos/3d/skeletal-animation/skeletal-animation.ts`

`SkeletalAnimation` extends `Animation` (line 102).

**Additional properties:**
- `sockets: Socket[]` -- Joint socket array for syncing node transforms to bones. (line 114)
- `useBakedAnimation: boolean` -- Toggle baked (precomputed) vs real-time mode. Default `true`. (line 140)

**Socket system:**
```ts
class Socket {
    path: string;       // Joint path (e.g., "right_hand")
    target: Node | null; // Node that follows the joint
}
```

**Baked vs Real-time:**
- Baked mode: Precomputed bone matrices are stored. High performance but no blending, no runtime modification. (line 134)
- Real-time mode: Bones are evaluated every frame. Supports blending and dynamic changes.
- In editor (not preview), baked mode is always disabled. (line 41: `FORCE_BAN_BAKED_ANIMATION`)

**Blend state system** (`cocos/3d/skeletal-animation/skeletal-animation-blending.ts`):
- `BlendStateBuffer` (abstract, line 29): Accumulates weighted contributions per node property.
- `LegacyBlendStateBuffer` (line 350): Default implementation using averaged Vec3 lerp and Quat slerp.
- `BlendStateWriterInternal` (line 100): Implements `RuntimeBinding`, applies `setValue()` by calling `blend(value, weight)`.
- Properties: `position` (Vec3 lerp), `rotation` (Quat slerp), `scale` (Vec3 lerp), `eulerAngles` (Vec3 lerp).

**Apply cycle** (in `LegacyNodeBlendState.apply`, line 302):
1. For each property with accumulated weight, if weight < 1.0, blend in the node's current value to complete to weight 1.0.
2. Call `node.setRTS(r, t, s)` with blended results.
3. Reset all accumulators.

### 1.9 Animation Mask

**File:** `cocos/animation/animation-mask.ts`

`AnimationMask` extends `Asset`, decorated with `@ccclass('cc.AnimationMask')`.

**API:**
- `addJoint(path: string, enabled: boolean): void` -- Add a joint mask. Existing same-path mask is replaced. (line 75)
- `removeJoint(removal: string): void` -- Remove by path. (line 83)
- `clear(): void` -- Remove all masks. (line 87)
- `filterDisabledNodes(root: Node): Set<Node>` -- Get all disabled nodes under root. (line 91)
- `isExcluded(path: string): boolean` -- Check if a path is excluded. If path is not registered, it is NOT excluded (defaults to enabled). (line 108)
- `joints: Iterable<JointMaskInfo>` -- Readable list of {path, enabled}. (line 53)

### 1.10 Animation Events

**File:** `cocos/animation/animation-clip.ts` (EventEvaluator class, line 1697)
**File:** `cocos/animation/event/event-emitter.ts`

Events are defined in the `AnimationClip.events` array. Each event has:
- `frame: number` -- Time in seconds when the event fires
- `func: string` -- Method name to invoke
- `params: string[]` -- Parameters to pass

**How events fire:**
1. `EventEvaluator.sample(ratio, direction, iterations)` is called each frame. (line 1736)
2. It uses `binarySearchEpsilon` to find the event index at the current ratio.
3. Events are fired via `invokeComponentMethodsEngagedInAnimationEvent(node, functionName, params)`. (line 1864)
4. This function iterates ALL components on the target node and calls `component[methodName]` if it exists. (`cocos/animation/event/event-emitter.ts:11`)

**Important:** Event callbacks are called by method name on ALL components of the target node, not just the Animation component. The method must exist on a component attached to the node.

**Delayed firing:** Events detected during `update()` are pushed to a delayed event queue in the `AnimationManager` via `pushDelayEvent()`, and executed at the end of the animation update cycle to avoid re-entrancy issues. (line 1835)

### 1.11 Wrap Modes

**File:** `cocos/animation/types.ts`

```
WrapMode.Default      -- Inherit from AnimationComponent/AnimationClip
WrapMode.Normal       -- Play once, stop at end
WrapMode.Reverse      -- Play once backward from last frame
WrapMode.Loop         -- Loop forward
WrapMode.LoopReverse  -- Loop backward
WrapMode.PingPong     -- Forward then backward, repeating
WrapMode.PingPongReverse -- Backward then forward, repeating
```

These are bitmask-based (`geometry.WrapModeMask`). Composed with flags: `Loop`, `Reverse`, `PingPong`.

**Key detail:** Setting `AnimationState.wrapMode` dynamically resets `time` to 0 and recalculates `repeatCount`. (animation-state.ts line 119)

### 1.12 Hidden Knowledge and Gotchas

1. **`play()` is just `crossFade(name, 0)`:** The `play()` method does not have special behavior -- it calls `crossFade` with zero duration, which calls `clear()` first, stopping all other states. (animation-component.ts:208)

2. **`playOnLoad` is bypassed if `play()` or `crossFade()` is called early:** The `_hasBeenPlayed` flag prevents `playOnLoad` from triggering. (animation-component.ts:171)

3. **Clip equality uses UUID:** Two clips are considered equal if they share a non-empty UUID. The `equalClips()` helper checks `clip1._uuid === clip2._uuid`. (animation-component.ts:490)

4. **State initialization is lazy:** `getState()` calls `state.initialize(this.node)` if `curveLoaded` is false. (animation-component.ts:267)

5. **Event methods are deprecated on AnimationState:** Since v1.1.1, `AnimationState.on()`, `off()`, `emit()` are deprecated. Events should be listened to on the `Animation` component instead. (animation-state.ts:427)

6. **LASTFRAME event optimization:** The `LASTFRAME` event is only evaluated when at least one listener is registered. `allowLastFrameEvent()` is toggled by `Animation.on()`/`off()` for the `lastframe` event type. (animation-component.ts:393, 467)

7. **`CrossFade` with duration 0 clears first:** Calling `crossFade(state, 0)` first calls `clear()`, immediately stopping all previous states before playing the new one. (cross-fade.ts:94)

8. **AnimationManager uses `MutableForwardIterator`:** During update, adding/removing animations is safe due to the iterator pattern, but the array can be modified during iteration. (animation-manager.ts:47)

9. **SkeletalAnimation baked mode is always disabled in editor:** `FORCE_BAN_BAKED_ANIMATION = EDITOR_NOT_IN_PREVIEW` (skeletal-animation.ts:41)

10. **Legacy properties (keys, curves, data) are deprecated since V3.3:** Use the track/channel/curve mechanism instead. Legacy data is lazily converted. (animation-clip.ts:618)

---

## 2. Audio System

### 2.1 Architecture Overview

```
AudioSource (Component) --> uses --> AudioClip (Asset)
                       --> wraps --> AudioPlayer (PAL layer)
```

- **AudioClip** (`cocos/audio/audio-clip.ts`) is the audio asset (extends `Asset`). Contains the platform-native audio data.
- **AudioSource** (`cocos/audio/audio-source.ts`) is the `Component` that handles playback. Wraps a platform `AudioPlayer`.
- **AudioManager** (`cocos/audio/audio-manager.ts`) is a singleton that tracks all playing audio and manages channel limits.

### 2.2 AudioClip

**File:** `cocos/audio/audio-clip.ts`

`AudioClip` extends `Asset`, decorated with `@ccclass('cc.AudioClip')`.

**Key properties:**
- `duration: number` -- Audio duration in seconds (serialized because unavailable at runtime on some platforms). (line 51)
- `loadMode: AudioType` -- The audio loading strategy (UNKNOWN_AUDIO by default). (line 113)
- `_nativeAsset: AudioMeta | null` -- Internal: holds `{player, url, type, duration}`. (line 80)

**Methods:**
- `getDuration(): number` -- Returns serialized `_duration` if available, otherwise `_meta.duration`. (line 121)
- `validate(): boolean` -- Returns true if `_meta` exists. (line 117)
- `destroy(): boolean` -- Destroys the player and meta references. (line 67)

**Deprecated methods on AudioClip** (since v3.1.0, use `AudioSource` instead):
- `play()`, `pause()`, `stop()`, `playOneShot(volume)`
- `getCurrentTime()`, `setCurrentTime(time)`
- `getVolume()`, `setVolume(volume)`
- `getLoop()`, `setLoop(loop)`
- `state` (getter)

### 2.3 AudioSource

**File:** `cocos/audio/audio-source.ts`

`AudioSource` extends `Component`, decorated with `@ccclass('cc.AudioSource')`.

**Static properties:**
- `maxAudioChannel: number` -- Max simultaneous audio channels. (line 64)
- `AudioState` -- Reference to the `AudioState` enum. (line 67)
- `EventType` -- `{STARTED: 'started', ENDED: 'ended'}`. (line 69)

**Serialized properties:**
- `clip: AudioClip | null` -- The audio clip to play. Setting triggers async player load. (line 109)
- `loop: boolean` -- Loop playback (default `false`). (line 197)
- `playOnAwake: boolean` -- Auto-play on `onEnable()` (default `true`). (line 219)
- `volume: number` -- Volume 0.0 to 1.0 (default `1.0`). (line 234)

**Computed properties:**
- `currentTime: number` -- Get/set current playback time in seconds. Clamped to [0, duration]. (line 480)
- `duration: number` -- Audio duration from clip or player. (line 508)
- `state: AudioState` -- Current playback state (INIT if no player). (line 518)
- `playing: boolean` -- True if state is PLAYING. (line 528)

**Methods:**
- `play(): void` -- Play or restart the clip. If not yet loaded, queues the operation. (line 366)
- `pause(): void` -- Pause playback. (line 395)
- `stop(): void` -- Stop playback and remove from playing list. (line 410)
- `playOneShot(clip: AudioClip, volumeScale?: number): void` -- Play a one-shot sound. Final volume = `audioSource.volume * volumeScale`. (line 430)
- `getPCMData(channelIndex: number): Promise<AudioPCMDataView | undefined>` -- Get PCM data (Native/Web Audio only). Channel 0 = left, 1 = right. (line 295)
- `getSampleRate(): Promise<number>` -- Get sample rate (Native/Web Audio only). (line 323)

**Lifecycle:**
- `onLoad()`: Calls `_syncPlayer()` to load the audio player from the assigned clip. (line 250)
- `onEnable()`: If `playOnAwake` and not already playing, calls `play()`. (line 254)
- `onDisable()`: Pauses playback unless root is a persist node. (line 261)
- `onDestroy()`: Stops and cleans up clip reference. (line 269)

### 2.4 AudioManager (Internal)

**File:** `cocos/audio/audio-manager.ts`

Singleton instance exported as `audioManager`.

**Key behavior:**
- `addPlaying(audio)` / `removePlaying(audio)` -- Track playing audio instances. (lines 63, 79)
- `discardOnePlayingIfNeeded()` -- Called before every new `play()`. If the total playing count exceeds `AudioPlayer.maxAudioChannel`, stops the oldest playing audio. Prioritizes discarding OneShotAudio over AudioPlayer. (line 87)
- `pause()` -- Stops all OneShotAudio (cannot be resumed), pauses all AudioPlayer. (line 113)
- `resume()` -- Resumes all AudioPlayer. OneShotAudio cannot be resumed. (line 122)

### 2.5 Hidden Knowledge and Gotchas

1. **Clip loading is async:** Setting `AudioSource.clip` triggers an async `AudioPlayer.load()`. Operations (play/pause/stop/seek) called before load completes are queued in `_operationsBeforeLoading` and replayed after load. (audio-source.ts:142)

2. **Clip assignment race condition:** If `clip` is set multiple times quickly, only the last assigned clip's player is kept. Previous loaded players are destroyed. (audio-source.ts:145)

3. **`playOnAwake` follows autoplay policy:** On Web platforms, autoplay requires user gesture. The engine will auto-play at the next user gesture if direct play fails. (audio-source.ts:217)

4. **One-shot sounds cannot be paused/resumed:** `playOneShot()` creates a fire-and-forget `OneShotAudio` instance. (audio-manager.ts:123)

5. **Channel limit enforcement:** `audioManager.discardOnePlayingIfNeeded()` is called before every `play()` and `playOneShot()`. When the limit is reached, the oldest audio (by play time) is stopped. (audio-source.ts:372, 441)

6. **Persist nodes bypass pause on disable:** If the root node is a persist node (`_persistNode`), `onDisable()` does NOT pause the audio. (audio-source.ts:262)

7. **Deprecated AudioClip methods:** All playback methods on `AudioClip` are deprecated since v3.1.0. Use `AudioSource` instead. (deprecated.ts)

8. **AudioPlayer is platform-specific (PAL):** The actual `AudioPlayer` and `OneShotAudio` come from `pal/audio`, which is platform-abstraction layer. Behavior varies by platform.

9. **Event system:** `AudioSource` emits `'started'` when play succeeds and `'ended'` when playback finishes naturally (not on pause/stop). (audio-source.ts:165, 381)

---

## 3. Tween System

### 3.1 Architecture Overview

```
Tween<T> --> builds --> FiniteTimeAction chain
                     --> registered with --> ActionManager (inside TweenSystem)
```

- **Tween** (`cocos/tween/tween.ts`) is a builder for chaining animation actions.
- **TweenSystem** (`cocos/tween/tween-system.ts`) is a `System` registered at `SystemPriority.MEDIUM`. It owns the `ActionManager` and calls `actionMgr.update(dt)` each frame.
- **ActionManager** (`cocos/tween/actions/action-manager.ts`) manages all running actions, scheduling and stepping them.
- Actions form a class hierarchy: `Action` -> `FiniteTimeAction` -> `ActionInterval` / `ActionInstant`.

### 3.2 Tween Class

**File:** `cocos/tween/tween.ts`

`Tween<T>` is generic over the target type `T extends object`.

**Constructor:**
- `new Tween<T>(target?: T | null)` -- Optional target. Can be set later via `.target()`. (line 111)

**Core chaining methods:**

- `to(duration: number, props: ConstructorType<T>, opts?: ITweenOption<T>): Tween<T>` -- Absolute value tween. (line 475)
- `by(duration: number, props: ConstructorType<T>, opts?: ITweenOption<T>): Tween<T>` -- Relative value tween. (line 496)
- `set(props: ConstructorType<T>): Tween<T>` -- Instantly set properties. (line 540)
- `delay(duration: number): Tween<T>` -- Wait for duration seconds. (line 555)
- `call(callback, callbackThis?, data?): Tween<T>` -- Execute a callback. (line 572)
- `update(duration: number, cb: TweenUpdateCallback<T>, ...args): Tween<T>` -- Custom action with known duration. (line 512)
- `updateUntil(cb: TweenUpdateUntilCallback<T>, ...args): Tween<T>` -- Custom action with unknown duration (returns true when done). (line 525)

**Composition methods:**
- `sequence(...args: Tween<any>[]): Tween<T>` -- Run sub-tweens sequentially. (line 587)
- `parallel(...args: Tween<any>[]): Tween<T>` -- Run sub-tweens simultaneously. (line 602)
- `then(other: Tween): Tween<T>` -- Append another tween's actions. (line 166)
- `union(fromId?: number): Tween<T>` -- Merge all previous actions into a single Sequence. (line 434)

**Modifier methods:**
- `repeat(repeatTimes: number, embedTween?: Tween<T>): Tween<T>` -- Repeat N times. If `Infinity`, delegates to `repeatForever`. (line 656)
- `repeatForever(embedTween?: Tween<T>): Tween<T>` -- Repeat forever. (line 685)
- `reverseTime(embedTween?: Tween<T>): Tween<T>` -- Play last action in reverse. (line 715)
- `timeScale(scale: number): Tween<T>` -- Set speed multiplier (1 = normal). (line 614)
- `tag(tag: number): Tween<T>` -- Set tag for batch operations. (line 139)
- `id(id: number): Tween<T>` -- Set ID on the previous action for targeted reverse/union. (line 150)
- `bindNodeState(isBindNodeState: boolean): Tween<T>` -- Bind tween lifecycle to node active state (default true). (line 127)
- `reverse(): Tween<T>` -- Returns a NEW tween that reverses all actions. (line 182)
- `reverse(id: number): Tween<T>` -- Reverse a specific action by ID. (line 190)
- `reverse(otherTween: Tween, id?: number): Tween<T>` -- Reverse action from another tween. (line 200)

**Node-only methods** (silently no-op if target is not a Node):
- `hide(): Tween<T>` -- Hide the node. (line 740)
- `show(): Tween<T>` -- Show the node. (line 756)
- `removeSelf(): Tween<T>` -- Remove node from parent. (line 772)
- `destroySelf(): Tween<T>` -- Remove and destroy node. (line 788)

**Playback control:**
- `start(time?: number): Tween<T>` -- Begin playback. The `time` parameter (default 0) skips forward: all actions before `time` are executed instantly. (line 329)
- `stop(): Tween<T>` -- Stop the tween. (line 358)
- `pause(): Tween<T>` -- Pause the tween. (line 373)
- `resume(): Tween<T>` -- Resume the tween. (line 387)
- `running: boolean` -- Whether the tween is currently running. (line 400)
- `duration: number` -- Total duration (only valid after `start()`). (line 639)
- `getTarget(): T | null` -- Get current target. (line 318)
- `getTimeScale(): number` -- Get current time scale. (line 627)
- `clone(target?): Tween<T>` -- Clone this tween for reuse with optional new target. (line 418)

**Static methods:**
- `tween.stopAll()` -- Stop all running tweens. (line 814)
- `tween.stopAllByTag(tag, target?)` -- Stop by tag. (line 823)
- `tween.stopAllByTarget(target?)` -- Stop all tweens of a target. (line 832)
- `tween.pauseAllByTarget(target)` -- Pause all tweens of a target. (line 841)
- `tween.resumeAllByTarget(target)` -- Resume all tweens of a target. (line 850)
- `tween.getRunningCount(target)` -- Count running tweens for a target. (line 804)

### 3.3 tween() Factory Function

**File:** `cocos/tween/tween.ts:922`

```ts
function tween<T extends object>(target?: T): Tween<T>
```

Creates a new `Tween` instance. This is the primary way to create tweens:

```ts
tween(this.node)
    .to(1, { scale: new Vec3(2, 2, 2) })
    .call(() => console.log('Done'))
    .start()
```

### 3.4 ITweenOption

**File:** `cocos/tween/export-api.ts:51`

```ts
interface ITweenOption<T extends object = any> {
    easing?: TweenEasing | ((k: number) => number);
    progress?: (start: number, end: number, current: number, ratio: number) => number;
    onStart?: (target?: T) => void;
    onUpdate?: (target?: T, ratio?: number) => void;
    onComplete?: (target?: T) => void;
}
```

**Custom property tweens** (from `tween.ts:60`):

Per-property options can override easing/progress at the property level:
```ts
{
    value: number | (() => number) | ITweenCustomProperty,
    progress?: TweenCustomProgress,
    easing?: TweenCustomEasing,
}
```

### 3.5 Easing Functions

**File:** `cocos/tween/export-api.ts:32`

Built-in easing names (string identifiers):
- `linear`, `smooth`, `fade`, `constant`
- `quadIn`, `quadOut`, `quadInOut`, `quadOutIn`
- `cubicIn`, `cubicOut`, `cubicInOut`, `cubicOutIn`
- `quartIn`, `quartOut`, `quartInOut`, `quartOutIn`
- `quintIn`, `quintOut`, `quintInOut`, `quintOutIn`
- `sineIn`, `sineOut`, `sineInOut`, `sineOutIn`
- `expoIn`, `expoOut`, `expoInOut`, `expoOutIn`
- `circIn`, `circOut`, `circInOut`, `circOutIn`
- `elasticIn`, `elasticOut`, `elasticInOut`, `elasticOutIn`
- `backIn`, `backOut`, `backInOut`, `backOutIn`
- `bounceIn`, `bounceOut`, `bounceInOut`, `bounceOutIn`

**Spline progress helpers** (`cocos/tween/tween-progress.ts`):
- `tweenProgress.bezier(...knots: Vec3[]): ITweenCustomProperty<Vec3>` -- Bezier curve interpolation. (line 90)
- `tweenProgress.catmullRom(...knots: Vec3[]): ITweenCustomProperty<Vec3>` -- Catmull-Rom spline interpolation. (line 94)

### 3.6 Action Hierarchy

**Files:** `cocos/tween/actions/action.ts`, `cocos/tween/actions/action-interval.ts`

```
Action (abstract)
  -> FiniteTimeAction (abstract, has duration)
       -> ActionInterval (abstract, time-based)
            -> TweenAction (the actual property tween)
            -> Sequence (run actions in order)
            -> Spawn (run actions in parallel)
            -> Repeat (repeat N times)
            -> RepeatForever (loop forever)
            -> ReverseTime (play backward)
            -> DelayTime
            -> ActionCustomUpdate
       -> ActionInstant (zero-duration)
            -> CallFunc
            -> Show / Hide
            -> RemoveSelf
  -> ActionUnknownDuration (callback-driven, unknown end time)
```

**Key Action methods:**
- `startWithTarget(target)`: Called when action begins. (action.ts:96)
- `stop()`: Called when action ends. Sets target to null. (action.ts:102)
- `step(dt)`: Called each frame with delta time. (action.ts:107)
- `update(t)`: Called with normalized time [0, 1]. (action.ts:110)
- `isDone(): boolean`: Whether action has finished. (action.ts:91)
- `reverse(): Action | null`: Returns reversed copy. (action.ts:244)

**ActionInterval specifics** (`action-interval.ts`):
- `_speed` multiplier (line 83): Scales dt in `step()`. (line 135)
- `_startTime` offset (line 82): Allows delayed start. (line 92)
- Duration of 0 is converted to `macro.FLT_EPSILON` to prevent division by zero. (line 111)

### 3.7 Hidden Knowledge and Gotchas

1. **`tween().start()` is required:** Actions are not registered with the `ActionManager` until `start()` is called. Simply building a tween chain does nothing. (tween.ts:336)

2. **`start(time)` skips actions:** Passing a non-zero time executes all actions that would complete before that time instantly, then starts the remaining actions at the offset. (tween.ts:323)

3. **`repeatForever` at chain end needs preceding action:** `repeatForever()` pops the last action from the chain and wraps it. If there are no preceding actions, it warns and does nothing. (tween.ts:695)

4. **Node lifecycle binding is ON by default:** `bindNodeState` defaults to `true` (compatible with Creator 2.x). When true: node deactivation pauses the tween, reactivation resumes it, node destruction destroys the tween. Call `bindNodeState(false)` to disable. (tween.ts:109, 127)

5. **`by()` is relative, `to()` is absolute:** `to()` sets properties to exact values. `by()` adds values relative to the current value at start. (tween.ts:477 vs 499)

6. **Property values can be functions:** Property values in the `props` object are evaluated lazily. If a value is a function, it is called at tween start time. (tween-action.ts:147)

7. **Per-property easing:** Each property can have its own easing function, overriding the global one. Use the object form `{ value: ..., easing: 'quadOut' }`. (tween-action.ts:163)

8. **Custom property support for object types:** For Vec3, Color, etc., the tween system iterates over `Object.keys()` or `getModifiableProperties()`. With `legacyProgress: true` (default), each key is interpolated independently. With `legacyProgress: false`, the whole object is passed to the progress function. (tween-action.ts:248-273)

9. **Warning for unsupported options:** `delay`, `repeat`, `repeatDelay`, `interpolation`, `onStop` in `ITweenOption` are not supported (warns at construction). Use the chaining methods instead. (tween-action.ts:78-89)

10. **`reverse()` on non-relative `to()` is a no-op:** `TweenAction.reverse()` only works on relative (`by()`) actions. Non-relative tweens cannot be reversed and emit warning 16382. (tween-action.ts:214-219)

11. **Worker target resolution:** For `parallel()` / `sequence()`, the worker target of each sub-tween action is resolved via `_owner.getTarget()`. If the sub-tween has no target, the root tween's target is used. (action.ts:188-191)

12. **TweenSystem update priority:** Registered at `SystemPriority.MEDIUM`. The `ActionManager.update(dt)` runs after all component updates. (tween-system.ts:86)

---

## 4. File Path Index

### Animation Module

| File | Key Contents | Lines of Interest |
|---|---|---|
| `cocos/animation/index.ts` | Public exports | Full file |
| `cocos/animation/animation-component.ts` | `Animation` class (ccclass `cc.Animation`) | L52 (class), L200 (play), L219 (crossFade), L265 (getState), L284 (createState), L335 (removeClip), L391 (on events) |
| `cocos/animation/animation-clip.ts` | `AnimationClip` class | L131 (class), L143 (createWithSpriteFrames), L204 (duration), L247 (events), L350 (addTrack), L390 (createEventEvaluator), L424 (createEvaluator), L1697 (EventEvaluator) |
| `cocos/animation/animation-state.ts` | `AnimationState` class, `AnimationStateEventType` enum | L40 (enum), L85 (class), L115 (wrapMode), L219 (speed), L233 (time), L257 (weight), L339 (initialize), L492 (setTime), L502 (update) |
| `cocos/animation/cross-fade.ts` | `CrossFade` class | L47 (class), L85 (crossFade), L119 (clear), L171 (_calculateWeights) |
| `cocos/animation/playable.ts` | `Playable` base class | L27 (class), L62 (play), L80 (stop), L94 (pause), L105 (resume) |
| `cocos/animation/types.ts` | `WrapMode` enum, `WrappedInfo` | L30 (WrapMode), L72 (WrappedInfo), L96 (ILerpable) |
| `cocos/animation/animation-mask.ts` | `AnimationMask` class | L47 (class), L75 (addJoint), L108 (isExcluded) |
| `cocos/animation/animation-manager.ts` | `AnimationManager` system | L41 (class), L81 (update), L119 (addAnimation), L135 (pushDelayEvent) |
| `cocos/animation/global-animation-manager.ts` | `getGlobalAnimationManager()` | L28 (function) |
| `cocos/animation/pose-output.ts` | `PoseOutput` class | L30 (class), L44 (createPoseWriter) |
| `cocos/animation/tracks/track.ts` | `TrackPath`, `Track`, `Channel`, `TrackBinding` | L76 (TrackPath), L537 (Track), L628 (Channel), L358 (TrackBinding) |
| `cocos/animation/tracks/real-track.ts` | `RealTrack` | L37 (class) |
| `cocos/animation/target-path.ts` | `HierarchyPath`, `ComponentPath` (deprecated in V3.3) | L74 (HierarchyPath), L100 (ComponentPath) |
| `cocos/animation/value-proxy.ts` | `IValueProxy`, `IValueProxyFactory` | L33 (IValueProxy), L52 (IValueProxyFactory) |
| `cocos/animation/event/event-emitter.ts` | `invokeComponentMethodsEngagedInAnimationEvent()` | L11 (function) |
| `cocos/animation/wrap.ts` | `wrap()` utility function | L5 (function) |
| `cocos/3d/skeletal-animation/skeletal-animation.ts` | `SkeletalAnimation`, `Socket` | L48 (Socket), L102 (SkeletalAnimation), L140 (useBakedAnimation) |
| `cocos/3d/skeletal-animation/skeletal-animation-blending.ts` | `BlendStateBuffer`, `LegacyBlendStateBuffer` | L29 (BlendStateBuffer), L100 (BlendStateWriterInternal), L159 (LegacyVec3PropertyBlendState), L350 (LegacyBlendStateBuffer) |

### Audio Module

| File | Key Contents | Lines of Interest |
|---|---|---|
| `cocos/audio/index.ts` | Public exports | Full file |
| `cocos/audio/audio-clip.ts` | `AudioClip` class | L44 (class), L51 (duration), L121 (getDuration), L67 (destroy) |
| `cocos/audio/audio-source.ts` | `AudioSource` class | L63 (class), L109 (clip), L197 (loop), L219 (playOnAwake), L234 (volume), L295 (getPCMData), L366 (play), L395 (pause), L410 (stop), L430 (playOneShot), L480 (currentTime) |
| `cocos/audio/audio-manager.ts` | `AudioManager` class, singleton | L37 (class), L63 (addPlaying), L79 (removePlaying), L87 (discardOnePlayingIfNeeded), L113 (pause), L122 (resume) |
| `cocos/audio/deprecated.ts` | Deprecation mappings | Full file |

### Tween Module

| File | Key Contents | Lines of Interest |
|---|---|---|
| `cocos/tween/index.ts` | Public exports | Full file |
| `cocos/tween/tween.ts` | `Tween<T>` class, `tween()` function | L103 (class), L127 (bindNodeState), L139 (tag), L150 (id), L166 (then), L182 (reverse), L308 (target), L329 (start), L358 (stop), L373 (pause), L387 (resume), L475 (to), L496 (by), L512 (update), L540 (set), L555 (delay), L572 (call), L587 (sequence), L602 (parallel), L656 (repeat), L685 (repeatForever), L614 (timeScale), L814 (stopAll), L922 (tween function) |
| `cocos/tween/tween-action.ts` | `TweenAction<T>` class | L105 (class), L201 (relative), L205 (clone), L214 (reverse), L227 (startWithTarget), L357 (update), L413 (progress) |
| `cocos/tween/tween-system.ts` | `TweenSystem` class | L36 (class), L59 (ActionManager getter), L76 (update) |
| `cocos/tween/export-api.ts` | `TweenEasing` type, `ITweenOption` | L32 (TweenEasing), L51 (ITweenOption) |
| `cocos/tween/tween-progress.ts` | `bezier()`, `catmullRom()` | L90 (bezier), L94 (catmullRom) |
| `cocos/tween/actions/action.ts` | `Action`, `FiniteTimeAction` | L46 (Action), L259 (FiniteTimeAction), L188 (_getWorkerTarget) |
| `cocos/tween/actions/action-interval.ts` | `ActionInterval`, `Sequence`, `Spawn`, `Repeat`, `RepeatForever` | L78 (ActionInterval) |
| `cocos/tween/actions/action-instant.ts` | `ActionInstant`, `CallFunc`, `Show`, `Hide`, `RemoveSelf` | Full file |
| `cocos/tween/actions/action-manager.ts` | `ActionManager` | Full file |
| `cocos/tween/set-action.ts` | `SetAction` | Full file |
| `cocos/tween/actions/action-unknown-duration.ts` | `ActionUnknownDuration` | Full file |

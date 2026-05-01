# Cocos Creator Engine -- Rendering, WebGPU, Global Illumination & Sorting Documentation

> This document covers four engine modules: the rendering pipeline (`cocos/rendering/`), the WebGPU backend (`cocos/webgpu/`), the global illumination / light probe system (`cocos/gi/`), and the sorting system (`cocos/sorting/`). It is written for AI-assisted scripting and focuses on non-obvious behaviors, hook points, and API signatures that are needed to correctly extend or interact with the rendering engine.

---

## Table of Contents

1. [Rendering Pipeline (`cocos/rendering/`)](#1-rendering-pipeline)
   - [Architecture Overview](#11-architecture-overview)
   - [RenderPipeline](#12-renderpipeline)
   - [RenderFlow](#13-renderflow)
   - [RenderStage](#14-renderstage)
   - [RenderQueue](#15-renderqueue)
   - [Forward Pipeline](#16-forward-pipeline)
   - [Deferred Pipeline](#17-deferred-pipeline)
   - [Shadow System](#18-shadow-system)
   - [Scene Culling](#19-scene-culling)
   - [Pipeline UBO & Global Descriptor Set](#110-pipeline-ubo--global-descriptor-set)
   - [Pipeline Events](#111-pipeline-events)
   - [Material & Pass System Integration](#112-material--pass-system-integration)
   - [Instanced Rendering](#113-instanced-rendering)
   - [Post-Process & Bloom](#114-post-process--bloom)
   - [Debug View](#115-debug-view)
   - [Reflection Probes](#116-reflection-probes)
2. [WebGPU Backend (`cocos/webgpu/`)](#2-webgpu-backend)
3. [Global Illumination (`cocos/gi/`)](#3-global-illumination)
4. [Sorting System (`cocos/sorting/`)](#4-sorting-system)
5. [File Path Index](#5-file-path-index)

---

## 1. Rendering Pipeline

### 1.1 Architecture Overview

The rendering pipeline follows a three-level hierarchy:

```
RenderPipeline (Asset)
  -> RenderFlow[] (ordered by priority)
       -> RenderStage[] (ordered by priority)
            -> RenderQueue[] (opaque front-to-back, transparent back-to-front)
```

The `Root` calls `RenderPipeline.render(cameras[])` each frame. The pipeline iterates all cameras, performs scene culling, updates UBOs, and dispatches to flows. Each flow dispatches to its stages, and each stage manages one or more render queues.

There are three pipeline implementations:
- **ForwardPipeline** -- default pipeline; single-pass forward rendering with additive light passes
- **DeferredPipeline** -- GBuffer-based deferred rendering with a full-screen lighting pass
- **Legacy** -- re-exports from forward/deferred for backward compatibility

**Key design principle**: The pipeline is an `Asset` (serialized). Flows and stages are configured in the editor and stored in the pipeline asset. Programmatic creation uses `initialize()` + `activate()`.

**Descriptor set layout** (defined in `define.ts`):
- `SetIndex.GLOBAL` (set 0) -- global UBOs (camera, shadow, CSM) and samplers
- `SetIndex.MATERIAL` (set 1) -- material-level uniforms and textures
- `SetIndex.LOCAL` (set 2) -- per-model uniforms (world matrix, skinning, morph, SH, lightmaps)

### 1.2 RenderPipeline

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/render-pipeline.ts`

`RenderPipeline` extends `Asset` and implements `IPipelineEvent` and `PipelineRuntime`. It is the root object of the entire rendering system.

#### Class: `RenderPipeline` (abstract, line 156)

| Property/Method | Line | Description |
|---|---|---|
| `tag: number` (readonly) | 165 | Pipeline identifier tag |
| `flows: RenderFlow[]` (readonly) | 174 | Ordered list of render flows |
| `device: Device` | 247 | GFX device reference |
| `globalDSManager: GlobalDSManager` | 251 | Manages global descriptor sets |
| `descriptorSet: DescriptorSet` | 259 | Global descriptor set (set 0) |
| `commandBuffers: CommandBuffer[]` | 263 | Command buffer array |
| `pipelineUBO: PipelineUBO` | 267 | UBO management for global/camera/shadow data |
| `pipelineSceneData: PipelineSceneData` | 271 | Scene data (render objects, lights, shadows, skybox) |
| `macros: MacroRecord` | 243 | Global shader macros (e.g., `CC_USE_HDR`, `CC_PIPELINE_TYPE`) |
| `shadingScale: number` | 466 | Render resolution scale; emits `ATTACHMENT_SCALE_CAHNGED` on change |
| `bloomEnabled: boolean` | 299 | Enable/disable bloom post-processing |
| `clusterEnabled: boolean` | 290 | Enable/disable clustered light culling |
| `initialize(info: IRenderPipelineInfo): boolean` | 329 | Programmatic initialization; sets flows and tag |
| `activate(swapchain: Swapchain): boolean` | 519 | Activates pipeline: creates devices, macros, activates flows |
| `render(cameras: Camera[]): void` | 545 | Main render entry; called by Root each frame |
| `on(type, callback, target?, once?)` | 998 | Register pipeline event listener |
| `emit(type, ...args)` | 1043 | Emit pipeline event |
| `getRenderPass(clearFlags, fbo)` | 388 | Get or create a cached RenderPass |
| `generateRenderArea(camera, out)` | 434 | Compute render area rect from camera viewport |
| `generateViewport(camera, out?)` | 444 | Compute viewport with shadingScale applied |
| `generateScissor(camera, out?)` | 455 | Compute scissor rect with shadingScale applied |
| `setMacroBool/String/Int(name, value)` | 501-511 | Set global shader macros |
| `generateBloomRenderData()` | 894 | Create bloom textures and framebuffers |

#### Render Flow (line 545)

The `render()` method follows this exact sequence:

1. `commandBuffers[0].begin()`
2. `emit(RENDER_FRAME_BEGIN, cameras)`
3. `_ensureEnoughSize(cameras)` -- ensures FBOs are large enough
4. `decideProfilerCamera(cameras)` -- picks camera for profiler display
5. **For each camera**:
   - `emit(RENDER_CAMERA_BEGIN, camera)`
   - `validPunctualLightsCulling(sceneData, camera)` -- cull punctual lights
   - `sceneCulling(sceneData, pipelineUBO, camera)` -- cull models, build renderObjects
   - `pipelineUBO.updateGlobalUBO(window)` -- write time, screen size, probe info
   - `pipelineUBO.updateCameraUBO(camera)` -- write view/proj matrices, fog, exposure
   - **For each flow**: `flow.render(camera)`
   - `emit(RENDER_CAMERA_END, camera)`
6. `emit(RENDER_FRAME_END, cameras)`
7. `commandBuffers[0].end()`
8. `device.queue.submit(commandBuffers)`

#### Hidden Gotcha: `CC_PIPELINE_TYPE` Macro

When creating a pipeline, the `activate()` method sets `_macros.CC_PIPELINE_TYPE`:
- Forward pipeline sets it to `0` (line 91 of forward-pipeline.ts)
- Deferred pipeline sets it to `1` (line 100 of deferred-pipeline.ts)

This macro is compiled into shaders and controls code paths. If you create a custom pipeline, you must set this macro correctly or shaders may misbehave.

### 1.3 RenderFlow

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/render-flow.ts`

#### Class: `RenderFlow` (abstract, line 47)

| Property/Method | Line | Description |
|---|---|---|
| `name: string` | 52 | Flow name (e.g., `"ShadowFlow"`, `"ForwardFlow"`) |
| `priority: number` | 60 | Execution order; lower runs first |
| `tag: number` | 68 | Flow tag (SCENE=0, POSTPROCESS=1, UI=2) |
| `stages: RenderStage[]` | 77 | Ordered stages in this flow |
| `pipeline: RenderPipeline` | 103 | Parent pipeline reference |
| `initialize(info: IRenderFlowInfo): boolean` | 112 | Set name, priority, stages |
| `activate(pipeline): void` | 125 | Sets pipeline ref, sorts stages by priority, activates each stage |
| `render(camera: Camera): void` | 139 | Iterates enabled stages and calls `stage.render(camera)` |
| `destroy(): void` | 149 | Destroys all stages |

**Hidden gotcha**: Stages are sorted by priority during `activate()` (line 127). If you dynamically add stages after activation, they will NOT be sorted automatically.

### 1.4 RenderStage

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/render-stage.ts`

#### Class: `RenderStage` (abstract, line 51)

| Property/Method | Line | Description |
|---|---|---|
| `name: string` | 56 | Stage name |
| `priority: number` | 64 | Execution order within the flow |
| `tag: number` | 72 | Stage tag |
| `enabled: boolean` | 97 | Enable/disable toggle; if false, `flow.render()` skips this stage |
| `initialize(info: IRenderStageInfo): boolean` | 120 | Set name, priority, tag |
| `activate(pipeline, flow): void` | 132 | Store pipeline and flow references |
| `render(camera: Camera): void` | 148 | **Abstract** -- implement actual rendering here |
| `destroy(): void` | 141 | **Abstract** |

The `IRenderStageInfo` interface (line 36):
```ts
interface IRenderStageInfo {
    name: string;
    priority: number;
    tag?: number;
    renderQueues?: RenderQueueDesc[];
}
```

### 1.5 RenderQueue

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/render-queue.ts`

#### Class: `RenderQueue` (line 52)

Manages a sorted array of `IRenderPass` entries.

| Method | Line | Description |
|---|---|---|
| `constructor(desc: IRenderQueueDesc)` | 67 | Creates queue with sort function and phase filter |
| `clear()` | 77 | Reset queue and pass pool |
| `insertRenderPass(renderObj, subModelIdx, passIdx): boolean` | 90 | Insert a render pass; returns false if filtered out by transparency/phase mismatch |
| `sort()` | 114 | Sort the queue using the configured sort function |
| `recordCommandBuffer(device, renderPass, cmdBuff)` | 118 | Record draw calls for all passes in sorted order |

#### Sorting Functions (line 36-46)

- `opaqueCompareFn` -- front-to-back: `hash -> depth -> shaderId`
- `transparentCompareFn` -- back-to-front: `priority -> hash -> depth(reversed) -> shaderId`

**Hidden gotcha**: The hash is composed as `(pass.priority << 16) | (subModel.priority << 8) | passIdx` (line 98 of render-queue.ts). The priority component in the hash is the **pass** priority, not the model priority. This means transparent objects are first grouped by pass priority, then by submodel priority within each pass group.

#### `IRenderPass` Interface (define.ts, line 82)

```ts
interface IRenderPass {
    priority: number;  // model priority
    hash: number;      // composed sort key
    depth: number;     // camera-space depth
    shaderId: number;  // shader typed ID
    subModel: SubModel;
    passIdx: number;
}
```

#### Phase System

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/pass-phase.ts` (line 25)

Phase IDs are generated as power-of-two bitmasks via `getPhaseID(name)`:
- `"default"` returns `1` (bit 0)
- `"planarShadow"` returns `2` (bit 1)
- Additional names get subsequent bits

Passes have a `phase` field that is a bitmask. A queue's phase is the OR of all stage names in `RenderQueueDesc.stages`. A pass is included in a queue if `pass.phase & queue.phases !== 0`.

**Critical**: If a pass's phase does not match the queue's phase mask, the pass will be silently skipped. This is the most common reason for invisible objects.

### 1.6 Forward Pipeline

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/forward/forward-pipeline.ts`

#### Class: `ForwardPipeline` (line 52)

| Method | Line | Description |
|---|---|---|
| `initialize(info)` | 68 | Creates ShadowFlow, ReflectionProbeFlow, ForwardFlow if empty |
| `activate(swapchain)` | 88 | Sets `CC_PIPELINE_TYPE=0`, creates `PipelineSceneData`, calls `_activeRenderer` |
| `_activeRenderer(swapchain)` | 135 | Binds default shadow textures, creates command buffer |

**Default flows created** (priority order):
1. `ShadowFlow` (priority 0) -- `ShadowStage`
2. `ReflectionProbeFlow` -- `ReflectionProbeStage`
3. `ForwardFlow` (priority 1) -- `ForwardStage`

#### Class: `ForwardFlow` (line 38, forward-flow.ts)

Single stage: `ForwardStage` (priority `ForwardStagePriority.FORWARD = 10`).

#### Class: `ForwardStage` (line 50, forward-stage.ts)

The workhorse of forward rendering. Its `render()` method (line 126):

1. Clear instanced queue and render queues
2. Iterate `renderObjects`, for each model/subModel/pass:
   - Skip if `pass.phase !== this._phaseID` (default phase = 1)
   - Skip if `pass.passID !== 0xFFFFFFFF` (only render non-special passes)
   - If instancing batching: merge into `InstancedBuffer`
   - Otherwise: insert into render queues
3. Sort instanced queue and render queues
4. Update shadow UBO
5. Upload instanced buffers
6. Gather additive light passes and planar shadow passes
7. Begin render pass on camera window framebuffer
8. **Record order**:
   - Opaque queue (front-to-back)
   - Additive instanced queues
   - Main instanced queue
   - Additive light queue (per-light deferred light passes)
   - Planar shadow queue
   - Transparent queue (back-to-front)
   - Geometry renderer (debug lines)
   - UI phase
   - Profiler
9. End render pass

**Hidden gotcha**: The additive light queue (`RenderAdditiveLightQueue`) creates per-light dynamic UBO updates. Each visible punctual light gets its own set of draw calls. The number of lights is limited by `UBOForwardLight.LIGHTS_PER_PASS` (1 light per dynamic UBO slot in forward, 10 in deferred).

### 1.7 Deferred Pipeline

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/deferred/deferred-pipeline.ts`

#### Class: `DeferredPipeline` (line 65)

| Method | Line | Description |
|---|---|---|
| `initialize(info)` | 78 | Creates ShadowFlow and MainFlow |
| `activate(swapchain)` | 94 | Sets `CC_PIPELINE_TYPE=1`, creates `DeferredPipelineSceneData` |
| `_activeRenderer(swapchain)` | 144 | Creates GBuffer render pass (3x RGBA16F + depth), lighting render pass (RGBA8), quad IAs |
| `getPipelineRenderData()` | 136 | Lazy-creates deferred render data (GBuffer textures) |

**GBuffer layout** (3 color attachments, all RGBA16F):
- Attachment 0: Albedo / Base Color
- Attachment 1: Normal (world-space, needs more precision hence RGBA16F)
- Attachment 2: Material properties (roughness, metallic, etc.)

**Lighting render pass**: Uses RGBA8 format, depth is loaded from GBuffer (not cleared), then discarded after lighting pass.

#### Class: `MainFlow` (line 46, main-flow.ts)

Default stages (in priority order):
1. `GbufferStage` (priority `DeferredStagePriority.GBUFFER = 10`)
2. `LightingStage` (priority `DeferredStagePriority.LIGHTING = 15`)
3. `BloomStage` (priority `CommonStagePriority.BLOOM = 18`)
4. `PostProcessStage` (priority `CommonStagePriority.POST_PROCESS = 19`)

#### Class: `GbufferStage` (line 52, gbuffer-stage.ts)

Renders all opaque geometry into the GBuffer. Similar iteration to ForwardStage but writes to the GBuffer framebuffer instead of the window framebuffer. Transparent objects are also written to the GBuffer.

#### Class: `LightingStage` (line 64, lighting-stage.ts)

Performs a full-screen lighting pass using the deferred lighting material, then renders transparent objects on top.

Key method `gatherLights(camera)` (line 100): Packs all visible sphere, spot, point, and ranged-directional lights into a Float32Array buffer. Maximum lights is `UBODeferredLight.LIGHTS_PER_PASS = 10`.

The lighting material receives:
- GBuffer textures (3 color + 1 depth)
- Light data buffer (position, color, size/range/angle, direction per light)
- Shadow maps

**Hidden gotcha**: The deferred pipeline does NOT support unlit materials (builtin-unlit). This is logged as a warning in the editor (line 97 of deferred-pipeline.ts). Unlit objects will be invisible in the GBuffer pass because they have no lighting model.

### 1.8 Shadow System

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/shadow/shadow-flow.ts`

#### Class: `ShadowFlow` (line 49)

| Method | Line | Description |
|---|---|---|
| `initialize(info)` | 67 | Creates ShadowStage |
| `activate(pipeline)` | 78 | Sets shadow-related macros: format, linear depth, CSM support, PCF type |
| `render(camera)` | 109 | Renders shadow maps for main light (with CSM) and valid spot lights |

**Shadow macros set during activate** (line 82-104):
- `CC_SHADOWMAP_FORMAT`: 0 for R32F, 1 for RGBA8 fallback
- `CC_SHADOWMAP_USE_LINEAR_DEPTH`: 1 on WebGL, 0 otherwise
- `CC_SUPPORT_CASCADED_SHADOW_MAP`: based on maxFragmentUniformVectors
- `CC_SHADOW_TYPE`: 0 (none) initially
- `CC_DIR_SHADOW_PCF_TYPE`: 0 (HARD) initially
- `CC_DIR_LIGHT_SHADOW_TYPE`: 0 (none) initially
- `CC_CASCADED_LAYERS_TRANSITION`: 0 initially

**CSM level control**: If the device has `maxFragmentUniformVectors < (UBOGlobal + UBOCamera + UBOShadow + UBOCSM) / 4`, CSM is disabled and falls back to single-level shadows (line 90).

### 1.9 Scene Culling

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/scene-culling.ts`

#### `sceneCulling(sceneData, pipelineUBO, camera)` (line 150)

Called once per camera per frame. Builds `sceneData.renderObjects`:

1. Clears renderObjects, castShadowObjects, csmLayerObjects
2. Updates shadow UBO color if shadows enabled
3. Updates CSM layers if main light has shadows
4. Adds skybox model if `camera.clearFlag & SkyBoxFlagValue`
5. For each model in scene:
   - Check `model.enabled`
   - Check LOD culling (`scene.isCulledByLod(camera, model)`)
   - If `model.castShadow`, add to castShadowObjects and csmLayerObjects
   - Check visibility: `(visibility & model.node.layer) === model.node.layer` OR `(visibility & model.visFlags)`
   - Frustum cull: skip if `!geometry.intersect.aabbFrustum(model.worldBounds, camera.frustum)`
   - Add to renderObjects with depth computed as dot product of (model center - camera position) with camera forward

**Hidden gotcha**: Visibility check has an OR condition (line 198-199). A model is visible if EITHER its node's layer matches the camera's visibility bitmask OR the model's own `visFlags` matches. This means models can bypass layer-based visibility through `visFlags`.

#### `validPunctualLightsCulling(sceneData, camera)` (line 53)

Culls sphere lights, spot lights, point lights, and ranged directional lights against the camera frustum. Baked lights are skipped when lightmaps are enabled.

#### `shadowCulling(camera, sceneData, layer)` (line 107)

Culls shadow-casting objects against the directional light frustum for a specific CSM layer. Supports `CSMOptimizationMode.RemoveDuplicates` to avoid rendering objects in multiple CSM cascades.

### 1.10 Pipeline UBO & Global Descriptor Set

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/pipeline-ubo.ts`

The `PipelineUBO` class manages three global UBOs:
- `CCGlobal` (binding 0): time, screen size, native size, probe info, debug view mode
- `CCCamera` (binding 1): view/proj matrices, camera pos, exposure, fog params, near/far, viewport
- `CCShadow` (binding 2): light view/proj matrices, shadow params, shadow color
- `CCCSM` (binding 3): cascaded shadow map data (view dirs, atlas, matrices per CSM level)

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/global-descriptor-set-manager.ts`

#### Class: `GlobalDSManager` (line 48)

Manages the global descriptor set and per-light descriptor sets for shadow rendering.

| Method | Line | Description |
|---|---|---|
| `globalDescriptorSet: DescriptorSet` | 79 | The main global descriptor set |
| `linearSampler / pointSampler` | 62/66 | Samplers for different filtering needs |
| `bindBuffer/Sampler/Texture(binding, resource)` | 108-151 | Updates the global DS and ALL per-light DS instances |
| `getOrCreateDescriptorSet(light)` | 174 | Creates a per-light DS with its own shadow UBO, synced with global bindings |
| `regenLayout()` | 95 | Regenerate layout from `globalDescriptorSetLayout` bindings |

**Hidden gotcha**: When you call `bindBuffer/bindSampler/bindTexture` on the GlobalDSManager, it propagates to ALL previously created per-light descriptor sets. This is essential for shadow map texture updates -- if you bind a new shadow map texture only to the global DS, per-light DS instances will still reference the old texture.

### 1.11 Pipeline Events

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/pipeline-event.ts`

#### `PipelineEventType` Enum (line 27)

| Event | Value | When Fired |
|---|---|---|
| `RENDER_FRAME_BEGIN` | `"render-frame-begin"` | Before any camera rendering |
| `RENDER_FRAME_END` | `"render-frame-end"` | After all cameras rendered |
| `RENDER_CAMERA_BEGIN` | `"render-camera-begin"` | Before a specific camera's flows run |
| `RENDER_CAMERA_END` | `"render-camera-end"` | After a specific camera's flows complete |
| `ATTACHMENT_SCALE_CAHNGED` | `"attachment-scale-changed"` | When `shadingScale` changes |

**Hook point**: You can register listeners on the pipeline to inject custom logic:
```ts
pipeline.on(PipelineEventType.RENDER_CAMERA_BEGIN, (camera) => { /* ... */ });
```

### 1.12 Material & Pass System Integration

The rendering pipeline is tightly integrated with the material/pass system from `render-scene/core/pass.ts`.

**Key integration points in ForwardStage.render()** (forward-stage.ts, line 126):

For each `IRenderObject` in `renderObjects`:
1. Iterate subModels -> passes
2. Check `pass.phase === this._phaseID` (phase filtering)
3. Check `pass.passID === 0xFFFFFFFF` (normal pass check)
4. Check `pass.batchingScheme`:
   - `BatchingSchemes.INSTANCING` -> merge into `InstancedBuffer`
   - Otherwise -> insert into `RenderQueue` via `insertRenderPass()`

In `RenderQueue.insertRenderPass()` (render-queue.ts, line 90):
- Checks `pass.blendState.targets[0].blend` to determine transparency
- Compares against queue's `isTransparent` flag -- **passes are rejected if transparency does not match**
- Checks `pass.phase & this._passDesc.phases` -- **passes are rejected if phase does not match**

**PipelineStateManager** (`pipeline-state-manager.ts`, line 28): Caches `PipelineState` objects using a hash of `pass.hash ^ renderPass.hash ^ ia.attributesHash ^ shader.typedID`. PSOs are created lazily and cached for the lifetime of the pipeline.

### 1.13 Instanced Rendering

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/instanced-buffer.ts`

#### Class: `InstancedBuffer` (line 60)

| Method | Line | Description |
|---|---|---|
| `constructor(pass)` | 68 | Stores the Pass reference and creates a sort render entry |
| `merge(subModel, passIdx, shaderImplant?)` | 86 | Adds a subModel's per-instance data to an existing batch or creates a new one |
| `uploadBuffers(cmdBuff)` | 178 | Uploads instance data to GPU |
| `clear()` | 187 | Resets all instance counts |

**Batching criteria** (line 109-148): Two subModels are merged into the same instanced batch if they share the same:
- Index buffer (`objectID`)
- Instance attribute stride
- Lighting map texture
- Reflection probe type and textures
- Capacity < `MAX_CAPACITY` (1024)

If any condition fails, a new instance batch is created.

#### Class: `RenderInstancedQueue` (render-instanced-queue.ts, line 34)

| Method | Line | Description |
|---|---|---|
| `sort()` | 57 | Sorts: opaque instances first, then transparent (both by hash then shaderId) |
| `uploadBuffers(cmdBuff)` | 71 | Uploads all pending instance buffers |
| `recordCommandBuffer(device, renderPass, cmdBuff, descriptorSet?, dynamicOffsets?)` | 84 | Records all instanced draw calls |

### 1.14 Post-Process & Bloom

#### BloomStage

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/deferred/bloom-stage.ts` (line 61)

Properties: `threshold = 1.0`, `intensity = 0.8`, `iterations = 2`

Bloom is implemented as a multi-pass filter with up to `MAX_BLOOM_FILTER_PASS_NUM = 6` downsample/upsample passes. The bloom data is managed by `RenderPipeline.generateBloomRenderData()`.

#### PostProcessStage

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/deferred/postprocess-stage.ts` (line 51)

Renders a full-screen quad using the post-process material, sampling either the lighting output or the bloom-combined texture. After post-processing, it renders UI and profiler.

### 1.15 Debug View

**File**: `/Users/kay/Git/cocos-engine/cocos/rendering/debug-view.ts`

`DebugViewSingleType` enum provides extensive debug visualization modes including: vertex color/normal/tangent, world position, UV channels, fragment normals, base/diffuse/specular colors, metallic/roughness, direct/ambient lighting, shadows, AO, and more.

Controlled by the global macro `CC_USE_DEBUG_VIEW` and the `cc_debug_view_mode` uniform in the `CCGlobal` UBO.

### 1.16 Reflection Probes

**Directory**: `/Users/kay/Git/cocos-engine/cocos/rendering/reflection-probe/`

- `ReflectionProbeFlow` -- Flow that renders reflection probe cubemaps and planar reflections
- `ReflectionProbeStage` -- Stage that renders the scene from the probe's perspective

The reflection probe flow runs as part of the ForwardPipeline's flow list (created in `ForwardPipeline.initialize()`, line 76). It is NOT part of the deferred pipeline.

---

## 2. WebGPU Backend

### 2.1 Overview

**File**: `/Users/kay/Git/cocos-engine/cocos/webgpu/instantiated.ts`

The WebGPU backend is an experimental, WASM-based implementation. The single file `instantiated.ts` handles loading three WASM modules:

| Module | Purpose |
|---|---|
| `webgpu_wasm.wasm` | Core WebGPU device implementation (CCWGPUDevice) |
| `glslang.wasm` | GLSL to SPIR-V shader transpilation |
| `twgsl.wasm` | SPIR-V to WGSL shader transpilation |

#### Initialization Flow (line 59-92)

The `promiseForWebGPUInstantiation` promise:
1. Loads glslang WASM module
2. Loads twgsl WASM module
3. Fetches and instantiates the WebGPU device WASM binary
4. Requests a native WebGPU adapter and device via `navigator.gpu.requestAdapter()`

This promise is hooked into the game's pre-infrastructure init delegate (line 95-102) so it completes before any rendering begins.

#### Global Singletons

| Export | Purpose |
|---|---|
| `glslangWasmModule.glslang` | GLSL-to-SPIR-V transpiler instance |
| `twgslModule.twgsl` | SPIR-V-to-WGSL transpiler instance |
| `gfx.wasmBinary` | WebGPU WASM binary buffer |
| `gfx.nativeDevice` | Native WASM device reference |
| `legacyCC.WebGPUDevice` | Global WebGPU device class reference |
| `webgpuAdapter.adapter` | Native WebGPU adapter |
| `webgpuAdapter.device` | Native WebGPU device |

**Hidden gotcha**: The WebGPU backend only activates when the `WEBGPU` build constant is true AND the bundle mode is not `ASMJS` (line 60). AsmJS fallback is not yet supported (noted as TODO). The backend requires the browser to support `navigator.gpu`.

---

## 3. Global Illumination

### 3.1 Overview

**Directory**: `/Users/kay/Git/cocos-engine/cocos/gi/light-probe/`

The GI system implements **Light Probe** based indirect lighting using **Spherical Harmonics (SH)** of order 2 (9 coefficients). It uses Delaunay tetrahedralization for spatial interpolation.

### 3.2 Key Classes

#### Class: `LightProbes`

**File**: `/Users/kay/Git/cocos-engine/cocos/gi/light-probe/light-probe.ts` (line 258)

| Property | Line | Default | Description |
|---|---|---|---|
| `giScale: number` | 263 | 1.0 | GI intensity multiplier |
| `giSamples: number` | 274 | 1024 | Number of GI samples for baking |
| `bounces: number` | 285 | 2 | Number of light bounces |
| `reduceRinging: number` | 296 | 0.0 | Reduce SH ringing artifacts |
| `showProbe: boolean` | 307 | true | Editor visualization toggle |
| `showWireframe: boolean` | 318 | true | Show tetrahedron wireframe |
| `showConvex: boolean` | 329 | false | Show convex hull |
| `data: LightProbesData \| null` | 340 | null | The actual probe and tetrahedron data |
| `lightProbeSphereVolume: number` | 351 | 1.0 | Display size of probe spheres |

#### Class: `LightProbesData`

**File**: `/Users/kay/Git/cocos-engine/cocos/gi/light-probe/light-probe.ts` (line 50)

| Method | Line | Description |
|---|---|---|
| `empty(): boolean` | 59 | True if no probes or tetrahedrons |
| `reset()` | 63 | Clear all data |
| `updateProbes(points: Vec3[])` | 68 | Update probe positions, preserving existing SH coefficients |
| `updateTetrahedrons()` | 86 | Rebuild Delaunay tetrahedralization |
| `getInterpolationSHCoefficients(tetIndex, weights, coefficients): boolean` | 91 | Compute interpolated SH coefficients at a point using barycentric weights |
| `getInterpolationWeights(position, tetIndex, weights): number` | 124 | Walk the tetrahedron mesh to find the containing cell and barycentric weights; returns the final tetIndex |
| `hasCoefficients(): boolean` | 162 | True if probes have SH coefficients baked |

**Hidden gotcha**: The `getInterpolationWeights()` method (line 124) performs a **mesh walk** through the tetrahedron graph. It starts at `tetIndex` and follows the neighbour with the most negative weight until all weights are non-negative. The walk has a safety check for numerical precision (line 151: if `lastIndex === nextIndex`, it breaks). If no containing tetrahedron is found, it falls back to `tetIndex = 0`.

#### Class: `LightProbeGroup` (Component)

**File**: `/Users/kay/Git/cocos-engine/cocos/gi/light-probe/light-probe-group.ts` (line 54)

A scene component that defines where light probes are placed in the world.

| Property | Line | Description |
|---|---|---|
| `probes: Vec3[]` | 79 | Array of probe positions (auto-generated or manual) |
| `method: PlaceMethod` | 91 | Generation method (uniform grid) |
| `minPos / maxPos: Vec3` | 105/120 | Bounding box for generation |
| `nProbesX / nProbesY / nProbesZ: number` | 130/142/155 | Grid dimensions (min 2, max 65535) |

| Method | Line | Description |
|---|---|---|
| `generateLightProbes()` | 208 | Generate probe positions using AutoPlacement |
| `onProbeChanged(updateTet?, emitEvent?)` | 225 | Sync data to scene globals, optionally rebuild tetrahedra |

**Editor-only behavior**: The `onLoad`, `onEnable`, and `onDisable` lifecycle methods (lines 162-206) only run in the editor. They register/unregister the node with the scene's `lightProbeInfo` for real-time editing.

### 3.3 Supporting Classes

#### `Vertex` (delaunay.ts, line 39)

```ts
class Vertex {
    position: Vec3;
    normal: Vec3;
    coefficients: Vec3[];  // SH coefficients (Vec3 per band)
}
```

#### `Tetrahedron` (delaunay.ts)

Stores 4 vertex indices (vertex3 = -1 for outer cells), 4 neighbour indices, a 3x3 matrix, and an offset for barycentric computation.

#### `Delaunay` (delaunay.ts)

Performs 3D Delaunay tetrahedralization of the probe positions. Returns an array of `Tetrahedron` objects with connectivity and neighbour information.

#### `SH` (sh.ts)

Spherical Harmonics utility class using LMAX=2 (9 basis functions). Provides:
- `getBasisCount()`: returns 9
- SH basis evaluation and coefficient computation
- `LightProbeSampler`: uniform sphere sampling for GI baking

---

## 4. Sorting System

### 4.1 Overview

**Directory**: `/Users/kay/Git/cocos-engine/cocos/sorting/`

The sorting system controls the render order of 3D models and 2D UI elements through sorting layers and orders.

### 4.2 SortingLayers Manager

**File**: `/Users/kay/Git/cocos-engine/cocos/sorting/sorting-layers.ts` (line 50)

A static manager class that provides the sorting layer registry.

| Method | Line | Description |
|---|---|---|
| `Enum` | 58 | Enum of all sorting layers (populated from settings) |
| `getSortingPriority(layer, order): number` | 64 | Compute priority: `((layer + 32768) << 16) \| (order + 32768)` |
| `getDefaultPriority(): number` | 68 | Priority for the default layer, order 0 |
| `getLayerIndex(layer): number` | 76 | Get sort index by layer ID |
| `getLayerIndexByName(name): number` | 90 | Get sort index by layer name |
| `getLayerName(layer): string` | 99 | Get layer name by ID |
| `getLayerByName(name): number` | 113 | Get layer ID by name |
| `isLayerValid(id): boolean` | 129 | Check if layer ID exists |
| `getBuiltinLayers()` | 143 | Returns `[{id:0, name:'default', value:0}]` |
| `init()` | 152 | Reads settings, populates layer maps and Enum |
| `setLayer(id, name, index)` | 185 | Register a layer entry |

**Priority formula** (line 64):
```
priority = ((layer + 32768) << 16) | (order + 32768)
```
This encodes layer as the upper 16 bits and order as the lower 16 bits, ensuring layer sorting always dominates over order sorting.

**Initialization**: `SortingLayers.init()` is called on `Game.EVENT_POST_SUBSYSTEM_INIT` (line 40). It reads layer definitions from `SettingsCategory.ENGINE` under the key `"sortingLayers"`. If none are found, only the built-in `"default"` layer exists.

### 4.3 Sorting Component (3D)

**File**: `/Users/kay/Git/cocos-engine/cocos/sorting/sorting.ts` (line 47)

A `@disallowMultiple` component for 3D nodes with `ModelRenderer`.

| Property | Line | Description |
|---|---|---|
| `sortingLayer: number` | 58 | Which sorting layer this object belongs to |
| `sortingOrder: number` | 72 | Order within the layer (-32768 to 32767) |

| Method | Line | Description |
|---|---|---|
| `__preload()` | 88 | Gets the ModelRenderer component and updates priority |
| `_updateSortingPriority()` | 96 | Computes `getSortingPriority(layerIndex, order)` and sets `modelRenderer.priority` |

**Hidden gotcha**: The `__preload()` method (line 88) looks for `ModelRenderer` via `getComponent('cc.ModelRenderer')`. If no ModelRenderer is found, it logs warning 16301 and the sorting component will have no effect. The component does NOT have a `@requireComponent` decorator, so it can be placed on nodes without a ModelRenderer without causing an error -- it will just silently fail.

### 4.4 Sorting2D Component (2D)

**File**: `/Users/kay/Git/cocos-engine/cocos/sorting/sorting-2d.ts` (line 51)

A `@disallowMultiple` `@requireComponent(UIRenderer)` component for 2D UI elements.

| Property | Line | Description |
|---|---|---|
| `sortingLayer: number` | 64 | Sorting layer ID |
| `sortingOrder: number` | 78 | Order within the layer |

| Method | Line | Description |
|---|---|---|
| `__preload()` | 94 | Gets the UIRenderer component |
| `onEnable()` | 101 | Enables sorting, increments global 2D sorting count |
| `onDisable()` | 108 | Disables sorting, decrements global 2D sorting count |
| `_updateSortingPriority()` | 115 | Sets `uiRenderer.priority` to computed sorting priority |

**Hidden gotcha**: The global `sorting2DCount` (line 36) is maintained manually and synced to the batcher via `_setSorting2DCount()`. When disabled, the priority is reset to `SortingLayers.getDefaultPriority()` (line 122), not simply left unchanged. This means disabling Sorting2D actively resets the render order.

---

## 5. File Path Index

### Rendering Pipeline Core

| File | Key Classes/Functions | Lines |
|---|---|---|
| `cocos/rendering/render-pipeline.ts` | `RenderPipeline`, `IRenderPipelineInfo`, `PipelineRenderData`, `BloomRenderData` | 93-1091 |
| `cocos/rendering/render-flow.ts` | `RenderFlow`, `IRenderFlowInfo` | 35-158 |
| `cocos/rendering/render-stage.ts` | `RenderStage`, `IRenderStageInfo` | 36-151 |
| `cocos/rendering/render-queue.ts` | `RenderQueue`, `opaqueCompareFn`, `transparentCompareFn`, `convertRenderQueue` | 36-174 |
| `cocos/rendering/define.ts` | UBOs (`UBOGlobal`, `UBOCamera`, `UBOShadow`, `UBOCSM`, `UBOLocal`, `UBOForwardLight`, `UBOMorph`, `UBOSkinning`, `UBOSH`), `PipelineGlobalBindings`, `ModelLocalBindings`, `SetIndex`, `IRenderObject`, `IRenderPass`, global/local descriptor set layouts | 43-1141 |
| `cocos/rendering/pipeline-event.ts` | `PipelineEventType`, `PipelineEventProcessor`, `IPipelineEvent` | 27-108 |
| `cocos/rendering/pipeline-types.ts` | `PipelineRuntime` interface | 39-61 |
| `cocos/rendering/pipeline-serialization.ts` | `RenderFlowTag`, `RenderQueueSortMode`, `RenderQueueDesc`, `RenderTextureConfig`, `MaterialConfig` | 42-187 |
| `cocos/rendering/pipeline-scene-data.ts` | `PipelineSceneData` | 45-261 |
| `cocos/rendering/pipeline-ubo.ts` | `PipelineUBO` (updateGlobalUBOView, updateCameraUBO, updateShadowUBO) | 73+ |
| `cocos/rendering/pipeline-state-manager.ts` | `PipelineStateManager.getOrCreatePipelineState()` | 28-62 |
| `cocos/rendering/pipeline-funcs.ts` | `SRGBToLinear`, `LinearToSRGB`, `decideProfilerCamera`, `renderProfiler` | 42-111 |
| `cocos/rendering/pass-phase.ts` | `getPhaseID()` | 25-36 |
| `cocos/rendering/scene-culling.ts` | `sceneCulling`, `validPunctualLightsCulling`, `shadowCulling` | 41-213 |
| `cocos/rendering/global-descriptor-set-manager.ts` | `GlobalDSManager` | 48-207 |
| `cocos/rendering/instanced-buffer.ts` | `InstancedBuffer`, `IInstancedItem`, `instancingCompareFn` | 35-194 |
| `cocos/rendering/render-instanced-queue.ts` | `RenderInstancedQueue` | 34-121 |
| `cocos/rendering/render-additive-light-queue.ts` | `RenderAdditiveLightQueue` | 66+ |
| `cocos/rendering/render-types.ts` | `PipelineInputAssemblerData` | 27-31 |
| `cocos/rendering/enum.ts` | `ForwardStagePriority`, `ForwardFlowPriority`, `DeferredStagePriority`, `DeferredFlowPriority`, `CommonStagePriority` | 26-69 |
| `cocos/rendering/ui-phase.ts` | `UIPhase` | 33-77 |
| `cocos/rendering/debug-view.ts` | `DebugViewSingleType`, `DebugViewCompositeType` | 28+ |
| `cocos/rendering/geometry-renderer.ts` | `GeometryRenderer` | (large file) |
| `cocos/rendering/pipeline-scene-data-utils.ts` | Utility functions for PipelineSceneData | |

### Forward Pipeline

| File | Key Classes | Lines |
|---|---|---|
| `cocos/rendering/forward/forward-pipeline.ts` | `ForwardPipeline`, `createDefaultPipeline` | 41-162 |
| `cocos/rendering/forward/forward-flow.ts` | `ForwardFlow` | 38-70 |
| `cocos/rendering/forward/forward-stage.ts` | `ForwardStage` | 50-210 |

### Deferred Pipeline

| File | Key Classes | Lines |
|---|---|---|
| `cocos/rendering/deferred/deferred-pipeline.ts` | `DeferredPipeline`, `DeferredRenderData` | 51-332 |
| `cocos/rendering/deferred/main-flow.ts` | `MainFlow` | 46-87 |
| `cocos/rendering/deferred/gbuffer-stage.ts` | `GbufferStage` | 52-177 |
| `cocos/rendering/deferred/lighting-stage.ts` | `LightingStage` | 64-417 |
| `cocos/rendering/deferred/bloom-stage.ts` | `BloomStage` | 61+ |
| `cocos/rendering/deferred/postprocess-stage.ts` | `PostProcessStage` | 51-166 |
| `cocos/rendering/deferred/deferred-pipeline-scene-data.ts` | `DeferredPipelineSceneData` | |

### Shadow System

| File | Key Classes | Lines |
|---|---|---|
| `cocos/rendering/shadow/shadow-flow.ts` | `ShadowFlow` | 49-337 |
| `cocos/rendering/shadow/shadow-stage.ts` | `ShadowStage` | |
| `cocos/rendering/shadow/csm-layers.ts` | `CSMLayers`, `ShadowLayerVolume` | |

### Reflection Probes

| File | Key Classes | Lines |
|---|---|---|
| `cocos/rendering/reflection-probe/reflection-probe-flow.ts` | `ReflectionProbeFlow` | |
| `cocos/rendering/reflection-probe/reflection-probe-stage.ts` | `ReflectionProbeStage` | |

### WebGPU

| File | Key Exports | Lines |
|---|---|---|
| `cocos/webgpu/instantiated.ts` | `promiseForWebGPUInstantiation`, `glslangWasmModule`, `twgslModule`, `webgpuAdapter` | 41-102 |

### Global Illumination

| File | Key Classes | Lines |
|---|---|---|
| `cocos/gi/light-probe/light-probe.ts` | `LightProbes`, `LightProbesData` | 50-388 |
| `cocos/gi/light-probe/light-probe-group.ts` | `LightProbeGroup` | 54-234 |
| `cocos/gi/light-probe/delaunay.ts` | `Vertex`, `Tetrahedron`, `Delaunay`, `Edge` | 39+ |
| `cocos/gi/light-probe/sh.ts` | `SH`, `LightProbeSampler` | 29+ |
| `cocos/gi/light-probe/auto-placement.ts` | `AutoPlacement`, `PlaceMethod` | |
| `cocos/gi/light-probe/polynomial-solver.ts` | `PolynomialSolver` | |

### Sorting System

| File | Key Classes | Lines |
|---|---|---|
| `cocos/sorting/sorting.ts` | `Sorting` | 47-103 |
| `cocos/sorting/sorting-2d.ts` | `Sorting2D` | 51-127 |
| `cocos/sorting/sorting-layers.ts` | `SortingLayers` | 50-202 |
| `cocos/sorting/index.ts` | Re-exports `SortingLayers`, `Sorting` | 25-27 |

### Legacy Re-exports

| File | Description |
|---|---|
| `cocos/rendering/legacy/index.ts` | Re-exports all pipeline, flow, and stage classes from forward/, deferred/, shadow/, reflection-probe/ |

---

## Appendix: Key Gotchas Summary

1. **Phase mismatch is silent**: If a material's pass phase does not match any render queue's phase mask, the object will not render and no error is logged. Always verify phase IDs match.

2. **`pass.passID !== 0xFFFFFFFF` check**: Both ForwardStage and LightingStage skip passes where `passID !== 0xFFFFFFFF`. This filters out special passes (shadow passes, etc.) that should not appear in the main rendering.

3. **Transparency filter**: Each render queue has an `isTransparent` flag. A pass is only inserted if `pass.blendState.targets[0].blend === queue.isTransparent`. Mismatched transparency causes invisible objects.

4. **Deferred pipeline cannot render unlit materials**: The deferred pipeline's GBuffer pass writes material properties for lighting calculations. Unlit shaders bypass lighting entirely and will appear black or invisible.

5. **CSM may be auto-disabled**: If the device's `maxFragmentUniformVectors` is too low to fit all required UBOs, `pipelineSceneData.csmSupported` is set to false and `CC_SUPPORT_CASCADED_SHADOW_MAP` is disabled.

6. **GlobalDSManager propagates to all per-light DS instances**: Binding operations on the global DS manager affect ALL previously created per-light descriptor sets. This is intentional for shadow map updates but can cause unexpected side effects.

7. **SortingLayers.init() is game-event driven**: It runs on `EVENT_POST_SUBSYSTEM_INIT`. Accessing sorting layer data before this event will use incomplete or default data.

8. **Sorting component requires ModelRenderer**: `Sorting` uses `getComponent('cc.ModelRenderer')` and will log a warning if missing, but will not error. The priority update silently fails.

9. **WebGPU requires all four WASM modules**: The WebGPU backend needs webgpu_wasm, glslang, twgsl, and a native GPU adapter. Any missing module causes the initialization promise to hang.

10. **Light probe mesh walk fallback**: When `getInterpolationWeights()` cannot find a containing tetrahedron, it falls back to tetrahedron index 0, which may produce incorrect lighting.

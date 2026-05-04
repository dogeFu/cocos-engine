# Cocos Creator 引擎 — 渲染管线

> 面向 AI 辅助编程的中文参考文档。覆盖渲染管线、阴影、全局光照、排序系统。

---

## 目录

1. [cocos/rendering/ — 渲染管线核心](#1-cocosrendering--渲染管线核心)
2. [cocos/webgpu/ — WebGPU 后端](#2-cocoswebgpu--webgpu-后端)
3. [cocos/gi/ — 全局光照](#3-cocosgi--全局光照)
4. [cocos/sorting/ — 渲染排序](#4-cocossorting--渲染排序)

---

## 1. cocos/rendering/ — 渲染管线核心

### 1.1 架构概览

渲染模块实现完整的帧渲染管线，包括场景剔除、管线流程、阴影、后处理等。

**核心类层次：**
- `Root`（`cocos/rendering/root.ts`）— 顶层渲染管理器
- `RenderPipeline`（`cocos/rendering/render-pipeline.ts`）— 管线基类
- `ForwardPipeline`（`cocos/rendering/pipeline-fwd.ts`）— 前向渲染管线
- `DeferredPipeline`（`cocos/rendering/pipeline-deferred.ts`）— 延迟渲染管线

**关键概念：**
- **RenderFlow**：管线中的一个逻辑步骤（如阴影、不透明、透明、后处理）
- **RenderPass**：GFX 级别的渲染通道，描述附件和操作
- **Phase**：渲染阶段位掩码，用于将绘制请求分类到不同流程

### 1.2 Root（`cocos/rendering/root.ts`）

`Root` 是渲染子系统的顶层管理器，由 `director.init()` 创建。

**单例：** `director.root`

#### 关键属性

- `device`：GFX 设备实例
- `pipeline`：当前 `RenderPipeline` 实例
- `scenes`：所有活跃的 `RenderScene` 数组
- `curWindow`：当前渲染窗口
- `mainWindow`：主渲染窗口
- `tempWindow`：临时渲染窗口（用于场景预览等）
- `builtinResMgr`：内置资源管理器

#### 关键方法

- `createScene(info)`：创建新的 RenderScene 并添加到 `scenes` 数组。
- `destroyScene(scene)`：从数组中移除并销毁场景。
- `frameMove(dt)`（第 688 行）：每帧调用。执行 `pipeline.render(swapchains)` 然后提交命令。
- `resize(width, height)`：调整所有窗口大小。
- `setRenderPipeline(pipelineName)`：切换渲染管线。

#### 初始化流程

`Root.initialize(info)`（第 410 行）：
1. 创建主 RenderWindow
2. 创建内置资源管理器
3. 创建命令缓冲区
4. 创建渲染管线（根据设置选择前向/延迟）
5. 初始化管线

### 1.3 RenderPipeline（`cocos/rendering/render-pipeline.ts`）

渲染管线基类。管理渲染流程、渲染通道和帧缓冲。

#### 关键属性

- `flows`：`RenderFlow[]` — 管线包含的渲染流程
- `renderPasses`：`Map<string, RenderPass>` — 缓存的渲染通道
- `commandBuffers`：`CommandBuffer[]` — 可用命令缓冲区
- `defaultResource`：默认纹理（1x1 白色）
- `profiler`：渲染性能分析器

#### 关键方法

- `render(swapchains)`（第 632 行）：主渲染入口。对每个 RenderScene 调用 `scene.update(stamp)`，然后执行所有 flows。
- `activate(swapchain)`：初始化管线，创建所有 flows 和 render passes。
- `destroy()`：销毁所有 GPU 资源。
- `getRenderPass(name)`：获取或创建缓存的渲染通道。
- `getPhaseID(phaseName)`：获取或注册阶段 ID。

#### 阶段（Phase）系统

Phase 是渲染管线中的核心分类机制。每个 `Pass` 对象有一个 `phase` 位掩码。`RenderFlow` 通过检查 `pass.phase & flow.phaseMask` 来决定是否处理某个绘制请求。

**内置阶段：**（`cocos/rendering/define.ts`）

| 阶段 | 值 | 用途 |
|---|---|---|
| `PHASE_BLEND` | 0 | 透明混合 |
| `PHASE_FORWARD` | 1 | 前向渲染 |
| `PHASE_SHADOW_CAST` | 2 | 阴影投射 |
| `PHASE_REFLECTION` | 3 | 反射 |
| `PHASE_GEOMETRY` | 4 | 几何（延迟 GBuffer） |
| `PHASE_LIGHTING` | 5 | 光照（延迟着色） |
| `PHASE_POST_PROCESS` | 6 | 后处理 |
| `PHASE_DEFAULT` | 1 | 默认（同 FORWARD） |

**关键：** 如果 pass.phase 不匹配 flow 的 phaseMask，渲染对象在该流程中**静默不可见**。这是最常见的"为什么我的模型不渲染"问题之一。

### 1.4 ForwardPipeline（`cocos/rendering/pipeline-fwd.ts`）

前向渲染管线。所有光照在单个通道中计算。

**默认流程：**
1. `ShadowFlow` — 阴影贴图渲染
2. `ForwardFlow` — 主前向渲染（不透明 + 透明）
3. `PostProcessFlow` — 后处理（色调映射、FXAA 等）

### 1.5 DeferredPipeline（`cocos/rendering/pipeline-deferred.ts`）

延迟渲染管线。先渲染几何信息到 GBuffer，再在光照通道中计算。

**默认流程：**
1. `ShadowFlow` — 阴影贴图渲染
2. `GBufferFlow` — 几何信息渲染（法线、反照率、深度等）
3. `LightingFlow` — 延迟光照计算
4. `PostProcessFlow` — 后处理

**GBuffer 附件：**

| 附件 | 格式 | 内容 |
|---|---|---|
| GBUFFER0 | RGBA8 | 反照率 (RGB) + 自发光强度 (A) |
| GBUFFER1 | RGBA8 | 法线 (RGB) + 粗糙度 (A) |
| GBUFFER2 | RGBA8 | 金属度 (R) + 天空遮蔽 (G) + 自发光 (BA) |
| GBUFFER3 | RGBA8 | 通道遮罩 (RGB) + 清漆 (A) |
| DEPTH | DEPTH24 | 深度 |

**关键限制：** 延迟管线不支持 unlit 材质 — GBuffer 阶段需要光照模型信息，unlit 着色器缺少这些数据会渲染为黑色。

### 1.6 RenderFlow（`cocos/rendering/render-flow.ts`）

渲染流程基类。管理一组 `RenderStage`。

**内置流程：**
- `ShadowFlow`（`cocos/rendering/shadow-flow.ts`）— 阴影贴图渲染
- `ForwardFlow`（`cocos/rendering/forward-flow.ts`）— 前向渲染
- `GBufferFlow`（`cocos/rendering/deferred/deferred-flow.ts`）— 延迟 GBuffer
- `LightingFlow`（`cocos/rendering/deferred/deferred-lighting-flow.ts`）— 延迟光照
- `PostProcessFlow`（`cocos/rendering/post-process-flow.ts`）— 后处理

### 1.7 RenderStage（`cocos/rendering/render-stage.ts`）

渲染阶段基类。管理实际的绘制命令。

**内置阶段：**
- `ShadowStage` — 阴影贴图渲染阶段
- `ForwardStage` — 前向渲染阶段
- `DeferredStage` — GBuffer 渲染阶段
- `LightingStage` — 延迟光照阶段
- `PostProcessStage` — 后处理阶段

### 1.8 阴影系统

#### ShadowFlow（`cocos/rendering/shadow-flow.ts`）

阴影流程管理阴影贴图的渲染。

**阴影类型：** `ShadowType` 枚举
- `PLANAR` = 0 — 平面阴影（投射到地面）
- `SHADOW_MAP` = 1 — 阴影贴图

#### ShadowStage（`cocos/rendering/shadow-stage.ts`）

阴影贴图渲染阶段。从光源视角渲染场景深度。

**关键属性（ShadowsInfo）：**
- `enabled`：是否启用阴影
- `type`：阴影类型
- `shadowColor`：阴影颜色（仅平面阴影）
- `shadowDistance`：阴影可见距离
- `shadowMapSize`：阴影贴图尺寸
- `pcf`：PCF 柔化核大小（0=禁用, 1=2x2, 2=3x3, 3=5x5）
- `bias`：阴影偏移（防止阴影痤疮）

#### 级联阴影（CSM）

方向光支持级联阴影贴图（Cascaded Shadow Maps）。

**关键属性：**
- `numCascades`：级联数（1-4）
- `cascadeSplit`：级联分割比例

**关键限制：** CSM 可能被自动禁用。如果设备 `maxFragmentUniformVectors` 不足以容纳所有级联的矩阵，引擎会回退到单级阴影。这发生在低端移动设备上。

#### 平面阴影

平面阴影将阴影投射到指定高度的平面上。使用 `ShadowPlane` 组件标记接收阴影的平面。

**关键属性：**
- `normal`：平面法线
- `distance`：平面到原点的距离

### 1.9 管线 UBO（Uniform Buffer Object）

渲染管线使用 UBO 向着色器传递全局渲染参数。

**关键 UBO 布局：**

| 绑定点 | 名称 | 内容 |
|---|---|---|
| 0 | `cc_local` | 模型矩阵、法线矩阵 |
| 1 | `cc_worldBound` | 世界包围盒 |
| 2 | `cc_light` | 灯光参数 |
| 3 | `cc_shadow` | 阴影参数 |
| 4 | `cc_ambient` | 环境光 |
| 5 | `cc_fog` | 雾效参数 |
| 6 | `cc_global` | 时间、屏幕尺寸等 |
| 7 | `cc_camera` | 相机参数 |

**关键：** UBO 布局在 `cocos/rendering/define.ts` 中定义。着色器必须匹配这些绑定点的布局才能正确接收数据。

### 1.10 场景剔除

#### 视锥体剔除

`RenderScene` 在渲染前对每个相机执行视锥体剔除。模型的世界包围盒与相机视锥体进行相交测试。

**剔除流程：**
1. 对每个相机，构建视锥体
2. 对每个模型，测试 AABB 与视锥体的相交
3. 不相交的模型不进入渲染队列

#### 遮挡剔除

引擎支持基于软件遮挡查询的遮挡剔除（`OcclusionQuery`）。默认关闭。

#### LOD 剔除

`LODGroup` 组件管理细节层次。`RenderScene.isCulledByLod()` 检查模型是否被 LOD 剔除。

### 1.11 实例化渲染

引擎支持 GPU 实例化渲染，减少 Draw Call。

**启用方式：**
1. 在材质中启用 `USE_INSTANCING` 宏
2. 使用相同材质和网格的模型会自动合批

**限制：**
- 实例化仅支持 `cc_local` UBO 中的属性（模型矩阵、法线矩阵）
- 自定义实例属性需要通过 `MeshRenderer.setInstancedAttribute()` 添加
- 最大实例数受设备 `maxUniformVectors` 限制

### 1.12 后处理

#### PostProcessFlow

后处理流程在所有 3D 渲染完成后执行。

**内置效果：**
- 色调映射（Tone Mapping）：`TONEMAP_ACES`、`TONEMAP_LINEAR`、`TONEMAP_UNCHARTED`
- FXAA 抗锯齿
- Bloom 泛光
- 色调校正

**自定义后处理：** 通过 `PostProcessSetting` 组件添加自定义效果。

### 1.13 隐含知识

- `RenderPipeline.render()` 中的 `swapchains` 参数是 `Map<Swapchain, number>`，值是当前交换链的图像索引。
- 管线中的 `constantMacros`（如 `CC_USE_HDR`、CC_DEVICE_SUPPORT_FLOAT_TEXTURE`）在管线激活时设置，影响所有着色器编译。
- `ForwardStage` 的渲染队列分为不透明和透明两部分。不透明按从前到后排序（减少过度绘制），透明按从后到前排序（保证正确混合）。
- 延迟管线的 GBuffer 使用 `MRT`（Multiple Render Targets），需要设备支持 `MULTIPLE_RENDER_TARGETS` 特性。
- `RenderPipeline._renderArea` 计算渲染区域时考虑了视口和剪刀矩形。
- 管线在 `destroy()` 时必须手动销毁所有 GPU 资源（帧缓冲、纹理、缓冲区），否则会泄漏。

---

## 2. cocos/webgpu/ — WebGPU 后端

### 2.1 架构

WebGPU 后端实现了 GFX 抽象层的 WebGPU 版本。采用**延迟命令队列**模式，不直接调用 WebGPU API，而是将命令推入队列，在 `endRenderPass()` 时一次性创建 `GPUCommandEncoder` 执行。

### 2.2 关键文件

| 文件 | 类 | 职责 |
|------|-----|------|
| `webgpu-device.ts` | `WebGPUDevice` | 设备管理，资源工厂 |
| `webgpu-command-buffer.ts` | `WebGPUCommandBuffer` | 命令录制与提交（延迟队列） |
| `webgpu-shader.ts` | `WebGPUShader` | 着色器管理（GLSL → SPIR-V → WGSL） |
| `webgpu-buffer.ts` | `WebGPUBuffer` | 缓冲区管理 |
| `webgpu-texture.ts` | `WebGPUTexture` | 纹理管理 |
| `webgpu-pipeline-state.ts` | `WebGPUPipelineState` | 管线状态 |
| `webgpu-descriptor-set.ts` | `WebGPUDescriptorSet` | 描述符集 |
| `webgpu-input-assembler.ts` | `WebGPUInputAssembler` | 顶点组装 |
| `webgpu-render-pass.ts` | `WebGPURenderPass` | 渲染通道 |
| `webgpu-queue.ts` | `WebGPUQueue` | 命令队列 |

### 2.3 WebGPUDevice 初始化

1. `navigator.gpu.requestAdapter()` — 获取 GPU 适配器
2. `adapter.requestDevice()` — 请求 GPU 设备，配置 `requiredLimits` 和 `requiredFeatures`
3. `loadWebGPUWasmModule()` — 加载 WebGPU WASM 模块（glslang + twgsl）
4. 设置 binding mapping（UBO 偏移 256、采样器纹理偏移等）
5. 获取 canvas 的 `webgpu` context
6. 初始化格式特性表，支持 ETC2/BC/ASTC 压缩格式
7. 创建默认资源（默认纹理、缓冲区、采样器、描述符集）

**关键 caps：** `clipSpaceMinZ = 0.0`（WebGL 为 -1.0），`screenSpaceSignY = -1.0`，UBO 对齐 256

### 2.4 WebGPUCommandBuffer 延迟命令

**核心设计：** 不直接调用 WebGPU API，而是将命令推入 `_renderPassFuncQueue`，在 `endRenderPass()` 时一次性执行。

**关键状态缓存：**

| 属性 | 说明 |
|------|------|
| `_curGPUPipelineState` | 当前 GPU 管线状态 |
| `_curGPUDescriptorSets` | 当前 GPU 描述符集（3 个 group） |
| `_curGPUInputAssembler` | 当前顶点组装器 |
| `_curDynamicOffsets` | 当前动态偏移 |
| `_isStateValid` | 状态是否有效 |

**RenderPass 流程：**
1. `beginRenderPass()` — 配置 `GPURenderPassDescriptor`，推入 viewport/scissor 函数
2. 绘制命令 — 推入 `drawIndexed`/`draw` 等函数
3. `endRenderPass()` — 创建 `GPUCommandEncoder`，执行所有队列函数，`submit`

### 2.5 WebGPUShader 编译

1. 构建 `IWebGPUGPUShader` 结构
2. 调用 `WebGPUCmdFuncCreateGPUShader()` 编译着色器
3. 使用 glslang 编译 GLSL → SPIR-V
4. 使用 twgsl 转换为 WGSL

### 2.6 WebGPU 特定限制

- **不支持 `gl_FragCoord.z` 的直接读取** — 需要手动在顶点着色器中输出深度
- **纹理格式限制** — 不支持某些 WebGL2 格式（如 `L8`、`A8`）
- **存储缓冲区** — 需要显式声明 `storage` 用途
- **渲染通道加载/存储操作** — 语义与 WebGL 不同
- **命令缓冲区延迟提交** — 在 `queue.submit()` 时才真正执行

### 2.7 隐含知识

- WebGPU 后端在编辑器中默认不启用（`deviceManager.init` 中检查 `!EDITOR`）
- WebGPU 初始化返回 `Promise<boolean>`，与 WebGL 同步初始化不同
- `DefaultResources` 类缓存默认 buffer/texture/sampler/descriptorSet
- GPU 对象接口定义在 `webgpu-gpu-objects.ts`

---

## 3. cocos/gi/ — 全局光照

### 3.1 光照探针（Light Probes）

光照探针系统允许在场景中采样间接光照。

**关键文件：**
- `cocos/gi/light-probe/light-probe.ts` — 光照探针组件
- `cocos/gi/light-probe/light-probe-volume.ts` — 探针体积
- `cocos/gi/light-probe/spherical-harmonics.ts` — 球谐函数

#### LightProbe 组件

- `lightProbeVolume`：探针体积数据
- `data`：球谐系数数组

#### 球谐函数

使用三阶球谐（L0、L1、L2），每阶 9 个系数，RGB 三通道共 27 个浮点数。

**四面体插值：** 光照探针使用 Delaunay 四面体剖分进行空间插值。给定世界坐标，找到包含该点的四面体，使用重心坐标插值四个顶点的球谐系数。

### 3.2 环境光照

**AmbientInfo**（`cocos/scene-graph/scene-globals.ts`）：

- `skyColor`：天空颜色（HDR/LDR）
- `skyIllum`：天空照度
- `groundAlbedo`：地面反照率

环境光照通过 `cc_ambient` UBO 传递给着色器。

### 3.3 隐含知识

- 光照探针的四面体剖分是预计算的，在场景加载时执行
- 球谐系数在 GPU 上使用 `SH9` 函数重建
- 环境贴图（天空盒）的卷积在管线激活时预计算，存储在 `convolutionMap` 中

---

## 4. cocos/sorting/ — 排序模块

### 4.1 模块结构

```
sorting/
├── index.ts           — 导出 SortingLayers 和 Sorting
├── sorting-layers.ts  — SortingLayers 管理器
├── sorting.ts         — Sorting 组件（3D）
└── sorting-2d.ts      — Sorting2D 组件（2D）
```

### 4.2 SortingLayers 管理器

**文件：** `cocos/sorting/sorting-layers.ts`

`SortingLayers` 是纯静态类，管理排序层的注册、查询和优先级计算。

**核心数据结构：**

| 属性 | 说明 |
|------|------|
| `nameMap` | `Map<number, string>` — layer id → name |
| `indexMap` | `Map<number, number>` — layer id → index（顺序） |
| `Enum` | 动态枚举，默认只有 `{ default: 0 }` |

**初始化流程：** 从 `settings` 读取 `sortingLayers` 配置 → 注册每一层 → 更新动态枚举 → 按层索引排序

**优先级计算核心算法：**

```typescript
public static getSortingPriority(layer = 0, order = 0): number {
    return (((layer + (1 << 15)) << 16) | (order + (1 << 15))) >>> 0;
}
```

将 `layer`（16位）和 `order`（16位）编码为一个 32 位无符号整数：

```
┌─────────────────────────┬─────────────────────────┐
│    高 16 位: layer      │    低 16 位: order      │
│   (layer + 32768)       │   (order + 32768)       │
└─────────────────────────┴─────────────────────────┘
```

layer 值越大，整体优先级越高（后渲染）。同一 layer 内，order 越大越后渲染。**跨层排序始终优先于层内排序**。

### 4.3 Sorting 组件（3D）

**文件：** `cocos/sorting/sorting.ts`

```typescript
@ccclass('cc.Sorting')
@disallowMultiple
@executeInEditMode
export class Sorting extends Component {
    sortingLayer: number;   // 排序层 ID
    sortingOrder: number;   // 层内排序顺序（int16 范围 [-32768, 32767]）
}
```

**工作原理：** `__preload()` 获取节点上的 `ModelRenderer` 组件，当 `sortingLayer` 或 `sortingOrder` 变化时，计算优先级并设置到 `ModelRenderer.priority`。

### 4.4 Sorting2D 组件（2D）

**文件：** `cocos/sorting/sorting-2d.ts`

```typescript
@ccclass('cc.Sorting2D')
@disallowMultiple
@executeInEditMode
@requireComponent(UIRenderer)
export class Sorting2D extends Component {
    sortingLayer: number;
    sortingOrder: number;
}
```

**与 Sorting 的区别：**
1. `@requireComponent(UIRenderer)` 而非 ModelRenderer
2. 维护全局 `sorting2DCount` 计数器，启用/禁用时通知 `Batcher2D`
3. 禁用时将 priority 重置为 `SortingLayers.getDefaultPriority()`

### 4.5 隐含知识

- `sortingOrder` 被限制在 `[-32768, 32767]`（int16 范围），与优先级编码算法的 16 位空间对应
- `UIRenderer` 在 `USE_SORTING_2D` 为 true 时，默认 priority 设为 `SortingLayers.getDefaultPriority()`
- 排序层配置从 `settings.querySettings(SettingsCategory.RENDERING, 'sortingLayers')` 读取
- 编辑器中修改排序层会触发场景中所有 Sorting 组件的优先级更新

---

## 5. 渲染排序策略

### 5.1 排序策略

渲染排序决定绘制顺序，影响性能（过度绘制）和正确性（透明混合）。

**关键文件：**
- `cocos/sorting/sort.ts` — 排序入口
- `cocos/sorting/layer.ts` — 层级排序

### 5.2 排序规则

#### 不透明物体

按以下优先级排序：
1. **渲染队列**（`RenderQueue`）— 由材质的 `technique` 决定
2. **距离** — 从相机到物体的距离，**从前到后**（减少过度绘制）
3. **Shader ID** — 相同 Shader 合批
4. **材质 ID** — 相同材质合批

#### 透明物体

按以下优先级排序：
1. **渲染队列**
2. **距离** — **从后到前**（保证正确混合）
3. **深度** — 按深度值排序

### 5.3 RenderQueue

`RenderQueue`（`cocos/rendering/render-queue.ts`）管理待渲染的绘制请求。

**关键方法：**
- `insertRenderPass(renderPass, passIndex, subModel)`：插入绘制请求
- `sort()`：按排序规则排序
- `clear()`：清空队列

### 5.4 隐含知识

- 排序使用 `std::sort` 的 JavaScript 等效实现，不稳定排序
- 透明物体排序的精度问题：距离非常接近的物体可能出现排序闪烁
- 渲染队列的 `sort()` 在每帧的 `RenderStage.render()` 中调用
- 实例化合批在排序之后执行，仅合批相邻且材质/网格相同的绘制请求

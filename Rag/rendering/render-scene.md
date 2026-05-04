# Cocos Creator 引擎 — 渲染场景数据层

> 面向 AI 辅助编程的中文参考文档。覆盖 render-scene 数据层、Effect/Shader 系统、Pass 管线状态、Root 帧循环、SceneGlobals 场景全局配置。

---

## 目录

1. [架构概览](#1-架构概览)
2. [RenderScene — 渲染场景容器](#2-renderscene--渲染场景容器)
3. [Model — 模型实例](#3-model--模型实例)
4. [SubModel — 子模型](#4-submodel--子模型)
5. [Pass — 渲染 Pass](#5-pass--渲染-pass)
6. [ProgramLib — Shader 程序管理器](#6-programlib--shader-程序管理器)
7. [EffectAsset — Effect 资源](#7-effectasset--effect-资源)
8. [MaterialInstance — 材质实例](#8-materialinstance--材质实例)
9. [Camera — 渲染相机](#9-camera--渲染相机)
10. [Light — 光源体系](#10-light--光源体系)
11. [Root — 帧循环](#11-root--帧循环)
12. [SceneGlobals — 场景全局配置](#12-sceneglobals--场景全局配置)
13. [隐含知识与常见陷阱](#13-隐含知识与常见陷阱)
14. [关键文件索引](#14-关键文件索引)

---

## 1. 架构概览

render-scene 模块是 Cocos Creator 渲染系统的核心数据层，管理场景中所有可渲染对象（Model、Camera、Light）及其渲染状态（Pass、Shader、DescriptorSet）。与上层场景图（scene-graph）和下层渲染管线（rendering）紧密配合。

**核心数据流：**

```
EffectAsset (.effect 文件)
    ↓ onLoaded()
    → programLib.register(effect) — 注册 Shader 模板
    → 创建 ITemplateInfo (bindings, ShaderInfo, handleMap, setLayouts)

Material (材质资源)
    ↓ 初始化
    → 从 EffectAsset.techniques[techIdx].passes 创建 Pass[]
    → Pass.initialize(IPassInfoFull)
      → 创建 DescriptorSet, 构建 UBO blocks, 生成 handles
      → tryCompile: programLib.getGFXShader() → device.createShader()

Model.initSubModel(idx, subMesh, mat)
    → SubModel.initialize(subMesh, mat.passes, macroPatches)
      → 创建 InputAssembler + DescriptorSet
      → _flushPassInfo: pass.getShaderVariant(patches) → shaders[i]
    → Model._updateAttributesAndBinding(idx)
      → 绑定 localBuffer/localSHBuffer 到 SubModel 的 DescriptorSet
```

---

## 2. RenderScene — 渲染场景容器

**文件：** `cocos/render-scene/core/render-scene.ts`

RenderScene 是渲染场景的核心容器，由 `Root` 创建，管理场景中所有渲染元素。

### 关键属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `_root` | `Root` | 所属的渲染根管理器 |
| `_cameras` | `Camera[]` | 所有相机 |
| `_models` | `Model[]` | 所有模型 |
| `_mainLight` | `DirectionalLight \| null` | 主方向光 |
| `_sphereLights` | `SphereLight[]` | 球面光源 |
| `_spotLights` | `SpotLight[]` | 聚光灯光源 |
| `_pointLights` | `PointLight[]` | 点光源 |
| `_rangedDirLights` | `RangedDirectionalLight[]` | 范围平行光 |
| `_lodGroups` | `LODGroup[]` | LOD 组 |
| `_batches` | `DrawBatch2D[]` | 2D 渲染批次 |

### 关键方法

- `update(stamp)` — 每帧更新：遍历更新所有光源和模型（`model.updateTransform` + `model.updateUBOs`），然后更新 LOD 状态
- `onGlobalPipelineStateChanged()` — 管线状态变更时通知所有 Model 重新编译 Shader
- `addModel/removeModel`、`addCamera/removeCamera`、`addXxxLight/removeXxxLight` — 增删场景对象
- `setMainLight(dl)` — 设置主光源并调用 `dl.activate()` 触发管线宏更新

### LodStateCache 内部类

管理 LODGroup 的使用状态，根据相机距离计算每个 LODGroup 应该使用哪一级 LOD，并缓存每个 Model 在各相机下的可见性。

---

## 3. Model — 模型实例

**文件：** `cocos/render-scene/scene/model.ts`

Model 代表场景中的一个渲染实例，是 MeshRenderer 的核心组成部分。一个 Model 可包含多个 SubModel，每个 SubModel 对应一个材质。

### ModelType 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `DEFAULT` | 默认静态模型 |
| 1 | `SKINNING` | 蒙皮动画模型 |
| 2 | `BAKED_SKINNING` | 烘焙蒙皮模型 |
| 3 | `BATCH_2D` | 2D 合批 |
| 4 | `PARTICLE_BATCH` | 粒子合批 |
| 5 | `LINE` | 线段 |

### 关键属性

| 属性 | 说明 |
|------|------|
| `_subModels` | `SubModel[]` — 子模型数组，每个对应一个材质 |
| `_node/_transform` | 关联的场景节点 |
| `_worldBounds/_modelBounds` | 世界/模型空间 AABB |
| `_localBuffer` | UBO 缓冲（存储 cc_matWorld、cc_matWorldIT 等） |
| `_localSHBuffer` | 球谐 UBO 缓冲 |
| `_worldBoundBuffer` | 世界包围盒 UBO 缓冲 |
| `_localData` | `Float32Array(UBOLocalEnum.COUNT)` — 本地 UBO 数据 |
| `receiveShadow/castShadow` | 阴影相关 |
| `reflectionProbeType` | 反射探针类型 |
| `useLightProbe` | 是否使用光照探针 |

### 关键方法

- `initSubModel(idx, subMeshData, mat)` — 初始化指定索引的 SubModel
- `setSubModelMaterial(idx, mat)` — 替换 SubModel 的材质，重新设置 passes 并更新属性绑定
- `updateTransform(stamp)` — 更新世界矩阵和包围盒
- `updateUBOs(stamp)` — 写入世界矩阵到 `_localBuffer`，处理实例化世界矩阵
- `getMacroPatches(subModelIndex)` — 收集当前 Model 的 Shader 宏补丁（CC_RECEIVE_SHADOW、CC_USE_LIGHTMAP、CC_USE_LIGHT_PROBE 等）
- `onMacroPatchesStateChanged()` — 宏变更时通知所有 SubModel 重新编译
- `onGlobalPipelineStateChanged()` — 管线变更时通知所有 SubModel

### 数据流

Model 持有 `_localBuffer`（UBO），包含 `cc_matWorld` 和 `cc_matWorldIT`。每帧 `updateUBOs` 将变换矩阵写入此 Buffer，然后 SubModel 的 DescriptorSet 引用此 Buffer。

---

## 4. SubModel — 子模型

**文件：** `cocos/render-scene/scene/submodel.ts`

SubModel 描述如何渲染一个子网格，是 Model 的子单元。每个 SubModel 对应一个材质（一组 Pass）和一个子网格。

### 关键属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `_passes` | `Pass[]` | 渲染 Pass 数组（来自 Material） |
| `_shaders` | `Shader[]` | 每个 Pass 对应的 Shader |
| `_subMesh` | `RenderingSubMesh` | 子网格几何数据 |
| `_patches` | `IMacroPatch[] \| null` | Shader 宏补丁 |
| `_inputAssembler` | `InputAssembler` | GFX 输入汇集器 |
| `_descriptorSet` | `DescriptorSet` | 描述符集（绑定 UBO、纹理等） |
| `_instancedAttributeBlock` | `IInstancedAttributeBlock` | 硬件实例化属性块 |

### 关键方法

- `initialize(subMesh, passes, patches)` — 创建 IA、DescriptorSet（布局来自 `passes[0].localSetLayout`）、设置 passes 和 patches、调用 `_flushPassInfo`
- `_flushPassInfo()` — 遍历所有 Pass，调用 `pass.getShaderVariant(this.patches)` 获取每个 Pass 对应的 Shader
- `onPipelineStateChanged()` — 对每个 Pass 调用 `tryCompile()` 强制重新编译
- `onMacroPatchesStateChanged(patches)` — 宏变更时比较新旧 patches，不同则更新并重新编译

### SubModel 与 Model 的交互

1. Model 创建 SubModel 并传入 `mat.passes` 和 `getMacroPatches(idx)`
2. Model 持有 `_localBuffer`，通过 `_updateLocalDescriptors` 将其绑定到 SubModel 的 DescriptorSet
3. Model 的 `updateUBOs` 遍历所有 SubModel 调用 `subModel.update()`
4. SubModel 的 `update()` 遍历所有 Pass 调用 `pass.update()`，然后更新自己的 DescriptorSet

---

## 5. Pass — 渲染 Pass

**文件：** `cocos/render-scene/core/pass.ts`

Pass 是渲染状态的核心封装，存储实际描述绘制过程的各项资源。

### 关键属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `_rootBuffer` | `Buffer` | 材质 UBO 的根缓冲 |
| `_rootBlock` | `ArrayBuffer` | 根缓冲的 CPU 端数据 |
| `_blocks/_blocksInt` | `Float32Array[]/Int32Array[]` | 各 binding 的 UBO 数据视图 |
| `_descriptorSet` | `DescriptorSet` | 描述符集 |
| `_pipelineLayout` | `PipelineLayout` | 管线布局 |
| `_shaderInfo` | `IProgramInfo` | Shader 信息 |
| `_defines` | `MacroRecord` | 预处理宏定义 |
| `_shader` | `Shader \| null` | 编译后的 Shader 对象 |
| `_bs` | `BlendState` | 混合状态 |
| `_dss` | `DepthStencilState` | 深度模板状态 |
| `_rs` | `RasterizerState` | 光栅化状态 |
| `_phase` | `number` | 渲染相位 ID |
| `_batchingScheme` | `BatchingSchemes` | 合批方案（NONE/INSTANCING） |
| `_hash` | `number` | Pass 哈希值 |

### Pass 初始化流程

1. `_doInit(info)` — 解析 phase/pass/subpass ID，设置 `_programName`、`_defines`、`_shaderInfo`
2. 调用 `Pass.fillPipelineInfo` 填充管线状态（priority、primitive、stage、blendState、depthStencilState、rasterizerState、dynamicStates）
3. 创建 DescriptorSet（布局来自 ProgramLib）
4. 构建 Uniform Block：创建 `_rootBuffer` 和 `_rootBlock`，按 UBO offset alignment 对齐各 block，创建 BufferView 并绑定到 DescriptorSet
5. 生成 Handle Map（`_propertyHandleMap`）
6. `resetUBOs()` — 将所有 UBO 成员重置为默认值
7. `resetTextures()` — 将所有纹理重置为默认值

### Handle 编码

Handle 是 32 位整数，编码了 Uniform 的位置信息：

```
[31:26] type      — 6 位，Type 枚举（FLOAT/FLOAT4/MAT4 等）
[25:20] binding   — 6 位，DescriptorSet binding 索引
[19:12] count     — 8 位，数组长度
[11:00] offset    — 12 位，在 block 中的偏移（以 vec4 为单位）
```

- `getHandle(name, offset, targetType)` — 获取属性句柄
- `setUniform(handle, value)` — 通过 handle 解码 binding/type/offset，写入对应的 `_blocks` 或 `_blocksInt` 视图
- `getUniform(handle, out)` — 读取 uniform 值
- `bindTexture/bindSampler` — 绑定纹理/采样器到 DescriptorSet

### Shader 编译与获取

- `tryCompile()` — 通过 `programLib.getGFXShader()` 或自定义管线的 `programLib.getProgramVariant()` 获取 Shader 对象
- `getShaderVariant(patches)` — 结合宏补丁获取 Shader 变体：临时将 patches 合入 `_defines`，编译获取 Shader，然后移除 patches。如果是透明 Pass，自动添加 `CC_IS_TRANSPARENCY_PASS` 宏

### Pass 哈希计算

将 shaderKey + primitive + dynamicStates + BlendState + DepthStencilState + RasterizerState 序列化为字符串，然后用 `murmurhash2_32_gc` 计算哈希。

### PassInstance

**文件：** `cocos/render-scene/core/pass-instance.ts`

继承 Pass，从父 Pass 创建的实例化版本。共享父 Pass 的 UBO 数据和纹理，但可以独立覆盖管线状态和宏定义。状态变更时通知所属的 `MaterialInstance`。

---

## 6. ProgramLib — Shader 程序管理器

**文件：** `cocos/render-scene/core/program-lib.ts`

ProgramLib 是全局 Shader 资源管理器，维护所有 Shader 模板和缓存。

### 关键数据结构

```typescript
class ProgramLib {
    _templates: Record<string, IProgramInfo>      // 按 shader 名索引的模板
    _cache: Record<string, Shader>                // 按 key 缓存的 Shader 实例
    _templateInfos: Record<number, ITemplateInfo> // 按 hash 索引的模板信息
}
```

### ITemplateInfo 核心字段

- `gfxAttributes` — GFX 属性数组
- `shaderInfo` — `ShaderInfo`（GFX 层 Shader 描述）
- `blockSizes` — 各 UBO block 大小
- `setLayouts` — DescriptorSetLayout 数组（MATERIAL/LOCAL/GLOBAL）
- `pipelineLayout` — PipelineLayout
- `handleMap` — 属性名到 Handle 的映射
- `bindings` — DescriptorSetLayoutBinding 数组

### 核心方法

- `register(effect)` — 注册 EffectAsset 的所有 Shader 模板
- `define(shader)` — 定义单个 Shader 模板：调用 `populateMacros` 计算宏位偏移，创建 `ITemplateInfo`，调用 `insertBuiltinBindings` 插入内置 UBO，调用 `genHandles` 生成 Handle Map
- `getGFXShader(device, name, defines, pipeline)` — 获取 Shader 实例：
  1. 合入管线宏 `pipeline.macros`
  2. 计算缓存 key（`getVariantKey`）
  3. 命中缓存则直接返回
  4. 否则创建 Shader 并缓存

### 宏 Key 生成

- 非 uber 模式：将各宏值映射为数字，按位偏移组合成整数 key
- uber 模式（宏数 > 31）：拼接字符串 key

---

## 7. EffectAsset — Effect 资源

**文件：** `cocos/asset/assets/effect-asset.ts`

EffectAsset 是材质实例化的模板，全局唯一。定义了 Shader 代码、Technique/Pass 结构、属性声明等。

### 关键接口

- `ITechniqueInfo` — 包含 `passes: IPassInfo[]`
- `IPassInfo` — 继承 `IPassStates`，包含 program、embeddedMacros、propertyIndex、switch、properties、shader
- `IPassStates` — 管线状态：priority、primitive、stage、rasterizerState、depthStencilState、blendState、dynamicStates、phase、pass、subpass
- `IShaderInfo` — Shader 完整描述：name、hash、glsl4/glsl3/glsl1 代码、builtins、defines、attributes、blocks、samplerTextures 等
- `IPropertyInfo` — 属性信息：type、handleInfo、samplerHash、value、linear
- `IDefineInfo` — 宏定义信息：name、type、range/options/default

### 关键属性

- `techniques` — `ITechniqueInfo[]` — 可用 Technique
- `shaders` — `IShaderInfo[]` — 所有 Shader
- `combinations` — `IPreCompileInfo[]` — 预编译宏组合

### 加载流程 (`onLoaded`)

1. 自定义管线：调用 `addEffectDefaultProperties` + `programLib.addEffect` + `programLib.init`
2. 传统管线：调用 `programLib.register(this)`
3. 注册到 `EffectAsset._effects` 静态映射
4. 延迟预编译：遍历 combinations 中的宏组合，调用 `programLib.getGFXShader` 预热 Shader 缓存

---

## 8. MaterialInstance — 材质实例

**文件：** `cocos/render-scene/core/material-instance.ts`

MaterialInstance 继承自 `Material`，用于创建可独立修改的材质实例。

### 关键设计

```typescript
export class MaterialInstance extends Material {
    protected _passes: PassInstance[] = [];
    private declare _parent: Material;
    private declare _owner: Renderer | null;
    private _subModelIdx = 0;
}
```

- 持有对父 `Material` 的引用
- `_passes` 使用 `PassInstance` 而非 `Pass`，每个 Pass 是父 Pass 的独立拷贝
- 状态变更时通过 `onPassStateChange` 通知所属的 `Renderer` 重建管线状态对象（PSO）
- 支持 `recompileShaders` 和 `overridePipelineStates` 两个定制入口

---

## 9. Camera — 渲染相机

**文件：** `cocos/render-scene/scene/camera.ts`

Camera 是渲染场景中的相机对象，由项目层的 Camera 组件管理。

### 关键枚举

- `CameraProjection` — ORTHO / PERSPECTIVE
- `CameraFOVAxis` — VERTICAL / HORIZONTAL
- `CameraUsage` — EDITOR / GAME_VIEW / SCENE_VIEW / PREVIEW / GAME
- `CameraAperture` — f/1.8 到 f/22
- `CameraShutter` — 1s 到 1/4000s
- `CameraISO` — ISO100 到 ISO800

### 关键属性

| 属性 | 说明 |
|------|------|
| `_matView/_matProj/_matProjInv/_matViewProj/_matViewProjInv` | 视图/投影矩阵族 |
| `_frustum` | 视锥体 |
| `_position/_forward` | 世界位置和前方向 |
| `_fov/_nearClip/_farClip/_orthoHeight` | 投影参数 |
| `_visibility` | 可见性掩码 |
| `_window` | 关联的 RenderWindow |
| `_exposure` | 曝光值（由光圈/快门/ISO 计算） |

### 关键方法

- `update(forceUpdate)` — 更新相机矩阵：计算 View/Projection/ViewProjection 矩阵和视锥体
- `updateExposure()` — 根据光圈、快门、ISO 计算 EV100 和曝光值：`_exposure = 0.833333 / 2^ev100`
- `screenPointToRay / screenToWorld / worldToScreen` — 坐标空间转换

---

## 10. Light — 光源体系

**文件：** `cocos/render-scene/scene/light.ts` 及各子类

### 类层次

```
Light (基类)
├── DirectionalLight  — 方向光（主光源），支持阴影（ShadowMap/Planar）、CSM 级联
├── SphereLight       — 球面光源
├── SpotLight         — 聚光灯
├── PointLight        — 点光源
└── RangedDirectionalLight — 范围平行光
```

### Light 基类关键属性

- `_color` — 光源颜色（Vec3）
- `_useColorTemperature` / `_colorTemp` — 色温支持
- `_finalColor` — 最终颜色（颜色 * 色温 RGB）
- `_visibility` — 可见性掩码
- `_baked` — 是否烘焙光源

### DirectionalLight 特殊行为

`activate()` 方法会根据阴影配置更新管线宏（`CC_DIR_LIGHT_SHADOW_TYPE`、`CC_DIR_SHADOW_PCF_TYPE`、`CC_CASCADED_LAYERS_TRANSITION`），并调用 `root.onGlobalPipelineStateChanged()` 触发全局 Shader 重编译。

---

## 11. Root — 帧循环

**文件：** `cocos/rendering/root.ts`

Root 是渲染器的根管理器，管理设备资源、渲染管线和帧循环。

### 关键属性

| 属性 | 说明 |
|------|------|
| `_device` | GFX Device |
| `_mainWindow` | 主渲染窗口 |
| `_pipeline` | 渲染管线（PipelineRuntime） |
| `_batcher` | 2D 合批器（Batcher2D） |
| `_scenes` | `RenderScene[]` — 渲染场景列表 |
| `_modelPools` | Model 对象池（按类型） |
| `_cameraPool` | Camera 对象池 |
| `_lightPools` | Light 对象池（按类型） |

### 帧循环 (`frameMove`)

```typescript
frameMove(deltaTime) {
    _frameTime = deltaTime;
    ++_frameCount;
    _cumulativeTime += deltaTime;
    _frameMoveBegin();
    _frameMoveProcess();
    _frameMoveEnd();
}
```

**`_frameMoveBegin`：**
- 清除所有场景的 2D 批次
- 清空相机列表

**`_frameMoveProcess`：**
1. 从所有 RenderWindow 提取渲染相机到 `_cameraList`
2. 如果有管线和相机：
   - `device.acquire([swapchain])` — 获取交换链
   - `batcher.update()` + `batcher.uploadBuffers()` — 更新 2D 合批数据
   - 遍历所有 `scenes[i].update(stamp)` — 更新场景（光源 + Model 变换 + UBO）

**`_frameMoveEnd`：**
1. 发射 `EVENT_BEFORE_COMMIT`
2. 按优先级排序相机列表
3. 更新几何渲染器
4. 发射 `EVENT_BEFORE_RENDER`
5. `pipeline.render(cameraList)` — 执行渲染管线
6. 发射 `EVENT_AFTER_RENDER`
7. `device.present()` — 呈现
8. `batcher.reset()` — 重置 2D 合批器

### 完整帧循环数据流

```
Director.tick()
  → Root.frameMove(deltaTime)
    → _frameMoveBegin: 清除 2D batches, 清空 cameraList
    → _frameMoveProcess:
        → windows[i].extractRenderCameras(cameraList)
        → device.acquire(swapchain)
        → batcher2D.update() + uploadBuffers()
        → scenes[i].update(stamp)
            → mainLight.update() — 更新方向
            → sphereLights/spotLights/pointLights — 各自 update
            → models[i].updateTransform(stamp) — 更新世界矩阵和包围盒
            → models[i].updateUBOs(stamp)
                → subModels[i].update() — pass.update() + descriptorSet.update()
                → 写入 cc_matWorld/cc_matWorldIT 到 _localBuffer
                → updateSHUBOs() — 更新球谐数据
            → lodStateCache.updateLodState()
    → _frameMoveEnd:
        → emit BEFORE_COMMIT
        → cameraList.sort(by priority)
        → geometryRenderer.update()
        → emit BEFORE_RENDER
        → pipeline.render(cameraList) — 渲染管线执行
        → emit AFTER_RENDER
        → device.present()
        → batcher2D.reset()
```

---

## 12. SceneGlobals — 场景全局配置

**文件：** `cocos/scene-graph/scene-globals.ts`

SceneGlobals 聚合了所有场景级别的渲染参数，通过 `activate(scene)` 方法将配置应用到 `PipelineSceneData` 中的渲染资源对象。

### Info 与 Resource 的双层架构

每个渲染子系统都采用 **Info（场景层配置）+ Resource（渲染层资源）** 的双层设计：

- **Info 类**（如 `AmbientInfo`, `FogInfo`, `SkyboxInfo`）：存储序列化数据，提供编辑器可见的属性
- **Resource 类**（如 `Ambient`, `Fog`, `Skybox`）：渲染场景中的实际资源对象，由渲染管线使用

### SceneGlobals 组合结构

| 属性 | 类型 | 说明 |
|------|------|------|
| `ambient` | `AmbientInfo` | 环境光（天空色、地面色、天空亮度，HDR/LDR 双套） |
| `shadows` | `ShadowsInfo` | 阴影（Planar/ShadowMap、CSM 级联） |
| `skybox` | `SkyboxInfo` | 天空盒（环境贴图、IBL、漫反射卷积、反射贴图） |
| `fog` | `FogInfo` | 全局雾（线性/指数/层级雾） |
| `octree` | `OctreeInfo` | 八叉树剔除 |
| `skin` | `SkinInfo` | 皮肤后处理（SSSS） |
| `lightProbeInfo` | `LightProbeInfo` | 光照探针 |
| `postSettings` | `PostSettingsInfo` | 后处理设置（色调映射） |

### HDR/LDR 双模式

`AmbientInfo` 和 `SkyboxInfo` 同时维护 HDR 和 LDR 两套数据。通过 `getPipelineSceneData().isHDR` 判断当前模式，setter 中根据模式写入对应的数据。

### 属性变更同步机制

所有 Info 类的 setter 都遵循相同模式：修改内部值后，如果 `_resource` 已存在，则同步到渲染资源：

```typescript
set enabled(val: boolean) {
    if (this._enabled === val) return;
    this._enabled = val;
    if (this._resource) { this._resource.enabled = val; }
}
```

### FogInfo 雾效配置

| 属性 | 适用雾类型 | 说明 |
|------|-----------|------|
| `type` | 全部 | FogType 枚举（LINEAR/EXP/EXP_SQUARED/LAYERED） |
| `fogDensity` | EXP/EXP_SQUARED | 雾浓度 |
| `fogStart/fogEnd` | LINEAR | 雾起始/结束距离 |
| `fogAtten` | EXP/EXP_SQUARED/LAYERED | 雾衰减 |
| `fogTop/fogRange` | LAYERED | 层级雾顶部范围和范围 |
| `accurate` | 全部 | 是否启用精确（像素）雾 |

### SkyboxInfo 天空盒配置

| 属性 | 说明 |
|------|------|
| `envLightingType` | 环境光照类型（HEMISPHERE_DIFFUSE / AUTOGEN_HEMISPHERE_DIFFUSE_WITH_REFLECTION / DIFFUSEMAP_WITH_REFLECTION） |
| `envmap` | 环境贴图（HDR/LDR 分别存储） |
| `diffuseMap` | 漫反射卷积图 |
| `reflectionMap` | 反射卷积图 |
| `rotationAngle` | 天空盒旋转角度 |
| `skyboxMaterial` | 自定义天空盒材质 |

`envLightingType` 的 setter 实现了三种模式的自动联动：设置类型时自动更新 `useIBL` 和 `applyDiffuseMap` 标志。

---

## 13. 隐含知识与常见陷阱

1. **Pass.phase 不匹配 = 不可见** — 渲染对象的 pass.phase 必须匹配管线的 phase 位掩码，否则静默剔除
2. **Material.initialize() 只能调用一次** — 重复初始化会打印警告并被拒绝
3. **Model.getMacroPatches 动态注入宏** — CC_RECEIVE_SHADOW、CC_USE_LIGHTMAP 等宏由 Model 运行时计算，不是材质定义的
4. **SubModel 最多 8 个 Pass** — 超过限制会被截断
5. **Handle 编码限制** — binding 最多 64 个，offset 最多 4096 个 vec4
6. **uber 模式性能下降** — 宏数量超过 31 位时切换为字符串 key，缓存效率降低
7. **PassInstance 共享父 Pass 数据** — 修改 PassInstance 的 UBO 不影响父 Pass，但纹理是共享引用
8. **DirectionalLight.activate 触发全局重编译** — 设置主光源会调用 `onGlobalPipelineStateChanged()`，影响所有 Model 的 Shader
9. **Root 使用对象池管理 Model/Camera/Light** — 创建和销毁通过 `createModel/destroyModel` 等方法，避免频繁 GC
10. **SceneGlobals 的 HDR/LDR 切换** — 运行时切换 HDR 模式需要重新设置所有贴图和颜色
11. **EffectAsset.combinations 控制预编译** — 未在 combinations 中声明的宏组合会在首次使用时编译，可能导致卡顿
12. **透明 Pass 自动添加 CC_IS_TRANSPARENCY_PASS** — `getShaderVariant` 会自动注入此宏

---

## 14. 关键文件索引

| 类 | 文件路径 |
|----|----------|
| RenderScene | `cocos/render-scene/core/render-scene.ts` |
| Model | `cocos/render-scene/scene/model.ts` |
| SubModel | `cocos/render-scene/scene/submodel.ts` |
| Camera | `cocos/render-scene/scene/camera.ts` |
| Light (基类) | `cocos/render-scene/scene/light.ts` |
| DirectionalLight | `cocos/render-scene/scene/directional-light.ts` |
| Pass | `cocos/render-scene/core/pass.ts` |
| PassInstance | `cocos/render-scene/core/pass-instance.ts` |
| MaterialInstance | `cocos/render-scene/core/material-instance.ts` |
| ProgramLib | `cocos/render-scene/core/program-lib.ts` |
| PassUtils (Handle) | `cocos/render-scene/core/pass-utils.ts` |
| EffectAsset | `cocos/asset/assets/effect-asset.ts` |
| Root | `cocos/rendering/root.ts` |
| SceneGlobals | `cocos/scene-graph/scene-globals.ts` |
| Constants | `cocos/render-scene/core/constants.ts` |

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*

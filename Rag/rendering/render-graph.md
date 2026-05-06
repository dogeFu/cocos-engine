# Cocos Creator 引擎 — Render Graph 自定义渲染管线

> 面向 AI 辅助编程的中文参考文档。覆盖新一代 Render Graph 渲染管线架构（C++ 层实现）。

---

## 目录

1. [架构概览](#1-架构概览)
2. [代码位置与平台支持](#2-代码位置与平台支持)
3. [核心接口类](#3-核心接口类)
4. [RenderGraph 数据结构](#4-rendergraph-数据结构)
5. [ResourceGraph 资源图](#5-resourcegraph-资源图)
6. [LayoutGraph 布局图](#6-layoutgraph-布局图)
7. [枚举与公共类型](#7-枚举与公共类型)
8. [PipelineBuilder 构建器接口](#8-pipelinebuilder-构建器接口)
9. [编译与执行](#9-编译与执行)
10. [与传统管线的对比](#10-与传统管线的对比)
11. [隐含知识与陷阱](#11-隐含知识与陷阱)
12. [关键文件索引](#12-关键文件索引)

---

## 1. 架构概览

Render Graph 是 Cocos Creator 引入的新一代渲染管线架构，采用有向无环图（DAG）结构组织渲染流程，实现自动资源管理、渲染流程优化和跨平台渲染抽象。这是对传统 Pipeline-Flow-Stage 架构的重大升级。

**核心设计思想：**

- **图结构组织**：使用 DAG 表达渲染 Pass 之间的依赖关系
- **自动资源管理**：系统自动管理渲染资源的创建、销毁和生命周期
- **编译优化**：编译器可进行全局优化（通道合并、资源别名）
- **跨平台抽象**：统一接口适配 Vulkan、Metal、WebGPU

**架构层次：**

```
PipelineBuilder（用户实现）
    ↓ setup(cameras, pipeline)
BasicPipeline / Pipeline（管线接口）
    ├── addRenderWindow / addRenderTarget / addDepthStencil  ← 资源注册
    ├── addRenderPass / addComputePass / addCopyPass         ← Pass 构建
    └── setMat4 / setVec4 / setTexture ...                  ← Uniform 设置
    ↓
RenderGraph（渲染图数据结构）
    ├── RasterPass / ComputePass / CopyPass / MovePass / ResolvePass
    └── RenderQueue / SceneData / Dispatch / Blit
    ↓
ResourceGraph（资源图数据结构）
    ├── ManagedTexture / ManagedBuffer
    ├── PersistentTexture / PersistentBuffer
    └── Framebuffer / RenderSwapchain / FormatView / SubresourceView
    ↓
LayoutGraph（布局图数据结构）
    ├── RenderPassType (stage) / RenderPhase (phase)
    └── DescriptorSetLayout / PipelineLayout
    ↓
FrameGraphDispatcher（编译器）
    ↓
NativeExecutor（执行器）
```

---

## 2. 代码位置与平台支持

**⚠️ 关键事实：Render Graph 系统完全在 C++ 层实现，没有暴露 TypeScript API。**

| 层面 | 位置 | 说明 |
|------|------|------|
| C++ 接口定义 | `native/cocos/renderer/pipeline/custom/RenderInterfaceTypes.h` | 所有接口类定义 |
| C++ 公共类型 | `native/cocos/renderer/pipeline/custom/RenderCommonTypes.h` | 枚举和基础类型 |
| C++ 渲染图类型 | `native/cocos/renderer/pipeline/custom/RenderGraphTypes.h` | RenderGraph、ResourceGraph 数据结构 |
| C++ 布局图类型 | `native/cocos/renderer/pipeline/custom/LayoutGraphTypes.h` | LayoutGraph 数据结构 |
| C++ 原生实现 | `native/cocos/renderer/pipeline/custom/NativePipeline.cpp` | NativePipeline 实现 |
| C++ 执行器 | `native/cocos/renderer/pipeline/custom/NativeExecutor.cpp` | NativeExecutor 实现 |
| C++ 编译器 | `native/cocos/renderer/pipeline/custom/FrameGraphDispatcher.cpp` | FrameGraphDispatcher 实现 |
| TS PipelineRuntime | `cocos/rendering/pipeline-types.ts` | 极简接口，不包含 Render Graph 构建能力 |

**TypeScript 侧的 `PipelineRuntime` 接口**（`cocos/rendering/pipeline-types.ts`）是 C++ `BasicPipeline` 的极简子集，仅包含 `activate`、`destroy`、`render`、`onGlobalPipelineStateChanged` 等基础方法，**不包含** `addRenderPass`、`addRenderTarget` 等 Render Graph 构建能力。

**C++ 与 TS 的唯一桥梁**：C++ 通过 `jsb.buildRenderPipeline` 反向调用 TS 的 `director.buildRenderPipeline()`（空实现），管线构建逻辑完全在 C++ 侧完成。

---

## 3. 核心接口类

所有接口类定义在 `native/cocos/renderer/pipeline/custom/RenderInterfaceTypes.h`，命名空间 `cc::render`。

### 3.1 类继承体系

```
PipelineRuntime（抽象基类）
  └── BasicPipeline（抽象类，全平台支持）
        └── Pipeline（抽象类，标准管线，支持 Compute/Subpass）

Setter（抽象基类，支持设置 uniform/descriptor）
  ├── SceneBuilder
  ├── RenderQueueBuilder
  ├── BasicRenderPassBuilder
  │     └── BasicMultisampleRenderPassBuilder
  ├── RenderPassBuilder（继承 BasicRenderPassBuilder）
  ├── MultisampleRenderPassBuilder（继承 BasicMultisampleRenderPassBuilder）
  ├── RenderSubpassBuilder
  │     └── MultisampleRenderSubpassBuilder
  ├── ComputeSubpassBuilder
  ├── ComputeQueueBuilder
  └── ComputePassBuilder

PipelinePassBuilder（独立类）
PipelineBuilder（用户实现此接口来构建 Render Graph）
```

### 3.2 BasicPipeline（全平台基础管线）

**关键方法：**

**资源注册：**

```cpp
virtual uint32_t addRenderWindow(const string &name, gfx::Format format,
    uint32_t width, uint32_t height, RenderWindow *renderWindow,
    const string &depthStencilName) = 0;

virtual uint32_t addRenderTarget(const string &name, gfx::Format format,
    uint32_t width, uint32_t height, ResourceResidency residency) = 0;

virtual uint32_t addDepthStencil(const string &name, gfx::Format format,
    uint32_t width, uint32_t height, ResourceResidency residency) = 0;

virtual uint32_t addBuffer(const string &name, uint32_t size,
    ResourceFlags flags, ResourceResidency residency) = 0;

virtual uint32_t addExternalTexture(const string &name,
    gfx::Texture *texture, ResourceFlags flags) = 0;
```

**Pass 构建：**

```cpp
virtual BasicRenderPassBuilder* addRenderPass(uint32_t width, uint32_t height,
    const string &passName) = 0;

virtual BasicMultisampleRenderPassBuilder* addMultisampleRenderPass(
    uint32_t width, uint32_t height, uint32_t count, uint32_t quality,
    const string &passName) = 0;

virtual void addCopyPass(const vector<CopyPair> &copyPairs) = 0;
```

**管线生命周期：**

```cpp
virtual void beginSetup() = 0;
virtual void endSetup() = 0;
virtual void beginFrame() = 0;
virtual void update(Camera *camera) = 0;
virtual void endFrame() = 0;
```

### 3.3 Pipeline（标准管线，继承 BasicPipeline）

额外提供 Compute Shader 和 Subpass 支持：

```cpp
RenderPassBuilder* addRenderPass(uint32_t width, uint32_t height,
    const string &passName) override = 0;  // 协变返回类型

ComputePassBuilder* addComputePass(const string &passName) = 0;

uint32_t addStorageBuffer(const string &name, gfx::Format format,
    uint32_t size, ResourceResidency residency) = 0;

uint32_t addStorageTexture(const string &name, gfx::Format format,
    uint32_t width, uint32_t height, ResourceResidency residency) = 0;

void addUploadPass(vector<UploadPair> &uploadPairs) = 0;
void addMovePass(const vector<MovePair> &movePairs) = 0;
```

### 3.4 BasicRenderPassBuilder

```cpp
virtual void addRenderTarget(const string &name, gfx::LoadOp loadOp,
    gfx::StoreOp storeOp, const gfx::Color &color) = 0;

virtual void addDepthStencil(const string &name, gfx::LoadOp loadOp,
    gfx::StoreOp storeOp, float depth, uint8_t stencil,
    gfx::ClearFlagBit clearFlags) = 0;
```

### 3.5 RenderPassBuilder（继承 BasicRenderPassBuilder）

支持 Subpass：

```cpp
virtual RenderSubpassBuilder* addSubpass(const string &passName,
    const vector<string> &inputs) = 0;

virtual MultisampleRenderSubpassBuilder* addMultisampleSubpass(
    const string &passName, const vector<string> &inputs) = 0;
```

### 3.6 ComputePassBuilder

```cpp
virtual ComputeQueueBuilder* addQueue(QueueHint hint,
    const string &phaseName) = 0;
```

---

## 4. RenderGraph 数据结构

定义在 `native/cocos/renderer/pipeline/custom/RenderGraphTypes.h`。

RenderGraph 是一个多态图（PolymorphicGraph），顶点类型包括：

| 顶点类型 | 说明 |
|----------|------|
| `RasterPass` | 光栅化通道 |
| `RasterSubpass` | 光栅化子通道 |
| `ComputeSubpass` | 计算子通道 |
| `ComputePass` | 计算通道 |
| `ResolvePass` | 解析通道 |
| `CopyPass` | 拷贝通道 |
| `MovePass` | 移动通道 |
| `RaytracePass` | 光线追踪通道 |
| `RenderQueue` | 渲染队列 |
| `SceneData` | 场景数据 |
| `Blit` | Blit 操作 |
| `Dispatch` | Compute Dispatch |
| `ClearView[]` | 清除视图 |
| `Viewport` | 视口 |

---

## 5. ResourceGraph 资源图

定义在 `native/cocos/renderer/pipeline/custom/RenderGraphTypes.h`。

ResourceGraph 也是一个多态图，顶点类型包括：

| 顶点类型 | 说明 |
|----------|------|
| `ManagedResource` | 托管资源基类 |
| `ManagedBuffer` | 托管缓冲 |
| `ManagedTexture` | 托管纹理 |
| `PersistentBuffer` | 持久缓冲 |
| `PersistentTexture` | 持久纹理 |
| `Framebuffer` | 帧缓冲 |
| `RenderSwapchain` | 渲染交换链 |
| `FormatView` | 格式视图 |
| `SubresourceView` | 子资源视图 |

**资源驻留策略（ResourceResidency）：**

| 值 | 说明 |
|----|------|
| `MANAGED` | 托管资源，系统自动管理生命周期 |
| `MEMORYLESS` | 内存无关资源，移动端优化 |
| `PERSISTENT` | 持久资源，跨帧存在 |
| `EXTERNAL` | 外部资源 |
| `BACKBUFFER` | 后缓冲 |

---

## 6. LayoutGraph 布局图

定义在 `native/cocos/renderer/pipeline/custom/LayoutGraphTypes.h`。

LayoutGraph 管理描述符集和管线布局，是现代图形 API 的核心概念。

**顶点类型：**

| 顶点类型 | 说明 |
|----------|------|
| `RenderPassType` | 渲染 Pass 阶段（stage） |
| `RenderPhase` | 渲染阶段（phase） |

**运行时数据版本 LayoutGraphData：**

| 顶点类型 | 说明 |
|----------|------|
| `RenderStageData` | 渲染阶段数据 |
| `RenderPhaseData` | 渲染 phase 数据 |

**布局类型（LayoutType）：**

| 值 | 说明 |
|----|------|
| `VULKAN` | Vulkan 布局 |
| `WEBGPU` | WebGPU 布局 |

**描述符索引键（DescriptorBlockIndex）：**

```cpp
struct DescriptorBlockIndex {
    UpdateFrequency updateFrequency;  // 更新频率
    ParameterType parameterType;      // 参数类型
    DescriptorTypeOrder descriptorType; // 描述符类型
    ShaderStageFlagBit visibility;    // Shader 可见性
};
```

---

## 7. 枚举与公共类型

所有枚举定义在 `native/cocos/renderer/pipeline/custom/RenderCommonTypes.h`。

### UpdateFrequency

```cpp
enum class UpdateFrequency : uint8_t {
    PER_INSTANCE,  // 每实例
    PER_BATCH,     // 每批次
    PER_PHASE,     // 每阶段
    PER_PASS,      // 每通道
    COUNT,
};
```

### ParameterType

```cpp
enum class ParameterType : uint8_t {
    CONSTANTS,  // 常量
    CBV,        // 常量缓冲视图
    UAV,        // 无序访问视图
    SRV,        // 着色器资源视图
    TABLE,      // 描述符表
    SSV,        // 采样器
};
```

### AccessType

```cpp
enum class AccessType : uint8_t {
    READ,        // 只读
    READ_WRITE,  // 读写
    WRITE,       // 只写
};
```

### QueueHint

```cpp
enum class QueueHint : uint8_t {
    NONE,
    OPAQUE,
    MASK,
    BLEND,
    RENDER_OPAQUE = OPAQUE,      // 别名
    RENDER_CUTOUT = MASK,        // 别名
    RENDER_TRANSPARENT = BLEND,  // 别名
};
```

### SceneFlags（位标志）

```cpp
enum class SceneFlags : uint32_t {
    NONE = 0,
    OPAQUE = 0x1,
    MASK = 0x2,
    BLEND = 0x4,
    SHADOW_CASTER = 0x8,
    DEFAULT_LIGHTING = 0x20,
    VOLUMETRIC_LIGHTING = 0x40,
    CLUSTERED_LIGHTING = 0x80,
    PLANAR_SHADOW = 0x100,
    GEOMETRY = 0x200,
    DRAW_INSTANCING = 0x800,
    DRAW_NON_INSTANCING = 0x1000,
    REFLECTION_PROBE = 0x2000,
    GPU_DRIVEN = 0x4000,
    NON_BUILTIN = 0x8000,
    ALL = 0xFFFFFFFF,
    // 以下已废弃
    OPAQUE_OBJECT = OPAQUE,
    CUTOUT_OBJECT = MASK,
    TRANSPARENT_OBJECT = BLEND,
    UI = 0x10,
    PROFILER = 0x400,
};
```

### ResourceDimension

```cpp
enum class ResourceDimension : uint8_t {
    BUFFER,
    TEXTURE1D,
    TEXTURE2D,
    TEXTURE3D,
};
```

### ResourceFlags（位标志）

```cpp
enum class ResourceFlags : uint32_t {
    NONE = 0,
    UNIFORM = 0x1,
    INDIRECT = 0x2,
    STORAGE = 0x4,
    SAMPLED = 0x8,
    COLOR_ATTACHMENT = 0x10,
    DEPTH_STENCIL_ATTACHMENT = 0x20,
    INPUT_ATTACHMENT = 0x40,
    SHADING_RATE = 0x80,
    TRANSFER_SRC = 0x100,
    TRANSFER_DST = 0x200,
};
```

### PipelineType

```cpp
enum class PipelineType : uint8_t {
    BASIC,     // 基础渲染管线，全平台支持
    STANDARD,  // 标准渲染管线，支持 Compute Shader 与 Subpass
};
```

---

## 8. PipelineBuilder 构建器接口

用户实现 `PipelineBuilder` 接口来构建自定义渲染管线：

```cpp
class PipelineBuilder {
public:
    virtual ~PipelineBuilder() noexcept = default;

    virtual void windowResize(BasicPipeline *pipeline, RenderWindow *window,
        Camera *camera, uint32_t width, uint32_t height) = 0;

    virtual void setup(const vector<Camera*> &cameras,
        BasicPipeline *pipeline) = 0;

    virtual void onGlobalPipelineStateChanged() = 0;
};
```

**注意：** `setup` 方法接收 `BasicPipeline*`（不是 `Pipeline*`），这意味着在基础管线模式下也能工作。

---

## 9. 编译与执行

### 编译器 — FrameGraphDispatcher

定义在 `native/cocos/renderer/pipeline/custom/FrameGraphDispatcher.cpp`。

FrameGraphDispatcher 负责将 Render Graph 编译为可执行的渲染命令，内部实现包括：
- 资源使用分析
- 依赖图构建
- 通道合并优化
- 资源别名优化（生命周期不重叠的资源共享内存）
- 执行计划生成

### 执行器 — NativeExecutor

定义在 `native/cocos/renderer/pipeline/custom/NativeExecutor.cpp`。

NativeExecutor 负责执行编译后的渲染命令，遍历 RenderGraph 的各个 Pass 节点并调用 GFX 命令。

---

## 10. 与传统管线的对比

| 特性 | 传统管线（Pipeline-Flow-Stage） | Render Graph |
|------|-------------------------------|--------------|
| 代码位置 | `cocos/rendering/`（TypeScript） | `native/cocos/renderer/pipeline/custom/`（C++） |
| TS API | 完整暴露 | **未暴露** |
| 架构 | 三层树形结构 | DAG 图结构 |
| 资源管理 | 手动管理 | 自动管理 |
| 优化能力 | 有限 | 编译器全局优化 |
| 扩展方式 | 继承 RenderPipeline | 实现 PipelineBuilder |
| Pass 类型 | RenderFlow + RenderStage | RasterPass + ComputePass + CopyPass + MovePass + Subpass |
| 平台 | Web + Native | 仅 Native（C++） |

---

## 11. 隐含知识与陷阱

1. **Render Graph API 未暴露到 TypeScript**：`addRenderPass`、`PipelineBuilder`、`BasicPipeline` 等全部在 C++ 层，TypeScript 侧无法直接使用。如果需要自定义管线，必须修改 C++ 代码。
2. **方法名不是 addRasterPass**：正确的方法名是 `addRenderPass`，返回 `BasicRenderPassBuilder*`（基础管线）或 `RenderPassBuilder*`（标准管线）。
3. **PipelineBuilder.setup 接收 BasicPipeline***：不是 `Pipeline*`，这意味着在 `setup` 中只能使用 `BasicPipeline` 的方法。如果需要 `Pipeline` 的 Compute/Subpass 功能，需要通过其他方式获取。
4. **SceneFlags 有多个废弃别名**：`OPAQUE_OBJECT` → `OPAQUE`，`CUTOUT_OBJECT` → `MASK`，`TRANSPARENT_OBJECT` → `BLEND`，`UI` 和 `PROFILER` 已废弃。
5. **AccessType 有三个值**：不只是 READ/WRITE，还有 `READ_WRITE`。
6. **ResourceResidency 有五个值**：除了 MANAGED/PERSISTENT/MEMORYLESS，还有 `EXTERNAL` 和 `BACKBUFFER`。
7. **C++ 与 TS 的桥梁是反向回调**：C++ 通过 `jsb.buildRenderPipeline` 调用 TS 的 `director.buildRenderPipeline()`（空实现），管线构建完全在 C++ 侧。

---

## 12. 关键文件索引

| 文件 | 说明 |
|------|------|
| `native/cocos/renderer/pipeline/custom/RenderInterfaceTypes.h` | 核心接口定义（BasicPipeline、Pipeline、PipelineBuilder、各种 Builder） |
| `native/cocos/renderer/pipeline/custom/RenderCommonTypes.h` | 枚举和公共类型（QueueHint、SceneFlags、AccessType 等） |
| `native/cocos/renderer/pipeline/custom/RenderGraphTypes.h` | RenderGraph 和 ResourceGraph 数据结构定义 |
| `native/cocos/renderer/pipeline/custom/LayoutGraphTypes.h` | LayoutGraph 数据结构定义 |
| `native/cocos/renderer/pipeline/custom/NativePipeline.cpp` | NativePipeline 实现 |
| `native/cocos/renderer/pipeline/custom/NativeExecutor.cpp` | NativeExecutor 执行器实现 |
| `native/cocos/renderer/pipeline/custom/FrameGraphDispatcher.cpp` | FrameGraphDispatcher 编译器实现 |
| `native/cocos/renderer/pipeline/custom/NativeRenderGraph.cpp` | NativeRenderGraph 实现 |
| `native/cocos/renderer/pipeline/custom/NativeResourceGraph.cpp` | NativeResourceGraph 实现 |
| `native/cocos/renderer/pipeline/custom/RenderCommonJsb.h/.cpp` | JSB 类型转换 |
| `cocos/rendering/pipeline-types.ts` | TS 侧 PipelineRuntime 极简接口 |
| `cocos/root.jsb.ts` | jsb.buildRenderPipeline 桥接 |

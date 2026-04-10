# Render Graph 渲染图系统模块分析

## 模块作用

Render Graph 是 Cocos Creator 引入的新一代渲染管线架构,位于 `cocos/rendering/custom/` 目录下。它采用现代化的渲染图(Render Graph)设计理念,通过图结构组织渲染流程,实现自动资源管理、渲染流程优化和跨平台渲染抽象。这是对传统 Pipeline-Flow-Stage 架构的重大升级。

### 主要功能领域

1. **渲染图架构** - 使用图结构组织渲染流程
2. **资源管理系统** - 自动化的资源生命周期管理
3. **布局图系统** - 描述符集布局和管线布局管理
4. **编译器系统** - 渲染图编译和优化
5. **执行器系统** - 高效的渲染命令执行
6. **跨平台抽象** - 统一的渲染接口

## 设计理念

### 1. Render Graph 架构

Render Graph 采用有向无环图(DAG)结构组织渲染流程,这是现代渲染引擎的主流设计。

**核心概念:**

```
Render Graph (渲染图)
├── Raster Pass (光栅化通道)
│   ├── Raster View (光栅化视图)
│   ├── Render Queue (渲染队列)
│   └── Subpass (子通道)
├── Compute Pass (计算通道)
│   ├── Compute View (计算视图)
│   └── Dispatch (调度)
├── Copy Pass (拷贝通道)
├── Move Pass (移动通道)
└── Resolve Pass (解析通道)

Resource Graph (资源图)
├── Managed Texture (托管纹理)
├── Managed Buffer (托管缓冲)
├── Persistent Texture (持久纹理)
└── Persistent Buffer (持久缓冲)
```

**设计优势:**
- **自动资源管理**: 系统自动管理资源的创建、销毁和生命周期
- **渲染优化**: 编译器可以优化渲染流程,合并通道
- **依赖追踪**: 自动追踪资源依赖关系
- **内存效率**: 按需分配和释放资源

**实现原理:**
```typescript
class RenderGraph extends PolymorphicGraph {
    // 渲染图包含多种类型的节点
    addRasterPass(name: string): RasterPass {
        const pass = new RasterPass();
        this.addVertex(pass);
        return pass;
    }
    
    addComputePass(name: string): ComputePass {
        const pass = new ComputePass();
        this.addVertex(pass);
        return pass;
    }
    
    // 建立资源依赖关系
    addEdge(from: vertex_descriptor, to: vertex_descriptor): void {
        // 添加边表示资源依赖
        super.addEdge(from, to);
    }
}
```

### 2. 资源管理系统

Render Graph 实现了自动化的资源管理系统,这是其最核心的创新。

**资源类型:**

1. **Managed Resources (托管资源)**
   - 由系统自动管理生命周期
   - 按需创建和销毁
   - 支持别名(Aliasing)优化

2. **Persistent Resources (持久资源)**
   - 跨帧存在的资源
   - 用户手动管理生命周期
   - 适用于需要保留的资源

**资源管理流程:**
```typescript
// 资源描述
class ResourceDesc {
    dimension: ResourceDimension;    // 维度(缓冲/纹理)
    width: number;                   // 宽度
    height: number;                  // 高度
    format: Format;                  // 格式
    sampleCount: SampleCount;        // 采样数
    flags: ResourceFlags;            // 资源标志
}

// 资源特性
class ResourceTraits {
    residency: ResourceResidency;    // 驻留策略
    // MANAGED: 托管资源
    // PERSISTENT: 持久资源
    // MEMORYLESS: 内存无关资源(移动端优化)
}

// 创建资源
const texture = pipeline.addRenderTarget(
    'OutputColor',
    Format.RGBA8,
    width,
    height
);
```

**资源生命周期:**
```
创建 (Create)
    ↓
首次使用 (First Use)
    ↓
传递使用 (Transitive Use)
    ↓
最后使用 (Last Use)
    ↓
销毁 (Destroy)
```

### 3. Layout Graph 布局图系统

Layout Graph 管理描述符集和管线布局,这是现代图形 API 的核心概念。

**布局层次:**
```typescript
// 描述符
class Descriptor {
    type: Type;              // 类型
    count: number;           // 数量
}

// 描述符块
class DescriptorBlock {
    descriptors: Map<string, Descriptor>;
    uniformBlocks: Map<string, UniformBlock>;
    capacity: number;
    count: number;
}

// 描述符集布局
class DescriptorSetLayout {
    bindings: DescriptorSetLayoutBinding[];
}

// 管线布局
class PipelineLayout {
    descriptorSetLayouts: DescriptorSetLayout[];
}
```

**布局索引:**
```typescript
class DescriptorBlockIndex {
    updateFrequency: UpdateFrequency;     // 更新频率
    parameterType: ParameterType;         // 参数类型
    descriptorType: DescriptorTypeOrder;  // 描述符类型
    visibility: ShaderStageFlagBit;       // 可见性
}

// 更新频率
enum UpdateFrequency {
    PER_INSTANCE,      // 每实例
    PER_PASS,          // 每通道
    PER_BATCH,         // 每批次
}
```

### 4. 编译器系统

编译器将 Render Graph 编译为可执行的渲染命令,并进行优化。

**编译流程:**
```
Render Graph
    ↓
资源分析 (Resource Analysis)
    ↓
依赖解析 (Dependency Resolution)
    ↓
通道合并 (Pass Merging)
    ↓
资源别名优化 (Resource Aliasing)
    ↓
执行计划 (Execution Plan)
```

**编译器实现:**
```typescript
class Compiler {
    compile(renderGraph: RenderGraph): void {
        // 1. 分析资源使用
        this.analyzeResources(renderGraph);
        
        // 2. 建立依赖图
        this.buildDependencyGraph(renderGraph);
        
        // 3. 优化渲染流程
        this.optimizePasses(renderGraph);
        
        // 4. 分配资源
        this.allocateResources(renderGraph);
        
        // 5. 生成执行计划
        this.generateExecutionPlan(renderGraph);
    }
    
    // 通道合并优化
    mergePasses(passes: Pass[]): Pass[] {
        // 合并可以合并的通道
        // 减少状态切换
        return mergedPasses;
    }
    
    // 资源别名优化
    aliasResources(resources: Resource[]): void {
        // 为生命周期不重叠的资源分配相同内存
        // 减少内存占用
    }
}
```

### 5. 执行器系统

执行器负责执行编译后的渲染命令。

**执行流程:**
```typescript
class Executor {
    execute(renderGraph: RenderGraph): void {
        // 遍历渲染图
        for (const pass of renderGraph.passes) {
            if (pass instanceof RasterPass) {
                this.executeRasterPass(pass);
            } else if (pass instanceof ComputePass) {
                this.executeComputePass(pass);
            } else if (pass instanceof CopyPass) {
                this.executeCopyPass(pass);
            }
        }
    }
    
    executeRasterPass(pass: RasterPass): void {
        const cmdBuff = this.commandBuffer;
        
        // 开始渲染通道
        cmdBuff.beginRenderPass(pass.renderPass, pass.framebuffer);
        
        // 执行渲染队列
        for (const queue of pass.queues) {
            this.executeRenderQueue(queue);
        }
        
        // 结束渲染通道
        cmdBuff.endRenderPass();
    }
}
```

### 6. 跨平台抽象

Render Graph 提供了统一的跨平台渲染接口。

**平台适配:**
```typescript
// 平台类型
enum LayoutType {
    VULKAN,     // Vulkan 布局
    WEBGPU,     // WebGPU 布局
}

// 统一接口
interface PipelineRuntime {
    activate(swapchain: Swapchain): boolean;
    destroy(): boolean;
    render(cameras: Camera[]): void;
    
    readonly device: Device;
    readonly commandBuffers: CommandBuffer[];
    readonly pipelineSceneData: PipelineSceneData;
}
```

## 核心组件详解

### 1. RenderGraph 渲染图

**职责:**
- 组织渲染流程
- 管理渲染节点
- 追踪资源依赖

**关键类型:**
- `RasterPass`: 光栅化通道
- `ComputePass`: 计算通道
- `CopyPass`: 拷贝通道
- `MovePass`: 移动通道
- `ResolvePass`: 解析通道

### 2. ResourceGraph 资源图

**职责:**
- 管理渲染资源
- 追踪资源使用
- 优化资源分配

**关键类型:**
- `ManagedTexture`: 托管纹理
- `ManagedBuffer`: 托管缓冲
- `PersistentTexture`: 持久纹理
- `PersistentBuffer`: 持久缓冲

### 3. LayoutGraph 布局图

**职责:**
- 管理描述符布局
- 优化资源绑定
- 支持多平台布局

**关键类型:**
- `Descriptor`: 描述符
- `DescriptorBlock`: 描述符块
- `DescriptorSetLayout`: 描述符集布局
- `PipelineLayout`: 管线布局

### 4. Pipeline 管线

**职责:**
- 管理渲染管线
- 协调编译和执行
- 提供用户接口

**关键方法:**
- `addRenderTarget()`: 添加渲染目标
- `addDepthStencil()`: 添加深度模板
- `addRasterPass()`: 添加光栅化通道
- `addComputePass()`: 添加计算通道

### 5. Compiler 编译器

**职责:**
- 编译渲染图
- 优化渲染流程
- 分配资源

**关键方法:**
- `compile()`: 编译渲染图
- `mergePasses()`: 合并通道
- `aliasResources()`: 资源别名优化

### 6. Executor 执行器

**职责:**
- 执行渲染命令
- 管理命令缓冲
- 处理资源屏障

**关键方法:**
- `execute()`: 执行渲染图
- `executeRasterPass()`: 执行光栅化通道
- `executeComputePass()`: 执行计算通道

## 代码示例

### 创建基本渲染流程

```typescript
import { BasicPipeline, PipelineBuilder } from 'cc';

// 自定义管线构建器
class CustomPipelineBuilder implements PipelineBuilder {
    build(cameras: Camera[], ppl: BasicPipeline): void {
        for (const camera of cameras) {
            this.renderCamera(camera, ppl);
        }
    }
    
    renderCamera(camera: Camera, ppl: BasicPipeline): void {
        // 添加渲染目标
        const width = camera.window.width;
        const height = camera.window.height;
        
        ppl.addRenderTarget('OutputColor', Format.RGBA8, width, height);
        ppl.addDepthStencil('DepthStencil', Format.DEPTH_STENCIL, width, height);
        
        // 添加光栅化通道
        const pass = ppl.addRasterPass('MainPass');
        pass.addRasterView('OutputColor', AccessType.WRITE);
        pass.addRasterView('DepthStencil', AccessType.WRITE);
        
        // 添加渲染队列
        const queue = pass.addQueue(QueueHint.RENDER_OPAQUE);
        queue.addScene(camera, SceneFlags.OPAQUE);
    }
}
```

### 使用计算通道

```typescript
// 添加计算通道
const computePass = ppl.addComputePass('ComputePass');

// 添加计算视图
computePass.addComputeView('InputTexture', AccessType.READ);
computePass.addComputeView('OutputTexture', AccessType.WRITE);

// 添加调度
const dispatch = computePass.addDispatch('ComputeShader');
dispatch.setThreadGroups(groupCountX, groupCountY, groupCountZ);
```

### 资源传递

```typescript
// 第一通道: 渲染到纹理
const pass1 = ppl.addRasterPass('Pass1');
pass1.addRasterView('TempTexture', AccessType.WRITE);

// 第二通道: 使用纹理
const pass2 = ppl.addRasterPass('Pass2');
pass2.addRasterView('TempTexture', AccessType.READ);
pass2.addRasterView('OutputColor', AccessType.WRITE);

// 系统自动处理资源依赖和生命周期
```

### 后处理流程

```typescript
// 创建后处理流程
function createPostProcess(ppl: BasicPipeline, inputTexture: string): void {
    // 添加后处理通道
    const pass = ppl.addRasterPass('PostProcess');
    
    // 输入纹理
    pass.addRasterView(inputTexture, AccessType.READ);
    
    // 输出纹理
    pass.addRasterView('PostProcessOutput', AccessType.WRITE);
    
    // 添加全屏四边形
    const queue = pass.addQueue(QueueHint.RENDER_TRANSPARENT);
    queue.addFullscreenQuad(postProcessMaterial);
}
```

## 模块关联

### 上游依赖

Render Graph 模块依赖:
- **Core**: 数学库、对象池、图算法
- **GFX**: 图形接口、资源管理
- **Scene Graph**: 场景数据、相机系统
- **Asset**: 材质和着色器资源

### 下游依赖

Render Graph 模块被以下模块使用:
- **Game**: 游戏渲染管线
- **Rendering**: 替代传统渲染管线

### 与传统管线对比

| 特性 | 传统管线 (Pipeline-Flow-Stage) | Render Graph |
|------|-------------------------------|--------------|
| 架构 | 三层树形结构 | 图结构 |
| 资源管理 | 手动管理 | 自动管理 |
| 优化能力 | 有限 | 强大 |
| 扩展性 | 需要继承 | 组合式 |
| 学习曲线 | 较低 | 较高 |
| 性能 | 良好 | 优秀 |

## 性能优化策略

### 1. 自动资源管理
- 按需分配资源
- 自动销毁无用资源
- 资源别名优化

### 2. 渲染流程优化
- 通道合并
- 状态排序
- 批处理优化

### 3. 内存优化
- 资源复用
- 内存池管理
- 延迟分配

### 4. 并行优化
- 多线程编译
- 异步资源创建
- 命令缓冲并行录制

## 扩展性设计

### 1. 自定义通道
可以创建自定义通道类型:

```typescript
class CustomPass extends RenderPass {
    execute(cmdBuff: CommandBuffer): void {
        // 自定义渲染逻辑
    }
}
```

### 2. 自定义资源
可以扩展资源类型:

```typescript
class CustomResource extends ManagedResource {
    allocate(): void {
        // 自定义分配逻辑
    }
}
```

### 3. 自定义优化
可以实现自定义优化策略:

```typescript
class CustomOptimizer {
    optimize(renderGraph: RenderGraph): void {
        // 自定义优化逻辑
    }
}
```

## 总结

Render Graph 是 Cocos Creator 引入的新一代渲染管线架构,其设计体现了现代渲染引擎的最佳实践:

1. **图结构组织**: 使用有向无环图组织渲染流程,清晰表达依赖关系
2. **自动资源管理**: 系统自动管理资源生命周期,减少内存泄漏风险
3. **编译优化**: 编译器可以进行全局优化,提高渲染效率
4. **跨平台抽象**: 统一的接口适配不同图形 API
5. **可扩展性**: 组合式设计,易于扩展新功能

Render Graph 代表了渲染引擎的未来发展方向,虽然学习曲线较陡,但提供了更强大的功能和更好的性能。它是对传统 Pipeline-Flow-Stage 架构的重大升级,为 Cocos Creator 带来了现代化的渲染能力。

理解 Render Graph 的设计理念,对于开发高性能、可扩展的渲染系统至关重要。它不仅适用于游戏开发,也为引擎开发者提供了强大的工具。

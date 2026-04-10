# Rendering 渲染管线模块分析

## 模块作用

Rendering 模块是 Cocos Creator 的渲染核心,负责组织和执行整个渲染流程。它实现了可扩展的渲染管线架构,通过 Pipeline、Flow、Stage 三层结构组织渲染过程,支持前向渲染、延迟渲染等多种渲染方案,并提供阴影、后处理、反射探针等高级渲染特性。

### 主要功能领域

1. **渲染管线架构** - Pipeline、Flow、Stage 三层抽象
2. **场景剔除** - 视锥剔除、遮挡剔除、光照剔除
3. **渲染队列** - 管理渲染对象的排序和批次
4. **光照系统** - 主光源、点光源、聚光灯等光照处理
5. **阴影系统** - 阴影贴图生成和渲染
6. **后处理** - Bloom、FXAA、TAA 等后处理效果
7. **反射探针** - 环境反射和探针系统

## 设计理念

### 1. 三层管线架构

Rendering 模块采用 Pipeline → Flow → Stage 的三层架构,实现了高度模块化和可扩展的渲染管线。

**架构层次:**

```
┌─────────────────────────────────────────────────────────┐
│  RenderPipeline (渲染管线)                               │
│  - 管理全局渲染资源和配置                                 │
│  - 组织多个 RenderFlow                                   │
│  - 处理所有 Camera 的渲染                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  RenderFlow (渲染流程)                                   │
│  - 独立的渲染子流程                                       │
│  - 组织多个 RenderStage                                  │
│  - 按优先级执行渲染阶段                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  RenderStage (渲染阶段)                                  │
│  - 实际的渲染执行单元                                     │
│  - 收集渲染对象并执行绘制                                 │
│  - 管理渲染队列和状态                                     │
└─────────────────────────────────────────────────────────┘
```

**设计优势:**
- **模块化**: 每个层次职责清晰,便于独立开发和测试
- **可扩展**: 可以轻松添加新的 Flow 或 Stage
- **可配置**: 通过组合不同的 Flow 和 Stage 实现不同的渲染方案
- **可复用**: 同一个 Stage 可以在不同的 Flow 中复用

**实现示例:**

```typescript
// ForwardPipeline 的组织结构
class ForwardPipeline extends RenderPipeline {
    initialize(info: IRenderPipelineInfo): boolean {
        // 添加阴影流程
        const shadowFlow = new ShadowFlow();
        shadowFlow.initialize(ShadowFlow.initInfo);
        this._flows.push(shadowFlow);
        
        // 添加反射探针流程
        const reflectionFlow = new ReflectionProbeFlow();
        reflectionFlow.initialize(ReflectionProbeFlow.initInfo);
        this._flows.push(reflectionFlow);
        
        // 添加前向渲染流程
        const forwardFlow = new ForwardFlow();
        forwardFlow.initialize(ForwardFlow.initInfo);
        this._flows.push(forwardFlow);
        
        return true;
    }
}
```

### 2. 命令模式与延迟执行

Rendering 模块采用命令模式,通过 CommandBuffer 记录渲染命令,实现延迟执行和优化。

**设计理念:**
- **命令录制**: 将渲染操作录制为命令
- **延迟执行**: 在合适的时机统一执行命令
- **批量优化**: 减少状态切换,提高性能

**渲染流程:**
```typescript
// RenderStage 的渲染过程
public render(camera: Camera): void {
    // 1. 场景剔除
    sceneCulling(camera, this.pipeline);
    
    // 2. 收集渲染对象
    this.collectRenderObjects(camera);
    
    // 3. 开始命令录制
    const cmdBuff = this.pipeline.commandBuffer;
    cmdBuff.begin();
    
    // 4. 开始渲染通道
    cmdBuff.beginRenderPass(this._renderPass, this._framebuffer, 
        clearColors, clearDepth, clearStencil);
    
    // 5. 设置视口和裁剪区域
    cmdBuff.setViewport(camera.viewport);
    cmdBuff.setScissor(camera.scissor);
    
    // 6. 执行绘制
    for (const queue of this._renderQueues) {
        queue.recordCommandBuffer(cmdBuff);
    }
    
    // 7. 结束渲染通道
    cmdBuff.endRenderPass();
    
    // 8. 结束命令录制
    cmdBuff.end();
}
```

### 3. 场景剔除优化

Rendering 模块实现了多层次的场景剔除,减少不必要的渲染开销。

**剔除类型:**

1. **视锥剔除 (Frustum Culling)**
   - 剔除视锥体外的对象
   - 使用包围盒快速判断

2. **遮挡剔除 (Occlusion Culling)**
   - 剔除被其他对象完全遮挡的对象
   - 使用层次化遮挡查询

3. **光照剔除 (Light Culling)**
   - 剔除不影响当前对象的光源
   - 基于光源范围和对象包围盒

4. **距离剔除 (Distance Culling)**
   - 剔除距离相机过远的对象
   - 支持 LOD 系统

**实现原理:**
```typescript
// 场景剔除流程
function sceneCulling(camera: Camera, pipeline: RenderPipeline): void {
    const scene = camera.scene!;
    const visibility = camera.visibility;
    
    // 遍历场景中的所有模型
    for (const model of scene.models) {
        // 视锥剔除
        if (!geometry.intersect.aabbFrustum(model.worldBounds, camera.frustum)) {
            continue;
        }
        
        // 距离剔除
        if (model.lodGroup) {
            const lodLevel = model.lodGroup.getLodLevel(camera.position);
            if (lodLevel < 0) continue;
        }
        
        // 层级过滤
        if (!(model.node.layer & visibility)) {
            continue;
        }
        
        // 添加到渲染队列
        pipeline.addRenderObject(model);
    }
    
    // 光照剔除
    validPunctualLightsCulling(camera, pipeline);
}
```

### 4. 渲染队列系统

Rendering 模块使用渲染队列管理渲染对象的排序和批次。

**队列类型:**
- **Opaque Queue**: 不透明对象队列,按距离从前到后排序
- **Transparent Queue**: 透明对象队列,按距离从后到前排序
- **Overlay Queue**: 覆盖层队列,最后渲染

**排序策略:**
```typescript
// 不透明对象排序:从前到后,减少过度绘制
opaqueQueue.sort((a, b) => {
    const depthA = a.depth;
    const depthB = b.depth;
    return depthA - depthB;  // 近的先渲染
});

// 透明对象排序:从后到前,保证正确的混合效果
transparentQueue.sort((a, b) => {
    const depthA = a.depth;
    const depthB = b.depth;
    return depthB - depthA;  // 远的先渲染
});
```

**批次合并:**
```typescript
// 按材质和网格合并批次
function batchRenderObjects(objects: RenderObject[]): Batch[] {
    const batches: Batch[] = [];
    const batchMap = new Map<string, Batch>();
    
    for (const obj of objects) {
        const key = `${obj.material.id}_${obj.mesh.id}`;
        if (!batchMap.has(key)) {
            batchMap.set(key, new Batch(obj.material, obj.mesh));
        }
        batchMap.get(key)!.addInstance(obj);
    }
    
    return Array.from(batchMap.values());
}
```

### 5. 光照系统设计

Rendering 模块支持多种类型的光源,并实现了高效的光照管理。

**光源类型:**
- **Directional Light**: 平行光(太阳光)
- **Point Light**: 点光源
- **Spot Light**: 聚光灯
- **Sphere Light**: 球形光
- **Tube Light**: 管状光

**光照数据管理:**
```typescript
// 全局光照 UBO
interface UBOGlobal {
    cc_time: Vec4;           // 时间
    cc_screenSize: Vec4;     // 屏幕尺寸
    cc_screenScale: Vec4;    // 屏幕缩放
    cc_nativeSize: Vec4;     // 原始尺寸
    cc_debug_view_mode: Vec4; // 调试视图模式
}

// 相机光照 UBO
interface UBOCamera {
    cc_matView: Mat4;        // 视图矩阵
    cc_matViewInv: Mat4;     // 视图逆矩阵
    cc_matProj: Mat4;        // 投影矩阵
    cc_matProjInv: Mat4;     // 投影逆矩阵
    cc_matViewProj: Mat4;    // 视图投影矩阵
    cc_cameraPos: Vec4;      // 相机位置
    cc_exposure: Vec4;       // 曝光参数
}

// 光照数据
interface UBOLight {
    cc_mainLitDir: Vec4;     // 主光源方向
    cc_mainLitColor: Vec4;   // 主光源颜色
    cc_ambientSky: Vec4;     // 天空环境光
    cc_ambientGround: Vec4;  // 地面环境光
}
```

### 6. 阴影系统设计

Rendering 模块实现了完整的阴影系统,支持多种阴影技术。

**阴影类型:**
- **Planar Shadow**: 平面阴影
- **Shadow Map**: 阴影贴图
- **CSM (Cascaded Shadow Maps)**: 级联阴影贴图

**阴影流程:**
```typescript
// ShadowFlow 的组织
class ShadowFlow extends RenderFlow {
    initialize(info: IRenderFlowInfo): boolean {
        // 添加阴影阶段
        const shadowStage = new ShadowStage();
        shadowStage.initialize(ShadowStage.initInfo);
        this._stages.push(shadowStage);
        
        return true;
    }
    
    render(camera: Camera): void {
        // 1. 从光源视角渲染深度
        this.renderShadowMap(camera);
        
        // 2. 在场景渲染时采样阴影贴图
        // (在 ForwardStage 中处理)
    }
}
```

**CSM 实现:**
```typescript
// 级联阴影贴图
class CSMLayers {
    update(light: DirectionalLight, camera: Camera): void {
        // 1. 计算视锥体分割
        const splits = this.calculateSplits(camera);
        
        // 2. 为每个级联计算光照矩阵
        for (let i = 0; i < this.levelCount; ++i) {
            const splitFrustum = this.getSplitFrustum(splits[i], splits[i + 1]);
            this.lightMatrices[i] = this.calculateLightMatrix(light, splitFrustum);
        }
        
        // 3. 渲染每个级联的阴影贴图
        for (let i = 0; i < this.levelCount; ++i) {
            this.renderShadowMapLevel(i);
        }
    }
}
```

### 7. 后处理系统

Rendering 模块提供了丰富的后处理效果,采用可扩展的架构设计。

**后处理效果:**
- **Bloom**: 辉光效果
- **FXAA**: 快速近似抗锯齿
- **TAA**: 时间抗锯齿
- **DOF**: 景深效果
- **Color Grading**: 颜色分级
- **HBAO**: 水平环境光遮蔽

**后处理流程:**
```typescript
// 后处理管线
class PostProcessBuilder {
    build(camera: Camera, inputTexture: Texture): Texture {
        let currentTexture = inputTexture;
        
        // 1. 应用 Bloom
        if (this.bloom.enabled) {
            currentTexture = this.bloom.render(currentTexture);
        }
        
        // 2. 应用 DOF
        if (this.dof.enabled) {
            currentTexture = this.dof.render(currentTexture);
        }
        
        // 3. 应用 Color Grading
        if (this.colorGrading.enabled) {
            currentTexture = this.colorGrading.render(currentTexture);
        }
        
        // 4. 应用 FXAA
        if (this.fxaa.enabled) {
            currentTexture = this.fxaa.render(currentTexture);
        }
        
        return currentTexture;
    }
}
```

## 核心组件详解

### 1. RenderPipeline 渲染管线

**职责:**
- 管理全局渲染资源
- 组织渲染流程
- 处理所有相机的渲染
- 管理常量宏和全局 UBO

**关键属性:**
- `flows`: 渲染流程列表
- `device`: GFX 设备
- `commandBuffers`: 命令缓冲列表
- `constantMacros`: 常量宏定义
- `pipelineSceneData`: 场景数据

**关键方法:**
- `initialize()`: 初始化管线
- `activate()`: 激活管线
- `render()`: 渲染所有相机
- `destroy()`: 销毁管线

### 2. RenderFlow 渲染流程

**职责:**
- 组织渲染阶段
- 按优先级执行渲染
- 管理流程级别的资源

**关键属性:**
- `name`: 流程名称
- `priority`: 优先级
- `stages`: 渲染阶段列表

**关键方法:**
- `initialize()`: 初始化流程
- `activate()`: 激活流程
- `render()`: 执行渲染

### 3. RenderStage 渲染阶段

**职责:**
- 收集渲染对象
- 执行实际的绘制
- 管理渲染队列

**关键属性:**
- `name`: 阶段名称
- `priority`: 优先级
- `enabled`: 是否启用

**关键方法:**
- `initialize()`: 初始化阶段
- `activate()`: 激活阶段
- `render()`: 执行渲染
- `destroy()`: 销毁阶段

### 4. Camera 相机系统

**职责:**
- 定义渲染视角
- 管理渲染目标
- 控制渲染参数

**关键属性:**
- `position`: 相机位置
- `forward`: 前方向
- `fov`: 视场角
- `near`: 近裁剪面
- `far`: 远裁剪面
- `visibility`: 可见性掩码
- `clearFlags`: 清除标记

### 5. Light 光照系统

**职责:**
- 定义光源参数
- 管理光照数据
- 支持多种光源类型

**关键属性:**
- `type`: 光源类型
- `color`: 光源颜色
- `intensity`: 光照强度
- `range`: 光照范围(点光源/聚光灯)

## 代码示例

### 自定义渲染管线

```typescript
import { RenderPipeline, RenderFlow, RenderStage, Camera } from 'cc';

// 自定义渲染阶段
class CustomRenderStage extends RenderStage {
    initialize(info: IRenderStageInfo): boolean {
        super.initialize(info);
        return true;
    }
    
    render(camera: Camera): void {
        // 自定义渲染逻辑
        const cmdBuff = this.pipeline.commandBuffer;
        cmdBuff.begin();
        
        // 开始渲染通道
        cmdBuff.beginRenderPass(this.renderPass, this.framebuffer, 
            [new Color(0, 0, 0, 1)], 1.0, 0);
        
        // 绘制对象
        this.drawRenderObjects(camera);
        
        cmdBuff.endRenderPass();
        cmdBuff.end();
    }
    
    destroy(): void {
        // 清理资源
    }
}

// 自定义渲染流程
class CustomRenderFlow extends RenderFlow {
    initialize(info: IRenderFlowInfo): boolean {
        super.initialize(info);
        
        // 添加自定义阶段
        const stage = new CustomRenderStage();
        stage.initialize({
            name: 'CustomStage',
            priority: 0,
        });
        this._stages.push(stage);
        
        return true;
    }
}

// 自定义渲染管线
class CustomPipeline extends RenderPipeline {
    initialize(info: IRenderPipelineInfo): boolean {
        super.initialize(info);
        
        // 添加自定义流程
        const flow = new CustomRenderFlow();
        flow.initialize({
            name: 'CustomFlow',
            priority: 0,
            stages: [],
        });
        this._flows.push(flow);
        
        return true;
    }
}
```

### 使用后处理效果

```typescript
import { director, Camera, Bloom, FXAA } from 'cc';

// 获取相机
const camera = node.getComponent(Camera);

// 启用 Bloom 效果
const bloom = camera.addComponent(Bloom);
bloom.enabled = true;
bloom.threshold = 0.8;
bloom.intensity = 1.5;
bloom.iterations = 4;

// 启用 FXAA 抗锯齿
const fxaa = camera.addComponent(FXAA);
fxaa.enabled = true;

// 启用颜色分级
const colorGrading = camera.addComponent(ColorGrading);
colorGrading.enabled = true;
colorGrading.toneMappingType = ToneMappingType.ACES;
```

### 自定义渲染队列

```typescript
import { RenderQueue, RenderObject } from 'cc';

class CustomRenderQueue extends RenderQueue {
    sort(): void {
        // 自定义排序逻辑
        this._objects.sort((a, b) => {
            // 按材质 ID 排序
            if (a.material.id !== b.material.id) {
                return a.material.id - b.material.id;
            }
            // 按深度排序
            return a.depth - b.depth;
        });
    }
    
    recordCommandBuffer(cmdBuff: CommandBuffer): void {
        for (const obj of this._objects) {
            // 绑定管线状态
            cmdBuff.bindPipelineState(obj.pipelineState);
            
            // 绑定描述符集
            cmdBuff.bindDescriptorSet(0, obj.descriptorSet);
            
            // 绑定输入装配器
            cmdBuff.bindInputAssembler(obj.inputAssembler);
            
            // 绘制
            cmdBuff.draw(obj.inputAssembler);
        }
    }
}
```

## 模块关联

### 上游依赖

Rendering 模块依赖以下基础模块:

1. **GFX**
   - 使用 GFX 设备和资源
   - 使用命令缓冲和渲染通道
   - 使用纹理和缓冲区

2. **Core**
   - 使用数学库进行计算
   - 使用事件系统
   - 使用对象管理

3. **Scene Graph**
   - 渲染场景节点
   - 使用相机和组件系统

### 下游依赖

Rendering 模块被以下模块依赖:

1. **Game**
   - 由 Game 初始化渲染管线

2. **2D/3D**
   - 使用渲染管线渲染对象
   - 提供渲染数据

3. **UI**
   - 使用渲染管线渲染 UI

### 模块交互流程

```
Game Loop
    ↓
Director.tick(dt)
    ↓
Root.render()
    ↓
┌─────────────────────────────────────────┐
│  RenderPipeline.render(cameras)         │
│  - 遍历所有相机                           │
│  - 为每个相机执行渲染流程                  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  RenderFlow.render(camera)              │
│  - 按优先级执行渲染阶段                   │
│  - ShadowFlow → ReflectionFlow → MainFlow│
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  RenderStage.render(camera)             │
│  - 场景剔除                               │
│  - 收集渲染对象                           │
│  - 执行绘制                               │
└─────────────────────────────────────────┘
    ↓
GFX CommandBuffer
    ↓
GPU Rendering
```

## 设计模式应用

### 1. 组合模式 (Composite Pattern)
- Pipeline 包含多个 Flow
- Flow 包含多个 Stage
- 树形结构组织渲染流程

### 2. 策略模式 (Strategy Pattern)
- 不同的渲染管线实现
- ForwardPipeline vs DeferredPipeline
- 运行时切换渲染策略

### 3. 命令模式 (Command Pattern)
- CommandBuffer 记录渲染命令
- 延迟执行和批量优化

### 4. 模板方法模式 (Template Method Pattern)
- RenderPipeline 定义渲染骨架
- 子类实现具体细节

### 5. 责任链模式 (Chain of Responsibility Pattern)
- Flow 和 Stage 形成处理链
- 按顺序处理渲染任务

## 性能优化策略

### 1. 场景剔除
- 视锥剔除减少渲染对象
- 光照剔除减少光照计算
- 距离剔除和 LOD 系统

### 2. 批次合并
- 按材质和网格合并
- 实例化渲染
- 减少 Draw Call

### 3. 排序优化
- 不透明对象从前到后
- 透明对象从后到前
- 减少状态切换

### 4. 资源管理
- 全局资源池
- 描述符集管理
- 纹理压缩和流式加载

## 扩展性设计

### 1. 自定义渲染管线
可以创建完全自定义的渲染管线:

```typescript
class MyCustomPipeline extends RenderPipeline {
    initialize(info: IRenderPipelineInfo): boolean {
        // 添加自定义的 Flow 和 Stage
        return true;
    }
}
```

### 2. 自定义后处理效果
可以添加自定义后处理:

```typescript
class MyCustomEffect extends PostProcessSetting {
    render(input: Texture): Texture {
        // 自定义后处理逻辑
        return outputTexture;
    }
}
```

### 3. 自定义渲染阶段
可以扩展渲染阶段:

```typescript
class MyCustomStage extends RenderStage {
    render(camera: Camera): void {
        // 自定义渲染逻辑
    }
}
```

## 总结

Rendering 模块是 Cocos Creator 渲染系统的核心,其设计体现了以下核心思想:

1. **三层架构**: Pipeline → Flow → Stage 的清晰分层,实现高度模块化
2. **命令模式**: CommandBuffer 延迟执行,支持优化和批处理
3. **场景剔除**: 多层次剔除策略,大幅减少渲染开销
4. **可扩展性**: 支持自定义渲染管线、流程和阶段
5. **性能优化**: 批次合并、排序优化、资源管理等策略

理解 Rendering 模块的设计理念,对于掌握 Cocos Creator 的渲染流程、实现自定义渲染效果、优化渲染性能都至关重要。Rendering 模块是引擎渲染能力的核心,为上层提供了强大而灵活的渲染框架。

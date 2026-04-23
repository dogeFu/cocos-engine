# Render Graph 模块移除方案（修正版）

> **优先级**: 3 | **预计时间**: 4-5天 | **风险等级**: ⭐⭐⭐⭐ 高
>
> **版本**: v2.1 (实施修订版) | **修正日期**: 2026-04-11
>
> **重要说明**: 本方案已根据实际落地前的二次核对继续修正，重点补齐了运行时控制链和编辑器导出遗漏

### 实施前再次核对结论

- `rendering/custom` 不是纯粹的“高级可选模块”，它还挂在 `Game -> Root -> Director` 的 `customPipeline` 执行分支上。
- `rendering/post-process` 当前运行时实现直接依赖 `custom/pipeline` 的 builder API；如果要移除 RenderGraph，必须同时移除这条运行时后处理链，不能只迁接口。
- `editor/exports/custom-pipeline.ts`、`exports/custom-pipeline.ts`、`cc.config.json` 的 JSB override、`render-config.json` 的 `custom-pipeline` 默认项，都是必须同步清理的遗漏点。
- 为了“不影响 rendering 下正常的 2D/3D 管线”，最终实施策略不是保留 `customPipeline` 空壳，而是彻底切回 legacy pipeline，仅迁出 legacy 仍需的最小类型定义。

---

## 一、模块概述

### 1.1 功能描述

Render Graph（渲染图）是Cocos引擎的高级渲染定制系统，提供：

- 基于图（Graph）的渲染管线定制能力
- 渲染Pass依赖关系管理
- 资源自动生命周期管理
- 自定义渲染流程编排
- Web平台专用管线实现（WebPipeline）
- 序列化和反序列化支持

### 1.2 技术架构

```
Render Graph 系统架构：

┌─────────────────────────────────────────┐
│              Framework                   │
│  (graph.ts, pipeline.ts, executor.ts)   │
├─────────────────────────────────────────┤
│              Compiler                    │
│  (compiler.ts, scene-culling.ts)        │
├─────────────────────────────────────────┤
│            Layout Graph                  │
│  (layout-graph.ts, layout-graph-utils.ts)│
├─────────────────────────────────────────┤
│           Web Pipeline                   │
│  (web-pipeline.ts, web-pipeline-types.ts)│
├─────────────────────────────────────────┤
│         Serialization                    │
│  (archive.ts, binary-archive.ts)        │
├─────────────────────────────────────────┤
│            Utilities                     │
│  (utils.ts, types.ts, define.ts)        │
└─────────────────────────────────────────┘
```

### 1.3 移除理由

根据[核心目标.md](./核心目标.md)，RenderGraph应该被完全删除，原因：

- ✅ 休闲游戏不需要复杂的自定义渲染管线
- ✅ 传统渲染管线（Pipeline → Flow → Stage）已足够
- ✅ RenderGraph增加了引擎复杂度和学习成本
- ✅ 不符合AI友好原则（API过于抽象）
- ✅ 减少约2万行代码和打包体积
- ✅ 大部分项目使用默认渲染管线

---

## 二、代码清单

### 2.1 TypeScript代码（需删除）

**路径**: `cocos/rendering/custom/`

#### 核心框架文件 (7个)

| 文件名         | 行数估算 | 功能说明                       |
| -------------- | -------- | ------------------------------ |
| `index.ts`     | ~50行    | 模块入口，导出公共API          |
| `index.jsb.ts` | ~30行    | 原生绑定入口                   |
| `framework.ts` | ~400行   | 核心框架定义                   |
| `graph.ts`     | ~600行   | 图数据结构和管理               |
| `pipeline.ts`  | ~800行   | **包含接口定义（需特殊处理）** |
| `executor.ts`  | ~500行   | 执行器，负责运行渲染图         |
| `define.ts`    | ~100行   | 常量和配置定义                 |

#### 编译器相关 (3个)

| 文件名                   | 行数估算 | 功能说明     |
| ------------------------ | -------- | ------------ |
| `compiler.ts`            | ~700行   | 渲染图编译器 |
| `scene-culling.ts`       | ~400行   | 场景裁剪逻辑 |
| `layout-graph-editor.ts` | ~300行   | 编辑器集成   |

#### Layout Graph系统 (4个)

| 文件名                  | 行数估算 | 功能说明         |
| ----------------------- | -------- | ---------------- |
| `layout-graph.ts`       | ~500行   | Layout图数据结构 |
| `layout-graph-utils.ts` | ~350行   | Layout工具函数   |
| `layout-graph-names.ts` | ~150行   | 名称管理         |
| `types-names.ts`        | ~100行   | 类型名称映射     |

#### Web Pipeline实现 (4个)

| 文件名                   | 行数估算 | 功能说明                      |
| ------------------------ | -------- | ----------------------------- |
| `web-pipeline.ts`        | ~1200行  | **Web端主实现**（最大文件！） |
| `web-pipeline-types.ts`  | ~300行   | Web管线类型定义               |
| `web-types.ts`           | ~200行   | Web特定类型                   |
| `web-program-library.ts` | ~400行   | 着色器程序库实现              |

#### 序列化系统 (3个)

| 文件名              | 行数估算 | 功能说明       |
| ------------------- | -------- | -------------- |
| `archive.ts`        | ~600行   | 归档/序列化    |
| `binary-archive.ts` | ~800行   | 二进制归档格式 |
| `serialization.ts`  | ~300行   | 序列化工具     |

#### 工具和类型 (4个)

| 文件名            | 行数估算 | 功能说明                                 |
| ----------------- | -------- | ---------------------------------------- |
| `types.ts`        | ~250行   | 核心类型定义                             |
| `utils.ts`        | ~200行   | 通用工具函数                             |
| `private.ts`      | ~150行   | **包含ProgramLibrary接口（需特殊处理）** |
| `effect.ts`       | ~300行   | 效果/着色器管理                          |
| `render-graph.ts` | ~500行   | RenderGraph主类                          |

**总计**: 25个文件，**~10,530行** TypeScript代码

### 2.2 C++原生代码

**✅ 无C++原生代码**

这是一个纯TypeScript实现的模块！这大大降低了移除难度。

---

## 三、关键发现：接口依赖关系（原方案的致命缺陷）

### 3.1 ⚠️ 不能直接删除整个 custom 目录！

**原方案错误假设**：可以直接 `rm -rf cocos/rendering/custom/`

**实际情况**：custom 目录中的 **pipeline.ts** 和 **private.ts** 包含了**传统渲染管线的核心接口定义**：

#### 必须保留/迁移的核心接口

##### ① [PipelineRuntime 接口](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/pipeline.ts#L56-L190)

```typescript
export interface PipelineRuntime {
    activate(swapchain: Swapchain): boolean;
    destroy(): boolean;
    render(cameras: Camera[]): void;
    readonly device: Device;
    readonly macros: MacroRecord;
    readonly globalDSManager: GlobalDSManager;
    // ... 约20个方法和属性
}
```

**被谁使用？**

- [render-pipeline.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/render-pipeline.ts#L118): `class RenderPipeline implements PipelineRuntime`
- **8个传统渲染管线文件**作为类型注解和参数类型

##### ② [BasicPipeline 接口](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/pipeline.ts#L704)

```typescript
export interface BasicPipeline extends PipelineRuntime {
    readonly type: PipelineType;
    readonly capabilities: PipelineCapabilities;
    beginSetup(): void;
    endSetup(): void;
    // ... 约15个方法
}
```

**被谁使用？**

- [base-pass.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/post-process/passes/base-pass.ts#L6): 函数参数类型
- [skin-pass.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/post-process/passes/skin-pass.ts#L28): 函数参数类型

##### ③ [ProgramLibrary 接口](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/private.ts#L41-L73)

```typescript
export interface ProgramLibrary {
    addEffect(effectAsset: EffectAsset): void;
    precompileEffect(device: Device, effectAsset: EffectAsset): void;
    getKey(phaseID: number, programName: string, defines: MacroRecord): string;
    // ... 约12个方法
}
```

**被谁使用？**

- [pass.ts](file:///Users/kay/Git/cocos-engine/cocos/render-scene/core/pass.ts#L44): 类型导入
- [effect-asset.ts](file:///Users/kay/Git/cocos-engine/cocos/asset/assets/effect-asset.ts#L36): 类型导入

##### ④ 相关枚举类型

- `PipelineType` (BASIC, STANDARD)
- `SubpassCapabilities`
- `PipelineCapabilities`

### 3.2 完整的依赖关系图（修正版）

```
                        ┌──────────────┐
                        │    root.ts   │ ◄── 引擎入口
                        │  导入:       │
                        │BasicPipeline │
                        │PipelineRuntime│
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌────────────┐  ┌─────────────┐  ┌──────────────┐
     │ rendering/  │  │   game/     │  │ render-scene/ │
     │ 传统管线   │  │ splash-     │  │ core/         │
     │ (8个文件!)  │  │ screen.ts   │  │ program-lib,  │
     │            │  │             │  │ pass, effect  │
     └─────┬──────┘  └──────┬──────┘  └──────┬───────┘
           │                │               │
           │     PipelineRuntime(接口)       │ ProgramLibrary(接口)
           │     BasicPipeline(接口)         │
           ▼                ▼               ▼
     ┌─────────────────────────────────────────────┐
     │   rendering/custom/pipeline.ts              │
     │   rendering/custom/private.ts              │
     │   (必须保留接口定义！)                       │
     └─────────────────────────────────────────────┘
                              │
                   ┌──────────┼──────────┐
                   ▼          ▼          ▼
              ┌────────┐ ┌────────┐ ┌────────┐
              │ WebPipe│ │Compiler│ │Archive │
              │ line   │ │ 等23个 │ │ 等     │
              │ (可删) │ │ (可删) │ │ (可删) │
              └────────┘ └────────┘ └────────┘
```

---

## 四、推荐策略：接口迁移方案（方案A）

### 4.1 策略概述

**核心思路**：

1. 将核心接口从 `custom/` 迁移到 `rendering/` 或 `render-scene/core/`
2. 更新所有 13 个依赖文件的 import 路径
3. 删除 `custom/` 目录剩余的所有实现代码

**优势**：

- ✅ 彻底移除 RenderGraph 实现
- ✅ 保持传统渲染管线完整可用
- ✅ 代码组织更清晰（接口与实现分离）
- ✅ 符合"完全移除"的目标

**劣势**：

- ⚠️ 需要修改 13 个文件
- ⚠️ 需要仔细验证接口完整性

### 4.2 接口迁移详细计划

#### Step 1: 创建新的接口文件

##### ① 创建 `cocos/rendering/pipeline-types.ts`

从 [custom/pipeline.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/pipeline.ts) 提取以下内容：

```typescript
// 从 pipeline.ts 提取的接口和枚举
export interface PipelineRuntime {
    /* 完整接口 */
}
export enum PipelineType {
    BASIC,
    STANDARD,
}
export enum SubpassCapabilities {
    /* ... */
}
export interface PipelineCapabilities {
    /* ... */
}
export interface BasicPipeline extends PipelineRuntime {
    /* ... */
}
export interface Pipeline extends BasicPipeline {
    /* ... */
}
// 其他相关类型...
```

**保留在原位置的类型**（如果仅被 custom 内部使用）：

- `PipelinePassBuilder`
- `PipelineBuilder`
- 其他内部类型

##### ② 创建 `cocos/render-scene/core/program-library-interface.ts`

从 [custom/private.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/private.ts) 提取：

```typescript
// 从 private.ts 提取的接口
export interface ProgramProxy {
    /* ... */
}
export interface ProgramLibrary {
    /* 完整接口 */
}
```

#### Step 2: 更新所有依赖文件的 import 路径

详见第五章完整清单。

#### Step 3: 清空或删除 custom/ 下的接口文件

**选项 A - 推荐**：清空接口定义，只保留空壳

```typescript
// custom/pipeline.ts - 清空后
// Re-export for backward compatibility (temporary)
export * from "../pipeline-types";

// TODO: 删除此文件在下个版本
```

**选项 B**：直接删除，强制更新所有 import

---

## 五、完整的文件操作清单

### 5.1 需要删除的文件（23个实现文件）

**可直接删除的文件**（无外部依赖）：

```
cocos/rendering/custom/
├── index.ts                          # 入口文件
├── index.jsb.ts                      # JSB绑定
├── framework.ts                      # 框架实现
├── graph.ts                          # 图数据结构
├── executor.ts                       # 执行器
├── define.ts                         # 常量定义
├── compiler.ts                       # 编译器
├── scene-culling.ts                  # 场景裁剪
├── layout-graph-editor.ts            # 编辑器集成
├── layout-graph.ts                   # Layout图
├── layout-graph-utils.ts             # Layout工具
├── layout-graph-names.ts             # 名称管理
├── types-names.ts                    # 类型名称
├── web-pipeline.ts                   # Web管线实现 ★ 最大
├── web-pipeline-types.ts             # Web类型
├── web-types.ts                      # Web特定类型
├── web-program-library.ts            # 着色器库实现
├── archive.ts                        # 归档
├── binary-archive.ts                 # 二进制归档
├── serialization.ts                  # 序列化工具
├── types.ts                          # 类型定义
├── utils.ts                          # 工具函数
├── effect.ts                         # 效果管理
└── render-graph.ts                   # 主类
```

**总计**: 23 个文件（不是25个，因为 pipeline.ts 和 private.ts 需要特殊处理）

### 5.2 需要创建的新文件（2个接口文件）

#### 新文件 1: `cocos/rendering/pipeline-types.ts`

**来源**: 从 [custom/pipeline.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/pipeline.ts) 提取

**包含内容**:

- `PipelineRuntime` 接口 (~135行)
- `BasicPipeline` 接口 (~200+行)
- `Pipeline` 接口 (如果传统管线使用)
- `PipelineType` 枚举
- `SubpassCapabilities` 枚举
- `PipelineCapabilities` 接口
- 所有相关的 type imports

**预估大小**: ~400-500行纯接口定义

#### 新文件 2: `cocos/render-scene/core/program-library-interface.ts`

**来源**: 从 [custom/private.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/private.ts) 提取

**包含内容**:

- `ProgramProxy` 接口
- `ProgramLibrary` 接口
- 相关 type imports

**预估大小**: ~80行

### 5.3 需要修改的文件（13个）⭐ 核心工作

#### 🔴 组A: 传统渲染管线文件（8个）- 高优先级

##### 1. [cocos/rendering/render-pipeline.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/render-pipeline.ts#L49)

**当前导入**:

```typescript
import { PipelineRuntime } from "./custom/pipeline"; // 第49行
```

**修改为**:

```typescript
import { PipelineRuntime } from "./pipeline-types"; // 新路径
```

**影响分析**:

- 第118行: `class RenderPipeline extends Asset implements IPipelineEvent, PipelineRuntime`
- **这是唯一实现了 PipelineRuntime 的类**
- ✅ 只需改 import 路径，无需改动实现

---

##### 2. [cocos/rendering/pipeline-ubo.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/pipeline-ubo.ts#L34)

**当前导入**:

```typescript
import { PipelineRuntime } from "./custom/pipeline"; // 第34行
```

**修改为**:

```typescript
import { PipelineRuntime } from "./pipeline-types";
```

**使用情况** (6处):

- 第102行: `pipeline: PipelineRuntime` 参数
- 第231行: `pipeline: PipelineRuntime` 参数
- 第335行: `updateShadowUBOLightView(pipeline: PipelineRuntime, ...)`
- 第452行: `protected declare _pipeline: PipelineRuntime;`
- 第471行: `activate(device: Device, pipeline: PipelineRuntime)`
- **全部是类型注解，只需改 import**

---

##### 3. [cocos/rendering/render-shadow-map-batched-queue.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/render-shadow-map-batched-queue.ts#L38)

**当前导入**:

```typescript
import { PipelineRuntime } from "./custom/pipeline"; // 第38行
```

**修改为**:

```typescript
import { PipelineRuntime } from "./pipeline-types";
```

**使用情况** (3处):

- 第60行: `private declare _pipeline: PipelineRuntime;`
- 第66行: `constructor(pipeline: PipelineRuntime)`

---

##### 4. [cocos/rendering/render-reflection-probe-queue.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/render-reflection-probe-queue.ts#L34)

**当前导入**:

```typescript
import { PipelineRuntime } from "./custom/pipeline"; // 第34行
```

**修改为**:

```typescript
import { PipelineRuntime } from "./pipeline-types";
```

**使用情况** (3处):

- 第71行: `private declare _pipeline: PipelineRuntime;`
- 第79行: `constructor(pipeline: PipelineRuntime)`

---

##### 5. [cocos/rendering/render-additive-light-queue.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/render-additive-light-queue.ts#L48)

**当前导入**:

```typescript
import { PipelineRuntime } from "./custom/pipeline"; // 第48行
```

**修改为**:

```typescript
import { PipelineRuntime } from "./pipeline-types";
```

**使用情况** (3处):

- 第118行: `private declare _pipeline: PipelineRuntime;`
- 第132行: `constructor(pipeline: PipelineRuntime)`

---

##### 6. [cocos/rendering/planar-shadow-queue.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/planar-shadow-queue.ts#L33)

**当前导入**:

```typescript
import { PipelineRuntime } from "./custom/pipeline"; // 第33行
```

**修改为**:

```typescript
import { PipelineRuntime } from "./pipeline-types";
```

**使用情况** (3处):

- 第58行: `private _pipeline: PipelineRuntime;`
- 第60行: `constructor(pipeline: PipelineRuntime)`

---

##### 7. [cocos/rendering/post-process/passes/base-pass.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/post-process/passes/base-pass.ts#L6)

**当前导入**:

```typescript
import {
    BasicPipeline,
    Pipeline,
    PipelineRuntime,
} from "../../custom/pipeline"; // 第6行
```

**修改为**:

```typescript
import { BasicPipeline, Pipeline, PipelineRuntime } from "../../pipeline-types";
```

**使用情况** (3处):

- 第23行: `getRTFormatBeforeToneMapping(ppl: BasicPipeline)`
- 第27行: `forceEnableFloatOutput(ppl: PipelineRuntime)`
- **注意**: 同时使用了 BasicPipeline 和 PipelineRuntime

---

##### 8. [cocos/rendering/post-process/passes/skin-pass.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/post-process/passes/skin-pass.ts#L28)

**当前导入**:

```typescript
import { BasicPipeline, PipelineRuntime } from "../../custom/pipeline"; // 第28行
```

**修改为**:

```typescript
import { BasicPipeline, PipelineRuntime } from "../../pipeline-types";
```

**使用情况** (5处):

- 第42行: `hasSkinObject(ppl: PipelineRuntime)`
- 第214行: `render(camera: Camera, ppl: BasicPipeline)`
- 第225行: 参数类型
- 第305行: 参数类型

---

#### 🟡 组B: 引擎核心文件（5个）- 中优先级

##### 9. [cocos/root.ts](file:///Users/kay/Git/cocos-engine/cocos/root.ts#L39)

**当前导入**:

```typescript
import { BasicPipeline, PipelineRuntime } from "./rendering/custom/pipeline"; // 第39行
```

**修改为**:

```typescript
import { BasicPipeline, PipelineRuntime } from "./rendering/pipeline-types";
```

**上下文分析**:

- root.ts 是引擎根模块
- 可能用于类型导出或全局注册
- **建议**: 检查是否有 `legacyCC.rendering` 的设置，如果有需一并处理

---

##### 10. [cocos/game/splash-screen.ts](file:///Users/kay/Git/cocos-engine/cocos/game/splash-screen.ts#L37)

**当前导入**:

```typescript
import { PipelineRuntime } from "../rendering/custom"; // 第37行
```

**修改为**:

```typescript
import { PipelineRuntime } from "../rendering/pipeline-types";
```

**上下文分析**:

- 启动画面可能使用 PipelineRuntime 来配置渲染
- **建议**: 读取文件确认具体用途，评估是否可以简化启动画面逻辑

---

##### 11. [cocos/render-scene/core/program-lib.ts](file:///Users/kay/Git/cocos-engine/cocos/render-scene/core/program-lib.ts#L28)

**当前导入**:

```typescript
import { PipelineRuntime } from "../../rendering/custom/pipeline"; // 第28行
```

**修改为**:

```typescript
import { PipelineRuntime } from "../../rendering/pipeline-types";
```

**上下文分析**:

- 着色器程序库
- 使用 PipelineRuntime 作为参数类型
- **只需改 import 路径**

---

##### 12. [cocos/render-scene/core/pass.ts](file:///Users/kay/Git/cocos-engine/cocos/render-scene/core/pass.ts#L44)

**当前导入**:

```typescript
import { ProgramLibrary } from "../../rendering/custom/private"; // 第44行
```

**修改为**:

```typescript
import { ProgramLibrary } from "./program-library-interface";
```

**上下文分析**:

- Pass 实现
- 使用 ProgramLibrary 接口
- **新文件在同一目录下，路径更短**

---

##### 13. [cocos/asset/assets/effect-asset.ts](file:///Users/kay/Git/cocos-engine/cocos/asset/assets/effect-asset.ts#L36)

**当前导入**:

```typescript
import { ProgramLibrary } from "../../rendering/custom/private"; // 第36行
```

**修改为**:

```typescript
import { ProgramLibrary } from "../../render-scene/core/program-library-interface";
```

**上下文分析**:

- 效果资源加载
- 使用 ProgramLibrary 接口
- **跨目录引用，需使用完整相对路径**

---

### 5.4 需要删除的导出/配置文件（3个）

##### 14. [exports/custom-pipeline.ts](file:///Users/kay/Git/cocos-engine/exports/custom-pipeline.ts) ⚠️ **必须删除**

**原因**: 直接引用 `../cocos/rendering/custom` 模块

**当前内容**:

```typescript
import { legacyCC } from "../cocos/core/global-exports";
import * as rendering from "../cocos/rendering/custom";
export { rendering };
legacyCC.rendering = rendering; // ← 全局变量赋值
```

**操作**:

- **选项A（推荐）**: 删除此文件
    - 影响: `legacyCC.rendering` 将变为 undefined
    - 需要检查是否有代码访问此全局变量

- **选项B**: 保留但重定向到传统渲染
    ```typescript
    import { legacyCC } from "../cocos/core/global-exports";
    import * as rendering from "../cocos/rendering";
    export { rendering };
    legacyCC.rendering = rendering;
    ```

##### 15. 评估 [exports/custom-pipeline-post-process.ts](file:///Users/kay/Git/cocos-engine/exports/custom-pipeline-post-process.ts)

**当前内容**:

```typescript
import * as postProcess from "../cocos/rendering/post-process";
export { postProcess };
```

**分析**:

- ✅ 引用的是 `rendering/post-process`，**不是** `rendering/custom`
- ✅ 可以**保留**此文件
- **无需修改**

---

### 5.5 需要更新的配置文件（2个）

##### 16. [cc.config.json](file:///Users/kay/Git/cocos-engine/cc.config.json)

**需要清理的位置**:

**位置1**: 第248-252行 - custom-pipeline 模块定义

```json
"custom-pipeline": {
    "modules": ["custom-pipeline"],
    "dependentAssets": [
        "6a2d0734-bd9e-4ddf-946e-caa52498cb75"
    ]
},
```

**操作**: ❌ **删除整个段落**

**位置2**: 第254-261行 - custom-pipeline-builtin-scripts

```json
"custom-pipeline-builtin-scripts": {
    "modules": [],
    "dependentScripts": [...]
},
```

**操作**: ❌ **删除整个段落**

**位置3**: 第263-283行 - custom-pipeline-post-process

```json
"custom-pipeline-post-process": {
    "modules": ["custom-pipeline-post-process"],
    "dependentAssets":[...],
    "dependentModules": ["custom-pipeline"]
},
```

**操作**:

- 删除 `"dependentModules": ["custom-pipeline"]` 这一行
- 或者如果 post-process 也不要了，删除整个段落

**位置4**: 第332行 - JSB 映射表

```json
"cocos/rendering/custom/index.ts": "cocos/rendering/custom/index.jsb.ts",
```

**操作**: ❌ **删除此行**

---

##### 17. [editor/engine-features/render-config.json](file:///Users/kay/Git/cocos-engine/editor/engine-features/render-config.json)

**位置1**: 第452-458行 - custom-pipeline-post-process 配置

```json
"custom-pipeline-post-process": {
    "default": false,
    "label": "...",
    "description": "...",
    "enginePlugin": false,
    "hidden": true
},
```

**操作**: ❌ **删除整个配置项**

**位置2**: 第459-473行 - render-pipeline.options.custom-pipeline

```json
"render-pipeline": {
    ...
    "options": {
        "custom-pipeline": {
            "default": true,
            "enginePlugin": false
        },
        "legacy-pipeline": {...}
    }
}
```

**操作**:

- 删除 `"custom-pipeline"` 选项
- 设置 `"legacy-pipeline.default": true` （作为默认管线）
- 或者删除整个 options 块（如果只有一个选项）

---

## 六、执行步骤（修正版）

### Phase 0: 接口迁移准备 (2-3小时) ⭐ 新增阶段

- [ ] **Step 0.1: 创建接口文件**

    ```bash
    # 创建 pipeline-types.ts
    touch cocos/rendering/pipeline-types.ts

    # 创建 program-library-interface.ts
    touch cocos/render-scene/core/program-library-interface.ts
    ```

- [ ] **Step 0.2: 提取接口定义**

    从 [custom/pipeline.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/pipeline.ts) 提取到 `pipeline-types.ts`:
    - PipelineRuntime 接口 (第56-190行)
    - PipelineType 枚举 (第197-218行)
    - SubpassCapabilities 枚举 (第237-260行左右)
    - PipelineCapabilities 接口
    - BasicPipeline 接口 (第704行起)
    - Pipeline 接口 (第1525行起，如需要)
    - **所有必需的 type imports**

    从 [custom/private.ts](file:///Users/kay/Git/cocos-engine/cocos/rendering/custom/private.ts) 提取到 `program-library-interface.ts`:
    - ProgramProxy 接口 (第36-39行)
    - ProgramLibrary 接口 (第41-73行)
    - **所有必需的 type imports**

- [ ] **Step 0.3: 验证接口完整性**

    ```bash
    # 编译检查新文件
    npx tsc --noEmit cocos/rendering/pipeline-types.ts
    npx tsc --noEmit cocos/render-scene/core/program-library-interface.ts

    # 确保没有语法错误
    ```

### Phase 1: 准备工作 (1小时)

- [ ] **创建Git分支**

    ```bash
    git checkout -b remove-render-graph-module-v2
    git push origin remove-render-graph-module-v2
    ```

- [ ] **备份当前状态**

    ```bash
    git tag backup-before-render-graph-removal-v2
    ```

- [ ] **全面基线测试**

    ```bash
    npm run build
    npm test
    echo "=== Baseline Test Results ===" > baseline.log
    npm run build >> baseline.log 2>&1
    npm test >> baseline.log 2>&1
    ```

    **确保100%通过后再继续！**

- [ ] **记录当前接口使用情况**

    ```bash
    # 统计 PipelineRuntime 使用次数
    grep -r "PipelineRuntime" --include="*.ts" cocos/ | wc -l

    # 统计 BasicPipeline 使用次数
    grep -r "BasicPipeline" --include="*.ts" cocos/ | wc -l

    # 统计 ProgramLibrary 使用次数
    grep -r "ProgramLibrary" --include="*.ts" cocos/ | wc -l
    ```

### Phase 2: 批量更新 Import 路径 (1-2小时) ⭐ 核心工作

按照第五章的清单，逐个修改 13 个文件的 import 语句。

**推荐执行顺序**（按依赖关系）：

#### 2.1 先修改组A（传统渲染管线8个文件）

```bash
# 使用 sed 或手动编辑，批量替换
# 示例：render-pipeline.ts
sed -i '' "s|from './custom/pipeline'|from './pipeline-types'|g" \
    cocos/rendering/render-pipeline.ts

# pipeline-ubo.ts
sed -i '' "s|from './custom/pipeline'|from './pipeline-types'|g" \
    cocos/rendering/pipeline-ubo.ts

# 其他6个文件类似...
```

**验证每个文件**:

```bash
# 修改后立即编译检查
npx tsc --noEmit --strict cocos/rendering/render-pipeline.ts
```

#### 2.2 再修改组B（引擎核心5个文件）

```bash
# root.ts
sed -i '' "s|from './rendering/custom/pipeline'|from './rendering/pipeline-types'|g" \
    cocos/root.ts

# splash-screen.ts
sed -i '' "s|from '../rendering/custom'|from '../rendering/pipeline-types'|g" \
    cocos/game/splash-screen.ts

# program-lib.ts
sed -i '' "s|from '../../rendering/custom/pipeline'|from '../../rendering/pipeline-types'|g" \
    cocos/render-scene/core/program-lib.ts

# pass.ts
sed -i '' "s|from '../../rendering/custom/private'|from './program-library-interface'|g" \
    cocos/render-scene/core/pass.ts

# effect-asset.ts
sed -i '' "s|from '../../rendering/custom/private'|from '../../render-scene/core/program-library-interface'|g" \
    cocos/asset/assets/effect-asset.ts
```

### Phase 3: 删除实现代码 (15分钟)

- [ ] **删除23个实现文件**

    ```bash
    cd cocos/rendering/custom/

    # 删除所有文件除了 pipeline.ts 和 private.ts（稍后处理）
    rm -f \
      index.ts index.jsb.ts framework.ts graph.ts executor.ts define.ts \
      compiler.ts scene-culling.ts layout-graph-editor.ts \
      layout-graph.ts layout-graph-utils.ts layout-graph-names.ts types-names.ts \
      web-pipeline.ts web-pipeline-types.ts web-types.ts web-program-library.ts \
      archive.ts binary-archive.ts serialization.ts \
      types.ts utils.ts effect.ts render-graph.ts
    ```

- [ ] **处理 pipeline.ts 和 private.ts**

    **选项A - 清空并重定向（推荐）**:

    ```typescript
    // custom/pipeline.ts - 保留为重定向文件
    /**
     * @deprecated This file is deprecated.
     * All interfaces have been moved to ../pipeline-types
     */
    export * from "../pipeline-types";
    ```

    ```typescript
    // custom/private.ts - 保留为重定向文件
    /**
     * @deprecated This file is deprecated.
     * All interfaces have been moved to ../../render-scene/core/program-library-interface
     */
    export * from "../../render-scene/core/program-library-interface";
    ```

    **选项B - 直接删除**:

    ```bash
    rm -f pipeline.ts private.ts
    # 注意：如果有遗漏的 import 会报错
    ```

- [ ] **删除导出文件**
    ```bash
    rm -f exports/custom-pipeline.ts
    ```

### Phase 4: 更新配置文件 (30分钟)

- [ ] **更新 cc.config.json**

    手动编辑或使用脚本删除第5.5节标记的所有位置。

    **建议**: 先备份，再编辑

    ```bash
    cp cc.config.json cc.config.json.backup
    # 手动编辑...
    ```

- [ ] **更新 render-config.json**

    ```bash
    cp editor/engine-features/render-config.json editor/engine-features/render-config.json.backup
    # 手动编辑...
    ```

- [ ] **处理 legacyCC.rendering 全局变量**

    如果选择了删除 `exports/custom-pipeline.ts`：

    **搜索是否有代码使用它**:

    ```bash
    grep -r "legacyCC.rendering\|cc.rendering" --include="*.ts" cocos/ native/
    ```

    如果有使用：
    - **选项1**: 设置为 undefined 并添加注释
    - **选项2**: 重定向到传统渲染模块

### Phase 5: 编译验证 (2-3小时)

- [ ] **第一次编译尝试**

    ```bash
    npm run build 2>&1 | tee build-log-1.txt
    ```

    **预期**: 可能有错误（正常现象）

    **常见错误及解决方案**:

    #### 错误1: 找不到模块

    ```
    Error: Cannot find module './custom/pipeline' or its type declarations
    ```

    **解决**: 还有文件漏改，回到 Phase 2 继续搜索

    ```bash
    grep -r "from.*custom/pipeline\|from.*custom/private" --include="*.ts" cocos/
    ```

    #### 错误2: 类型不存在

    ```
    Error: TS2304: Cannot find name 'PipelineRuntime'.
    ```

    **解决**:
    - 检查 pipeline-types.ts 是否完整导出了该接口
    - 检查 import 路径是否正确

    #### 错误3: 属性缺失

    ```
    Error: TS2339: Property 'xxx' does not exist on type 'PipelineRuntime'.
    ```

    **解决**:
    - 接口定义不完整
    - 对比原始 custom/pipeline.ts，补充缺失的属性/方法

- [ ] **迭代修复循环**

    ```bash
    # 循环直到编译成功
    while ! npm run build 2>&1 | tee -q build-latest.log; do
        # 分析 build-latest.log
        # 修复问题
        # 重新尝试
        echo "=== Fix attempt $(date) ==="
    done
    ```

    **预计循环次数**: 3-5次

- [ ] **最终编译成功**

    ```bash
    npm run build
    # ✅ 成功！
    ```

- [ ] **类型检查**
    ```bash
    npx tsc --noEmit
    # ✅ 无错误
    ```

### Phase 6: 运行测试 (1小时)

- [ ] **运行完整测试套件**

    ```bash
    npm test 2>&1 | tee test-results.txt
    ```

    **预期结果**: 所有现有测试通过

    **如果测试失败**:

    | 失败模式          | 原因                   | 解决方案               |
    | ----------------- | ---------------------- | ---------------------- |
    | 渲染相关测试失败  | 接口迁移不完整         | 检查 pipeline-types.ts |
    | 场景加载失败      | 缺少必要属性           | 补充接口定义           |
    | 初始化失败        | root.ts 或 config 问题 | 回滚相关修改           |
    | legacyCC 相关错误 | 全局变量未处理         | 补充兼容代码           |

- [ ] **专项验证测试**

    ```typescript
    // tests/render-graph-removal-verification.test.ts
    describe("Render Graph Removal Verification", () => {
        describe("Interface Migration", () => {
            test("PipelineRuntime should be accessible from new location", () => {
                const {
                    PipelineRuntime,
                } = require("../cocos/rendering/pipeline-types");
                expect(PipelineRuntime).toBeDefined();
                expect(typeof PipelineRuntime).toBe("object"); // interface
            });

            test("BasicPipeline should extend PipelineRuntime", () => {
                const {
                    BasicPipeline,
                    PipelineRuntime,
                } = require("../cocos/rendering/pipeline-types");
                expect(BasicPipeline).toBeDefined();
                // 验证继承关系（如果可测试）
            });

            test("ProgramLibrary should be accessible", () => {
                const {
                    ProgramLibrary,
                } = require("../cocos/render-scene/core/program-library-interface");
                expect(ProgramLibrary).toBeDefined();
            });
        });

        describe("No Custom Implementation", () => {
            test("WebPipeline should not exist", () => {
                try {
                    const custom = require("../cocos/rendering/custom");
                    expect(custom.WebPipeline).toBeUndefined();
                } catch (e) {
                    expect(e.message).toContain("Cannot find module");
                }
            });

            test("RenderGraph class should not exist", () => {
                try {
                    const custom = require("../cocos/rendering/custom");
                    expect(custom.RenderGraph).toBeUndefined();
                } catch (e) {
                    expect(e.message).toContain("Cannot find module");
                }
            });
        });

        describe("Traditional Pipeline Works", () => {
            test("RenderPipeline should implement PipelineRuntime", () => {
                const {
                    RenderPipeline,
                } = require("../cocos/rendering/render-pipeline");
                const {
                    PipelineRuntime,
                } = require("../cocos/rendering/pipeline-types");
                expect(RenderPipeline).toBeDefined();
                // 验证实现关系
            });

            test("Rendering queues should work", () => {
                const {
                    RenderShadowMapBatchedQueue,
                } = require("../cocos/rendering/render-shadow-map-batched-queue");
                expect(RenderShadowMapBatchedQueue).toBeDefined();
            });
        });

        describe("No Residual References", () => {
            test("No files should import from rendering/custom (except re-exports)", async () => {
                const { execSync } = require("child_process");
                const result = execSync(
                    'grep -r "from.*rendering/custom" --include="*.ts" cocos/ | grep -v "node_modules"',
                    { encoding: "utf-8" },
                ).trim();

                // 允许重定向文件存在
                const allowedFiles = [
                    "custom/pipeline.ts",
                    "custom/private.ts",
                ];
                const lines = result
                    .split("\n")
                    .filter(
                        (line) =>
                            !allowedFiles.some((file) => line.includes(file)),
                    );

                expect(lines.length).toBe(0);
            });
        });
    });
    ```

    ```bash
    npx jest tests/render-graph-removal-verification.test.ts
    ```

### Phase 7: 功能验证 (2小时)

- [ ] **创建多个验证场景**

    #### 测试1: 空2D场景

    ```typescript
    // tests/scenes/empty-2d.scene
    // 加载并运行，确认不崩溃
    ```

    #### 测试2: 带3D对象的场景

    ```typescript
    // 包含MeshRenderer、Camera、Light
    // 确认传统管线能正确渲染
    ```

    #### 测试3: UI场景

    ```typescript
    // 包含Button、Label、ScrollView等UI组件
    ```

    #### 测试4: 后处理场景

    ```typescript
    // 包含Bloom、FXAA等后处理效果
    // 验证 base-pass.ts 和 skin-pass.ts 正常工作
    ```

- [ ] **手动测试清单**
    - [ ] 引擎启动时间 < 3秒
    - [ ] 首帧渲染时间 < 100ms
    - [ ] 连续渲染60帧无崩溃
    - [ ] 内存占用稳定（无明显泄漏）
    - [ ] 控制台无错误/警告
    - [ ] 后处理效果正常显示（验证 BasicPipeline 接口）
    - [ ] 阴影渲染正常（验证各种 Queue 类）
    - [ ] 着色器编译和切换正常（验证 ProgramLibrary 接口）

- [ ] **性能基准对比**

    ```javascript
    const metrics = {
        startupTime: performance.now() - startTime,
        firstFrameTime: firstFrameDuration,
        memoryUsage: performance.memory.usedJSHeapSize,
        drawCalls: stats.drawCalls,
    };
    console.table(metrics);
    ```

    与基线数据对比，不应有明显退化。

### Phase 8: 边界情况和兼容性 (1小时)

- [ ] **测试旧项目兼容性**

    如果有使用Render Graph的旧项目：
    1. 尝试编译旧项目
    2. 记录编译错误
    3. 整理成迁移指南

- [ ] **测试编辑器功能** (如果适用)
    - 打开编辑器
    - 确认不再显示"Custom Pipeline"选项
    - 确认传统管线设置面板正常工作
    - 确认 render-config.json 配置生效

- [ ] **测试多平台编译**

    ```bash
    # Web
    npm run build:h5

    # 小游戏平台（如果有配置）
    npm run build:wechat
    npm run build:bytedance

    # 原生平台（如果有JSB绑定）
    npm run build:native
    ```

- [ ] **验证 JSB 绑定**

    检查 cc.config.json 中的 JSB 映射表是否已清理：

    ```bash
    grep "rendering/custom" cc.config.json
    # 应返回空结果
    ```

### Phase 9: 最终清理 (30分钟)

- [ ] **决定是否删除重定向文件**

    如果 Phase 3 选择了选项A（保留重定向文件）：

    **现在可以选择**:
    - **保留**: 为第三方库提供向后兼容（推荐第一个版本）
    - **删除**: 强制所有代码使用新路径（更干净）

    如果选择删除：

    ```bash
    # 再次全局搜索确认没有遗漏
    grep -r "from.*custom/pipeline\|from.*custom/private" --include="*.ts" cocos/

    # 如果确实没有了
    rm -f cocos/rendering/custom/pipeline.ts cocos/rendering/custom/private.ts
    rmdir cocos/rendering/custom/  # 删除空目录
    ```

- [ ] **更新核心目标文档**

    在[核心目标.md](./核心目标.md)中标记：

    ```markdown
    #### 2.3 删除RenderGraph模块（4-5天）✅ 已完成

    - 完成日期: 2026-04-XX
    - 删除代码量: ~10,000行TS (23个实现文件)
    - 接口迁移: 2个新文件 (pipeline-types.ts, program-library-interface.ts)
    - 修改文件数: 13个 + 2个配置文件 + 1个导出文件
    - 测试结果: 全部通过
    - 性能影响: 无明显变化
    - 采用策略: 接口迁移方案（方案A）
    ```

- [ ] **编写迁移指南**

    创建 `docs/migration/from-render-graph.md`:

    ```markdown
    # 从RenderGraph迁移到传统管线

    ## 为什么删除RenderGraph？

    - 休闲游戏不需要复杂的自定义渲染管线
    - 传统管线已足够强大
    - 降低引擎复杂度和学习成本

    ## 接口变更

    ### PipelineRuntime 接口

    **旧路径**: `import { PipelineRuntime } from 'cc/rendering/custom'`
    **新路径**: `import { PipelineRuntime } from 'cc/rendering/pipeline-types'`

    ### BasicPipeline 接口

    **旧路径**: `import { BasicPipeline } from 'cc/rendering/custom'`
    **新路径**: `import { BasicPipeline } from 'cc/rendering/pipeline-types'`

    ### ProgramLibrary 接口

    **旧路径**: `import { ProgramLibrary } from 'cc/rendering/custom/private'`
    **新路径**: `import { ProgramLibrary } from 'cc/render-scene/core/program-library-interface'`

    ## 不再支持的功能

    以下API已完全删除且无替代：

    - WebPipeline 类
    - RenderGraph 类
    - 自定义渲染管线构建器
    - 渲染图序列化/反序列化
    - LayoutGraph 系统

    ## 如何迁移？

    ### 场景1: 使用了WebPipeline

    // 旧代码
    import { WebPipeline, RenderGraph } from 'cc';
    const graph = new RenderGraph();
    const pipeline = new WebPipeline(graph);

    // 新代码
    import { Pipeline } from 'cc';
    const pipeline = new Pipeline();
    // 使用内置的前向/延迟渲染管线

    ### 场景2: 自定义PostProcess

    // 旧代码
    const pass = graph.addRenderPass('custom-pass');

    // 新代码
    // 使用 Camera.targetTexture + RenderTexture 方式
    const rt = new RenderTexture();
    camera.targetTexture = rt;

    ### 场景3: 访问 legacyCC.rendering

    // 旧代码
    const rendering = legacyCC.rendering;

    // 新代码
    // 此全局变量已被移除或重定向
    // 请使用具体的模块导入
    ```

- [ ] **提交代码**

    ```bash
    git add .
    git commit -m "refactor: remove RenderGraph module and migrate core interfaces

    BREAKING CHANGE: Custom rendering pipeline system removed

    Interface migration (backward compatible):
    - PipelineRuntime, BasicPipeline, Pipeline interfaces moved to
      cocos/rendering/pipeline-types.ts
    - ProgramLibrary interface moved to
      cocos/render-scene/core/program-library-interface.ts

    Deleted implementation files (cocos/rendering/custom/):
    - Core framework (graph, pipeline impl, executor, framework)
    - Compiler (compiler, scene-culling, layout-graph-editor)
    - Layout system (layout-graph, utils, names)
    - Web implementation (web-pipeline, web-types, program-library)
    - Serialization (archive, binary-archive, serialization)
    - Utilities (types, utils, effect, render-graph)
    Total: 23 files, ~10,000 lines TypeScript

    Modified files (13 source files):
    - cocos/rendering/*.ts (8 files) - updated import paths
    - cocos/root.ts - updated import path
    - cocos/game/splash-screen.ts - updated import path
    - cocos/render-scene/core/*.ts (3 files) - updated import paths
    - cocos/asset/assets/effect-asset.ts - updated import path

    Configuration updates:
    - Removed exports/custom-pipeline.ts
    - Cleaned cc.config.json (removed custom-pipeline configs)
    - Updated editor/engine-features/render-config.json

    Reasoning:
    - Casual games don't need customizable render pipelines
    - Traditional pipeline (forward/deferred) is sufficient
    - Reduces engine complexity by ~10K lines
    - Improves AI-friendliness (simpler APIs)
    - Reduces bundle size significantly

    Migration guide: See docs/migration/from-render-graph.md

    Testing:
    - All existing unit tests pass
    - Traditional pipeline works correctly
    - Interface compatibility verified
    - 2D/3D scenes render properly
    - Post-processing effects work (BasicPipeline interface)
    - Shadow rendering works (PipelineRuntime in queues)
    - Shader compilation works (ProgramLibrary interface)
    - No performance regression

    See: litePlan/核心目标.md"
    ```

- [ ] **创建Release Notes条目**

    ```markdown
    ## Breaking Changes in v3.x

    ### Removed: Render Graph System

    The custom rendering pipeline system has been completely removed.

    **Interface Migration** (for engine developers):

    - PipelineRuntime interface: `rendering/custom/pipeline` → `rendering/pipeline-types`
    - BasicPipeline interface: `rendering/custom/pipeline` → `rendering/pipeline-types`
    - ProgramLibrary interface: `rendering/custom/private` → `render-scene/core/program-library-interface`

    **Deleted APIs** (no replacement):

    - WebPipeline
    - RenderGraph
    - Custom pipeline builder system
    - Render graph serialization

    Use the built-in forward/deferred pipelines instead.

    See migration guide for details.
    ```

---

## 七、风险评估（修正版）

### 7.1 技术风险矩阵

| 风险项                         | 概率   | 影响     | 严重程度    | 应对措施                                 |
| ------------------------------ | ------ | -------- | ----------- | ---------------------------------------- |
| **接口定义不完整导致编译失败** | **高** | **极高** | **🔴 极高** | **Phase 0.3 严格验证；Phase 5 迭代修复** |
| **Import 路径修改遗漏**        | 高     | 高       | 🔴 高       | Phase 6 专项测试全覆盖搜索               |
| **传统管线功能回归**           | 中     | 极高     | 🔴 极高     | Phase 7 全面功能测试                     |
| **legacyCC.rendering 未处理**  | 中     | 中       | 🟡 中       | Phase 4 全局搜索 + 兼容处理              |
| **配置文件清理不完整**         | 中     | 中       | 🟡 中       | Phase 5 多轮编译验证                     |
| **性能下降**                   | 低     | 高       | 🟠 中高     | Phase 7 性能基准对比                     |
| **第三方库兼容性破坏**         | 中     | 高       | 🔴 高       | 提供迁移文档 + 向后兼容重定向            |
| **JSB 绑定问题**               | 低     | 极高     | 🔴 高       | Phase 8 多平台测试                       |

### 7.2 最高风险项详细应对

#### 风险1: 接口定义不完整（新增最高优先级风险）

**预防措施**:

```bash
# 1. 提取接口时严格对照原始文件
diff -u cocos/rendering/custom/pipeline.ts cocos/rendering/pipeline-types.ts
# 确保所有 export interface/enum 都已迁移

# 2. 使用 TypeScript 编译器验证
npx tsc --noEmit --strict cocos/rendering/pipeline-types.ts

# 3. 搜索所有使用处确保覆盖
grep -rn "PipelineRuntime\." --include="*.ts" cocos/rendering/
# 检查每个属性/方法是否在新接口中定义
```

**检测方法**:

```bash
# 编译后检查错误类型
npm run build 2>&1 | grep -E "TS2339|TS2304|TS2305"
# 这些错误码通常表示类型/属性缺失
```

**应急方案**:
如果发现接口不完整：

1. 立即停止其他工作
2. 对照原始文件补全缺失的定义
3. 重新编译验证
4. 不要跳过任何属性或方法签名

---

#### 风险2: Import 路径遗漏（原方案的主要缺陷）

**预防措施**:

```bash
# Phase 2 完成后执行全面搜索
find cocos/ -name "*.ts" -not -path "*node_modules*" \
    -exec grep -l "from.*custom/\(pipeline\|private\)" {} \;

# 应返回空结果（或者只有重定向文件本身）
```

**分批验证策略**:

```bash
# 验证组A（8个文件）
for file in render-pipeline.ts pipeline-ubo.ts render-shadow-map-batched-queue.ts \
            render-reflection-probe-queue.ts render-additive-light-queue.ts \
            planar-shadow-queue.ts; do
    echo "Checking $file..."
    grep "from.*custom/pipeline" cocos/rendering/$file || echo "✅ OK"
done

# 验证组B（5个文件）
for file in root.ts splash-screen.ts program-lib.ts pass.ts effect-asset.ts; do
    echo "Checking $file..."
    grep "from.*custom/" cocos/$file cocos/game/$file cocos/render-scene/core/$file \
          cocos/asset/assets/$file 2>/dev/null || echo "✅ OK"
done
```

---

#### 风险3: 传统管线功能回归

**重点测试场景**:

1. **基本渲染流程**
    - 2D Sprite 渲染
    - 3D MeshRenderer 渲染
    - UI 渲染

2. **高级特性**（依赖迁移的接口）
    - **阴影渲染** (PipelineRuntime 在 Queue 类中使用)
        - 平面阴影
        - 阴影贴图批处理
        - 反射探针
    - **后处理** (BasicPipeline 在 Pass 类中使用)
        - 基础后处理通道
        - 皮肤渲染通道
    - **着色器管理** (ProgramLibrary)
        - Effect 资源加载
        - 着色器变体编译

3. **管线生命周期**
    - activate / destroy
    - render() 调用
    - 宏管理 (setMacro*, getMacro*)

---

### 7.3 回滚方案

#### 完全回滚 (10分钟内)

```bash
# 方法1: Git revert
git revert HEAD

# 方法2: 切换到备份标签
git checkout backup-before-render-graph-removal-v2

# 方法3: 手动恢复所有修改
git checkout HEAD~1 -- \
    cocos/rendering/ \
    cocos/root.ts \
    cocos/game/splash-screen.ts \
    cocos/render-scene/core/program-lib.ts \
    cocos/render-scene/core/pass.ts \
    cocos/asset/assets/effect-asset.ts \
    exports/custom-pipeline.ts \
    cc.config.json \
    editor/engine-features/render-config.json
```

#### 部分回滚（按阶段回退）

**只回退接口迁移**:

```bash
git checkout HEAD~1 -- cocos/rendering/pipeline-types.ts
git checkout HEAD~1 -- cocos/render-scene/core/program-library-interface.ts
git checkout HEAD~1 -- cocos/rendering/*.ts  # 恢复所有 import
```

**只回退配置文件**:

```bash
git checkout HEAD~1 -- cc.config.json
git checkout HEAD~1 -- editor/engine-features/render-config.json
git checkout HEAD~1 -- exports/custom-pipeline.ts
```

---

## 八、成功标准（修正版）

### 8.1 必须满足 (Hard Requirements)

- [x] **编译成功**
    - `npm run build` 通过
    - `npx tsc --noEmit` 无错误
    - 无"Cannot find module"、"Property does not exist"相关错误

- [x] **测试全部通过**
    - `npm test` 100%通过
    - 无回归性测试失败
    - 新增的验证测试通过（特别是接口迁移测试）

- [x] **核心功能正常**
    - ✅ 引擎可正常初始化
    - ✅ 传统渲染管线工作正常（前向/延迟渲染）
    - ✅ RenderPipeline 正确实现 PipelineRuntime 接口
    - ✅ 2D游戏可以正常运行
    - ✅ 3D场景可以正常渲染（使用传统管线）
    - ✅ UI系统正常工作
    - ✅ 动画系统正常工作
    - ✅ **阴影系统正常工作**（验证 PipelineRuntime 在 Queue 中的使用）
    - ✅ **后处理效果正常**（验证 BasicPipeline 在 Pass 中的使用）
    - ✅ **着色器系统正常**（验证 ProgramLibrary 接口）

- [x] **接口迁移完整性**

    ```bash
    # 验证新接口文件存在且有内容
    test -f cocos/rendering/pipeline-types.ts && echo "✅ pipeline-types.ts exists"
    test -f cocos/render-scene/core/program-library-interface.ts && echo "✅ program-library-interface.ts exists"

    # 验证接口导出完整
    grep -c "export interface\|export enum" cocos/rendering/pipeline-types.ts
    # 应该 > 5 (至少 PipelineRuntime, BasicPipeline, Pipeline, PipelineType, ...)

    grep -c "export interface" cocos/render-scene/core/program-library-interface.ts
    # 应该 >= 2 (ProgramProxy, ProgramLibrary)
    ```

- [x] **无残留引用（实现代码）**

    ```bash
    # 执行此命令应返回空结果（允许重定向文件）
    find cocos/ -name "*.ts" -not -path "*node_modules*" \
        -exec grep -l "from.*rendering/custom" {} \; \
        | grep -v "custom/pipeline.ts$\|custom/private.ts$"

    # 应返回空结果
    ```

- [x] **配置文件已清理**

    ```bash
    # cc.config.json 不应包含 custom-pipeline 模块定义
    grep '"custom-pipeline"' cc.config.json
    # 应返回空结果（或只有注释）

    # render-config.json 不应有 custom-pipeline 选项
    grep '"custom-pipeline"' editor/engine-features/render-config.json
    # 应返回空结果
    ```

### 8.2 期望达到 (Soft Goals)

- [ ] **性能指标**
    - 启动时间不超过基线的110%
    - 首帧渲染时间不超过基线的120%
    - 内存占用减少（因为少了~10K行实现代码）
    - **接口迁移不应引入性能开销**（只是类型定义移动）

- [ ] **代码质量**
    - 无新增TODO/FIXME/HACK注释
    - 修改的代码符合项目编码规范
    - 新接口文件有完整的 JSDoc 注释
    - 删除后的代码无孤立的死代码

- [ ] **向后兼容性**
    - 如果保留了重定向文件，旧代码仍可编译（带 deprecation 警告）
    - 迁移文档清晰完整
    - API 变更通知清晰

### 8.3 量化指标

| 指标               | 删除前 | 删除后          | 变化                   |
| ------------------ | ------ | --------------- | ---------------------- |
| TypeScript文件总数 | X      | X-23+2          | -21 (净减少)           |
| 代码总行数         | Y      | Y-10000+500     | -9,500 (净减少)        |
| 接口文件           | 0      | 2               | +2 (新增)              |
| 实现文件           | 25     | 2 (重定向) 或 0 | -23 或 -25             |
| 修改文件数         | 0      | 13+2+1          | +16                    |
| 打包体积 (估计)    | Z KB   | Z-50 KB         | ~-50KB                 |
| 编译时间           | A sec  | A-3 sec         | ~-3sec (少了实现代码)  |
| npm test通过率     | 100%   | 100%            | 无变化                 |
| 接口覆盖率         | N/A    | 100%            | 所有使用的接口都已迁移 |

---

## 九、后续影响

### 9.1 对开发者的影响

#### 不再支持的功能

1. **自定义渲染管线**

    ```typescript
    // ❌ 不再支持
    const pipeline = new WebPipeline(pipelineAsset);
    ```

2. **Render Graph编程模型**

    ```typescript
    // ❌ 不再支持
    const graph = new RenderGraph();
    const pass = graph.addRenderPass("main-pass");
    ```

3. **高级渲染定制**
    - 自定义Pass排序
    - 资源依赖自动管理
    - 渲染图序列化/反序列化
    - Layout Graph 编辑器集成

#### 接口路径变更（仅影响引擎开发者）

```typescript
// PipelineRuntime 接口
// 旧: import { PipelineRuntime } from 'cc/rendering/custom'
// 新: import { PipelineRuntime } from 'cc/rendering/pipeline-types'

// BasicPipeline 接口
// 旧: import { BasicPipeline } from 'cc/rendering/custom'
// 新: import { BasicPipeline } from 'cc/rendering/pipeline-types'

// ProgramLibrary 接口
// 旧: import { ProgramLibrary } from 'cc/rendering/custom/private'
// 新: import { ProgramLibrary } from 'cc/render-scene/core/program-library-interface'
```

#### 仍然支持的功能 ✅

1. **传统前向渲染管线** (推荐)
2. **内置后处理效果** (Bloom, HDR, FXAA等)
3. **材质/着色器定制**
4. **渲染顺序控制** (通过Layer)
5. **Camera定制** (viewport, scissor等)
6. **阴影系统** (平面阴影、阴影贴图、反射探针)
7. **着色器变体系统** (通过 ProgramLibrary 接口)

### 9.2 对引擎架构的影响

**正面影响**:

- 渲染模块复杂度降低50%（移除实现，保留接口）
- 接口与实现分离，架构更清晰
- 更易理解和维护
- AI友好度提升（更简单的API表面）
- 打包体积显著减小
- **传统渲染管线完全不受影响**

**潜在负面影响**:

- 失去高级渲染定制能力
- 特殊视觉效果需要更多手动实现
- 对追求画质的高端游戏不太友好（但不在目标用户范围内）
- **增加了接口文件的维护责任**（需要保持接口稳定性）

### 9.3 替代方案

对于需要高级渲染功能的开发者：

#### 方案1: 使用传统管线 + 后处理 (推荐)

```typescript
// 传统管线已经足够强大
import { Pipeline, PostProcess } from "cc";

const pipeline = new Pipeline();
pipeline.addPostProcess(new BloomEffect());
pipeline.addPostProcess(new FXAAEffect());
```

#### 方案2: 修改引擎源码 (高级用户)

对于特殊需求，可以直接修改传统管线的源码：

- `cocos/rendering/pipeline-types.ts` (扩展接口)
- `cocos/rendering/render-pipeline.ts` (修改实现)
- `cocos/rendering/` 中的渲染逻辑

#### 方案3: 等待社区插件

可能会有社区成员开发基于传统管线的渲染插件。

### 9.4 API变更通知

#### 完全删除的API（无替代）

```typescript
namespace cc {
    // Render Graph核心
    class RenderGraph {} // 删除
    class RenderPass {} // 删除
    class RenderQueue {} // 删除

    // Web Pipeline
    class WebPipeline {} // 删除
    interface IWebPipelineTypes {} // 删除

    // Custom Pipeline框架（实现部分）
    class RenderingCustom {} // 删除（如果存在具体类）

    // Serialization
    class PipelineArchive {} // 删除
    class BinaryArchive {} // 删除

    // Layout Graph
    class LayoutGraph {} // 删除
}
```

#### 接口迁移（路径变更）

```typescript
namespace cc {
    // 以下接口保留，但导入路径变更

    // 从 rendering/custom 迁移到 rendering/pipeline-types
    interface PipelineRuntime {} // 保留，路径变更
    interface BasicPipeline {} // 保留，路径变更
    interface Pipeline {} // 保留，路径变更（如使用）
    enum PipelineType {} // 保留，路径变更
    enum SubpassCapabilities {} // 保留，路径变更

    // 从 rendering/custom/private 迁移到 render-scene/core
    interface ProgramLibrary {} // 保留，路径变更
    interface ProgramProxy {} // 保留，路径变更
}
```

#### 迁移示例

**示例1: 接口路径迁移**

```typescript
// ===== 旧路径 =====
import { PipelineRuntime, BasicPipeline } from "cc/rendering/custom";
import { ProgramLibrary } from "cc/rendering/custom/private";

// ===== 新路径 =====
import { PipelineRuntime, BasicPipeline } from "cc/rendering/pipeline-types";
import { ProgramLibrary } from "cc/render-scene/core/program-library-interface";
```

**示例2: 从WebPipeline迁移到传统Pipeline**

```typescript
// ===== 旧代码 (Render Graph) =====
import { WebPipeline, RenderGraph } from "cc";

const graph = new RenderGraph();
const pipeline = new WebPipeline(graph);
this._pipeline = pipeline;

// ===== 新代码 (传统管线) =====
import { Pipeline } from "cc";

const pipeline = new Pipeline();
this._pipeline = pipeline;
```

**示例3: 自定义RenderPass迁移**

```typescript
// ===== 旧代码 =====
const pass = graph.addRenderPass("custom-pass");
pass.addRenderTarget(colorTexture);
pass.setExecute((view) => {
    // 自定义渲染逻辑
});

// ===== 新代码 =====
// 使用传统的 Camera + RenderTexture 方式
const rt = new RenderTexture();
camera.targetTexture = rt;
camera.visibility = 0xffffffff;
// 在update中处理
```

---

## 十、附录

### A. 完整文件操作清单

#### 删除清单 (23个实现文件)

```
cocos/rendering/custom/
├── index.ts                          ❌ DELETE
├── index.jsb.ts                      ❌ DELETE
├── framework.ts                      ❌ DELETE
├── graph.ts                          ❌ DELETE
├── executor.ts                       ❌ DELETE
├── define.ts                         ❌ DELETE
├── compiler.ts                       ❌ DELETE
├── scene-culling.ts                  ❌ DELETE
├── layout-graph-editor.ts            ❌ DELETE
├── layout-graph.ts                   ❌ DELETE
├── layout-graph-utils.ts             ❌ DELETE
├── layout-graph-names.ts             ❌ DELETE
├── types-names.ts                    ❌ DELETE
├── web-pipeline.ts                   ❌ DELETE (最大文件 ~1200行)
├── web-pipeline-types.ts             ❌ DELETE
├── web-types.ts                      ❌ DELETE
├── web-program-library.ts            ❌ DELETE
├── archive.ts                        ❌ DELETE
├── binary-archive.ts                 ❌ DELETE
├── serialization.ts                  ❌ DELETE
├── types.ts                          ❌ DELETE
├── utils.ts                          ❌ DELETE
├── effect.ts                         ❌ DELETE
└── render-graph.ts                   ❌ DELETE

总计: 23 个文件, ~10,000 行实现代码
```

#### 特殊处理文件 (2个)

```
cocos/rendering/custom/
├── pipeline.ts                       ⚠️ 清空或转为重定向
└── private.ts                        ⚠️ 清空或转为重定向
```

#### 新建文件 (2个接口文件)

```
cocos/rendering/
└── pipeline-types.ts                 ✅ CREATE (新)
    ├── PipelineRuntime interface (~135行)
    ├── BasicPipeline interface (~200行)
    ├── Pipeline interface (可选)
    ├── PipelineType enum
    ├── SubpassCapabilities enum
    ├── PipelineCapabilities interface
    └── 相关类型定义

cocos/render-scene/core/
└── program-library-interface.ts      ✅ CREATE (新)
    ├── ProgramProxy interface
    └── ProgramLibrary interface
```

#### 修改文件 (13个源文件)

```
组A: 传统渲染管线 (8个文件)
├── cocos/rendering/render-pipeline.ts           ✅ MODIFY (import path)
├── cocos/rendering/pipeline-ubo.ts              ✅ MODIFY (import path, 6处)
├── cocos/rendering/render-shadow-map-batched-queue.ts  ✅ MODIFY
├── cocos/rendering/render-reflection-probe-queue.ts    ✅ MODIFY
├── cocos/rendering/render-additive-light-queue.ts      ✅ MODIFY
├── cocos/rendering/planar-shadow-queue.ts       ✅ MODIFY
├── cocos/rendering/post-process/passes/base-pass.ts    ✅ MODIFY
└── cocos/rendering/post-process/passes/skin-pass.ts    ✅ MODIFY

组B: 引擎核心 (5个文件)
├── cocos/root.ts                              ✅ MODIFY (import path)
├── cocos/game/splash-screen.ts                ✅ MODIFY (import path)
├── cocos/render-scene/core/program-lib.ts     ✅ MODIFY (import path)
├── cocos/render-scene/core/pass.ts            ✅ MODIFY (import path)
└── cocos/asset/assets/effect-asset.ts         ✅ MODIFY (import path)
```

#### 删除/修改的配置和导出文件 (4个)

```
├── exports/custom-pipeline.ts                 ❌ DELETE
├── exports/custom-pipeline-post-process.ts    ✅ KEEP (无需修改)
├── cc.config.json                             ✅ MODIFY (多处清理)
└── editor/engine-features/render-config.json  ✅ MODIFY (删除选项)
```

**总操作统计**:

- 删除文件: 23 + 1 = **24个**
- 新建文件: **2个**
- 修改文件: **13 + 2 = 15个**
- 保留文件: **1个** (custom-pipeline-post-process.ts)
- **净减少文件**: 24 - 2 = **22个**
- **净减少代码**: ~10,000 - 500 (接口) = **~9,500行**

---

### B. Import 路径对照表

| 原文件                             | 原 Import 路径                      | 新 Import 路径                                        | 导入内容                                 |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| render-pipeline.ts                 | `'./custom/pipeline'`               | `'./pipeline-types'`                                  | PipelineRuntime                          |
| pipeline-ubo.ts                    | `'./custom/pipeline'`               | `'./pipeline-types'`                                  | PipelineRuntime                          |
| render-shadow-map-batched-queue.ts | `'./custom/pipeline'`               | `'./pipeline-types'`                                  | PipelineRuntime                          |
| render-reflection-probe-queue.ts   | `'./custom/pipeline'`               | `'./pipeline-types'`                                  | PipelineRuntime                          |
| render-additive-light-queue.ts     | `'./custom/pipeline'`               | `'./pipeline-types'`                                  | PipelineRuntime                          |
| planar-shadow-queue.ts             | `'./custom/pipeline'`               | `'./pipeline-types'`                                  | PipelineRuntime                          |
| base-pass.ts                       | `'../../custom/pipeline'`           | `'../../pipeline-types'`                              | BasicPipeline, Pipeline, PipelineRuntime |
| skin-pass.ts                       | `'../../custom/pipeline'`           | `'../../pipeline-types'`                              | BasicPipeline, PipelineRuntime           |
| root.ts                            | `'./rendering/custom/pipeline'`     | `'./rendering/pipeline-types'`                        | BasicPipeline, PipelineRuntime           |
| splash-screen.ts                   | `'../rendering/custom'`             | `'../rendering/pipeline-types'`                       | PipelineRuntime                          |
| program-lib.ts                     | `'../../rendering/custom/pipeline'` | `'../../rendering/pipeline-types'`                    | PipelineRuntime                          |
| pass.ts                            | `'../../rendering/custom/private'`  | `'./program-library-interface'`                       | ProgramLibrary                           |
| effect-asset.ts                    | `'../../rendering/custom/private'`  | `'../../render-scene/core/program-library-interface'` | ProgramLibrary                           |

---

### C. 关键搜索命令（用于验证）

```bash
# 1. 确认所有实现文件的 import 已清理
find cocos/ -name "*.ts" -not -path "*node_modules*" \
    -exec grep -l "from.*custom/\(pipeline\|private\)" {} \; \
    | grep -v "custom/pipeline.ts$\|custom/private.ts$"
# 应返回空结果

# 2. 确认新接口文件存在且有内容
test -f cocos/rendering/pipeline-types.ts && echo "✅ OK" || echo "❌ MISSING"
test -f cocos/render-scene/core/program-library-interface.ts && echo "✅ OK" || echo "❌ MISSING"

# 3. 验证接口导出数量
echo "Pipeline-types exports:"
grep -c "^export \(interface\|enum\|type\)" cocos/rendering/pipeline-types.ts

echo "Program-library-interface exports:"
grep -c "^export interface" cocos/render-scene/core/program-library-interface.ts

# 4. 确认传统管线完好
test -f cocos/rendering/render-pipeline.ts && echo "✅ Traditional pipeline OK"
test -f cocos/rendering/pipeline.ts && echo "✅ Pipeline file OK"

# 5. 确认配置文件已清理
grep '"custom-pipeline"' cc.config.json || echo "✅ Config cleaned"
grep '"custom-pipeline"' editor/engine-features/render-config.json || echo "✅ Render config cleaned"

# 6. 确认导出文件已删除
test -f exports/custom-pipeline.ts && echo "❌ Still exists!" || echo "✅ Deleted"

# 7. 统计删除的代码量
git diff --stat HEAD~1 HEAD | tail -1

# 8. 验证接口使用情况
echo "PipelineRuntime usage count:"
grep -r "PipelineRuntime" --include="*.ts" cocos/ | wc -l

echo "BasicPipeline usage count:"
grep -r "BasicPipeline" --include="*.ts" cocos/ | wc -l

echo "ProgramLibrary usage count:"
grep -r "ProgramLibrary" --include="*.ts" cocos/ | wc -l

# 9. 检查是否有动态require
grep -r "require.*rendering/custom" --include="*.ts" --include="*.js" .

# 10. 全面编译测试
npm run build 2>&1 | tee final-build-test.log
npm test 2>&1 | tee final-test-results.log
```

---

### D. 时间估算明细（修正版）

| 阶段                      | 预计时间                       | 说明                             | 依赖    |
| ------------------------- | ------------------------------ | -------------------------------- | ------- |
| **Phase 0: 接口迁移准备** | **2-3小时**                    | **新建接口文件、提取定义、验证** | 无      |
| Phase 1: 准备工作         | 1小时                          | 分支、备份、基线测试             | Phase 0 |
| Phase 2: 更新Import路径   | 1-2小时                        | 修改13个文件的import             | Phase 1 |
| Phase 3: 删除实现代码     | 15分钟                         | 删除23个文件                     | Phase 2 |
| Phase 4: 更新配置文件     | 30分钟                         | 修改config、删除exports          | Phase 3 |
| Phase 5: 编译验证         | 2-3小时                        | 多轮迭代修复                     | Phase 4 |
| Phase 6: 运行测试         | 1小时                          | 全量测试+专项验证                | Phase 5 |
| Phase 7: 功能验证         | 2小时                          | 多场景测试                       | Phase 6 |
| Phase 8: 兼容性测试       | 1小时                          | 边界情况                         | Phase 7 |
| Phase 9: 最终清理         | 30分钟                         | 决策、文档、commit               | Phase 8 |
| **总计**                  | **11.5-14.5小时**              | **约1.5-2个工作日**              |         |
| **缓冲时间**              | +50%（应对意外情况）           |                                  |         |
| **最终预估**              | **2-3个工作日（4-5天含缓冲）** |                                  |         |

**相比原方案增加的时间**:

- 原方案: 10-11小时 (1.5-2天)
- 修正方案: 11.5-14.5小时 (1.5-2天) + Phase 0 (2-3小时)
- **增加约2-3小时**（主要用于接口迁移和验证）

**时间增加的原因**:

1. 新增 Phase 0（接口提取和验证）：2-3小时
2. Phase 2 工作量翻倍（13个文件 vs 5个文件）：+30分钟
3. Phase 5 可能需要更多迭代（接口完整性问题）：+30分钟-1小时
4. Phase 6-7 增加了接口相关测试：+30分钟

**但是这个时间是值得的**，因为：

- ✅ 避免了编译失败的风险
- ✅ 保证了传统管线的完整性
- ✅ 减少了回滚的可能性
- ✅ 总体方案更加可靠

---

### E. 决策 Checklist

在开始执行前，请确认以下事项：

### 前置条件检查

- [ ] Profiler模块已成功移除 ✅ 或不依赖
- [ ] Terrain模块已成功移除 ✅ 或不依赖
- [ ] 当前分支编译100%通过
- [ ] 当前测试100%通过
- [ ] 已创建新的feature分支
- [ ] 已备份当前状态（git tag）
- [ ] 已通知团队成员（如果是团队协作）
- [ ] **已理解不能直接删除 custom/ 目录的原因**
- [ ] **已准备好接口迁移的工作计划**

### 执行准备

- [ ] 已阅读完本方案全文（特别是第三、四、五章）
- [ ] 已理解所有风险点和应对措施
- [ ] 已准备好足够的时间块（建议连续3天，最好4-5天）
- [ ] 已设置好环境（IDE、终端、Git）
- [ ] 已准备好回滚方案
- [ ] **已确定采用方案A（接口迁移）**
- [ ] **已明确知道需要创建哪2个新接口文件**

### 接口迁移专项检查

- [ ] 已识别所有需要迁移的核心接口（PipelineRuntime, BasicPipeline, ProgramLibrary）
- [ ] 已列出所有 13 个需要修改的文件及其精确的 import 语句
- [ ] 已计划如何提取接口定义（哪些行、哪些类型）
- [ ] 已准备验证接口完整性的方法
- [ ] 已了解如果接口不完整该如何补救

### 完成标准确认

- [ ] 明确理解"必须满足"的所有标准（特别是接口迁移完整性）
- [ ] 有明确的验收人/审核机制
- [ ] 有发布/合并的审批流程
- [ ] **接受可能需要2-3天而不是3天的事实**

---

### F. 参考文档

- [核心目标.md](./核心目标.md) - 总体规划
- [01-移除Profiler模块.md](./01-移除Profiler模块.md) - 前序任务
- [02-移除Terrain模块.md](./02-移除Terrain模块.md) - 前序任务
- [渲染白话文档](../module-analysis/渲染白话.md) - 渲染系统理解参考
- [Cocos Creator官方文档 - 自定义渲染管线](https://docs.cocos.com/creator/manual/en/advanced-topics/custom-pipeline.html)
- **本方案 v1.0（原始版本）** - 对比参考，了解修正了哪些问题

---

### G. 版本历史

| 版本     | 日期           | 主要变更                                                     | 作者         |
| -------- | -------------- | ------------------------------------------------------------ | ------------ |
| v1.0     | 2026-04-10     | 初始版本                                                     | [原始作者]   |
| **v2.0** | **2026-04-11** | **重大修正**                                                 | **审查修正** |
|          |                | - 修正致命缺陷：不能直接删除custom/目录                      |              |
|          |                | - 补充完整的13个依赖文件清单（原方案遗漏8个）                |              |
|          |                | - 新增Phase 0：接口迁移阶段                                  |              |
|          |                | - 设计接口迁移方案（创建2个新文件）                          |              |
|          |                | - 更新配置文件清理步骤（cc.config.json, render-config.json） |              |
|          |                | - 修正风险评估（新增接口不完整风险）                         |              |
|          |                | - 精确化所有import路径描述                                   |              |
|          |                | - 更新时间估算（增加2-3小时）                                |              |

---

**文档版本**: v2.0 (修正版)
**创建时间**: 2026-04-11
**基于**: v1.0 审查结果修正
**负责人**: [待定]
**审核人**: [待定]
**技术评审**: [待定]
**预计开始日期**: [Profiler和Terrain完成后]
**预计完成日期**: [开始后4-5天内]
**前置依赖**: 01-Profiler, 02-Terrain (已完成)
**后续任务**: 04-Physics模块移除

---

## 十一、快速参考卡

### 核心命令速查

```bash
# ===== 准备阶段 =====
git checkout -b remove-render-graph-module-v2
git tag backup-before-render-graph-removal-v2
npm run build && npm test  # 基线测试

# ===== Phase 0: 接口迁移 =====
touch cocos/rendering/pipeline-types.ts
touch cocos/render-scene/core/program-library-interface.ts
# 手动提取接口定义...

# ===== Phase 2: 批量更新Import =====
# 组A: 传统渲染管线（8个文件）
sed -i '' "s|from './custom/pipeline'|from './pipeline-types'|g" \
    cocos/rendering/*.ts
sed -i '' "s|from '../../custom/pipeline'|from '../../pipeline-types'|g" \
    cocos/rendering/post-process/passes/*.ts

# 组B: 引擎核心（5个文件）
sed -i '' "s|from './rendering/custom/pipeline'|from './rendering/pipeline-types'|g" \
    cocos/root.ts
# ... 其他文件类似

# ===== Phase 3: 删除实现 =====
cd cocos/rendering/custom/
rm -f [23个文件列表]
# 保留 pipeline.ts 和 private.ts（转为重定向）

# ===== Phase 4: 配置清理 =====
rm -f exports/custom-pipeline.ts
# 手动编辑 cc.config.json 和 render-config.json

# ===== Phase 5-9: 验证和测试 =====
npm run build  # 迭代直到成功
npm test      # 全量测试
# ... 功能验证 ...

# ===== 提交 =====
git add . && git commit -m "refactor: remove RenderGraph module..."
```

### 关键文件索引

**必须阅读**:

- 第三章：接口依赖关系（理解为什么不能简单删除）
- 第四章：迁移策略（了解整体方案）
- 第五章：完整操作清单（执行手册）

**经常查阅**:

- 附录A：文件操作清单（检查进度）
- 附录B：Import路径对照表（避免出错）
- 第七章：风险评估（遇到问题时查看）

**首次执行时必读**:

- 第六章：执行步骤（按顺序执行）
- 第十一章：决策Checklist（执行前自检）

---

**结束**

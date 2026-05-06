# Cocos Creator 引擎 — 序列化与实例化

> 面向 AI 辅助编程的中文参考文档。覆盖序列化格式体系、反序列化、instantiate 深拷贝、JIT 预制体优化。

---

## 目录

1. [序列化格式体系](#1-序列化格式体系)
2. [动态格式详解](#2-动态格式详解)
3. [编译格式详解](#3-编译格式详解)
4. [CCON/CCONB 二进制格式](#4-cconcconb-二进制格式)
5. [反序列化流程](#5-反序列化流程)
6. [instantiate 深拷贝](#6-instantiate-深拷贝)
7. [预制体与 JIT 优化](#7-预制体与-jit-优化)
8. [隐含知识与陷阱](#8-隐含知识与陷阱)

---

## 1. 序列化格式体系

Cocos Creator 使用**三种**序列化格式，分别用于不同阶段：

| 格式 | 阶段 | 文件扩展名 | 用途 |
|---|---|---|---|
| **动态格式（Dynamic Format）** | 编辑器源文件 / Library | `.json` | `.scene`、`.prefab` 及大部分资源 |
| **编译格式（Compiled Format）** | 构建输出 | `.json` | 运行时高效反序列化 |
| **CCON/CCONB** | Library / 构建输出 | `.bin` | 仅 AnimationClip 使用 |

### 1.1 格式转换流程

```
编辑器源文件（动态格式 JSON）
  → 导入到 Library（动态格式 JSON 或 CCONB）
    → 构建输出（编译格式 JSON 或 CCONB）
```

### 1.2 各资源类型的格式

| 资源类型 | 编辑器源文件 | Library 存储 | 构建输出 |
|---|---|---|---|
| `.scene` | 动态格式 JSON | `.json`（动态格式） | `.json`（编译格式，可合并打包） |
| `.prefab` | 动态格式 JSON | `.json`（动态格式） | `.json`（编译格式，可合并打包） |
| `AnimationClip` | 动态格式 JSON | `.bin`（CCONB） | `.bin`（CCONB，可合并打包） |
| 其他资源（Sprite、Material 等） | 动态格式 JSON | `.json`（动态格式） | `.json`（编译格式，可合并打包） |
| `.meta` | 标准 JSON | N/A | N/A |

**关键：** CCON/CCONB **仅用于 AnimationClip**，大部分资源使用 JSON 格式（动态格式或编译格式）。

### 1.3 判断规则

通过 `.meta` 文件的 `files` 字段判断 Library 存储格式：
- `files: ['.json']` → 资源以 JSON 格式存储
- `files: ['.bin']` → 资源以 CCONB 二进制格式存储（仅 AnimationClip）

---

## 2. 动态格式详解

动态格式是编辑器中 `.scene` 和 `.prefab` 文件使用的序列化格式，由 `DynamicBuilder` 生成。

### 2.1 整体结构

动态格式是一个 **JSON 数组**，数组中的每个元素是一个对象：

```json
[
  { "__type__": "cc.PrefabInfo", ... },   // 索引 0：预制体信息
  { "__type__": "cc.Scene", "_id": "...", ... },  // 索引 1：场景根节点
  { "__type__": "cc.Node", ... },          // 索引 2：子节点
  ...
]
```

- 根对象在索引 0 或 1
- 每个对象通过 `__id__` 引用数组内其他对象（值为目标对象的数组索引）
- 每个对象通过 `__uuid__` 引用外部资源

### 2.2 引用标识

| 标识 | 格式 | 说明 |
|---|---|---|
| `__id__` | `{ "__id__": 3 }` | 对象间引用，值为目标在数组中的索引 |
| `__uuid__` | `{ "__uuid__": "xxxxx" }` | 资源 UUID 引用，指向另一个 Asset |
| `__type__` | `"cc.Scene"` | 类型标识，标记 CCClass 类型名 |

### 2.3 序列化规则

- **@ccclass 标记的类**才能被序列化
- **@property 或 @serializable 标记的属性**才会被序列化
- 引用其他 Asset 存储 `__uuid__` 引用
- 内嵌对象存储完整数据
- 数组和基本类型直接序列化

### 2.4 版本号

动态格式版本号：`version = '1.1.50'`，`versionCode = 2`。`.scene` 和 `.prefab` 共用同一版本号。

---

## 3. 编译格式详解

编译格式是**构建输出**时使用的格式，由 `CompiledBuilder` 生成，用于运行时更高效的反序列化。

### 3.1 整体结构

编译格式是一个 JSON 数组，按固定索引分段存储：

| 索引 | 段名 | 说明 |
|---|---|---|
| 0 | `Version` | 格式版本号 |
| 1 | `Instances` | 所有实例数据 |
| 2 | `InstanceTypes` | 实例类型信息 |
| 3 | `SharedClasses` | 共享类定义 |
| 4 | `SharedMasks` | 共享属性掩码 |
| 5 | `SharedStrings` | 共享字符串表 |
| 6 | `SharedUuids` | 共享 UUID 表 |
| 7 | `DependObjs` | 依赖对象 |
| 8 | `DependKeys` | 依赖键 |
| 9 | `DependUuidIndices` | 依赖 UUID 索引 |
| 10 | `Refs` | 引用关系 |

### 3.2 编译格式 vs 动态格式

| 特性 | 动态格式 | 编译格式 |
|---|---|---|
| 引用方式 | `__id__`（数组索引） | `instanceIndex`（实例索引） |
| 类型标识 | `__type__`（每对象重复） | 共享类定义（`SharedClasses`） |
| 字符串 | 每对象重复存储 | 共享字符串表（`SharedStrings`） |
| UUID | `__uuid__`（每引用重复） | 共享 UUID 表（`SharedUuids`） |
| 体积 | 较大 | 较小（去重后） |
| 反序列化速度 | 较慢（需类型查找） | 较快（预编译） |

### 3.3 JSON 分组打包

构建时，多个小编译格式 JSON 可以合并为一个打包文件（`packJSONs`），共享字符串/UUID/类定义等，进一步压缩体积。

打包后的文件格式为 `IPackedFileData`，包含多个资源的序列化数据。

---

## 4. CCON/CCONB 二进制格式

### 4.1 CCON（Cocos Creator Object Notation）

CCON 允许二进制表示序列化数据，但失去可读性。

**CCON 结构：**

```ts
class CCON {
    json: any;           // JSON 部分（编译格式数据）
    chunks: Uint8Array[]; // 二进制数据块（TypedArray 等二进制数据）
}
```

CCON 包含两部分：
1. **JSON 部分**：对象的 JSON 数据（与编译格式相同的数据结构）
2. **Binary Chunks**：二进制数据块（如动画关键帧的 TypedArray 数据存放在此处）

### 4.2 CCONB（CCON Binary）

CCONB 是 CCON 的纯二进制编码形式，通过 `encodeCCONBinary(CCON)` 生成。

- 编码：`CCON → encodeCCONBinary → Uint8Array`
- 解码：`Uint8Array → decodeCCONBinary → CCON`

### 4.3 CCON 使用场景

**目前仅 AnimationClip 使用 CCON/CCONB 格式。**

原因：AnimationClip 包含大量浮点数关键帧数据（位置、旋转、缩放曲线），使用二进制格式存储比 JSON 更高效：
- 体积更小（浮点数二进制 vs JSON 字符串）
- 加载更快（无需 JSON 解析）
- 直接映射到 TypedArray（无需逐值转换）

### 4.4 BIN 分组打包

构建时，多个 CCONB 文件（目前仅 `cc.AnimationClip`）可以合并为一个 `.bin` 文件，通过 `binPackagePack` 打包。阈值默认 16KB。

---

## 5. 反序列化流程

### 5.1 反序列化入口

`cocos/serialization/deserialize.ts` 提供反序列化功能。

#### 关键函数

- `deserialize(data, options?)`：反序列化数据为对象
- `deserializeAsset(data, options?)`：反序列化为 Asset

### 5.2 反序列化流程

1. **解析数据**：解析 JSON 或解码 CCONB 二进制
2. **创建对象**：根据 `__type__`（动态格式）或 `SharedClasses`（编译格式）创建对应类的实例
3. **设置属性**：按属性定义设置值
4. **解析引用**：将 `__uuid__` / `__id__` / UUID 索引解析为实际对象/资源
5. **调用回调**：触发 `onLoad`、`onRestore` 等

### 5.3 反序列化选项

```ts
interface DeserializeOptions {
    classFinder?: (type: string) => any;
    customEnv?: any;
}
```

---

## 6. instantiate 深拷贝

### 6.1 instantiate（`cocos/serialization/instantiate.ts`）

`instantiate(original)` 创建对象的深拷贝。

#### 关键行为

- **Node**：克隆节点及其所有子节点和组件
- **Component**：克隆组件的可序列化属性
- **Asset**：**不克隆**，共享引用
- **基本类型**：值拷贝
- **数组/对象**：递归深拷贝

#### 实现原理

1. 检查对象是否支持 `clone` 方法
2. 如果支持，调用 `clone()`
3. 否则使用通用深拷贝逻辑
4. 递归处理子对象
5. 重建引用关系

### 6.2 instantiate 流程

```
instantiate(node)
  → 创建新 Node
  → 深拷贝所有组件
  → 递归深拷贝子节点
  → 重建组件间的引用
  → 返回新节点
```

### 6.3 关键限制

- **不克隆资源**：`instantiate()` 引用资源而非深拷贝。SpriteFrame、Material 等资源是共享的。
- **不克隆不可序列化的属性**：运行时动态添加的属性不会被克隆。
- **UUID 不保留**：克隆的对象获得新的 UUID。
- **组件引用**：组件间通过 UUID 的引用会被重映射到克隆后的对象。

---

## 7. 预制体与 JIT 优化

### 7.1 Prefab（`cocos/scene-graph/prefab.ts`）

预制体资源。存储可复用的节点树模板。

#### 关键属性

- `data`：`PrefabInfo` — 预制体数据
- `optimizationPolicy`：`OptimizationPolicy` — 优化策略

#### OptimizationPolicy 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `AUTO` | 自动选择（默认） |
| 1 | `SINGLE` | 单次实例化优化 |
| 2 | `MULTI` | 多次实例化优化 |

### 7.2 JIT 预制体优化

JIT（Just-In-Time）优化通过代码生成加速预制体实例化。

#### 工作原理

1. 前几次实例化使用标准 `instantiate()` 流程
2. 当实例化次数超过阈值（默认 3）时，生成优化的实例化代码
3. 优化代码直接设置属性，跳过类型查找和反射

#### JIT 阈值

- 阈值 = 3：前 3 次使用标准克隆，之后切换为 JIT
- `optimizationPolicy = SINGLE`：始终使用标准克隆
- `optimizationPolicy = MULTI`：始终使用 JIT

### 7.3 JIT 代码生成

JIT 生成的代码类似：

```ts
function instantiatePrefab(parent) {
    const node = new Node();
    node.name = "MyNode";
    node.position = new Vec3(0, 0, 0);
    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = someFrame;
    parent.addChild(node);
    return node;
}
```

**优点：**
- 比反射快 5-10 倍
- 减少内存分配
- 避免类型查找开销

**限制：**
- 仅支持可序列化的属性
- 不支持动态添加的属性
- 代码生成有延迟（首次使用时）

---

## 8. 隐含知识与陷阱

1. **instantiate() 不克隆资源** — `instantiate()` 引用资源而非深拷贝。修改共享资源会影响所有引用者。
2. **CCON/CCONB 仅用于 AnimationClip** — 大部分资源（.scene/.prefab/材质/精灵帧等）使用 JSON 格式，只有 AnimationClip 使用 CCONB 二进制格式。
3. **编辑器用动态格式，构建输出用编译格式** — 动态格式可读性好（`__id__`/`__type__`/`__uuid__`），编译格式体积小、反序列化快（共享字符串/UUID/类定义）。
4. **预制体 JIT 阈值 = 3** — 前 3 次实例化使用标准克隆，之后切换为 JIT 代码生成。
5. **UUID 在克隆后改变** — 克隆的对象获得新的 UUID，原始 UUID 的引用会被重映射。
6. **不可序列化属性不克隆** — 运行时动态添加的属性（没有 `@serializable` 标记）不会被克隆。
7. **循环引用** — 序列化系统支持循环引用，通过延迟解析处理。
8. **反序列化顺序** — 对象按序列化顺序创建，引用在所有对象创建后解析。
9. **JSON 分组打包** — 构建时多个小编译格式 JSON 合并为一个打包文件，共享字符串/UUID/类定义。
10. **BIN 分组打包** — 构建时多个 CCONB（AnimationClip）可合并为一个 `.bin` 文件，阈值默认 16KB。
11. **`optimizationPolicy` 的选择** — 如果预制体只实例化一次（如场景中的唯一对象），使用 `SINGLE`；如果多次实例化（如敌人），使用 `MULTI`。
12. **JIT 代码缓存在预制体上** — 生成的 JIT 代码与预制体关联，预制体释放后 JIT 代码也被释放。
13. **组件的 `_dt` 等内部属性不序列化** — 只有标记了 `@serializable` 的属性才会被序列化和克隆。

---

## 9. UUID 压缩算法

### 9.1 两种 UUID 格式

| 格式 | 来源 | 长度 | 示例 |
|------|------|------|------|
| file UUID (hex) | `.meta` 文件 `"uuid"` 字段 | 36 字符 | `fc991dd7-0033-4b80-9d41-c8a86a702e59` |
| class UUID (compressed) | scene JSON `__type__` 字段 | 23 字符 | `fc9913XADNLgJ1ByKhqcC5Z` |

### 9.2 compressUUID 算法

`compressUUID(uuid, min)` 定义在 `cocos/core/utils/decode-uuid.ts`：

- 保留前 N 个 hex 字符（`min=false` 时 N=5，`min=true` 时 N=2）
- 剩余 hex 字符按 3 hex → 2 base64 压缩

```
算法（min=false）: 5 hex 保留 + (27 hex / 3 × 2 base64) = 5 + 18 = 23 chars

输入:  fc991dd7-0033-4b80-9d41-c8a86a702e59
      └─5hex─┘ └────────── 27 hex → 18 base64 ───────────┘
输出:  fc991    3XADNLgJ1ByKhqcC5Z  →  fc9913XADNLgJ1ByKhqcC5Z
```

Scene JSON 中的 `__type__` 使用 `compressUUID(uuid, false)`（23 字符）。

### 9.3 映射关系（确定性）

```
file UUID (from .meta) ──→ compressUUID(uuid, false) ──→ class UUID (scene JSON __type__)
```

编译管线中的映射链路：

```
PackerDriver.applyAssetChanges()
  → _modLo.setUUID(scriptUrl, fileUuid)
  → ModLo.transform()
    → compressUUID(fileUuid, false)
    → babel-plugin-cc-module-meta 注入:
      _cclegacy._RF.push({}, "<compressedUUID>", "<baseName>", import.meta)

引擎运行时:
  cc.class() → _RF.peek() → _setClassId(compressedUUID, cls)
  cls.prototype.__scriptUuid = decompressUUID(compressedUUID)
```

### 9.4 ⚠️ 常见错误

`fullUuidToCompressed()`（全 base64, 22 chars）是**错误算法**，输出与 `compressUUID()` 完全不同，不可混用。

---

## 10. 反序列化 Details 与 assignAssetsBy()

### 10.1 __uuid__ 引用：只收集不解析

`cc.deserialize()` 遇到 `{"__uuid__": "..."}` 时调用 `details.push(uuid, obj, prop, type)` 记录引用关系，但属性保持为 `null`。资源引用需要后续通过 `Details.assignAssetsBy()` 或引擎的 `assetManager` 解析。

### 10.2 Details.assignAssetsBy()

**仅在 `EDITOR || TEST` 模式下可用**（`cocos/serialization/deserialize.ts`）：

```typescript
Details.prototype.assignAssetsBy = function (getter) {
    for (let i = 0; i < this.uuidList.length; i++) {
        const obj = this.uuidObjList[i];
        const prop = this.uuidPropList[i];
        const uuid = this.uuidList[i];
        obj[prop] = getter(uuid);
    }
};
```

**这是迁移流程中解析 Prefab 嵌套引用的唯一正确方式**。必须显式创建 Details 并传入：

```typescript
const details = new Details();
const scene = cc.deserialize(jsonArray, details);
details.assignAssetsBy(uuid => loadFromLibrary(uuid));
```

---

## 11. Prefab 嵌套展开机制

`expandNestedPrefabInstanceNode()`（`cocos/scene-graph/prefab/utils.ts`）：

```
遍历所有 PrefabInstance 根节点:
  → createNodeWithPrefab(node)
    → prefabInfo.asset._doInstantiate(node)  // 克隆 Prefab 节点树
  → 应用 mountedChildren + propertyOverrides
  → 标记 expanded = true
```

`prefabInfo.asset` 必须不为 null 才能展开（否则报 errorID 3701）。

---

## 12. 运行时可查询的装饰器元数据

`@ccclass` 处理完成后，每个组件构造函数上有两个关键字段：

| 字段 | 内容 | 用途 |
|------|------|------|
| `ctor.__values__` | 可序列化属性名列表 (string[]) | 过滤了 `serializable: false` 的属性 |
| `ctor.__attrs__` | 属性元数据 (flat key-value) | `propName$_$type`, `propName$_$default`, `propName$_$editorOnly` 等 |

通过这些元数据可以在运行时动态获取组件的序列化信息：

```typescript
comp.constructor.name          // 组件类名 (如 "Camera", "BoxCollider")
comp.constructor.__values__    // 应序列化的属性列表
comp.constructor.__attrs__     // 每个属性的详细元数据
```

---

## 13. EditorExtends 序列化

### 13.1 serialize() 行为

`EditorExtends.serialize(comp)` 调用链：

```
Parser.parse(obj)
  → enumerateClass(owner, ccclass)
    → 遍历 ccclass.__values__
    → 查 __attrs__ 获取 formerlySerializedAs, default, editorOnly
    → 跳过 editorOnly 属性
    → 递归处理 ValueType / Array / Dict / Asset 引用
  → DynamicBuilder.dump() → JSON 字符串
```

### 13.2 浏览器环境 vs 无头引擎

| 特性 | 浏览器 (Combo renderer) | Node.js 无头引擎 |
|------|------------------------|-------------------|
| EditorExtends 来源 | 引擎自带 | 从 cocos-cli 移植到 `editor-extends/` |
| serialize() 初始化 | 引擎加载时已完整 | 需要 `init()` 延迟升级 |
| `__values__` 完整性 | 完整 | 可能不完整 |

---

## 14. 引擎构建模式与序列化

| 配置 | 文件 | EDITOR | 用途 |
|------|------|--------|------|
| CLI | `vite/platforms/cli/platform.config.ts` | `true` | 编辑器工具、迁移——保留 `_serialize()` 方法体 |
| Web | `vite/platforms/web/platform.config.ts` | `false` | 游戏运行时——tree-shake 掉编辑器代码 |

迁移**必须使用 CLI 构建**（`EDITOR=true`）的引擎包，否则 `Details.assignAssetsBy()` 和 `EditorExtends.serialize()` 不可用。

---

## 15. Library 目录结构

```
library/
  <XX>/              ← UUID 前 2 位 hex
    <uuid>.json      ← 资产序列化数据（cc.deserialize() 兼容格式）
    <uuid>.<ext>     ← 原始文件（贴图、音频等）
```

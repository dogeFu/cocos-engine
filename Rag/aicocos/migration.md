# 迁移系统

## 概述

迁移系统将 Cocos Creator 的 `.scene` / `.prefab` JSON 文件自动转换为 AiCocos 的链式 Scene/Prefab DSL TypeScript 代码。核心思路是用 Cocos Engine 自身的 `cc.deserialize()` 反序列化 JSON，而非静态解析。

**核心约束**：迁移必须在 Cocos Engine 运行时环境中执行，因为需要 `cc.deserialize()` 解析 `__id__` 指针、展开 Prefab 实例、填充组件默认值。

## 核心概念

### 为什么用 cc.deserialize() 而不是静态解析

Cocos Creator 的 scene JSON 是**扁平数组 + `__id__` 指针引用**，不是自描述的嵌套树。静态解析需要手写引用追踪、Prefab 展开逻辑、默认值填充，工作量极大且极易出错。`cc.deserialize()` 已在引擎中实现所有这些逻辑。

### 数据流

```
.scene JSON [array]
    │
    ├─→ buildJsonTypeIndex()       ← JSON 层索引: 提取 __type__ 信息
    │
    ├─→ cc.deserialize(jsonArray)  ← 引擎层: 解析 __id__ 引用, 填充默认值
    │       │
    │       ├── Camera, Sprite... → KNOWN_CC_COMPONENTS → emit DSL
    │       ├── MissingScript     → 查 migration-map.json → emit .component(MyScript, ...)
    │       └── EditorExtends.serialize(comp) → 属性 JSON → emit props
    │
    └─→ CodeBuilder → .scene.ts / .prefab.ts
```

### 场景与 Prefab 转换的差异

| | Scene | Prefab |
|---|-------|--------|
| 根对象 | `cc.Scene` | `cc.Node` (prefab root) |
| 基类 | `extends Scene` | `extends Prefab` |
| 构造入口 | `constructor()` 中直接构建 | `build(root: Node)` 从 root 开始 |
| SceneGlobals | ambient, shadows, skybox, fog | 无 |
| 链式前缀 | 顶层 `this.`，子节点 `node.` | 根 `root.`，子节点 `node.` |

### 自定义脚本 UUID 映射

Scene JSON 中自定义脚本通过 `__type__` 标识（23 字符 compressed UUID）。`generate-migration-map` 命令自动构建映射：

```
1. 扫描 .ts → 从 .meta 提取 file UUID → compressUUID(uuid, false) → class UUID
2. 从 .ts 源码提取 class name / import path
3. 按 class UUID 存入 map.scripts
4. 扫描 scene/prefab JSON → 提取 __type__
   → map.scripts[__type__] 已有条目 → 保留
   → map.scripts[__type__] 不存在（如来自 node_modules）→ 标记 TODO
```

**关键**：必须使用 `compressUUID(uuid, false)` 而非 `fullUuidToCompressed()`。两者编码方式完全不同（hex-triplet 分组 vs bit 级 base64），输出永不相同。

## 引擎运行环境

### 当前方案：Node.js 无头引擎

迁移最初是纯 CLI 工具，必须在 Node.js 中独立运行。无头引擎通过 `engine-headless.ts` 初始化，包含以下 hack：

| 要解决的问题 | Hack | 副作用 |
|-------------|------|--------|
| 引擎依赖浏览器全局 | `setupWindowMocks()` | 假对象不完整 |
| cc.js 是 IIFE | `vm.runInThisContext()` | 语义与 `<script>` 不同 |
| 动态 import 不支持 | 正则替换为 `Promise.resolve()` | 可能漏掉变体 |
| `require('offline-mappings')` | Hook `Module._load` | 手工维护映射表 |
| `require('gl')` | 返回 stub WebGL | 无法检测 shader 错误 |
| 编辑器回调守卫 | `window.Build=true` + `CC_EDITOR=false` | 矛盾设置 |

### 未来方案：Combo 浏览器环境

Combo 是 Electron 应用，Chromium renderer 拥有真实浏览器 API：

```
┌── Main Process (Node.js) ──────────────────────────┐
│  fs.readFile(.scene)  →  IPC  →  Renderer          │
│  fs.writeFile(.scene.ts) ← IPC ← Renderer          │
└────────────────────────────────────────────────────┘
                         │ IPC
┌── Renderer (Chromium) ─────────────────────────────┐
│  <script src="cc.js">   ← 真实浏览器环境             │
│  cc.deserialize()        ← 引擎原生                   │
│  EditorExtends.serialize() ← 引擎自带               │
│  → 生成代码字符串 → IPC → Main 写入文件               │
└────────────────────────────────────────────────────┘
```

切换到浏览器环境可消除所有 9 个 hack，并获得完整的 `__values__` 属性列表。

## Prefab 嵌套展开

### 核心机制

`cc.deserialize()` 处理 `__uuid__` 引用的方式与 `__id__` 完全不同：

| 引用类型 | 解析方式 | 何时完成 |
|---------|---------|---------|
| `__id__` (数组内指针) | 反序列化期间同步解析 | `cc.deserialize()` 返回时已就绪 |
| `__uuid__` (资源引用) | 只收集到 `Details.uuidList`，不解析 | 需后续调用 `details.assignAssetsBy()` |

### 正确的展开流程

```typescript
const details = new Details();
const scene = cc.deserialize(jsonArray, details);

// 步骤 1: 填充 __uuid__ 引用
await details.assignAssetsBy(async (uuid) => {
    const libFile = path.join(libraryDir, uuid.slice(0, 2), `${uuid}.json`);
    const libData = JSON.parse(readFileSync(libFile, 'utf-8'));
    return cc.deserialize(libData);
});

// 步骤 2: 展开嵌套 Prefab
const prefabUtils = cc.prefab || cc._prefab;
if (typeof prefabUtils?.expandNestedPrefabInstanceNode === 'function') {
    prefabUtils.expandNestedPrefabInstanceNode(rootNode);
}
```

`assignAssetsBy` 填上 `prefabInfo.asset` 后，`expandNestedPrefabInstanceNode()` 才能正常工作：克隆 Prefab 节点树、应用 PropertyOverrides、保留 mountedChildren。

**注意**：`Details.assignAssetsBy()` 仅在 `EDITOR || TEST` 模式下可用，因此迁移必须使用 CLI 构建（`EDITOR=true`）的 cc.js。

## 组件属性提取

### EditorExtends.serialize()

`EditorExtends.serialize(comp)` 遍历 `ccclass.__values__` + `__attrs__`，输出属性 JSON。在无头引擎中，`__values__` 可能不完整（非 Editor 构建中属性注册不全），导致组件属性大量为空。切换到 Combo 浏览器环境后可解决。

### serializeValue 形状检测

`EditorExtends.serialize()` 返回纯 JSON 对象（原型链丢失），不能用 `instanceof`。改用两种方式组合：
1. **`__type__` 标注**（优先）：`"cc.Vec3"` → `new Vec3(x,y,z)`
2. **形状检测**（fallback）：`{x,y,z}` → Vec3，`{r,g,b,a}` → Color

## CLI 命令

| 命令 | 作用 |
|------|------|
| `aicocos migrate <project>` | 完整迁移（资产导入 + 代码转换） |
| `aicocos convert-scene <project>` | 转换 .scene/.prefab 为 DSL |
| `aicocos generate-migration-map <project>` | 生成 migration-map.json |
| `aicocos list-scenes <project>` | 列出生成的场景 |
| `aicocos set-launch-scene <project> <className>` | 设置启动场景 |

## 关键文件索引

### 入口与编排

| 文件 | 职责 |
|------|------|
| [migration-tool.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-tool.ts) | `runMigration()` 迁移主入口 |
| [migration-convert-entry.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-convert-entry.ts) | `convertAll()` 场景/预制体批量转换 |
| [migration-launcher.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-launcher.ts) | `listScenes()` / `setLaunchScene()` |

### 核心转换

| 文件 | 职责 |
|------|------|
| [migration-scene-converter.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-scene-converter.ts) | Scene → DSL |
| [migration-prefab-converter.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-prefab-converter.ts) | Prefab → DSL |
| [migration-codegen.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-codegen.ts) | CodeBuilder、ImportTracker、serializeValue |
| [migration-component-utils.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-component-utils.ts) | classifyComponent、extractComponentProps |

### UUID 与映射

| 文件 | 职责 |
|------|------|
| [migration-map-generator.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-map-generator.ts) | 自动生成迁移映射 |
| [migration-map-loader.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-map-loader.ts) | 加载 migration-map.json |
| [migration-asset-index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/migration-asset-index.ts) | UUID→文件路径索引 |
| [editor-extends/uuid.ts](file:///Users/kay/Git/aicocos/packages/cli/src/editor-extends/uuid.ts) | compressUUID / decompressUUID（正确实现） |

## 排查指南

### 自定义脚本全部标记 TODO

检查 `migration-map-generator.ts` 是否使用 `compressUUID(uuid, false)` 而非 `fullUuidToCompressed()`。

### Prefab 嵌套展开失败（节点名 "New Node"）

检查是否调用了 `details.assignAssetsBy()` 和 `expandNestedPrefabInstanceNode()`。

### 组件属性为空

无头引擎中 `__values__` 不完整导致。切换 Combo 浏览器环境可解决。

## 相关文档

- [AiCocos 整体架构](./overview.md)
- [引擎集成与启动](./engine-integration.md)
- [Cocos Engine 序列化系统](../core/serialization.md)

# @combo/core 运行时 — 接口设计与 API 参考

> 代码优先游戏开发运行时。提供 Scene、Node、Asset 类型安全引用、Prefab 模板和渐进资源加载。
>
> 外部仓库：`/Users/kay/Git/combo-core` | npm 包：`@combo/core` | 版本：0.2.0

---

## 设计原则

`@combo/core` 的核心理念是 **"一切皆代码"**：游戏场景、节点树、预制体全部用 TypeScript 类定义，不使用 .scene 或 .prefab 文件。使 AI 编码工具可以精确地生成和修改游戏逻辑，且与 Cocos Creator 引擎完全兼容。

### 关键设计决策

| 决策 | 理由 |
|------|------|
| **Scene/Node 继承 cc 类** | 保持与引擎完全兼容，不额外封装层。Scene/Node 实例可直接传给任何引擎 API。 |
| **AssetRef branded type** | 类型安全的资源引用，支持延迟加载和去重。使用 `unique symbol` 品牌标记防止与普通对象混淆，让编译期可以发现类型错误。 |
| **ResourceLoader 帧节流** | 避免一帧内发起大量网络请求阻塞渲染线程。每帧通过 `requestAnimationFrame` 调度，控制 `perFrame` 和 `concurrency` 两个维度。 |
| **component() 同时支持 function 和 Partial** | 函数形式适合需要逻辑操作的场景（如动画参数），Partial 对象适合批量设置属性的场景。两者可混合使用。 |
| **Prefab 使用 abstract class** | 通过 `abstract build()` 保证实例化流程统一；`buildPrefab()` 工厂函数提供更简洁的匿名方式。 |
| **不替引擎做决策** | 不覆盖组件默认值，不发明"安全默认"。默认值交给引擎自身，combo-core 只提供便利的工具函数（如 `camera2D()`）。 |

### 资源加载策略

```
组件 setup 中包含 AssetRef
  → Node._applySetupWithAssetRefs() 分离同步属性和资源引用
  → 同步属性立即赋值（_assignDeep）
  → 资源引用注册到 Scene._resourceLoader
  → ResourceLoader 按帧节流调度 loadAsset()
  → 加载完成后将 asset 赋值到组件对应属性
```

**延迟绑定**：节点尚未添加到 Scene 时，AssetRef 暂存到 `_pendingAssetRefs[]`。添加到 Scene 后（通过 `override setParent` 拦截）自动触发加载。

---

## 导出总览

```typescript
// 从 @combo/core 导入
export * from "./app";              // startApplication, StartupContext
export * from "./asset";            // AssetRef, AssetRefUUID, assetRef, uuidRef, loadAsset, ...
export * from "./node";             // Node (extends cc.Node), NodeBuilder
export * from "./prefab";           // Prefab (abstract), buildPrefab
export * from "./resource-loader";  // ResourceLoader, PaceConfig
export * from "./scene";            // Scene (extends cc.Scene), AssetsObserver
export * from "./utils";            // utils/camera, utils/canvas, utils/builtin-assets
```

---

## 1. Scene

**文件**: `combo-core/src/scene.ts` | **类**: `Scene extends cc.Scene`

### 职责

场景容器，管理 `ResourceLoader` 生命周期。所有子节点的资源引用通过 Scene 统一调度加载。

### 构造函数

```typescript
class Scene {
  constructor(name?: string);  // 默认 "Scene"
}
```

### API

| 方法 | 签名 | 用途 |
|------|------|------|
| `node` | `(name?: string \| NodeBuilder, build?: NodeBuilder): this` | 创建子节点。`name` 作为 Node 名称，`builder` 接收 `Node` 实例进行链式配置 |
| `append` | `(child: cc.Node): this` | 添加已有的 `cc.Node` |
| `prefab` | `(prefab: Prefab): this` | 实例化 Prefab |
| `setupGlobals` | `(setup: (g: SceneGlobals) => void): this` | 配置 scene globals（ambient、shadows、skybox、fog 等） |
| `pace` | `(config: Partial<PaceConfig>): this` | 配置资源加载速度（`{ perFrame, concurrency }`） |
| `run` | `(): this` | 同步启动：`resourceLoader.ensureStarted()` + `director.runSceneImmediate()` |
| `load` | `(onProgress?: (p: number) => void): Promise<this>` | 异步加载：`resourceLoader.ensureStarted()` + `director.runScene()` |

### run() vs load()

| | `run()` | `load()` |
|---|---|---|
| 场景切换 | `runSceneImmediate`（立即） | `runScene`（异步过渡） |
| 进度回调 | 无 | `onProgress?: (progress: number) => void` |
| 返回值 | `this` | `Promise<this>` |
| 典型用途 | 启动场景 | 带加载画面的场景切换 |

### AssetsObserver

```typescript
interface AssetsObserver {
  onProgress(fn: (done: number, total: number) => void): this;
  onComplete(fn: () => void): this;
  ready(): Promise<void>;
}
```

---

## 2. Node

**文件**: `combo-core/src/node.ts` | **类**: `Node extends cc.Node`

### 职责

Cocos `cc.Node` 的流畅 API 封装。所有配置方法返回 `this` 以支持链式调用。

### 构造函数

```typescript
class Node {
  constructor(name?: string);
}
```

### API

| 方法 | 签名 | 用途 |
|------|------|------|
| `setPosition` | `(x: number \| Vec3, y?: number, z?: number): this` | 设置位置。接受 `(x,y,z)` 或 `Vec3` |
| `setRotationFromEuler` | `(x: number \| Vec3, y?: number, z?: number): this` | 设置欧拉角旋转 |
| `setScale` | `(x: number \| Vec3, y?: number, z?: number): this` | 设置缩放。`y` 省略时等于 `x`（等比缩放），`z` 默认为 1 |
| `setActive` | `(active: boolean): this` | 设置激活状态 |
| `setOpacity` | `(opacity: number): this` | 设置透明度（0-255）。自动添加 `UIOpacity` 组件 |
| `setContentSize` | `(w: number, h: number): this` | 设置内容尺寸。自动添加 `UITransform` 组件 |
| `setAnchorPoint` | `(x: number, y: number): this` | 设置锚点。自动添加 `UITransform` 组件 |
| `component` | `<T>(type: Constructor<T>, setup?: ComponentSetup<T>): this` | 添加/获取组件。`setup` 可以是函数 `(comp) => void` 或 Partial 对象 |
| `node` | `(name?: string \| NodeBuilder, build?: NodeBuilder): this` | 创建子节点 |
| `append` | `(child: cc.Node): this` | 添加已有的 `cc.Node` |
| `setParent` | `(target: cc.Node \| null, keepWorldTransform?: boolean): this` | 设置父节点后自动刷新待处理的资源引用 |
| `prefab` | `(prefab: Prefab): this` | 实例化 Prefab |

### component() 内部机制

`ComponentSetup<T>` 类型别名：

```typescript
type ComponentSetup<T> = Partial<T> | ((component: T) => void);
```

两种形式的区别：
- **Partial 对象** `{ spriteFrame: ref, color: Color.RED }`：内部通过 `_applySetupWithAssetRefs()` 处理，自动识别其中的 `AssetRef` 值并注册到 ResourceLoader
- **函数** `(comp) => { comp.spriteFrame = ref; }`：直接调用，由调用方自行处理资源引用和赋值顺序

### _assignDeep 深度合并

```typescript
private static _assignDeep(target: Record<string, unknown>, source: Record<string, unknown>): void
```

特殊处理：当目标值是 typed object（`constructor !== Object`，如 `CurveRange`、`GradientRange`）时，使用 `Object.assign` 合并而不是覆盖，避免丢失构造函数初始化的状态。

---

## 3. Asset

**文件**: `combo-core/src/asset.ts`

### AssetRef (branded type)

```typescript
import { ASSET_REF_BRAND } from "./asset";

interface AssetRef<T extends Asset = Asset> {
  readonly [ASSET_REF_BRAND]: true;     // 品牌标记，防止与普通对象混淆
  readonly bundle: string;               // bundle 名称
  readonly path: string;                 // 包内路径
  readonly type?: AssetConstructor<T>;   // 可选类型约束
}

interface AssetRefUUID<T extends Asset = Asset> {
  readonly [ASSET_REF_BRAND]: true;
  readonly uuid: string;                 // 直接 UUID
  readonly type?: AssetConstructor<T>;
}
```

### 工厂函数

```typescript
function assetRef<T extends Asset = Asset>(
  bundle: string, path: string, type?: AssetConstructor<T>
): AssetRef<T>;

function uuidRef<T extends Asset = Asset>(
  uuid: string, type?: AssetConstructor<T>
): AssetRefUUID<T>;
```

### 加载函数

```typescript
function loadBundle(name: string): Promise<AssetManager.Bundle>;

function loadAsset<T extends Asset>(reference: AssetRef<T>): Promise<T>;

function loadAssetByUUID<T extends Asset>(reference: AssetRefUUID<T>): Promise<T>;
```

### 资源类型检查

```typescript
function isAssetRef(value: unknown): value is AssetRef | AssetRefUUID;
```

### 加载流程

```
loadAsset(ref)
  ├─ loadBundle(ref.bundle)
  │    └─ assetManager.loadBundle(name)
  │         └─ 获取 /assets/{bundle}/config.json
  │              └─ 解析 uuids/paths/packs/redirect → UUID→URL 映射
  └─ bundle.load(ref.path, ref.type)
       └─ paths[UUID] → importBase/{uuid[:2]}/{uuid}.json
```

---

## 4. ResourceLoader

**文件**: `combo-core/src/resource-loader.ts` | **类**: `ResourceLoader`

### 职责

渐进式批量资源加载器。通过 `requestAnimationFrame` 每帧节流，避免一帧内发起大量网络请求阻塞渲染。

### API

| 方法 | 签名 | 用途 |
|------|------|------|
| `register` | `(ref: ResourceRef): Promise<Asset>` | 注册一个资源引用。返回 `Promise<Asset>`（自动去重） |
| `pace` | `(config: Partial<PaceConfig>): void` | 配置加载速度 |
| `ensureStarted` | `(): void` | 启动加载（幂等） |
| `onProgress` | `(fn: ProgressCallback): void` | 注册进度回调 `(done, total) => void` |
| `onComplete` | `(fn: () => void): void` | 注册完成回调 |
| `ready` | `(): Promise<void>` | 所有资源加载完成后 resolve |

### 配置

```typescript
interface PaceConfig {
  perFrame: number;       // 每帧最多启动多少个加载
  concurrency: number;    // 最大并发数
}

const DEFAULT_PACE: PaceConfig = { perFrame: 5, concurrency: 10 };
```

### 内部机制

```
register(ref) → 放入队列，同时注册 _dedupMap
ensureStarted() → _tick()
  └─ requestAnimationFrame(process)
       ├─ 每帧启动最多 perFrame 个
       ├─ 活跃加载数不超过 concurrency
       └─ 完成后回调 progressCbs + completeCbs
```

**去重**：同一资源多次 `register()` 返回同一个 Promise（通过 `_dedupMap: Map<string, Promise<Asset>>`）。

---

## 5. Prefab

**文件**: `combo-core/src/prefab.ts` | **类**: `Prefab` (abstract)

### 职责

可复用的节点模板。类似 Cocos Creator 的 Prefab 概念，但完全用代码定义。

```typescript
abstract class Prefab {
  readonly name: string;
  instantiate(parent?: cc.Node): Node;
  protected abstract build(root: Node): void;
}
```

### instantiate 流程

1. 创建 `new Node(this.name)`
2. 如果传入了 `parent`，添加到父节点
3. 调用 `this.build(root)` — 子类实现节点树
4. 设置 `root.active = true`
5. 返回 root

### buildPrefab 函数式工厂

```typescript
function buildPrefab(name: string, builder: (root: Node) => void): Prefab;
```

`buildPrefab` 内部创建匿名子类，将 `builder` 作为 `build()` 的实现。适合一次性或参数简单的预制体。

---

## 6. startApplication

**文件**: `combo-core/src/app.ts`

### 职责

Combo 应用程序的入口函数。管理 Scene 启动流程，提供 `beforeStart` 钩子。

### 签名

```typescript
interface StartupContext {
  game: Game;   // cc.game 单例
}

async function startApplication(options: {
  scene: Scene;
  beforeStart?: (context: StartupContext) => Promise<void> | void;
}): Promise<void>;
```

### 内部流程

```
startApplication({ scene, beforeStart })
  → await beforeStart({ game })  // 初始化时机
  → scene.run()                   // resourceLoader.ensureStarted() + director.runSceneImmediate()
```

---

## 7. Utils

**文件**: `combo-core/src/utils/`

### camera2D

```typescript
function camera2D(parent: cc.Node, opts?: Camera2DOptions): Camera;
```

创建 2D 正交 Camera。默认：ORTHO 投影、SOLID_COLOR + DEPTH 清除、深灰色背景（44,62,80）、orthoHeight=960、z=1000。

```typescript
interface Camera2DOptions {
  clearColor?: Color;
  orthoHeight?: number;
  name?: string;
}
```

### camera3D

```typescript
function camera3D(parent: cc.Node, opts?: Camera3DOptions): Camera;
```

创建 3D 透视 Camera。默认：PERSPECTIVE 投影、FOV=45、near=1、far=1000、位置 (0,0,-10)。

```typescript
interface Camera3DOptions {
  clearColor?: Color;
  fov?: number;
  nearClip?: number;
  farClip?: number;
  position?: Vec3;
  name?: string;
}
```

### setupCanvas2D

```typescript
function setupCanvas2D(parent: cc.Node, opts?: Canvas2DSetup): Canvas2DResult;
```

创建 Canvas 节点 + 关联的 2D Camera。默认设计分辨率 640 x 960。

```typescript
interface Canvas2DSetup {
  designWidth?: number;
  designHeight?: number;
  camera?: Camera2DOptions;
}

interface Canvas2DResult {
  node: Node;
  camera: Camera;
}
```

### builtin assets

```typescript
function builtinAsset<T>(key: string): T | null;
function whiteTexture(): Texture2D | null;
function whiteSpriteFrame(): SpriteFrame;  // packable = false
```

---

## 外部依赖

| 包 | 关系 | 说明 |
|----|------|------|
| `cc` | peer dep | Cocos Engine 运行时类型。构建时 `external: cc` |

## 构建

```bash
esbuild src/index.ts --bundle --format=esm --outfile=dist/index.js --external:cc
```

---

## 文件路径索引

| 源码文件 | 导出模块 |
|----------|---------|
| `combo-core/src/index.ts` | 重新导出所有模块 |
| `combo-core/src/app.ts` | `startApplication`, `StartupContext` |
| `combo-core/src/scene.ts` | `Scene`, `AssetsObserver` |
| `combo-core/src/node.ts` | `Node`, `NodeBuilder` |
| `combo-core/src/prefab.ts` | `Prefab`, `buildPrefab` |
| `combo-core/src/asset.ts` | `AssetRef`, `AssetRefUUID`, `assetRef`, `uuidRef`, `loadAsset`, `loadAssetByUUID` |
| `combo-core/src/resource-loader.ts` | `ResourceLoader`, `PaceConfig` |
| `combo-core/src/utils/camera.ts` | `camera2D`, `camera3D` |
| `combo-core/src/utils/canvas.ts` | `setupCanvas2D` |
| `combo-core/src/utils/builtin-assets.ts` | `builtinAsset`, `whiteTexture`, `whiteSpriteFrame` |

---

## Future Considerations

1. **Scene 缺少 component() 方法**：Node 有 `component()` 但 Scene 没有，虽然 Scene 继承自 cc.Scene（cc.Node），但在 combo-core 的 fluent API 中没有暴露。

2. **startApplication 不处理 game.init() 时序**：目前假设引擎已初始化完成。对于需要动态初始化的场景，可以增加 `beforeStart` 钩子内的手动检查或未来版本内置时序管理。

3. **没有 scene 切换 API**：场景间切换需要调用方直接使用 `director.runScene()`。未来可提供 `sceneManager.transitionTo()` 之类的封装。

4. **Scene.load() 中 console.error 的使用**：当前用 `console.error` 输出加载错误，与引擎的 `errorID` 体系不一致。

5. **缺少输入事件 helper**：当前输入事件需要通过 `cc.input.on(...)` 直接处理。

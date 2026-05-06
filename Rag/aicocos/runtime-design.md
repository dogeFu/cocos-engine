# 运行时设计

## 概述

AiCocos 运行时库提供代码优先的场景和 Prefab 定义方式，以及资源引用的统一接口。目标是让开发者用 TypeScript 代码表达游戏内容，而非依赖序列化文件。

**核心职责**：
- 提供 Scene/Prefab 的代码 DSL 定义（类继承 + 链式 API）
- 提供资源引用协议（AssetRef）与自动加载机制
- 提供应用启动的桥接函数
- 提供资源加载节奏控制（pace）与进度观测

**详细设计文档**：`docs/15-code-representation-scene-prefab.md`

## 核心概念

### Scene — 场景的代码表示

Scene 继承 `cc.Scene`。链保持纯粹——只做同步的节点树构建。异步资源加载不侵入链语法。

```typescript
import { Scene } from "@aicocos/runtime";
import { Camera, DirectionalLight, Sprite, MeshRenderer } from "cc";
import { main } from "@/generated/assetManifest";

const scene = new Scene("Main")
    // pace 可选，默认 perFrame: 5, concurrency: 10
    .pace({ perFrame: 3, concurrency: 6 })

    // 无异步资源的节点（纯同步）
    .node("MainLight", (light) => {
        light
            .setPosition(0, 10, 0)
            .component(DirectionalLight, { illuminance: 80000 });
    })
    .node("MainCamera", (cam) => {
        cam.setPosition(0, 0, 10)
           .component(Camera, { fov: 45 });
    })

    // 有异步资源的节点（AssetRef 自动加载）
    .node("Bg", (bg) => {
        bg.setContentSize(1920, 1080)
          .component(Sprite, {
              spriteFrame: main.textures.bg,  // AssetRef → 自动注册加载
          });
    })
    .node("Player", (player) => {
        player.setPosition(0, 0, 0)
              .component(MeshRenderer, {
                  mesh: main.models.player,    // AssetRef → 自动注册加载
              });
    });

// 资源加载观测
scene.assets.onProgress((done, total) => updateLoadingBar(done / total));
scene.assets.onComplete(() => console.log("All assets loaded"));

// 等待资源就绪后启动
await scene.assets.ready();
scene.run();

// 或不等待，直接启动——资源在后台按 pace 持续加载
scene.run();
```

**Scene API**：

| 方法 | 说明 |
|------|------|
| `node(name?, builder?)` | 创建子节点（同步） |
| `append(child)` | 添加已有节点 |
| `prefab(prefab)` | 实例化 Prefab 并添加到场景 |
| `pace({ perFrame?, concurrency? })` | 配置资源加载节奏 |
| `assets.onProgress(fn)` | 资源加载进度回调 |
| `assets.onComplete(fn)` | 全部资源加载完成回调 |
| `assets.ready()` | 返回 Promise，全部资源加载完成时 resolve |
| `run()` | 立即启动场景 + 启动资源加载 |
| `load(onProgress?)` | 异步切换场景 + 启动资源加载 |

### Prefab — 预制体的代码表示

Prefab 是抽象类，子类实现 `build(root: Node)` 定义内部结构。`build()` 是纯同步方法——节点和组件同步创建，AssetRef 由 `component()` 自动注册。

```typescript
import { Prefab, Node } from "@aicocos/runtime";
import { Sprite } from "cc";
import { main } from "@/generated/assetManifest";

export class Player extends Prefab {
    constructor() { super("Player"); }

    build(root: Node): void {
        root.setPosition(0, 0, 0)
            .node("Sprite", (sprite) => {
                sprite
                    .setContentSize(64, 64)
                    .component(Sprite, {
                        spriteFrame: main.textures.player,  // AssetRef → 自动加载
                    });
            });
    }
}

// 使用
scene.prefab(new Player());
```

### Node — 链式节点 API

Node 继承 `cc.Node`，所有 setter 返回 `this` 支持链式调用。

**关键 API**：

| 方法 | 说明 |
|------|------|
| `setPosition(x, y, z?)` | 设置位置，链式 |
| `setRotationFromEuler(x, y, z?)` | 设置欧拉旋转，链式 |
| `setScale(x, y, z?)` | 设置缩放，链式 |
| `setActive(active)` | 设置激活状态 |
| `setOpacity(opacity)` | 设置透明度（自动添加 UIOpacity） |
| `setContentSize(w, h)` | 设置内容尺寸（自动添加 UITransform） |
| `setAnchorPoint(x, y)` | 设置锚点（自动添加 UITransform） |
| `component(type, setup?)` | 添加组件，setup 为 Partial 对象或回调 |
| `node(name?, builder?)` | 创建子节点 |
| `append(child)` | 添加已有节点 |
| `prefab(prefab)` | 实例化 Prefab 作为子节点 |

**AssetRef 自动注册**：`component()` 检测配置对象中的 AssetRef 值，自动分离同步属性和资源依赖，将 AssetRef 注册到 Scene 的 ResourceLoader。

### 资源引用

资源通过 `bundle + path + type` 三元组标识，带 symbol brand 用于运行时类型检测：

```typescript
import { assetRef, uuidRef, isAssetRef } from "@aicocos/runtime";

const playerModel = assetRef("main", "characters/player", Mesh);
const effect = uuidRef("a1b2c3d4-...", EffectAsset);

isAssetRef(playerModel);  // true
```

CLI 自动生成 `src/generated/assetManifest.ts` 提供类型安全的资产清单：

```typescript
import { main } from "@/generated/assetManifest";
// main.textures.bg 是 AssetRef<Texture2D>
```

### 资源加载机制

**设计原则**：链负责结构，组件负责资源。

```
component(Sprite, { spriteFrame: main.textures.bg })
  │
  ├── isAssetRef(main.textures.bg) → true
  ├── 同步属性 → Object.assign(comp, syncProps)
  └── AssetRef → scene._registerAssetRef(ref)
        └── ResourceLoader.register(ref)
              ├── 去重
              ├── 加入队列
              ├── rAF 调度器按 pace 发放加载任务
              └── 加载完成 → 自动赋值 comp.spriteFrame = asset
```

**ResourceLoader 参数**（默认值参考 Cocos 反序列化）：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `perFrame` | 5 | 每帧最多启动的新加载数 |
| `concurrency` | 10 | 最大并发加载数 |

**调度器**：`requestAnimationFrame` 驱动，每帧检查队列，在 perFrame 和 concurrency 限制内启动新的加载任务。全部完成后触发 onComplete 和 ready()。

### 应用启动桥接

```typescript
import { registerProjectBootstrap, startApplication } from "@aicocos/runtime";

registerProjectBootstrap(async () => {
    await startApplication({ scene: mainScene });
});
```

**启动链路**：
```
index.html
  → application.js 调用 cc.game.init() + cc.game.run()
    → cc.game.onStart 触发
      → __AICOCOS_BOOTSTRAP__()  (registerProjectBootstrap 注册)
        → startApplication({ scene })
          → scene.run()
            ├── ResourceLoader.ensureStarted() → rAF 调度器启动
            └── director.runSceneImmediate(scene)
```

`settings.json` 中 `launch.launchScene` 设为空字符串 `""`，引擎跳过场景加载直接触发 `onStart`。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      用户代码 (src/)                             │
│                                                                 │
│  new Scene("Main")                                              │
│    .pace(...)                                                    │
│    .node("Light", ...)                                           │
│    .node("Bg", bg => bg.component(Sprite, {                     │
│        spriteFrame: main.textures.bg  ← AssetRef 内联            │
│    }))                                                           │
│                                                                 │
│  scene.assets.onProgress/onComplete/ready()                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Runtime Library (@aicocos/runtime)          │
│                                                                 │
│  Scene (extends cc.Scene)                                       │
│  ├── node/append/prefab          → 同步树构建                    │
│  ├── pace({ perFrame, concurrency }) → 加载节奏                  │
│  ├── assets.onProgress/onComplete/ready() → 加载观测             │
│  └── _registerAssetRef(ref)      → 内部：组件注册资源             │
│                                                                 │
│  Node (extends cc.Node)                                         │
│  ├── component(type, setup)      → 自动检测 + 注册 AssetRef      │
│  └── setPosition/Scale/...       → 链式 Transform               │
│                                                                 │
│  Prefab (abstract)                                              │
│  └── build(root: Node)           → 子类实现（同步）              │
│                                                                 │
│  ResourceLoader                                                 │
│  ├── register(ref) → Promise<Asset>  → 注册 + 去重              │
│  ├── pace / ensureStarted           → 启动 rAF 调度             │
│  └── onProgress / onComplete / ready → 回调                     │
│                                                                 │
│  AssetRef<T> / AssetRefUUID<T>                                  │
│  ├── [ASSET_REF_BRAND]              → brand 标记               │
│  ├── assetRef / uuidRef             → 工厂函数                  │
│  └── isAssetRef                     → 类型守卫                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cocos Engine (cc)                           │
│                                                                 │
│  director.runSceneImmediate()    director.runScene()            │
│  assetManager.loadBundle()       bundle.load()                  │
│  Node.addChild()                 Node.addComponent()            │
└─────────────────────────────────────────────────────────────────┘
```

## 关键文件索引

| 文件 | 职责 |
|------|------|
| [index.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/index.ts) | 运行时入口，re-export 所有模块 |
| [app.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/app.ts) | 启动桥接：registerProjectBootstrap, startApplication |
| [scene.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/scene.ts) | Scene — 继承 cc.Scene，pace/assets/run/load |
| [prefab.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/prefab.ts) | Prefab — 抽象类，模板方法，子类实现 build() |
| [node.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/node.ts) | Node — 链式 API，component() 自动注册 AssetRef |
| [asset.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/asset.ts) | 资源引用协议：assetRef, uuidRef, isAssetRef, loadAsset |
| [resource-loader.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/resource-loader.ts) | ResourceLoader — rAF 调度、pace 控制、去重、进度回调 |

## 核心流程

### 1. 应用启动

```
new Scene("Main")
  .pace({ perFrame: 3 })
  .node(...)
  .node(...)
       │
       ├── registerProjectBootstrap(bootstrap)
       │     └── 将启动函数存入 globalThis.__AICOCOS_BOOTSTRAP__
       │
       └── 浏览器加载 index.html
             ├── 1. 加载 polyfills.js
             ├── 2. 加载 cocos-js/cc.js (IIFE → window.cc)
             ├── 3. 加载 src/chunks/bundle.js (注册 bootstrap)
             ├── 4. 加载 application.js
             │      ├── cc.game.init()
             │      └── cc.game.run()
             │            └── onStart → __AICOCOS_BOOTSTRAP__()
             │                  └── startApplication({ scene })
             │                        └── scene.run()
             │                              ├── ResourceLoader 启动 (rAF)
             │                              └── director.runSceneImmediate(scene)
             └── 场景渲染 + 资源后台加载
```

### 2. 场景构建（同步）

```
new Scene("Main")
  .node("Camera", cam => cam.component(Camera))
  .node("Bg", bg => bg.component(Sprite, { spriteFrame: main.textures.bg }))
  .prefab(new Player())
       │
       ├── 所有 node() / prefab() 同步执行
       ├── component() 同步创建组件
       ├── AssetRef 自动注册到 ResourceLoader
       └── 链结束 → 完整节点树已构建
```

### 3. 资源加载（异步，自动）

```
scene.run()
  → ResourceLoader.ensureStarted()
    → rAF loop {
        每帧: 从队列取最多 perFrame 个，不超过 concurrency
        → loadAsset / loadAssetByUUID
        → 完成后: comp[key] = asset (自动应用)
        → onProgress 回调
        → 全部完成: onComplete 回调 + ready() resolve
    }
```

### 4. Prefab 实例化

```
new Player().instantiate(parent)
  ├── 1. 创建根 Node
  ├── 2. 加入 parent（如果有）
  ├── 3. 调用 build(root)（同步）
  │       └── component(Sprite, { spriteFrame: AssetRef })
  │             └── AssetRef 自动注册到 Scene 的 ResourceLoader
  ├── 4. 激活节点
  └── 5. 返回根 Node
```

## 与 Cocos Creator 的对照

| 概念 | Cocos Creator | AiCocos |
|------|--------------|---------|
| 场景定义 | `.scene` JSON 文件 | `Scene` 子类 / 工厂函数 |
| 预制体定义 | `.prefab` JSON 文件 | `Prefab` 抽象子类 |
| 节点操作 | 编辑器拖拽 + 属性面板 | `Node` 链式 API |
| 组件添加 | Add Component 按钮 | `node.component(Type, setup)` |
| 资源引用 | 拖拽到属性面板 → UUID | `assetRef(bundle, path, type)` 内联在 `component()` 中 |
| 资源加载 | 构建时打包，运行时自动 | 组件自动注册 + ResourceLoader 按 pace 调度 |
| 场景切换 | `director.loadScene("name")` | `scene.run()` / `scene.load()` |
| 启动流程 | `launchScene` → `.scene` | `launchScene:""` → bootstrap |

## 排查指南

### 资源不显示

1. **检查 AssetRef 是否正确传递**
   - 确认 `component()` 的第二个参数使用 Partial 对象模式（非回调模式）
   - 回调模式下 AssetRef 不会自动注册，需手动调用 `loadAsset()`

2. **检查 pace 配置**
   - 确认 `perFrame` 和 `concurrency` 值合理
   - 观察 `onProgress` 回调是否触发

3. **检查 assetManifest**
   - 运行 `aicocos asset` 确保清单最新
   - 确认 `src/generated/assetManifest.ts` 存在且路径正确

### 启动白屏

1. 确认浏览器 Console 无报错
2. 确认 `cocos-js/cc.js` 可访问 (200)
3. 确认 `src/chunks/bundle.js` 可访问 (200)
4. 确认 `settings.json` 中 `launch.launchScene` 为空字符串

### Prefab 实例化失败

1. 确认子类正确实现了 `build(root: Node)`
2. 确认 Prefab 是 `new` 出来的实例，而非类引用

## 相关文档

- [AiCocos 整体架构](./overview.md)
- [CLI 设计](./cli-design.md)
- [迁移系统](./migration.md)
- [Cocos Engine 资源加载流程](../core/asset.md)

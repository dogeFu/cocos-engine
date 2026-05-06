# Cocos Creator 引擎 — AI RAG 中文参考索引

> 引擎全模块中文参考文档，面向 AI 辅助编程。每篇文档涵盖关键类、API、内部机制、隐含约束与设计细节、文件路径索引。

---

## 目录结构

```
Rag/
├── core/           # 核心引擎 — 生命周期、场景图、工具、装饰器、序列化、资源、输入
├── rendering/      # 渲染系统 — 渲染数据层、渲染管线、Render Graph、渲染白话
├── 2d/             # 2D 系统 — Sprite/Label/UI/TiledMap/粒子
├── 3d/             # 3D 系统 — 模型/灯光/相机/粒子/光照探针
├── physics/        # 物理系统 — 3D/2D 物理
├── animation/      # 动画与音频 — 动画系统、音频、缓动
├── platform/       # 平台适配 — 小游戏、原生平台
│   └── native/     #   原生平台 — PAL/JSB/C++/CMake
├── build/          # 构建体系 — 引擎编译流程、Vite/Babel/宏配置/模块裁剪
├── extensions/     # 扩展模块 — Spine/DragonBones/杂项
├── aicocos/        # AiCocos 项目 — 引擎集成、CLI、运行时、迁移
└── README.md       # 本文件
```

---

## 📦 core/ — 核心引擎

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [engine-lifecycle.md](core/engine-lifecycle.md) | `core`、`game`、`scene-graph`、`gfx` | 游戏生命周期、Director tick 循环、Node/Component 系统、GFX 抽象层 |
| [scene-graph-detail.md](core/scene-graph-detail.md) | `director`、`node-activator`、`component-scheduler`、`class` | Director 生命周期、NodeActivator、ComponentScheduler、CCClass 属性存储、Node 变换系统 |
| [utilities.md](core/utilities.md) | `memop`、`curves`、`geometry`、`math`、`scheduler`、`system`、`settings`、`debug`、`event` | 内存池、曲线系统、几何模块、值类型、调度器、System 基类、Settings、错误系统、事件系统 |
| [decorators.md](core/decorators.md) | `cc.decorator` | 30 个装饰器完整参考、@property 选项、类型推断、序列化行为、编辑器显示 |
| [serialization.md](core/serialization.md) | `serialization` | CCON 格式、反序列化、instantiate 深拷贝、JIT 预制体优化、UUID 压缩算法、Details.assignAssetsBy()、EditorExtends 序列化 |
| [asset.md](core/asset.md) | `asset` | 资源加载/释放、Bundle、SpriteFrame、Material、EffectAsset、引用计数 |
| [input.md](core/input.md) | `input` | 触摸/鼠标/键盘事件、EventTouch/EventMouse、输入分发机制 |

## 🎨 rendering/ — 渲染系统

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [render-scene.md](rendering/render-scene.md) | `render-scene`、`effect`、`shader`、`pass`、`root` | 渲染场景数据层、Effect/Shader 系统、Pass 管线状态、ProgramLib、Root 帧循环、SceneGlobals |
| [pipeline.md](rendering/pipeline.md) | `rendering`、`webgpu`、`gi`、`sorting` | 渲染管线（前向/延迟）、阴影系统、管线 UBO、光照探针、WebGPU 后端、SortingLayers |
| [render-graph.md](rendering/render-graph.md) | `native/cocos/renderer/pipeline/custom/` | Render Graph 新一代渲染管线（C++ 层）、BasicPipeline/Pipeline 接口、RenderGraph/ResourceGraph/LayoutGraph 数据结构、PipelineBuilder、编译与执行 |
| [rendering-plain.md](rendering/rendering-plain.md) | 渲染概念 | 渲染流程通俗解读、GFX/Rendering/Render Graph 概念类比、前向/延迟渲染对比 |

## 🖼️ 2d/ — 2D 系统

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [2d-ui.md](2d/2d-ui.md) | `2d`、`ui`、`tiledmap`、`particle-2d` | Sprite/Label/Mask、UI 布局/滚动/按钮、Batcher2D、动态图集、TiledMap 完整实现、2D 粒子 |

## 🧊 3d/ — 3D 系统

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [3d-system.md](3d/3d-system.md) | `3d`、`primitive`、`gi/light-probe` | Mesh/Model、灯光组件、相机、LOD、反射探针、GI 光照探针系统（SH/Delaunay/插值） |
| [particle-3d.md](3d/particle-3d.md) | `particle` | 3D 粒子系统组件、发射器形状、生命周期模块、CurveRange/GradientRange、CPU/GPU 渲染器 |

## ⚡ physics/ — 物理系统

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [physics.md](physics/physics.md) | `physics`、`physics-2d` | 3D/2D 刚体、碰撞器、射线检测、PhysicsSelector、三后端架构、9 种关节 |

## 🎬 animation/ — 动画与音频

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [animation.md](animation/animation.md) | `animation`、`3d/skeletal-animation` | 动画剪辑/状态/轨道、骨骼动画、BlendState、动画遮罩、CrossFade |
| [audio-tween.md](animation/audio-tween.md) | `audio`、`tween` | 音频源/剪辑、AudioManager、Tween 链式 API、缓动函数、Action 体系 |

## 📱 platform/ — 平台适配

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [minigame.md](platform/minigame.md) | `pal/minigame`、小游戏平台、`vite/platforms/` | 小游戏平台适配、pal/minigame 模块、各平台差异、构建配置、platforms/ 源码 |

### platform/native/ — 原生平台

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [pal-architecture.md](platform/native/pal-architecture.md) | `pal/` | PAL 架构设计、接口一致性校验、各模块平台差异、路径别名解析 |
| [jsb-binding.md](platform/native/jsb-binding.md) | JSB 绑定层 | JSB 工作原理、jsb 全局对象、反射调用（Android/iOS/OH）、jsb.bridge、装饰器补丁 |
| [cpp-engine.md](platform/native/cpp-engine.md) | `native/cocos/` | C++ 引擎架构、平台抽象、渲染后端、数学库、网络、音频 |
| [native-build.md](platform/native/native-build.md) | CMake 构建 | 原生构建配置、CMake 选项、平台检测、JS 引擎选择、图形后端 |

## 🔧 build/ — 构建体系

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [engine-build.md](build/engine-build.md) | 引擎编译流程 | Vite + Babel/Rollup 双构建体系、虚拟模块、路径别名、平台配置、编译流程 |
| [vite-build.md](build/vite-build.md) | `vite`、`rollup`、`build`、`plugins` | Vite/Rollup 构建架构、插件体系、IIFE 输出格式、与 SystemJS 行为差异 |
| [babel-systemjs-build.md](build/babel-systemjs-build.md) | `ccbuild`、`babel`、`systemjs` | Babel+SystemJS 原始构建体系、ccbuild API、15 个 Rollup 插件链、4 个 TS Transformer |
| [macro-config.md](build/macro-config.md) | `constants`、`features` | 宏配置与条件编译体系、cc.config.json、internal:constants、运行时 macro |
| [module-culling.md](build/module-culling.md) | `features`、`module-culling` | 引擎模块裁剪体系、四层裁剪机制、Vite 插件链、公共模块导出层 |

## 🧩 extensions/ — 扩展模块

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [spine-dragonbones.md](extensions/spine-dragonbones.md) | `spine`、`dragon-bones` | Spine/DragonBones 运行时、缓存模式、骨骼挂点、WASM 集成 |
| [misc.md](extensions/misc.md) | `video`、`web-view`、`profiler`、`misc`、`renderer` | 视频/WebView、性能分析器、MissingScript、Renderer 三层材质体系 |

## 🤖 aicocos/ — AiCocos 项目

| 文档 | 覆盖模块 | 说明 |
|------|---------|------|
| [overview.md](aicocos/overview.md) | AiCocos 项目概览 | 项目目标、架构设计、模块划分 |
| [engine-integration.md](aicocos/engine-integration.md) | 引擎集成 | Cocos 引擎集成方式、启动流程、模块适配 |
| [cli-design.md](aicocos/cli-design.md) | CLI 设计 | 命令行工具架构、命令体系、插件机制 |
| [runtime-design.md](aicocos/runtime-design.md) | 运行时设计 | 运行时架构、组件系统、渲染集成 |
| [migration.md](aicocos/migration.md) | 迁移系统 | 项目迁移、资源迁移、组件映射 |

---

**合计：35 篇文档，11 个分类目录，覆盖全部 31 个 `cocos/` 子模块及 AiCocos 项目。**

---

## 速查：常用脚本模式

### 游戏生命周期

```
Game.init() → EVENT_GAME_INITED → EVENT_PROJECT_INITED → Game.run()
  → Director.mainLoop（每帧）:
    → EVENT_BEGIN_FRAME
    → ComponentScheduler.updateAll（update → lateUpdate）
    → Director.emit(EVENT_AFTER_UPDATE)
    → Director.emit(EVENT_BEFORE_COMMIT)
    → RenderScene.render()
    → Director.emit(EVENT_AFTER_DRAW)
    → EVENT_END_FRAME
```

- **文件：** `cocos/game/game.ts`（Game）、`cocos/core/director.ts`（Director）

### 组件生命周期

```
preload() → onLoad() → onEnable() → start() → update() → lateUpdate() → onDisable() → onDestroy()
```

- `start()` 仅执行一次，在 `onLoad()` 之后的首个激活帧
- `update(dt)` / `lateUpdate(dt)` 接收的 dt 单位为秒
- **文件：** `cocos/scene-graph/component.ts`

### 节点层级

- `node.parent = otherNode` — 重新设置父节点
- `node.addChild(child)` / `node.removeChild(child)`
- `node.getComponent(ClassName)` — 返回首个匹配组件
- `node.getComponentsInChildren(ClassName)` — 递归搜索
- `node.active = false` — 禁用所有组件（触发 `onDisable`）
- **文件：** `cocos/scene-graph/node.ts`

### 资源加载

```ts
// 从 resources 包加载
resources.load('textures/bg', SpriteFrame, (err, asset) => { ... });

// 从自定义 Bundle 加载
assetManager.loadBundle('myBundle', (err, bundle) => {
    bundle.load('hero', SpriteFrame, (err, sf) => { ... });
});

// 远程 URL 加载
assetManager.loadRemote('https://example.com/img.png', (err, asset) => { ... });
```

- **文件：** `cocos/asset/asset-manager/asset-manager.ts`

### 输入事件

```ts
// 全局输入
input.on(InputEventType.TOUCH_START, (event: EventTouch) => {
    const touch = event.touch!;
    const pos = touch.getLocation(); // OpenGL 坐标
    const uiPos = touch.getUILocation(); // UI 坐标
}, this);

// 节点级输入
node.on(Node.EventType.TOUCH_START, (event: EventTouch) => { ... }, this);

// 键盘
input.on(InputEventType.KEY_DOWN, (event: EventKeyboard) => {
    if (event.keyCode === KeyCode.SPACE) { ... }
}, this);
```

- **文件：** `cocos/input/input.ts`、`cocos/input/types/event-enum.ts`

### Tween 缓动

```ts
tween(node)
    .to(1.0, { position: new Vec3(100, 0, 0) }, { easing: 'bounceOut' })
    .delay(0.5)
    .call(() => log('完成'))
    .start();
```

- 必须调用 `start()` 才会生效
- `to()` 是绝对值，`by()` 是相对值
- **文件：** `cocos/tween/tween.ts`

### 材质属性

```ts
const mat = renderer.material;
mat.setProperty('mainColor', new Color(255, 0, 0, 255));
mat.setProperty('albedo', texture);
mat.recompileShaders({ USE_INSTANCING: true }); // 仅对实例化副本有效
```

- **文件：** `cocos/asset/assets/material.ts`

### 物理射线检测

```ts
const ray = new Ray(origin, direction);
const results: RaycastResult[] = [];
physicsWorld.raycast(results, ray, PhysicsSystem.PhysicsGroup.DEFAULT, maxDistance);
```

- **文件：** `cocos/physics/framework/physics-system.ts`

---

## 关键单例

| 单例 | 访问方式 | 文件 |
|---|---|---|
| `game` | `import { game } from 'cc'` | `cocos/game/game.ts` |
| `director` | `import { director } from 'cc'` | `cocos/core/director.ts` |
| `assetManager` | `import { assetManager } from 'cc'` | `cocos/asset/asset-manager/asset-manager.ts` |
| `resources` | `import { resources } from 'cc'` | `cocos/asset/asset-manager/bundle.ts` |
| `input` | `import { input } from 'cc'` | `cocos/input/input.ts` |
| `PhysicsSystem` | `PhysicsSystem.instance` | `cocos/physics/framework/physics-system.ts` |
| `PhysicsSystem2D` | `PhysicsSystem2D.instance` | `cocos/physics-2d/framework/physics-system.ts` |
| `tween`（模块） | `import { tween } from 'cc'` | `cocos/tween/tween.ts` |
| `view` | `import { view } from 'cc'` | `cocos/core/platform/view.ts` |
| `screen` | `import { screen } from 'cc'` | `cocos/core/platform/screen.ts` |
| `sys` | `import { sys } from 'cc'` | `cocos/core/platform/sys.ts` |
| `cclegacy` | `import { cclegacy } from 'cc'` | `cocos/core/global-exports.ts` |

---

## 跨模块常见陷阱

1. **instantiate() 不克隆资源** — `instantiate()` 引用资源而非深拷贝。（[serialization.md](core/serialization.md) §6）
2. **`node.active = false` 触发 `onDisable`** — 组件递归停用。（[engine-lifecycle.md](core/engine-lifecycle.md) §2）
3. **触摸事件逐个分发** — 每个 changed touch 之间会重置传播状态。（[input.md](core/input.md) §2.8）
4. **Material.initialize() 只能调用一次** — 重复初始化会打印警告并被拒绝。（[asset.md](core/asset.md) §1.6）
5. **Phase 不匹配 = 不可见** — 渲染对象的 pass.phase 必须匹配管线的 phase 位掩码，否则静默剔除。（[pipeline.md](rendering/pipeline.md) §1.5）
6. **`to()` 是绝对值，`by()` 是相对值** — Tween 常见混淆。（[audio-tween.md](animation/audio-tween.md) §3）
7. **SpriteFrame.texture 设为 null 会被拒绝** — 设置 `spriteFrame.texture = null` 会警告并忽略。（[asset.md](core/asset.md) §1.5）
8. **`getTouches()` vs `getAllTouches()`** — 多点触控事件中返回不同的集合。（[input.md](core/input.md) §2.3）
9. **WebGL mipmap 需要 2 的幂** — 非 POT 纹理不会自动生成 mipmap。（[asset.md](core/asset.md) §1.4）
10. **预制体 JIT 阈值 = 3** — 前 3 次实例化使用标准克隆，之后切换为 JIT 代码生成。（[serialization.md](core/serialization.md) §3.4）
11. **延迟管线不支持 unlit 材质** — GBuffer 阶段需要光照模型，unlit 着色器会渲染为黑色。（[pipeline.md](rendering/pipeline.md) §1.7）
12. **CSM 可能被自动禁用** — 设备 `maxFragmentUniformVectors` 不足时会回退到单级阴影。（[pipeline.md](rendering/pipeline.md) §1.8）
13. **3D 粒子 Trail 模块仅 CPU** — `useGPU` 开启后拖尾不可用。（[particle-3d.md](3d/particle-3d.md) §5.5）
14. **动画 `play()` 本质是 `crossFade(name, 0)`** — 会先 `clear()` 停止所有其他状态。（[animation.md](animation/animation.md) §1.12）
15. **Spine 皮肤必须在动画之前设置** — 先设动画后设皮肤会导致渲染异常。（[spine-dragonbones.md](extensions/spine-dragonbones.md) §1）

---

*基于 cocos-engine 源码整理。所有文件路径引用当前代码库。*

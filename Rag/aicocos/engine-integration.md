# 引擎集成与启动

## 概述

AiCocos 需要在两种环境中运行 Cocos Engine：
1. **Node.js 无头环境**：用于 CLI 资源导入、Effect 编译、迁移转换
2. **浏览器运行时**：用于游戏运行

本文档覆盖无头引擎初始化机制和浏览器端启动流程。

## 核心概念

### EDITOR=true 与 CC_EDITOR 的区别

这是理解 AiCocos 引擎集成的关键：

| 标志 | 类型 | 作用 | AiCocos 设置 |
|------|------|------|-------------|
| `EDITOR` | 编译时常量 | 决定 `_serialize()` 方法体是否被包含 | CLI 构建时 `true`，Web 构建时 `false` |
| `CC_EDITOR` | 运行时标志 | 控制编辑器 UI/回调等运行时行为 | 无头引擎 `false`，浏览器 `false` |
| `window.Build` | 运行时标志 | 跳过 `class.ts` 中的编辑器属性回调 | 无头引擎 `true` |

**设计意图**：CLI 批量导入需要序列化能力（编译时 EDITOR=true 保留 `_serialize()`），但不需要编辑器交互行为（运行时 CC_EDITOR=false 禁用）。`window.Build=true` 跳过 `class.ts` 中 6 处 `(EDITOR && !window.Build)` 守卫。

### _serialize() 方法保留

7 个资源类的 `_serialize()` 方法在 `EDITOR=false` 编译时被 tree-shake 移除：ImageAsset、TextureBase、Texture2D、TextureCube、RenderTexture、SpriteFrame、SpriteAtlas。AiCocos 使用 CLI 构建（`EDITOR=true`）的引擎版本来保留这些方法。

## 无头引擎初始化

### 初始化流程

```typescript
initEngineHeadless(engineRoot: string): Promise<void>
    │
    ├── 1. setupWindowMocks()         ← 模拟浏览器全局对象
    ├── 2. loadViteEngineExports()    ← 加载 Vite IIFE 构建的 cc.js
    ├── 3. patchViteEngineBundle()    ← 替换动态 import 和 emscripten 引用
    ├── 4. 初始化 EditorExtends       ← 升级 serialize 实现
    ├── 5. buildOfflineMappings()     ← 构建 GLSL 类型映射表
    ├── 6. Hook Module._resolveFilename / Module._load  ← 拦截 require
    └── 7. 预加载内置 chunk 文件      ← effect 编译所需
```

### 浏览器环境模拟

`setupWindowMocks()` 设置以下全局对象：

```typescript
g.window.Build = true;     // 跳过编辑器属性回调
g.CC_EDITOR = false;       // 禁用编辑器交互行为
g.CC_PREVIEW = false;
g.window = g;
g.document = { createElement: () => ({...}), ... };
g.navigator = { userAgent: 'node' };
g.WebGLRenderingContext = createStubGL();
g.requestAnimationFrame = (cb) => setTimeout(cb, 16);
```

### WebGL 上下文桩

Effect 编译器需要 WebGL 上下文进行 Shader 验证。桩实现使所有编译检查返回成功：

```typescript
function createStubGL() {
    return {
        VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632,
        COMPILE_STATUS: 35713, LINK_STATUS: 35714,
        createShader: () => ({}), compileShader: () => {},
        getShaderParameter: () => true,  // 总是返回编译成功
        createProgram: () => ({}), linkProgram: () => {},
        getProgramParameter: () => true,
        // ...
    };
}
```

### offline-mappings 构建

从引擎导出构建 GLSL 类型 ↔ gfx.Type 枚举映射、格式映射、Pass 参数映射。约 200 行代码，与引擎源码高度耦合，引擎升级时需同步修改。

### Module Hook

拦截 `Module._resolveFilename` 和 `Module._load`：
- `require('cc/editor/offline-mappings')` → 返回手工构建的映射对象
- `require('gl')` → 返回 stub WebGL context

### 已知限制

| 限制 | 原因 | 影响 |
|------|------|------|
| `vm.runInThisContext` 安全风险 | 执行引擎代码 | 不可在不受信环境运行 |
| Module hook 是全局的 | 可能影响其他模块 | 初始化顺序需注意 |
| Shader 编译错误被掩盖 | stub 总返回成功 | Effect 问题不易发现 |
| offline-mappings 手工维护 | 与引擎源码耦合 | 引擎升级需同步 |

## 浏览器端启动流程

### 10 步启动链路

```
1. 浏览器加载 index.html
    ↓
2. 加载 polyfills.bundle.js (ES polyfills)
    ↓
3. 加载 cocos-js/cc.js (Vite IIFE) → 全局 cc 对象可用
    ↓
4. 加载 chunks/bundle.js (Vite IIFE) → 注册 __AICOCOS_BOOTSTRAP__
    ↓
5. 加载 application.js (IIFE) → 启动引擎
    ↓
6. cc.game.init() → cc.game.run()
    ↓
7. 引擎初始化完成，触发 game.onStart
    ↓
8. 调用 globalThis.__AICOCOS_BOOTSTRAP__()
    ↓
9. startApplication({ scene }) → scene.run()
    ↓
10. director.runSceneImmediate(scene) - 场景启动完成
```

### 空 launchScene 安全性

`settings.json` 中 `launch.launchScene` 设为空字符串 `""`。引擎源码确认空字符串时跳过场景加载，直接触发 `onStart`。这是 AiCocos 代码驱动场景加载的基础。

### IIFE 加载模式

- 无需 SystemJS，不依赖 import-map
- 浏览器原生支持 `<script>` 标签加载
- `cc` 作为 external，通过 `window.cc` 全局访问
- 项目代码打包为 Vite IIFE 格式，`globals: { cc: "cc" }`

### 运行时产物结构

```
dist/web-desktop/debug/
├── index.html
├── style.css
├── application.js          # cc.game.init + cc.game.run + __AICOCOS_BOOTSTRAP__
├── polyfills.bundle.js
├── settings.json           # launchScene: ""
├── effect.bin
├── cocos-js/
│   └── cc.js               # Vite IIFE 引擎构建
├── chunks/
│   └── bundle.js            # 用户代码 (Vite IIFE)
└── assets/
    ├── internal/
    │   ├── config.json
    │   ├── index.js         # no-op
    │   └── import/*
    └── main/
        ├── config.json
        ├── index.js         # no-op
        ├── import/*
        └── native/*
```

### Bundle 初始化流程

```
cc.game.init()
    ├── 读取 settings.json → projectBundles: ["internal", "main"]
    ├── 初始化 AssetManager
    ├── 加载 projectBundles → 读取 config.json → 注册 Bundle
    └── 预加载 preloadBundles → assetManager.loadBundle("main")
        → main 的 deps: ["internal"] → 先自动加载 internal
```

### 图片加载链路

```
bundle.load("path/to/texture", Texture2D)
    ├── 1. config.json paths 找到 UUID
    ├── 2. 加载 import/{uuid}.json
    ├── 3. JSON 反序列化 → 创建 Asset 对象
    ├── 4. ImageAsset._deserialize() → 读取 fmt → _setRawAsset(".png")
    ├── 5. nativeUrl getter → transformPipeline → 拼接 native 路径
    ├── 6. Downloader → downloadDomImage(url)
    └── 7. Factory → new ImageAsset() → 赋值
```

## 关键文件索引

| 文件 | 职责 |
|------|------|
| [engine-headless.ts](file:///Users/kay/Git/aicocos/packages/cli/src/engine-headless.ts) | 无头引擎初始化 |
| [editor-extends/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/editor-extends/index.ts) | EditorExtends 门面 |
| [editor-extends/uuid.ts](file:///Users/kay/Git/aicocos/packages/cli/src/editor-extends/uuid.ts) | UUID 压缩/解压 |
| [editor-extends/serialize/parser.ts](file:///Users/kay/Git/aicocos/packages/cli/src/editor-extends/serialize/parser.ts) | 序列化解析器 |
| [effect-compiler/index.js](file:///Users/kay/Git/aicocos/packages/cli/src/effect-compiler/index.js) | Effect 编译器 |
| [project-build/shell-generator.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/shell-generator.ts) | Shell 生成 |
| [project-build/engine-resolve.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/engine-resolve.ts) | 引擎构建 |

## 排查指南

### 引擎模块加载失败

1. 检查引擎路径是否为绝对路径
2. 检查 `bin/.cache/dev-cli/` 或 `bin/vite/cli/` 是否存在
3. 检查 Node.js 版本（需要 16+）

### Effect 编译失败

1. 检查 `editor/assets/chunks/**/*.chunk` 是否存在
2. 检查 offline-mappings 的 typeMap/formatMap 是否完整

### 浏览器白屏

1. 检查 `application.js` 是否存在且调用 `__AICOCOS_BOOTSTRAP__`
2. 检查 `settings.json` 的 `launchScene` 是否为空字符串
3. 检查 `cocos-js/cc.js` 和 `chunks/bundle.js` 是否可访问

## 相关文档

- [AiCocos 整体架构](./overview.md)
- [CLI 设计](./cli-design.md)
- [运行时设计](./runtime-design.md)
- [迁移系统](./migration.md)
- [Cocos Engine 序列化系统](../core/serialization.md)

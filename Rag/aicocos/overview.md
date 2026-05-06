# AiCocos 项目整体架构

## 概述

AiCocos 是一个基于 Cocos Engine 3.8.8 的代码优先游戏开发框架，提供独立的 CLI 工具和运行时，支持脱离 Creator 编辑器进行游戏开发。

### 设计理念

1. **Code-First 是源真相**：TS 代码定义场景，而非序列化文件。Scene/Prefab 的源格式是 TypeScript 模块，不是 `.scene/.prefab` JSON 文件。这使得代码可静态分析、类型安全、可版本控制、无编辑器依赖。
2. **兼容优先，不改引擎源码**：复用官方资源导入和构建链路，产物与官方一致。所有构建逻辑在 `@aicocos/cli` 包内自主实现，cocos-cli 仅作参考，不共享代码也不修改。
3. **分层清晰**：导入、清单、打包、启动各层职责明确，通过文件系统解耦。
4. **渐进式落地**：先跑通核心链路，再逐步对齐官方行为，最后优化体验。

### 核心设计决策

1. **Scene/Prefab 的源格式是 TS 模块**，不是 `.scene/.prefab` 文件
2. **脚本继续走官方脚本构建链路**
3. **原始资源继续走官方 importer**
4. **上层公开资产引用用 `bundle + path (+ type)`**，不直接暴露 UUID
5. **空 scene 只用于 build 兼容**，不进入真实启动链路
6. **不生成完整 Creator 项目作为主工作流**，只生成官方链路所需的兼容产物
7. **运行时采用 Custom TS Startup**，引擎编译必须依赖 `@cocos/ccbuild`

### 不推荐方案（及原因）

| 方案 | 不推荐原因 |
|------|-----------|
| 完整翻译成 .scene/.prefab | 双向同步困难，丢失 code-first 优势 |
| 绕开官方 importer | 无法复用官方 handler，维护成本极高 |
| 字符串形式资源路径 | 无类型安全，重构困难 |
| 空 scene 作为启动壳 | 启动链路复杂，依赖引擎内部行为 |

## 核心概念

### 项目结构

```
aicocos/
├── packages/
│   ├── cli/                    # CLI 工具
│   │   ├── src/
│   │   │   ├── index.ts            # CLI 入口，命令路由
│   │   │   ├── asset-pipeline/     # 资源管线（导入 + Manifest + 打包）
│   │   │   ├── script-pipeline/    # 脚本管线（Vite 编译 / 静态服务器）
│   │   │   ├── project-build/      # 最终构建（引擎 + 设置 + Shell + 平台配置）
│   │   │   ├── editor-extends/     # EditorExtends 移植（序列化/UUID/缺失类报告）
│   │   │   ├── effect-compiler/    # Effect 编译器
│   │   │   ├── gltf-converter/     # glTF → cc.Mesh 转换
│   │   │   ├── fbx-convert/        # FBX 格式转换
│   │   │   ├── handlers/           # 资源处理器（image/audio/effect/json/mesh...）
│   │   │   ├── asset-importer.ts   # 资源导入底层逻辑
│   │   │   ├── bundle-packager.ts  # Bundle 打包底层逻辑
│   │   │   ├── bundle-scanner.ts   # Manifest 引用扫描
│   │   │   ├── internal-bundle-planner.ts # Internal bundle 依赖闭包计算
│   │   │   ├── manifest-generator.ts # assetManifest.ts 生成
│   │   │   ├── engine-headless.ts  # 无头引擎初始化
│   │   │   ├── project-config.ts   # 项目配置解析
│   │   │   ├── migration-*.ts      # 迁移系统（7 个文件）
│   │   │   └── cc-shim.ts         # cc 懒加载 Proxy
│   │   └── templates/              # 项目模板
│   │
│   └── runtime/                # 运行时库
│       └── src/
│           ├── index.ts            # 运行时入口
│           ├── app.ts              # 启动桥接（registerProjectBootstrap + startApplication）
│           ├── scene.ts            # Scene DSL
│           ├── prefab.ts           # Prefab DSL
│           ├── node.ts             # Node 链式 API
│           ├── asset.ts            # 资源引用（AssetRef / uuidRef）
│           └── resource-loader.ts  # 资源加载调度器
│
└── knowledge/                  # 知识库文档
```

### 五层架构

```
┌──────────────────────────────────────────────────────────────┐
│  A. Code Source Layer                                        │
│  TS 代码：scene、prefab、组件、游戏入口、业务逻辑            │
└──────────────────────────────────────────────────────────────┘
                                                     ↓
┌──────────────────────────────────────────────────────────────┐
│  B. Raw Asset Layer                                          │
│  原始资源：图片、模型、音频、材质、effect、压缩纹理等        │
└──────────────────────────────────────────────────────────────┘
                                                     ↓
┌──────────────────────────────────────────────────────────────┐
│  C. Compatibility Layer                                      │
│  - TS 资产引用收集（扫描 assetManifest.ts 导入）             │
│  - 原始资源导入到 library（@cocos/asset-db）                 │
│  - 生成 asset manifest / bundle config / settings            │
└──────────────────────────────────────────────────────────────┘
                                                     ↓
┌──────────────────────────────────────────────────────────────┐
│  D. Official Toolchain Layer                                 │
│  - @cocos/ccbuild（引擎 Vite 编译）                          │
│  - @cocos/asset-db（资源导入管线）                            │
│  - @cocos/build-polyfills（polyfills 构建）                   │
└──────────────────────────────────────────────────────────────┘
                                                     ↓
┌──────────────────────────────────────────────────────────────┐
│  E. Runtime Output Layer                                     │
│  - Engine runtime (cocos-js/cc.js, IIFE 格式)                │
│  - scriptPackages / chunks (bundle.js, IIFE 格式)            │
│  - bundles/config/import/native                              │
│  - settings.json / effect.bin                                │
└──────────────────────────────────────────────────────────────┘
```

**数据流**：TS 源码 → 资产引用收集 → asset-manifest → 原始资源导入 → bundle/config/settings → 运行时产物

## 关键文件索引

### CLI 核心

| 文件 | 职责 |
|------|------|
| [index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/index.ts) | CLI 入口，命令路由 |
| [asset-pipeline/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/asset-pipeline/index.ts) | 资源管线入口 |
| [asset-pipeline/watch.ts](file:///Users/kay/Git/aicocos/packages/cli/src/asset-pipeline/watch.ts) | 资源 watch 模式 |
| [script-pipeline/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/script-pipeline/index.ts) | 脚本管线入口 |
| [script-pipeline/vite-config.ts](file:///Users/kay/Git/aicocos/packages/cli/src/script-pipeline/vite-config.ts) | Vite 配置工厂 |
| [script-pipeline/dev-server.ts](file:///Users/kay/Git/aicocos/packages/cli/src/script-pipeline/dev-server.ts) | Node.js 静态文件服务器 |
| [project-build/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/index.ts) | 最终构建入口 |
| [project-build/engine-resolve.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/engine-resolve.ts) | 引擎 cc.js 处理 |
| [project-build/platforms/base.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/platforms/base.ts) | 平台配置接口 |
| [asset-importer.ts](file:///Users/kay/Git/aicocos/packages/cli/src/asset-importer.ts) | 资源导入底层 |
| [bundle-packager.ts](file:///Users/kay/Git/aicocos/packages/cli/src/bundle-packager.ts) | Bundle 打包底层 |
| [project-config.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-config.ts) | 项目配置 |

### 运行时库

| 文件 | 职责 |
|------|------|
| [runtime/index.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/index.ts) | 运行时入口 |
| [runtime/app.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/app.ts) | 启动桥接 |
| [runtime/scene.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/scene.ts) | Scene DSL |
| [runtime/prefab.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/prefab.ts) | Prefab DSL |
| [runtime/node.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/node.ts) | Node 链式 API |
| [runtime/asset.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/asset.ts) | 资源引用 |
| [runtime/resource-loader.ts](file:///Users/kay/Git/aicocos/packages/runtime/src/resource-loader.ts) | 资源加载调度器 |

## 核心流程

### 三管线架构

CLI 按职责拆分为三条独立管线，通过文件系统解耦：

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Asset Pipeline   │    │ Script Pipeline   │    │  Project Build    │
│  aicocos asset    │    │  aicocos script   │    │  aicocos build    │
│  aicocos asset -w │    │  aicocos script -w│    │  aicocos run      │
└────────┬──────────┘    └────────┬──────────┘    └───────────────────┘
         │                         │
         ▼                         ▼
    library/                  src/chunks/bundle.js
    src/generated/
    assetManifest.ts
    assets/{bundle}/
```

### 构建流程 (aicocos build)

```
aicocos build
    │
    ├── 1. Asset Pipeline
    │       - importInternalAssets()  ← 先导入引擎内置资源（必须先于项目资源）
    │       - importProjectAssets()   ← 后导入项目资源（extractFbxSubAssets 依赖 engine effects）
    │       - planInternalBundle()    ← BFS 闭包计算
    │       - generateAssetManifest() → src/generated/assetManifest.ts
    │       - scanManifestReferences() → bundleNames, uuids
    │       - packBundles() → assets/{bundle}/config.json + import/native
    │
    ├── 2. Script Pipeline
    │       - Vite build → src/chunks/bundle.js (IIFE)
    │       - external: ['cc']
    │
    ├── 3. Engine Resolve
    │       - Vite 编译 cocos-engine → cocos-js/cc.js
    │       - 修补动态导入
    │       - 构建 polyfills
    │
    ├── 4. Settings
    │       - generateSettingsJson() → settings.json
    │
    └── 5. Shell
            - index.html, style.css, application.js
```

**导入顺序关键约束**：`importInternalAssets()` 必须先于 `importProjectAssets()`，因为 FBX 材质子资源的 `createMaterialJson()` 依赖 `findBuiltinStandardEffectUuid()` 查找引擎内置的 `builtin-standard.effect`，该 effect 的 library JSON 仅在 internal 导入后才存在。

## 与官方方案对比

| 方面 | 官方 Creator | AiCocos |
|------|-------------|---------|
| Scene 格式 | `.scene` JSON 文件 | `.scene.ts` TS 模块 |
| Prefab 格式 | `.prefab` JSON 文件 | `.prefab.ts` TS 模块 |
| 编辑器 | 必须使用 Creator | 不依赖编辑器 |
| 资源导入 | 编辑器自动 | CLI 显式调用 |
| 构建方式 | Creator 构建 | CLI 构建 |
| 产物格式 | 官方标准 | 与官方一致 |
| 引擎加载 | SystemJS | IIFE |
| 脚本格式 | System.register | IIFE |
| 引擎编译 | @cocos/ccbuild | Vite |

## 相关文档

- [引擎集成与启动](./engine-integration.md)
- [CLI 设计](./cli-design.md)
- [运行时设计](./runtime-design.md)
- [迁移系统](./migration.md)

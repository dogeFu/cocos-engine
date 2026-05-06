# CLI 设计

## 概述

AiCocos CLI 按职责拆分为三条独立管线，通过文件系统解耦。每条管线可独立运行和 watch，为 AI Agent 工作流提供基础。

**三条管线**：
- **Asset Pipeline**：资源导入、Manifest 生成、Bundle 打包
- **Script Pipeline**：TypeScript 编译、静态开发服务器
- **Project Build**：引擎 cc.js、settings.json、运行时 Shell、最终组装

## 命令参考

| 命令 | 作用 | 常用选项 |
|------|------|----------|
| `aicocos create <name>` | 创建项目 | `--engine-path` |
| `aicocos import-assets [project]` | 单次资源导入（旧版） | `--force` |
| `aicocos asset [project]` | 资源管线 | `--watch`, `--mode debug\|release` |
| `aicocos script [project]` | 脚本管线 | `--watch`, `--mode`, `--port`, `--no-open` |
| `aicocos build [project]` | 完整构建 | `--mode`, `--engine-path` |
| `aicocos run [project]` | 构建 + dev server | `--mode`, `--port`, `--no-open` |
| `aicocos dev [project]` | asset watch + script dev 并行 | `--mode`, `--port`, `--no-open` |

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Entry (index.ts)                      │
│  create | import-assets | asset | script | build | run | dev    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Asset Pipeline│    │ Script Pipeline│    │ Project Build │
│               │    │               │    │               │
│ asset-pipeline│    │ script-       │    │ project-build │
│ /index.ts     │    │ pipeline/     │    │ /index.ts     │
│               │    │ index.ts      │    │               │
│ asset-pipeline│    │               │    │ engine-resolve│
│ /watch.ts     │    │ vite-config.ts│    │ settings-gen  │
│               │    │ dev-server.ts │    │ shell-gen     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Build Output                                │
│  library/  assets/{bundle}/  src/chunks/bundle.js               │
│  src/generated/assetManifest.ts  cocos-js/cc.js                 │
│  src/settings.json  index.html  style.css  application.js       │
└─────────────────────────────────────────────────────────────────┘
```

## 核心概念

### 资源管线 (Asset Pipeline)

**文件**：`asset-pipeline/index.ts`, `asset-pipeline/watch.ts`

**职责**：将原始资源导入为引擎可加载的格式，生成 Bundle。

**流程**：
1. `importProjectAssets()` - 扫描 `assets/` 目录，调用资源处理器
2. `importInternalAssets()` - 导入引擎内部资源（effect、材质等）
3. `planInternalBundle()` - 按 feature 标志筛选所需引擎资源
4. `generateAssetManifest()` - 生成 `src/generated/assetManifest.ts`
5. `scanManifestReferences()` - 解析 manifest 中的 bundle 名和 UUID 引用
6. `packBundles()` - 复制 import/native 文件到 `assets/{bundle}/`

**产出**：`library/`, `src/generated/assetManifest.ts`, `assets/{bundle}/`

**Watch 模式**：`aicocos asset --watch` 使用 chokidar 监听 `assets/` 目录，变化时自动重新执行管线。

### 脚本管线 (Script Pipeline)

**文件**：`script-pipeline/index.ts`, `script-pipeline/vite-config.ts`, `script-pipeline/dev-server.ts`

**职责**：将用户 TypeScript 代码编译为浏览器可执行的 JavaScript。

**单次编译**：`aicocos script` 调用 `viteBuild()` 输出 IIFE 格式的 `bundle.js`。

**Dev 模式**：`aicocos script --watch` 启动 Node.js 静态文件服务器：
- 先执行一次完整构建（Vite IIFE），然后启动 HTTP 服务器提供构建产物
- 修改 `.ts` 文件后需手动重新构建并刷新浏览器（当前不支持 HMR）
- 服务器提供 `cocos-js/cc.js`、`application.js`、`settings.json` 等静态文件

**产出**：`src/chunks/bundle.js`

### 项目构建 (Project Build)

**文件**：`project-build/index.ts`, `project-build/engine-resolve.ts`, `project-build/settings-generator.ts`, `project-build/shell-generator.ts`

**职责**：组装最终可运行的项目产物。

**流程**：
1. 调用资源管线（如果尚未执行）
2. 调用脚本管线（单次编译）
3. 复制引擎 `cc.js`，修补动态导入，构建 polyfills
4. 生成 `settings.json`
5. 生成 `index.html`, `style.css`, `application.js`

**产出**：`dist/{platform}/{mode}/` 完整可运行目录

### 平台配置

**文件**：`project-build/platforms/base.ts`, `project-build/platforms/{platform}/platform.config.ts`

每个平台定义：
- `constants`：编译时常量（HTML5, MINIGAME, SUPPORT_JIT 等）
- `outputFormat`：输出格式（web=iife, minigame=cjs）
- `engineBundlePath`：引擎 cc.js 路径
- `shellType`：运行时 Shell 类型（web-html / mini-game）

当前支持：`web-desktop`, `web-mobile`。后续可扩展小游戏平台。

## 关键文件索引

| 文件 | 职责 |
|------|------|
| [index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/index.ts) | CLI 入口，命令路由 |
| [asset-pipeline/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/asset-pipeline/index.ts) | 资源管线：导入 + Manifest + 打包 |
| [asset-pipeline/watch.ts](file:///Users/kay/Git/aicocos/packages/cli/src/asset-pipeline/watch.ts) | chokidar watch 模式 |
| [script-pipeline/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/script-pipeline/index.ts) | 脚本管线入口 |
| [script-pipeline/vite-config.ts](file:///Users/kay/Git/aicocos/packages/cli/src/script-pipeline/vite-config.ts) | Vite 配置工厂 |
| [script-pipeline/dev-server.ts](file:///Users/kay/Git/aicocos/packages/cli/src/script-pipeline/dev-server.ts) | Node.js 静态文件服务器 |
| [project-build/index.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/index.ts) | 最终构建入口 |
| [project-build/engine-resolve.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/engine-resolve.ts) | 引擎 cc.js 复制/修补 |
| [project-build/settings-generator.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/settings-generator.ts) | settings.json 生成 |
| [project-build/shell-generator.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/shell-generator.ts) | index.html/style.css/application.js |
| [project-build/platforms/base.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-build/platforms/base.ts) | PlatformConfig 接口 |
| [asset-importer.ts](file:///Users/kay/Git/aicocos/packages/cli/src/asset-importer.ts) | 资源导入底层（@cocos/asset-db） |
| [bundle-packager.ts](file:///Users/kay/Git/aicocos/packages/cli/src/bundle-packager.ts) | Bundle 打包底层 |
| [manifest-generator.ts](file:///Users/kay/Git/aicocos/packages/cli/src/manifest-generator.ts) | assetManifest.ts 生成 |
| [bundle-scanner.ts](file:///Users/kay/Git/aicocos/packages/cli/src/bundle-scanner.ts) | 扫描 manifest 引用 |
| [internal-bundle-planner.ts](file:///Users/kay/Git/aicocos/packages/cli/src/internal-bundle-planner.ts) | 引擎内部 bundle 规划 |
| [project-config.ts](file:///Users/kay/Git/aicocos/packages/cli/src/project-config.ts) | aicocos.project.json 解析 |

## AI Agent 开发流程

```
AI 修改资源文件 → aicocos asset → manifest 更新
AI 修改脚本文件 → aicocos build → 手动刷新浏览器 → 查看效果
                                ↑
                     aicocos dev 同时启动 asset watch + 静态服务器
```

1. AI 修改 `assets/` 下的资源 → 运行 `aicocos asset` 重新导入
2. AI 修改 `src/` 下的脚本 → 运行 `aicocos build` 重新构建，然后刷新浏览器
3. AI 需要完整构建 → 运行 `aicocos build`
4. 用 `aicocos dev` 同时启动 asset watch + 静态文件服务器

## 排查指南

### 资源加载 404

检查 `assets/{bundle}/config.json` 是否存在。如果不存在，运行 `aicocos asset` 重新打包。

### 白屏无报错

1. 检查浏览器 Console 是否有错误
2. 确认 `application.js` 存在且内容正确
3. 确认 `src/settings.json` 存在
4. 确认 `cocos-js/cc.js` 可访问

### 开发服务器不生效

1. 确认使用 `aicocos script --watch` 或 `aicocos dev`
2. 确认构建产物存在（检查 `index.html`、`cocos-js/cc.js`）
3. 修改 `.ts` 文件后需手动重新构建并刷新浏览器（当前不支持 HMR）

### 引擎 cc.js 找不到

确认引擎已构建：在 `cocos-engine` 目录执行 `npm run vite:build`。产物位于 `bin/vite/web/{dev|prod}/cc.js`。

## 相关文档

- [AiCocos 整体架构](./overview.md)
- [引擎集成与启动](./engine-integration.md)
- [运行时设计](./runtime-design.md)
- [迁移系统](./migration.md)

# 引擎内置资产全链路

> 从 `cocos-engine/editor/assets/` 到运行时 `assetManager.loadBundle("internal")` 的完整路径。
>
> 本文档描述 Combo 构建管线中引擎内置资产的导入、打包、加载全流程。

## 概述

Combo 在构建时从 Cocos 引擎源码目录导入内置资产（effects、materials、render pipelines 等），经过功能裁剪和闭包解析后打包到构建产物的 `assets/internal/` 中。运行时通过 `assetManager.loadBundle("internal")` 加载。

```
build/web-desktop/debug/
├── assets/
│   ├── internal/          ← 引擎内置资产
│   │   ├── config.json    ← 包清单（uuids、paths、redirect...）
│   │   ├── index.js       ← stub
│   │   ├── import/        ← 序列化资产（.json）和图片（.png...）
│   │   └── native/        ← 二进制资产（.bin 网格、音频...）
│   └── main/              ← 用户项目资产
```

## 阶段 1：导入引擎内置资产

**入口**：`asset-pipeline/index.ts:56` → `asset-importer.ts:1712`

```
importInternalAssets(engineRoot, libraryDir, tempDir)
```

1. **初始化 headless 引擎** — `initEngineHeadless(engineRoot)`（`engine-headless.ts:138`）
   - 模拟浏览器全局变量（`window`、`document`、`navigator`、WebGL）
   - 通过 IIFE 执行加载 `{engineRoot}/bin/vite/cli/prod/cc.js`（预构建引擎包）
   - 初始化 `EditorExtends` 用于序列化
   - 构建 `offline-mappings`（类型映射、格式信息、渲染通道参数）
   - 从 `editor/assets/chunks/` 预加载着色器分段文件

2. **验证着色器编译器** — `probeEffectCompiler(engineRoot)`，编译 `builtin-unlit.effect`

3. **创建 asset-db 实例**，指向 `{engineRoot}/editor/assets/`

4. **挂接自定义导入器**，使 `.effect` 和 `.chunk` 文件由 Combo 处理

5. **启动数据库**，触发所有内置资产导入到 `library/`

6. **后处理图像子资产**（重写 SpriteFrame/Texture2D JSON）

7. **收集 AssetRecord**，所有记录标记为 `bundleName: "internal"`

## 阶段 2：功能根查询

**入口**：`asset-pipeline/index.ts:101` → `asset-importer.ts:1802`

```
queryInternalFeatureRoots(enabledFeatures, engineRoot)
```

读取 `{engineRoot}/cc.config.json`，解析 `features` 字段。每个 feature 定义了 `dependentAssets`、`dependentScripts`、`dependentModules`。

默认启用的功能：`base, gfx-webgl, gfx-webgl2, 3d, 2d, ui, animation, skeletal-animation, tween, audio, custom-pipeline`

可选功能（由 `combo.project.json` 的 `config.engine.features` 控制）：
- `spine`, `dragon-bones`, `physics`, `physics-2d`

## 阶段 3：闭包解析

**入口**：`asset-pipeline/index.ts:102` → `internal-bundle-planner.ts:79`

```
planInternalBundle({ libraryDir, internalRecords, rootAssetUuids, rootScriptUuids })
```

以根资产 UUID 为种子，BFS 遍历传递引用。对每个 UUID，读取序列化的 library `.json` 文件，递归提取所有 `__uuid__` 引用。

**为什么需要闭包**：根 3D 材质 UUID 可能引用特定的 effect UUID，该 effect 又引用 texture 和 chunk UUID。闭包确保所有传递依赖都被包含。

## 阶段 4：打包输出

**入口**：`asset-pipeline/index.ts:147` → `bundle-packager.ts:433`

```
packBundles(libraryDir, assets, bundleNames, referencedUuids, outDir, mode)
```

### config.json 结构

```json
{
  "importBase": "import",
  "nativeBase": "native",
  "name": "internal",
  "deps": [],
  "uuids": ["...", "..."],
  "paths": {
    "abc123": ["effects/builtin-unlit", 5]
  },
  "packs": {
    "abc12345": [0, 1, 2, 3]
  },
  "redirect": [],
  "types": ["cc.EffectAsset", "cc.Material", ...],
  "extensionMap": {},
  "versions": { "import": [], "native": [] }
}
```

**关键路径解析**：
- 序列化资产（`.json`）→ `importBase` + `{uuid[:2]}/{uuid}.json`
- 原生资产（图片、网格）→ `nativeBase` + `{uuid[:2]}/{uuid}.{nativeExt}`
- 跨包引用 → `redirect` 数组

### 内部包特殊处理

`bundle-packager.ts:756` — `buildMergeAllJsonPack()`：内部包的所有序列化 JSON 在构建时合并到单个打包文件（Cocos 内部的 `offsetCompiledJson` 格式），减少运行时 HTTP 请求。

## 阶段 5：清单生成

**入口**：`asset-pipeline/index.ts:135` → `manifest-generator.ts:154`

```
generateAssetManifest(assets, manifestPath)
```

输出到 `{projectDir}/assets/comboMigrate/assetManifest.ts`：

```typescript
import { assetRef } from '@combo/core';

export const assetManifest = {
  internal: {
    effectsBuiltinUnlit: assetRef('internal', 'effects/builtin-unlit', EffectAsset),
    materialsBuiltinMaterial: assetRef('internal', 'materials/builtin-material', Material),
  },
  main: {
    imagesHero: assetRef('main', 'images/hero', Texture2D),
  },
};
```

## 阶段 6：运行时加载

### 引擎初始化

1. `cc.game.init({ settingsPath: 'settings.json' })` 读取：
   - `engine.builtinAssets` — 根内置资产 UUID
   - `assets.projectBundles` — `["internal", "main", ...]`
   - `assets.preloadBundles` — `["main"]`

### @combo/core 加载链路

```typescript
import { loadAsset } from '@combo/core';

const material = await loadAsset(assetManifest.internal.materialsBuiltinMaterial);
// 等价于：
//   loadBundle("internal") → assetManager.loadBundle("internal")
//   bundle.load("materials/builtin-material", Material)
```

**`loadBundle()`**：检查 `bundleCache` → `assetManager.loadBundle(name)` → 引擎获取 `config.json` → 使用 `uuids`/`paths`/`packs`/`redirect` 构建 UUID→URL 映射 → 缓存 bundle 实例。

**`loadAsset()`**：`loadBundle(ref.bundle)` → `bundle.load(ref.path, ref.type)` → 路径通过 `paths` 映射解析为 UUID → 通过 `importBase` 或 `nativeBase` 加载。

**`loadAssetByUUID()`**：`assetManager.loadAny({ uuid })` → 在所有已加载 bundle 中查找 UUID → 跨包通过 `redirect` 表查找。

### ResourceLoader 渐进加载

```typescript
const loader = new ResourceLoader();
loader.pace({ perFrame: 5, concurrency: 10 });
loader.register(assetManifest.internal.someAsset);
loader.onProgress((done, total) => console.log(`${done}/${total}`));
await loader.ready();
```

## 常见问题

| 症状 | 根因 | 解法 |
|------|------|------|
| `texSubImage2D` overload failure | DynamicAtlas 尝试重新打包 builtin 纹理 | 设置 `sf.packable = false` |
| `builtinResMgr.get()` 返回 undefined | builtinResMgr 是 Editor 内部 API | 改用 `assetManifest.internal` |
| 资源加载 404 | library 文件未正确拷贝到 output | 检查 `library/` 中文件是否存在 |
| 运行时提示 "missing bundle internal" | settings.json 未包含 `"internal"` | 确认 `settings-generator.ts` 正确生成 |
| 材质显示为洋红色 | 引用的 effect 未被闭包包含 | 在 `cc.config.json` 中添加依赖 |

## 相关源码文件

| 文件（Combo 仓库） | 功能 |
|------|------|
| `asset-pipeline/index.ts` | 管线编排器 |
| `asset-importer.ts` | `importInternalAssets()`, `queryInternalFeatureRoots()` |
| `internal-bundle-planner.ts` | `planInternalBundle()` BFS 闭包 |
| `bundle-packager.ts` | `packBundles()` 写入 config.json |
| `manifest-generator.ts` | `generateAssetManifest()` |
| `settings-generator.ts` | `generateSettingsJson()` |
| `engine-headless.ts` | `initEngineHeadless()` 浏览器模拟 |
| `combo-core/src/asset.ts` | `assetRef()`, `uuidRef()`, `loadAsset()` |
| `combo-core/src/resource-loader.ts` | `ResourceLoader` 渐进加载 |

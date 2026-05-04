# Cocos Creator 引擎 — 资源管理系统

> 面向 AI 辅助编程的中文参考文档。覆盖资源加载/释放、Bundle、SpriteFrame、Material、引用计数。

---

## 目录

1. [AssetManager 架构](#1-assetmanager-架构)
2. [Bundle 资源包](#2-bundle-资源包)
3. [关键资源类型](#3-关键资源类型)
4. [引用计数与释放](#4-引用计数与释放)
5. [隐含知识与陷阱](#5-隐含知识与陷阱)

---

## 1. AssetManager 架构

### 1.1 AssetManager（`cocos/asset/asset-manager/asset-manager.ts`）

资源管理器。负责资源的加载、缓存和释放。

**单例：** `assetManager`

#### 关键属性

- `assets`：`Cache<Asset>` — 已加载资源缓存
- `bundles`：`Cache<Bundle>` — 已加载 Bundle 缓存
- `fetchPipeline`：`Pipeline` — 下载管线
- `parsePipeline`：`Pipeline` — 解析管线
- `downloader`：`Downloader` — 下载器
- `parser`：`Parser` — 解析器
- `packManager`：`PackManager` — 包管理器
- `cache`：`Cache<string>` — 资源路径缓存

#### 关键方法

- `loadRemote(url, options?, callback?)`：加载远程资源
- `loadBundle(nameOrUrl, options?, callback?)`：加载 Bundle
- `releaseAsset(asset)`：释放资源
- `releaseUnused()`：释放未使用的资源
- `getBundle(name)`：获取已加载的 Bundle

### 1.2 Pipeline（`cocos/asset/asset-manager/pipeline.ts`）

资源加载管线。由多个任务处理器组成。

**下载管线（fetchPipeline）：**
1. `unpackTask` — 解包
2. `downloadTask` — 下载

**解析管线（parsePipeline）：**
1. `parseTask` — 解析
2. `preloadTask` — 预加载

### 1.3 加载流程

```
assetManager.loadBundle(name)
  → 下载 Bundle 配置
  → 解析 Bundle 信息
  → 缓存 Bundle

bundle.load(path, type, callback)
  → 查找 Bundle 中的资源信息
  → 下载资源数据
  → 解析资源数据
  → 创建 Asset 对象
  → 缓存到 assetManager.assets
  → 返回 Asset
```

---

## 2. Bundle 资源包

### 2.1 Bundle（`cocos/asset/asset-manager/bundle.ts`）

资源包。包含一组相关资源。

**特殊 Bundle：** `resources` — 内置的资源包，包含 `resources/` 目录下的资源。

#### 关键属性

- `name`：`string` — Bundle 名称
- `deps`：`string[]` — 依赖的其他 Bundle
- `info`：`IBundleInfo` — Bundle 配置信息

#### 关键方法

- `load(path, type?, options?, callback?)`：加载资源
- `loadDir(dir, type?, options?, callback?)`：加载目录下所有资源
- `preload(path, type?, options?, callback?)`：预加载资源
- `preloadDir(dir, type?, options?, callback?)`：预加载目录
- `get(path, type?)`：获取已加载的资源
- `release(path, type?)`：释放资源

#### 隐含知识

- `resources` Bundle 是特殊的，使用 `resources.load()` 而非 `bundle.load()`
- Bundle 的依赖关系在构建时确定
- 加载 Bundle 中的资源时，依赖的其他 Bundle 会自动加载
- `loadDir` 会加载目录下的所有匹配资源，可能很慢

---

## 3. 关键资源类型

### 3.1 Asset（`cocos/asset/assets/asset.ts`）

所有资源类型的基类。

#### 关键属性

- `_uuid`：`string` — 唯一标识符
- `loaded`：`boolean` — 是否已加载
- `isDefault`：`boolean` — 是否为默认资源
- `refCount`：`number` — 引用计数

#### 关键方法

- `addRef()`：增加引用计数
- `decRef(autoRelease?)`：减少引用计数
- `onLoaded()`：加载完成回调
- `validate()`：验证资源是否有效

### 3.2 SpriteFrame（`cocos/2d/assets/sprite-frame.ts`）

精灵帧资源。包含纹理和 UV 信息。

#### 关键属性

- `texture`：`Texture2D` — 纹理
- `rect`：`Rect` — 纹理中的矩形区域
- `insetLeft/Top/Right/Bottom`：九宫格边距
- `rotated`：`boolean` — 是否旋转（纹理打包优化）
- `offset`：`Vec2` — 偏移
- `originalSize`：`Size` — 原始尺寸
- `uv`：`number[]` — UV 坐标数组
- `vertices`：`IVertices` — 顶点数据

#### 关键方法

- `checkRect(texture, rect)`：检查矩形是否有效
- `reset(info)`：重置精灵帧数据
- `flipUVs(flipX, flipY)`：翻转 UV

#### 隐含知识

- **设置 `texture = null` 会被拒绝** — 会打印警告并忽略
- `rotated` 属性用于纹理打包优化，旋转 90 度存储
- `uv` 数组是 8 个浮点数（4 个顶点的 UV 坐标）
- 修改 `rect` 会重新计算 UV 和顶点

### 3.3 Texture2D（`cocos/asset/assets/texture-2d.ts`）

2D 纹理资源。

#### 关键属性

- `width` / `height`：纹理尺寸
- `format`：`PixelFormat` — 像素格式
- `mipFilter`：`Filter` — Mipmap 过滤
- `minFilter` / `magFilter`：缩小/放大过滤
- `wrapS` / `wrapT`：寻址模式
- `isCompressed`（只读）：是否为压缩格式
- `mipmapLevelDataSize`：各级 mipmap 数据大小

#### 隐含知识

- **WebGL mipmap 需要 2 的幂** — 非 POT 纹理不会自动生成 mipmap
- 压缩纹理格式（ETC、ASTC、PVRTC）需要特定硬件支持
- 纹理数据在首次使用时上传到 GPU
- `reset(info)` 可以重新初始化纹理

### 3.4 Material（`cocos/asset/assets/material.ts`）

材质资源。

#### 关键属性

- `effectAsset`：`EffectAsset` — 效果资源
- `technique`：`number` — 技术索引
- `passes`：`Pass[]` — 渲染通道数组
- `properties`：`{ [name: string]: any }` — 属性值

#### 关键方法

- `setProperty(name, value)`：设置属性值
- `getProperty(name, passIdx?)`：获取属性值
- `recompileShaders(defines, passIdx?)`：重新编译着色器
- `initialize(data)`：初始化材质

#### 隐含知识

- **`initialize()` 只能调用一次** — 重复初始化会打印警告并被拒绝
- `setProperty` 会自动查找属性所在的 pass
- `recompileShaders` 仅对实例化副本有效，不影响共享材质
- 修改 `effectAsset` 会重建所有 pass

### 3.5 EffectAsset（`cocos/asset/assets/effect-asset.ts`）

效果资源。定义着色器程序和渲染状态。

#### 关键属性

- `techniques`：`Technique[]` — 技术数组
- `shaders`：`ShaderInfo[]` — 着色器数组
- `combinedSamplerCount`：`number` — 合并采样器数量

### 3.6 其他资源类型

| 类型 | 文件 | 说明 |
|---|---|---|
| `JsonAsset` | `assets/json-asset.ts` | JSON 数据 |
| `TextAsset` | `assets/text-asset.ts` | 文本数据 |
| `ImageAsset` | `assets/image-asset.ts` | 图片数据 |
| `Font` | `2d/assets/font.ts` | 位图字体 |
| `Skeleton` | `3d/skeletal-animation/skeleton.ts` | 骨骼 |
| `AnimationClip` | `animation/animation-clip.ts` | 动画剪辑 |
| `Mesh` | `3d/assets/mesh.ts` | 3D 网格 |
| `AudioClip` | `audio/audio-clip.ts` | 音频剪辑 |
| `PhysicsMaterial` | `physics/framework/physics-material.ts` | 物理材质 |
| `TiledMapAsset` | `tiledmap/assets/tiled-map-asset.ts` | TMX 地图 |
| `ParticleAsset` | `particle-2d/assets/particle-asset.ts` | 2D 粒子 |

---

## 4. 引用计数与释放

### 4.1 引用计数机制

每个 `Asset` 维护 `refCount` 计数器：

- `addRef()`：`refCount++`
- `decRef(autoRelease = true)`：`refCount--`，如果 `refCount <= 0` 且 `autoRelease` 为 true，尝试释放

**自动引用计数：**
- `instantiate()` 不增加资源引用计数（共享引用）
- 节点销毁时，组件引用的资源 `decRef()`
- `assetManager.loadBundle()` 增加 Bundle 中资源的引用
- 场景切换时，旧场景引用的资源 `decRef()`

### 4.2 资源释放策略

```ts
// 释放单个资源
assetManager.releaseAsset(spriteFrame);

// 释放未使用的资源
assetManager.releaseUnused();

// 释放 Bundle 中的资源
bundle.release(path, type);
```

### 4.3 自动释放

- `Scene.autoReleaseAssets = true`：场景切换时自动释放静态引用的资源
- `Asset.decRef(true)`：引用计数归零时自动释放
- `Asset.decRef(false)`：引用计数归零时不释放

---

## 5. 隐含知识与陷阱

1. **instantiate() 不克隆资源** — `instantiate()` 引用资源而非深拷贝。修改共享资源会影响所有引用者。
2. **SpriteFrame.texture 设为 null 会被拒绝** — 会打印警告并忽略。
3. **Material.initialize() 只能调用一次** — 重复初始化会打印警告并被拒绝。
4. **WebGL mipmap 需要 2 的幂** — 非 POT 纹理不会自动生成 mipmap。
5. **资源加载是异步的** — `load()` 回调在资源加载完成后执行，不能同步获取。
6. **Bundle 依赖自动加载** — 加载 Bundle 中的资源时，依赖的其他 Bundle 会自动加载。
7. **releaseUnused 不会释放正在使用的资源** — 只有引用计数为 0 的资源才会被释放。
8. **远程加载的资源不会自动释放** — `loadRemote` 加载的资源需要手动释放。
9. **修改共享材质影响所有使用者** — 使用 `MaterialVariant` 或 `getMaterialInstance()` 创建副本。
10. **资源 UUID 是唯一标识** — 相同 UUID 的资源在缓存中只有一份。

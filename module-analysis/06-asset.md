# Asset 资源管理模块分析

## 模块作用

Asset 模块是 Cocos Creator 的资源管理系统,负责游戏资源的加载、缓存、释放和依赖管理。它提供了统一的资源访问接口,支持异步加载、资源包(Bundle)系统、引用计数和自动释放等特性,是引擎资源管理的核心基础设施。

### 主要功能领域

1. **资源加载** - 支持多种资源类型的异步加载
2. **资源缓存** - 管理已加载资源的缓存和复用
3. **资源释放** - 引用计数和自动释放机制
4. **资源包** - Bundle 系统实现资源分组和按需加载
5. **依赖管理** - 自动处理资源间的依赖关系
6. **下载管理** - 网络资源的下载和缓存

## 设计理念

### 1. 异步加载流水线

Asset 模块采用流水线(Pipeline)模式处理资源加载,将加载过程分解为多个阶段。

**流水线阶段:**

```
┌─────────────────────────────────────────────────────────┐
│  1. Downloader (下载阶段)                                │
│     - 从本地或远程下载资源文件                            │
│     - 支持并发下载和优先级                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. Parser (解析阶段)                                    │
│     - 解析资源文件格式                                    │
│     - JSON、图片、音频等格式处理                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. Factory (工厂阶段)                                   │
│     - 创建资源对象实例                                    │
│     - 初始化资源属性                                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. Depend (依赖阶段)                                    │
│     - 加载资源的依赖项                                    │
│     - 递归处理依赖关系                                    │
└─────────────────────────────────────────────────────────┘
```

**设计优势:**
- **可扩展**: 可以插入自定义的处理阶段
- **可配置**: 不同资源类型可以配置不同的处理流程
- **可监控**: 每个阶段都可以监控进度和错误

**实现原理:**
```typescript
class Pipeline {
    private _pipes: Pipe[] = [];
    
    async execute(item: RequestItem): Promise<any> {
        for (const pipe of this._pipes) {
            if (item.isCanceled) break;
            await pipe.handle(item);
        }
        return item.result;
    }
}

// 资源加载流程
assetManager.loadAny('textures/hero', (err, asset) => {
    if (err) {
        console.error('Load failed:', err);
        return;
    }
    console.log('Asset loaded:', asset);
});
```

### 2. Bundle 资源包系统

Asset 模块使用 Bundle 系统组织和管理资源,实现资源的分组和按需加载。

**Bundle 概念:**
- **资源分组**: 将相关资源组织到一个包中
- **独立加载**: 可以单独加载和卸载 Bundle
- **版本管理**: 每个 Bundle 可以有独立的版本号
- **远程加载**: 支持从服务器动态加载 Bundle

**Bundle 结构:**
```
resources/          // 内置 Bundle
├── textures/
│   └── hero.png
├── audio/
│   └── bgm.mp3
└── scenes/
    └── main.fire

main/               // 自定义 Bundle
├── textures/
├── prefabs/
└── scripts/
```

**使用示例:**
```typescript
// 加载 Bundle
assetManager.loadBundle('main', (err, bundle) => {
    if (err) {
        console.error('Load bundle failed:', err);
        return;
    }
    
    // 从 Bundle 中加载资源
    bundle.load('textures/hero', SpriteFrame, (err, spriteFrame) => {
        // 使用资源
        sprite.spriteFrame = spriteFrame;
    });
});

// 加载远程 Bundle
assetManager.loadBundle('https://example.com/bundles/level1', (err, bundle) => {
    // 加载完成
});
```

### 3. 引用计数与自动释放

Asset 模块实现了引用计数机制,自动管理资源的生命周期。

**引用计数原理:**
```typescript
class Asset {
    private _refCount: number = 0;
    
    addRef(): Asset {
        this._refCount++;
        return this;
    }
    
    decRef(): Asset {
        this._refCount--;
        if (this._refCount === 0) {
            this.destroy();
        }
        return this;
    }
}
```

**自动释放机制:**
```typescript
// 场景切换时自动释放
director.on(Director.EVENT_AFTER_SCENE_LAUNCH, (scene) => {
    // 释放上一个场景的资源
    releaseManager._autoRelease(oldScene, newScene, persistRootNodes);
});

// 手动释放资源
assetManager.releaseAsset(spriteFrame);

// 释放所有未使用的资源
assetManager.releaseAll();
```

### 4. 资源依赖管理

Asset 模块自动处理资源间的依赖关系,确保依赖资源正确加载和释放。

**依赖关系图:**
```
Material (材质)
├── Texture2D (贴图)
├── Shader (着色器)
└── Technique (技术)

Scene (场景)
├── Prefab (预制体)
│   ├── Mesh (网格)
│   ├── Material (材质)
│   │   └── Texture2D (贴图)
│   └── AnimationClip (动画)
└── AudioClip (音频)
```

**依赖加载:**
```typescript
// 加载材质时自动加载依赖的贴图
assetManager.loadAny('materials/hero-mat', Material, (err, material) => {
    // material 及其依赖的贴图都已加载完成
    console.log('Material loaded with dependencies');
});

// 依赖信息存储
const depends = dependUtil.getDeps('materials/hero-mat');
console.log('Dependencies:', depends);  // ['textures/hero-diffuse', ...]
```

### 5. 资源缓存机制

Asset 模块使用缓存池管理已加载的资源,避免重复加载。

**缓存策略:**
```typescript
class Cache<T> {
    private _map: Map<string, T> = new Map();
    
    get(key: string): T | null {
        return this._map.get(key) || null;
    }
    
    add(key: string, value: T): void {
        this._map.set(key, value);
    }
    
    remove(key: string): void {
        this._map.delete(key);
    }
    
    clear(): void {
        this._map.clear();
    }
}

// 资源缓存使用
const cachedAsset = assetManager.assets.get('textures/hero');
if (cachedAsset) {
    // 使用缓存的资源
    callback(null, cachedAsset);
} else {
    // 加载新资源
    loadAsset('textures/hero', callback);
}
```

### 6. 并发加载与优先级

Asset 模块支持并发加载和优先级控制,优化加载性能。

**并发控制:**
```typescript
class Downloader {
    private _maxConcurrency: number = 10;
    private _activeCount: number = 0;
    private _queue: RequestItem[] = [];
    
    download(item: RequestItem): void {
        if (this._activeCount < this._maxConcurrency) {
            this._activeCount++;
            this._doDownload(item);
        } else {
            this._queue.push(item);
        }
    }
    
    private _onComplete(): void {
        this._activeCount--;
        if (this._queue.length > 0) {
            const next = this._queue.shift()!;
            this.download(next);
        }
    }
}
```

**优先级排序:**
```typescript
// 按优先级排序加载队列
queue.sort((a, b) => {
    return b.priority - a.priority;  // 高优先级先加载
});
```

## 核心组件详解

### 1. AssetManager 资源管理器

**职责:**
- 统一的资源访问接口
- 管理所有 Bundle
- 管理资源缓存
- 协调加载流程

**关键属性:**
- `assets`: 资源缓存
- `bundles`: Bundle 集合
- `pipeline`: 加载流水线
- `downloader`: 下载器

**关键方法:**
- `loadAny()`: 通用加载方法
- `loadBundle()`: 加载 Bundle
- `releaseAsset()`: 释放资源
- `releaseAll()`: 释放所有资源

### 2. Bundle 资源包

**职责:**
- 管理一组相关资源
- 提供资源加载接口
- 管理资源配置

**关键属性:**
- `name`: Bundle 名称
- `version`: 版本号
- `base`: 基础路径

**关键方法:**
- `load()`: 加载资源
- `get()`: 获取资源路径
- `getSceneInfo()`: 获取场景信息

### 3. Pipeline 加载流水线

**职责:**
- 组织加载阶段
- 执行加载流程
- 处理错误和进度

**关键属性:**
- `pipes`: 处理阶段列表

**关键方法:**
- `execute()`: 执行流水线
- `append()`: 添加处理阶段
- `remove()`: 移除处理阶段

### 4. Cache 资源缓存

**职责:**
- 缓存已加载资源
- 提供快速查询
- 管理缓存大小

**关键方法:**
- `get()`: 获取缓存
- `add()`: 添加缓存
- `remove()`: 移除缓存

### 5. DependUtil 依赖工具

**职责:**
- 分析资源依赖
- 存储依赖关系
- 递归加载依赖

**关键方法:**
- `getDeps()`: 获取依赖列表
- `parseDeps()`: 解析依赖关系

## 代码示例

### 加载资源

```typescript
import { assetManager, SpriteFrame, AudioClip, Prefab } from 'cc';

// 加载精灵帧
assetManager.load('textures/hero', SpriteFrame, (err, spriteFrame) => {
    if (err) {
        console.error('Load failed:', err);
        return;
    }
    sprite.spriteFrame = spriteFrame;
});

// 加载音频
assetManager.load('audio/bgm', AudioClip, (err, audioClip) => {
    if (err) return;
    audioSource.clip = audioClip;
    audioSource.play();
});

// 加载预制体
assetManager.load('prefabs/enemy', Prefab, (err, prefab) => {
    if (err) return;
    const enemy = instantiate(prefab);
    scene.addChild(enemy);
});

// 批量加载
assetManager.load(['textures/hero', 'textures/enemy'], SpriteFrame, 
    (finished, total, item) => {
        console.log(`Progress: ${finished}/${total}`);
    },
    (err, spriteFrames) => {
        if (err) return;
        console.log('All loaded:', spriteFrames);
    }
);
```

### 使用 Bundle

```typescript
import { assetManager } from 'cc';

// 加载 Bundle
assetManager.loadBundle('main', (err, bundle) => {
    if (err) {
        console.error('Load bundle failed:', err);
        return;
    }
    
    // 从 Bundle 加载资源
    bundle.load('textures/hero', SpriteFrame, (err, sf) => {
        // 使用资源
    });
    
    // 加载场景
    bundle.loadScene('scenes/level1', (err, scene) => {
        director.runScene(scene);
    });
    
    // 获取资源路径
    const path = bundle.get('textures/hero');
    console.log('Resource path:', path);
});

// 加载远程 Bundle
assetManager.loadBundle({
    bundle: 'level2',
    version: '1.0.0',
    remote: 'https://example.com/bundles',
}, (err, bundle) => {
    // 加载完成
});
```

### 资源释放

```typescript
import { assetManager } from 'cc';

// 释放单个资源
assetManager.releaseAsset(spriteFrame);

// 释放多个资源
assetManager.release(['textures/hero', 'textures/enemy'], SpriteFrame);

// 释放 Bundle
assetManager.releaseBundle('main');

// 释放所有未使用的资源
assetManager.releaseAll();

// 引用计数管理
const asset = assetManager.get('textures/hero');
asset.addRef();  // 增加引用
asset.decRef();  // 减少引用,引用为 0 时自动销毁
```

### 自定义加载流程

```typescript
import { assetManager } from 'cc';

// 添加自定义加载阶段
assetManager.pipeline.append({
    handle(item, next) {
        console.log('Custom processing:', item.url);
        next(null);
    }
});

// 自定义资源类型加载
assetManager.downloader.register('.txt', (url, options, callback) => {
    fetch(url)
        .then(response => response.text())
        .then(text => callback(null, text))
        .catch(err => callback(err));
});

// 自定义资源解析
assetManager.parser.register('.txt', (file, options, callback) => {
    const textAsset = new TextAsset();
    textAsset.text = file;
    callback(null, textAsset);
});
```

## 模块关联

### 上游依赖

Asset 模块依赖以下基础模块:

1. **Core**
   - 使用事件系统
   - 使用对象管理
   - 使用异步工具

2. **Platform**
   - 文件系统访问
   - 网络请求

### 下游依赖

Asset 模块被以下模块依赖:

1. **Game**
   - 初始化资源管理器
   - 加载启动资源

2. **Scene Graph**
   - 加载场景和预制体

3. **Rendering**
   - 加载材质和纹理

4. **Audio**
   - 加载音频资源

### 模块交互流程

```
Game.init()
    ↓
AssetManager.init()
    ↓
┌─────────────────────────────────────────┐
│  Load Bundle                             │
│  - Download bundle config                │
│  - Parse dependencies                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Load Asset                              │
│  - Check cache                           │
│  - Execute pipeline                      │
│  - Download → Parse → Factory            │
│  - Load dependencies                     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Cache Asset                             │
│  - Store in cache                        │
│  - Return to user                        │
└─────────────────────────────────────────┘
```

## 设计模式应用

### 1. 流水线模式 (Pipeline Pattern)
- 加载流程分解为多个阶段
- 每个阶段独立处理
- 支持扩展和定制

### 2. 工厂模式 (Factory Pattern)
- Factory 阶段创建资源对象
- 不同资源类型使用不同的工厂方法

### 3. 单例模式 (Singleton Pattern)
- AssetManager 是全局单例
- 统一管理所有资源

### 4. 观察者模式 (Observer Pattern)
- 加载进度回调
- 加载完成事件

### 5. 引用计数模式 (Reference Counting Pattern)
- 自动管理资源生命周期
- 避免内存泄漏

## 性能优化策略

### 1. 缓存复用
- 避免重复加载
- 快速访问已加载资源

### 2. 并发加载
- 多个资源同时加载
- 提高加载速度

### 3. 按需加载
- Bundle 分组
- 只加载需要的资源

### 4. 延迟加载
- 预加载关键资源
- 其他资源按需加载

### 5. 自动释放
- 引用计数管理
- 场景切换时自动释放

## 扩展性设计

### 1. 自定义资源类型
可以注册自定义资源类型的加载器:

```typescript
// 注册自定义加载器
assetManager.downloader.register('.custom', customDownloader);
assetManager.parser.register('.custom', customParser);
```

### 2. 自定义加载阶段
可以扩展加载流水线:

```typescript
// 添加自定义处理阶段
assetManager.pipeline.append(customPipe);
```

### 3. 自定义 Bundle
可以创建和管理自定义 Bundle:

```typescript
// 创建自定义 Bundle
const bundle = new Bundle();
bundle.init(config);
assetManager.bundles.add(bundle);
```

## 总结

Asset 模块是 Cocos Creator 资源管理的核心,其设计体现了以下核心思想:

1. **流水线架构**: 将加载过程分解为可扩展的阶段,灵活高效
2. **Bundle 系统**: 资源分组和按需加载,优化内存和加载速度
3. **引用计数**: 自动管理资源生命周期,避免内存泄漏
4. **依赖管理**: 自动处理资源依赖,简化开发流程
5. **缓存机制**: 避免重复加载,提高性能

理解 Asset 模块的设计理念,对于掌握 Cocos Creator 的资源管理、优化加载性能、实现自定义资源类型都至关重要。Asset 模块为整个引擎提供了稳定、高效的资源管理基础设施。

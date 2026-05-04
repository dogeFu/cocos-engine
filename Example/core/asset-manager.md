# AssetManager — 资源管理器

## 概述

`assetManager` 是引擎的资源管理核心，负责资源的加载、缓存、释放和 Bundle 管理。所有资源的异步加载都通过 `assetManager` 完成。

## 导入方式

```typescript
import { assetManager, Asset, SpriteFrame, Texture2D, JsonAsset, TextAsset, AudioClip } from 'cc';
```

## 基础用法

### 加载单个资源

```typescript
assetManager.loadBundle('resources', (err, bundle) => {
    if (err) return;
    bundle.load<SpriteFrame>('textures/avatar/spriteFrame', SpriteFrame, (err, spriteFrame) => {
        if (err) return;
        sprite.spriteFrame = spriteFrame;
    });
});
```

### 加载远程资源

```typescript
assetManager.loadRemote<ImageAsset>('http://example.com/image.png', (err, imageAsset) => {
    if (err) return;
    const spriteFrame = new SpriteFrame();
    const texture = new Texture2D();
    texture.image = imageAsset;
    spriteFrame.texture = texture;
    sprite.spriteFrame = spriteFrame;
});

assetManager.loadRemote<AudioClip>('http://example.com/audio.mp3', (err, clip) => {
    if (err) return;
    audioSource.clip = clip;
    audioSource.play();
});
```

## Bundle — 资源包

### 获取 Bundle

```typescript
assetManager.loadBundle('common', (err, bundle) => {
    if (err) return;
});

const bundle = assetManager.getBundle('common');
```

### 从 Bundle 加载资源

```typescript
const bundle = assetManager.getBundle('common');

bundle.load<SpriteFrame>('textures/icon', SpriteFrame, (err, asset) => {
    if (err) return;
});

bundle.loadDir<SpriteFrame>('textures', SpriteFrame, (err, assets) => {
    if (err) return;
});

bundle.load<JsonAsset>('configs/levels', JsonAsset, (err, asset) => {
    if (err) return;
    const data = asset.json!;
});
```

### 加载进度

```typescript
bundle.loadDir('textures', SpriteFrame, (finished, total) => {
    const progress = finished / total;
}, (err, assets) => {
    if (err) return;
});
```

### 释放资源

```typescript
bundle.release('textures/icon', SpriteFrame);
bundle.releaseDir('textures', SpriteFrame);
```

### 获取资源信息

```typescript
const info = bundle.getInfoWithPath('textures/icon');
const infos = bundle.getDirWithPath('textures');
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `bundles` | `Record<string, Bundle>` | 已加载的 Bundle 集合 |
| `assets` | `Cache<Asset>` | 全局资源缓存 |
| `dependUtil` | `DependUtil` | 依赖关系工具 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `loadBundle(nameOrUrl, options?, callback)` | 加载 Bundle |
| `getBundle(name)` | 获取已加载的 Bundle |
| `removeBundle(bundle)` | 移除 Bundle（不释放资源） |
| `loadRemote(url, options?, callback)` | 加载远程资源 |
| `releaseAsset(asset)` | 释放单个资源 |
| `releaseUnused()` | 释放所有未使用资源 |

## 进阶用法

### Promise 风格加载

```typescript
async function loadSpriteFrame(path: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => {
        const bundle = assetManager.getBundle('resources');
        bundle!.load<SpriteFrame>(path, SpriteFrame, (err, asset) => {
            if (err) reject(err);
            else resolve(asset);
        });
    });
}

const frame = await loadSpriteFrame('textures/avatar/spriteFrame');
```

### 资源预加载

```typescript
@ccclass('ResourcePreloader')
export class ResourcePreloader extends Component {
    @property({ type: [String] })
    public preloadPaths: string[] = [];

    start() {
        const bundle = assetManager.getBundle('resources');
        if (!bundle) return;

        for (const path of this.preloadPaths) {
            bundle.preload(path, SpriteFrame, (err) => {
                if (err) {
                    return;
                }
            });
        }
    }
}
```

### 资源释放管理

```typescript
@ccclass('ResourceCleaner')
export class ResourceCleaner extends Component {
    public cleanUnused() {
        assetManager.releaseUnused();
    }

    public cleanBundle(bundleName: string) {
        const bundle = assetManager.getBundle(bundleName);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
        }
    }
}
```

### 加载配置文件

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<JsonAsset>('configs/game-config', JsonAsset, (err, asset) => {
    if (err) return;
    const config = asset.json as Record<string, unknown>;
});
```

### 加载文本资源

```typescript
bundle!.load<TextAsset>('data/dialog', TextAsset, (err, asset) => {
    if (err) return;
    const text = asset.text;
});
```

## 注意事项

- `loadBundle` 是异步操作，加载完成后才能从 Bundle 中加载资源
- `release` 只释放引用计数为 0 的资源，正在使用的资源不会被释放
- `releaseUnused` 会释放所有引用计数为 0 的资源，适合场景切换后调用
- 远程资源加载受跨域限制，需要服务器配置 CORS
- `resources` Bundle 是内置的默认 Bundle，无需手动加载
- 使用 `releaseAsset` 释放单个资源时，其依赖资源不会自动释放

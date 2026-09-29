# Asset — 资源引用与加载

> `@combo/core` 的 `AssetRef` branded type 提供类型安全的资源引用，支持 bundle 路径和 UUID 两种方式。

## 导入方式

```typescript
import {
  assetRef, uuidRef,
  loadAsset, loadAssetByUUID, loadBundle,
} from '@combo/core';
```

## AssetRef vs AssetRefUUID

| | `AssetRef` | `AssetRefUUID` |
|---|---|---|
| 标识 | `bundle + path` | `uuid` |
| 用途 | 引用项目资产（通过 bundle 路径） | 引用已知 UUID 的资产 |
| 自动加载 | 可在 `component()` setup 中使用 | 可在 `component()` setup 中使用 |
| 典型场景 | `assetManifest.main.imagesHero` | `uuidRef('abc123...')` |

## 引用项目资产

```typescript
import { assetManifest } from './generated/assetManifest';

// assetManifest 包含所有 bundle 的类型安全引用
const heroRef = assetManifest.main.imagesHero;     // AssetRef<Texture2D>
const matRef = assetManifest.internal.material;    // AssetRef<Material>
```

## 手动加载资产

```typescript
// 按 bundle + 路径加载
import { loadAsset } from '@combo/core';

const texture = await loadAsset(assetManifest.main.imagesHero);
const spriteFrame = SpriteFrame.createWithImageSource(texture)!;
spriteFrame.packable = false;

// 按 UUID 加载
import { uuidRef, loadAssetByUUID } from '@combo/core';

const customAsset = await loadAssetByUUID(
  uuidRef('a1b2c3d4-e5f6-7890-abcd-ef1234567890', Texture2D),
);
```

## 在组件属性中自动加载

当 `component()` 的 setup 中包含 `AssetRef` 或 `AssetRefUUID` 值时，Node 会自动注册到 Scene 的 ResourceLoader：

```typescript
import { Scene, Node } from '@combo/core';
import { Sprite } from 'cc';
import { assetManifest } from './generated/assetManifest';

const scene = new Scene('Game');
scene.node('Player', (player) => {
  player.component(Sprite, {
    spriteFrame: assetManifest.main.playerSprite,  // AssetRef — 自动异步加载
    color: Color.WHITE,                             // 普通值 — 同步赋值
  });
});
scene.run();
```

处理流程：
1. `_applySetupWithAssetRefs()` 将 setup 拆分为同步属性 + 资源引用
2. 同步属性立即赋值
3. 资源引用注册到 `Scene._resourceLoader`
4. 加载完成后将 asset 赋值到组件属性

### 延迟绑定

如果节点尚未添加到场景中，AssetRef 暂存到 `_pendingAssetRefs[]`。添加到场景后通过 `setParent` 拦截自动触发加载：

```typescript
const node = new Node('Player');
// 节点尚未 addChild，AssetRef 暂存
node.component(Sprite, { spriteFrame: someAssetRef });

// 添加到 scene 后，AssetRef 自动加载
scene.append(node);  // setParent 触发 _flushPendingAssetRefs()
```

## 手动加载 Bundle

```typescript
import { loadBundle } from '@combo/core';

const bundle = await loadBundle('main');
// bundle 缓存到 bundleCache，同一名称只加载一次
const texture = await new Promise((resolve, reject) => {
  bundle.load('images/hero', Texture2D, null, (err, asset) => {
    if (err) reject(err); else resolve(asset);
  });
});
```

## 创建自定义 AssetRef

```typescript
import { assetRef, uuidRef } from '@combo/core';
import { SpriteFrame } from 'cc';

// bundle + 路径引用
const myRef = assetRef('main', 'ui/button-bg', SpriteFrame);

// UUID 引用
const myUuidRef = uuidRef('a1b2c3d4-...', SpriteFrame);
```

## 完整示例

```typescript
import { Scene } from '@combo/core';
import { Sprite, SpriteFrame, Color } from 'cc';
import { assetManifest } from './generated/assetManifest';

// 1. 手动加载 + 创建 SpriteFrame
const tex = await loadAsset(assetManifest.main.imagesHero);
const sf = SpriteFrame.createWithImageSource(tex)!;
sf.packable = false;

// 2. 用组件属性自动加载
const scene = new Scene('Game');
scene.node('Sprite', (n) => {
  n.component(Sprite, {
    spriteFrame: assetManifest.main.imagesHero,  // 自动加载
    color: Color.WHITE,
  });
});
scene.run();
```

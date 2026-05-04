# SpriteFrame — 精灵帧

## 概述

`SpriteFrame` 是精灵帧资源，包含一张纹理图片的引用和裁剪信息。Sprite 组件通过 SpriteFrame 来显示图片。SpriteFrame 可以从 Texture2D 动态创建。

## 导入方式

```typescript
import { SpriteFrame, Texture2D, ImageAsset, Rect, Vec2, Size } from 'cc';
```

## 基础用法

### 从资源管理器加载

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<SpriteFrame>('textures/avatar/spriteFrame', SpriteFrame, (err, frame) => {
    if (err) return;
    sprite.spriteFrame = frame;
});
```

### 从 ImageAsset 动态创建

```typescript
assetManager.loadRemote<ImageAsset>('http://example.com/image.png', (err, imageAsset) => {
    if (err) return;

    const texture = new Texture2D();
    texture.image = imageAsset;

    const spriteFrame = new SpriteFrame();
    spriteFrame.texture = texture;

    sprite.spriteFrame = spriteFrame;
});
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `rect` | `Rect \| null` | 纹理裁剪区域 |
| `insetLeft` | `number` | 九宫格左边距 |
| `insetRight` | `number` | 九宫格右边距 |
| `insetTop` | `number` | 九宫格上边距 |
| `insetBottom` | `number` | 九宫格下边距 |
| `texture` | `Texture2D \| null` | 关联的纹理 |
| `isRotate` | `boolean` | 纹理是否旋转（图集打包时） |
| `originalSize` | `Size` | 原始尺寸 |
| `offset` | `Vec2` | 偏移量 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `reset` | `(info) => void` | 重置精灵帧信息 |
| `ensureMeshData` | `() => void` | 确保网格数据有效 |

## 进阶用法

### 设置九宫格边距

```typescript
spriteFrame.insetLeft = 20;
spriteFrame.insetRight = 20;
spriteFrame.insetTop = 20;
spriteFrame.insetBottom = 20;
```

### 裁剪纹理区域

```typescript
spriteFrame.rect = new Rect(0, 0, 100, 100);
```

### 从 Texture2D 创建带裁剪的 SpriteFrame

```typescript
const spriteFrame = new SpriteFrame();
spriteFrame.texture = texture;
spriteFrame.rect = new Rect(0, 0, texture.width, texture.height);
```

### 动态图片加载与显示

```typescript
@ccclass('DynamicImage')
export class DynamicImage extends Component {
    @property({ type: Sprite })
    public sprite: Sprite | null = null;

    public loadImage(url: string) {
        assetManager.loadRemote<ImageAsset>(url, (err, imageAsset) => {
            if (err || !this.sprite) return;

            const texture = new Texture2D();
            texture.image = imageAsset;

            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;

            this.sprite.spriteFrame = spriteFrame;
        });
    }
}
```

## 注意事项

- 加载 SpriteFrame 时路径需要带 `/spriteFrame` 后缀（从图集中加载子帧）
- 独立图片资源的路径直接使用图片路径
- `rect` 属性定义了在纹理中的裁剪区域
- 九宫格属性（inset*）仅在 Sprite 的 `SLICED` 模式下生效
- 动态创建 SpriteFrame 后需要确保 Texture2D 已正确初始化

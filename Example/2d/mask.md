# Mask — 遮罩组件

## 概述

`Mask` 是遮罩组件，用于限制子节点的可见区域。子节点只有在遮罩范围内的部分才会被渲染。支持矩形、椭圆、图形模板和图片模板四种类型。

## 导入方式

```typescript
import { Mask, Node, SpriteFrame } from 'cc';
```

## 基础用法

### 矩形遮罩

```typescript
const maskNode = new Node('Mask');
const mask = maskNode.addComponent(Mask);
mask.type = Mask.Type.RECT;
```

### 椭圆遮罩

```typescript
mask.type = Mask.Type.ELLIPSE;
```

### 图片模板遮罩

```typescript
mask.type = Mask.Type.IMAGE_STENCIL;
mask.spriteFrame = stencilFrame;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `Mask.Type` | 遮罩类型 |
| `spriteFrame` | `SpriteFrame \| null` | 模板图片（IMAGE_STENCIL 时使用） |
| `inverted` | `boolean` | 是否反转遮罩 |
| `segements` | `number` | 椭圆遮罩的曲线段数 |

## Type 枚举

| 值 | 说明 |
|-----|------|
| `RECT` | 矩形遮罩 |
| `ELLIPSE` | 椭圆遮罩 |
| `GRAPH_STENCIL` | 图形模板遮罩 |
| `IMAGE_STENCIL` | 图片模板遮罩 |

## 进阶用法

### 圆形头像

```typescript
const avatarNode = new Node('Avatar');
const mask = avatarNode.addComponent(Mask);
mask.type = Mask.Type.ELLIPSE;
mask.segements = 64;

const avatarSprite = new Node('AvatarSprite');
avatarSprite.addComponent(UITransform).contentSize = new Size(100, 100);
const sprite = avatarSprite.addComponent(Sprite);
sprite.spriteFrame = avatarFrame;
avatarNode.addChild(avatarSprite);
```

### 反转遮罩

```typescript
mask.inverted = true;
```

> 反转遮罩时，遮罩区域外可见，遮罩区域内不可见。

### 动态遮罩

```typescript
@ccclass('RevealEffect')
export class RevealEffect extends Component {
    private _mask: Mask | null = null;
    private _progress: number = 0;

    start() {
        this._mask = this.getComponent(Mask);
    }

    update(dt: number) {
        if (!this._mask) return;
        this._progress = Math.min(this._progress + dt * 0.5, 1);
        const uiTransform = this.node.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(new Size(
                uiTransform.width * this._progress,
                uiTransform.height
            ));
        }
    }
}
```

## 注意事项

- Mask 的遮罩范围由节点的 `UITransform.contentSize` 决定
- `ELLIPSE` 类型的 `segements` 值越大，椭圆边缘越平滑，但性能开销也越大
- `IMAGE_STENCIL` 使用图片的 alpha 通道作为遮罩模板
- 遮罩会增加 Draw Call，不宜嵌套使用
- `inverted` 反转遮罩在某些平台上可能有兼容性问题

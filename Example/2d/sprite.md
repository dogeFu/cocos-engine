# Sprite — 精灵组件

## 概述

`Sprite` 是 2D 渲染的基础组件，用于显示图片。支持简单模式、九宫格切片、平铺、填充和网格五种渲染模式。

## 导入方式

```typescript
import { Sprite, SpriteFrame, Node, Size } from 'cc';
```

## 基础用法

### 创建精灵

```typescript
const node = new Node('MySprite');
const sprite = node.addComponent(Sprite);
sprite.spriteFrame = mySpriteFrame;
```

### 动态加载精灵帧

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<SpriteFrame>('textures/avatar/spriteFrame', SpriteFrame, (err, frame) => {
    if (err) return;
    sprite.spriteFrame = frame;
});
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `spriteFrame` | `SpriteFrame \| null` | 精灵帧资源 |
| `type` | `Sprite.Type` | 渲染模式 |
| `sizeMode` | `Sprite.SizeMode` | 尺寸模式 |
| `trim` | `boolean` | 是否裁剪透明像素 |
| `grayscale` | `boolean` | 是否灰度显示 |
| `fillType` | `Sprite.FillType` | 填充类型 |
| `fillStart` | `number` | 填充起始点（0-1） |
| `fillRange` | `number` | 填充范围（0-1） |

## Type 枚举

| 值 | 说明 |
|-----|------|
| `SIMPLE` | 简单模式 |
| `SLICED` | 九宫格切片 |
| `TILED` | 平铺模式 |
| `FILLED` | 填充模式 |
| `MESH` | 网格模式 |

## SizeMode 枚举

| 值 | 说明 |
|-----|------|
| `CUSTOM` | 自定义大小 |
| `TRIMMED` | 裁剪后原始大小 |
| `RAW` | 原始图片大小 |

## FillType 枚举

| 值 | 说明 |
|-----|------|
| `HORIZONTAL` | 水平填充 |
| `VERTICAL` | 垂直填充 |
| `RADIAL` | 径向填充 |

## 进阶用法

### 九宫格切片

```typescript
sprite.type = Sprite.Type.SLICED;
sprite.spriteFrame = slicedFrame;
```

> 九宫格切片需要在 SpriteFrame 编辑器中设置九宫格边距，适合按钮背景、面板边框等可拉伸 UI。

### 平铺模式

```typescript
sprite.type = Sprite.Type.TILED;
sprite.spriteFrame = tileFrame;
```

### 填充模式（技能冷却）

```typescript
@ccclass('CooldownEffect')
export class CooldownEffect extends Component {
    private _sprite: Sprite | null = null;
    private _cooldown: number = 0;
    private _maxCooldown: number = 5;

    start() {
        this._sprite = this.getComponent(Sprite);
        if (this._sprite) {
            this._sprite.type = Sprite.Type.FILLED;
            this._sprite.fillType = Sprite.FillType.RADIAL;
            this._sprite.fillStart = 0;
            this._sprite.fillRange = 1;
        }
    }

    public startCooldown(duration: number) {
        this._maxCooldown = duration;
        this._cooldown = duration;
    }

    update(dt: number) {
        if (this._cooldown > 0 && this._sprite) {
            this._cooldown -= dt;
            this._sprite.fillRange = this._cooldown / this._maxCooldown;
        }
    }
}
```

### 动态切换精灵帧

```typescript
@ccclass('SpriteSwitcher')
export class SpriteSwitcher extends Component {
    @property({ type: [SpriteFrame] })
    public frames: SpriteFrame[] = [];

    private _sprite: Sprite | null = null;
    private _index: number = 0;

    start() {
        this._sprite = this.getComponent(Sprite);
        this.showFrame(0);
    }

    public showFrame(index: number) {
        if (!this._sprite || index >= this.frames.length) return;
        this._sprite.spriteFrame = this.frames[index];
        this._index = index;
    }

    public nextFrame() {
        this.showFrame((this._index + 1) % this.frames.length);
    }
}
```

### 灰度效果

```typescript
sprite.grayscale = true;
```

## 注意事项

- `spriteFrame` 为 `null` 时精灵不渲染
- `SLICED` 模式需要 SpriteFrame 设置了九宫格边框
- `FILLED` 模式下 `fillRange` 为 0-1，负值表示反向填充
- `sizeMode` 为 `TRIMMED` 或 `RAW` 时，节点大小会自动适配图片大小
- 修改 `spriteFrame` 后不需要手动更新 `UITransform` 的 `contentSize`

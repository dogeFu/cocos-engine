# ProgressBar — 进度条

## 概述

`ProgressBar` 是进度条组件，用于显示操作进度或数值比例。支持水平、垂直和填充三种模式。

## 导入方式

```typescript
import { ProgressBar, Node, Sprite } from 'cc';
```

## 基础用法

### 创建进度条

```typescript
const barNode = new Node('ProgressBar');
const progressBar = barNode.addComponent(ProgressBar);
progressBar.progress = 0.7;
progressBar.mode = ProgressBar.Mode.HORIZONTAL;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `progress` | `number` | 进度值（0-1） |
| `barSprite` | `Sprite \| null` | 进度条填充精灵 |
| `mode` | `ProgressBar.Mode` | 进度条模式 |
| `reverse` | `boolean` | 是否反向 |
| `totalLength` | `number` | 进度条总长度 |

## Mode 枚举

| 值 | 说明 |
|-----|------|
| `HORIZONTAL` | 水平模式 |
| `VERTICAL` | 垂直模式 |
| `FILLED` | 填充模式 |

## 进阶用法

### 加载进度

```typescript
@ccclass('LoadingBar')
export class LoadingBar extends Component {
    @property({ type: ProgressBar })
    public progressBar: ProgressBar | null = null;

    @property({ type: Label })
    public percentLabel: Label | null = null;

    private _progress: number = 0;

    update(dt: number) {
        this._progress = Math.min(this._progress + dt * 0.2, 1);
        if (this.progressBar) {
            this.progressBar.progress = this._progress;
        }
        if (this.percentLabel) {
            this.percentLabel.string = `${Math.round(this._progress * 100)}%`;
        }
    }
}
```

### 血条

```typescript
@ccclass('HealthBar')
export class HealthBar extends Component {
    @property({ type: ProgressBar })
    public healthBar: ProgressBar | null = null;

    private _maxHealth: number = 100;
    private _currentHealth: number = 100;

    public takeDamage(amount: number) {
        this._currentHealth = Math.max(0, this._currentHealth - amount);
        this.updateBar();
    }

    public heal(amount: number) {
        this._currentHealth = Math.min(this._maxHealth, this._currentHealth + amount);
        this.updateBar();
    }

    private updateBar() {
        if (this.healthBar) {
            this.healthBar.progress = this._currentHealth / this._maxHealth;
        }
    }
}
```

### 反向进度条

```typescript
progressBar.reverse = true;
progressBar.mode = ProgressBar.Mode.HORIZONTAL;
```

### 填充模式

```typescript
progressBar.mode = ProgressBar.Mode.FILLED;
progressBar.barSprite = spriteComponent;
```

> 填充模式下需要 `barSprite` 的 `SpriteFrame` 设置为 `FILLED` 类型。

## 注意事项

- `progress` 值范围为 0-1，超出范围会被自动裁剪
- `barSprite` 是进度条的可变部分，需要有 `Sprite` 组件
- `totalLength` 在 `HORIZONTAL`/`VERTICAL` 模式下表示像素长度
- `FILLED` 模式下 `Sprite` 的 `type` 必须为 `Sprite.Type.FILLED`
- `reverse` 在 `HORIZONTAL` 模式下从右到左，`VERTICAL` 模式下从上到下

# UIOpacity — 透明度组件

## 概述

`UIOpacity` 用于控制节点的整体透明度，影响节点及其所有子节点的渲染透明度。

## 导入方式

```typescript
import { UIOpacity, Node } from 'cc';
```

## 基础用法

### 设置透明度

```typescript
const opacity = node.getComponent(UIOpacity);
if (opacity) {
    opacity.opacity = 128;
}
```

### 添加 UIOpacity 组件

```typescript
const opacity = node.addComponent(UIOpacity);
opacity.opacity = 200;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `opacity` | `number` | 透明度（0-255） |

## 进阶用法

### 淡入淡出效果

```typescript
@ccclass('FadeEffect')
export class FadeEffect extends Component {
    private _opacity: UIOpacity | null = null;

    start() {
        this._opacity = this.getComponent(UIOpacity);
    }

    public fadeIn(duration: number = 0.5) {
        if (!this._opacity) return;
        this._opacity.opacity = 0;
        tween(this._opacity)
            .to(duration, { opacity: 255 })
            .start();
    }

    public fadeOut(duration: number = 0.5) {
        if (!this._opacity) return;
        tween(this._opacity)
            .to(duration, { opacity: 0 })
            .start();
    }
}
```

### 闪烁效果

```typescript
@ccclass('BlinkEffect')
export class BlinkEffect extends Component {
    private _opacity: UIOpacity | null = null;

    start() {
        this._opacity = this.getComponent(UIOpacity);
    }

    public blink(count: number = 3) {
        if (!this._opacity) return;
        const t = tween(this._opacity);
        for (let i = 0; i < count; i++) {
            t.to(0.1, { opacity: 0 }).to(0.1, { opacity: 255 });
        }
        t.start();
    }
}
```

### 与 tween 配合

```typescript
const opacity = node.addComponent(UIOpacity);
tween(opacity)
    .to(1, { opacity: 0 })
    .call(() => {
        node.destroy();
    })
    .start();
```

## 注意事项

- `opacity` 范围为 0-255（0 完全透明，255 完全不透明）
- UIOpacity 影响节点及其所有子节点的透明度
- 透明度为 0 时节点仍然存在，只是不可见，仍可接收触摸事件
- UIOpacity 与 Sprite 的 `color.a` 效果叠加
- 使用 `tween` 操作 UIOpacity 时，目标对象是 UIOpacity 组件而非 Node

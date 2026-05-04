# Tween — 缓动动画

## 概述

`tween` 是 Cocos Creator 的缓动动画系统，提供链式 API 创建平滑的属性过渡动画。支持缓动函数、并行/串行动画、回调、重复等功能。适用于 UI 动画、移动过渡、属性渐变等场景。

## 导入方式

```typescript
import { tween, Tween, Vec3, Color, Node, UIOpacity } from 'cc';
```

## 基础用法

### 简单位移动画

```typescript
tween(this.node)
    .to(1, { position: new Vec3(100, 0, 0) })
    .start();
```

### 链式动画

```typescript
tween(this.node)
    .to(1, { position: new Vec3(100, 0, 0) })
    .to(1, { position: new Vec3(100, 100, 0) })
    .to(1, { position: new Vec3(0, 100, 0) })
    .to(1, { position: new Vec3(0, 0, 0) })
    .start();
```

### 使用 by（相对变化）

```typescript
tween(this.node)
    .by(1, { position: new Vec3(100, 0, 0) })
    .start();
```

## 核心 API

| 方法 | 签名 | 说明 |
|------|------|------|
| `tween` | `(target) => Tween` | 创建缓动（静态入口） |
| `to` | `(duration, props, opts?) => Tween` | 过渡到目标值 |
| `by` | `(duration, props, opts?) => Tween` | 相对变化 |
| `delay` | `(duration) => Tween` | 延迟 |
| `call` | `(callback) => Tween` | 回调 |
| `start` | `() => Tween` | 开始播放 |
| `stop` | `() => Tween` | 停止 |
| `clone` | `(target) => Tween` | 克隆到新目标 |
| `repeat` | `(times, embedded?) => Tween` | 重复 |
| `repeatForever` | `(embedded?) => Tween` | 无限重复 |
| `parallel` | `(...tweens) => Tween` | 并行执行 |
| `sequence` | `(...tweens) => Tween` | 串行执行 |
| `union` | `() => Tween` | 合并 |

## 缓动函数

```typescript
import { easing } from 'cc';

tween(this.node)
    .to(1, { position: new Vec3(100, 0, 0) }, { easing: 'backOut' })
    .start();
```

### 常用缓动函数

| 函数 | 说明 |
|------|------|
| `linear` | 线性 |
| `quadIn/Out/InOut` | 二次方 |
| `cubicIn/Out/InOut` | 三次方 |
| `quartIn/Out/InOut` | 四次方 |
| `quintIn/Out/InOut` | 五次方 |
| `sineIn/Out/InOut` | 正弦 |
| `expoIn/Out/InOut` | 指数 |
| `circIn/Out/InOut` | 圆形 |
| `elasticIn/Out/InOut` | 弹性 |
| `backIn/Out/InOut` | 回弹 |
| `bounceIn/Out/InOut` | 弹跳 |

## 进阶用法

### UIOpacity 淡入淡出

```typescript
const opacity = node.addComponent(UIOpacity);
opacity.opacity = 0;

tween(opacity)
    .to(0.5, { opacity: 255 })
    .delay(2)
    .to(0.5, { opacity: 0 })
    .start();
```

### 缩放弹跳

```typescript
tween(this.node)
    .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
    .to(0.1, { scale: new Vec3(1, 1, 1) })
    .start();
```

### 颜色过渡

```typescript
const sprite = this.node.getComponent(Sprite);
if (sprite) {
    tween(sprite.color)
        .to(1, { r: 255, g: 0, b: 0 })
        .start();
}
```

### 回调与延迟

```typescript
tween(this.node)
    .to(1, { position: new Vec3(100, 0, 0) })
    .call(() => {
    })
    .delay(0.5)
    .to(1, { position: new Vec3(0, 0, 0) })
    .start();
```

### 重复动画

```typescript
tween(this.node)
    .by(1, { position: new Vec3(0, 10, 0) })
    .by(1, { position: new Vec3(0, -10, 0) })
    .repeatForever()
    .start();
```

### 并行动画

```typescript
tween(this.node)
    .parallel(
        tween().to(1, { position: new Vec3(100, 0, 0) }),
        tween().to(1, { scale: new Vec3(2, 2, 2) }),
        tween().to(1, { eulerAngles: new Vec3(0, 360, 0) })
    )
    .start();
```

### 停止动画

```typescript
const t = tween(this.node)
    .to(2, { position: new Vec3(100, 0, 0) })
    .start();

t.stop();
```

### 克隆动画到多个目标

```typescript
const template = tween()
    .to(1, { position: new Vec3(100, 0, 0) })
    .to(1, { scale: new Vec3(2, 2, 2) });

template.clone(node1).start();
template.clone(node2).start();
template.clone(node3).start();
```

### 自定义缓动

```typescript
tween(this.node)
    .to(1, { position: new Vec3(100, 0, 0) }, {
        easing: 'elasticOut',
        onComplete: (target?: object) => {
        },
    })
    .start();
```

## 注意事项

- `to` 是过渡到绝对值，`by` 是相对变化量
- `tween` 的目标对象可以是 `Node`、`Component`、`Vec3` 等任意对象
- 对 `Vec3` 等值类型做 tween 时，修改的是对象本身而非节点的属性
- `repeat` 和 `repeatForever` 重复的是前一个动作
- 动画目标被销毁后，tween 会自动停止
- 不要在 `update` 中创建 tween，会导致动画堆积

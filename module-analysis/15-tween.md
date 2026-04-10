# Tween 缓动系统模块分析

## 模块作用

Tween 模块是 Cocos Creator 的缓动动画系统,提供简单易用的动画 API,用于创建平滑的过渡效果、UI 动画、对象移动等。它支持多种缓动函数、链式调用、并行执行等功能,是游戏动画开发的重要工具。

### 主要功能领域

1. **属性动画** - 节点属性的平滑过渡
2. **缓动函数** - 多种缓动曲线
3. **动画序列** - 链式动画和并行动画
4. **动画控制** - 暂停、恢复、停止
5. **回调函数** - 动画事件回调

## 设计理念

### 1. 链式调用设计

Tween 模块采用链式调用设计,提供流畅的 API 体验。

**链式调用:**
```typescript
tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) })
    .to(1.0, { scale: new Vec3(2, 2, 2) })
    .to(1.0, { rotation: new Quat(0, 0, 0, 1) })
    .call(() => console.log('Animation complete'))
    .start();
```

### 2. 缓动函数系统

Tween 模块提供丰富的缓动函数,实现不同的动画效果。

**缓动函数类型:**
- **Linear**: 线性
- **Quad**: 二次方
- **Cubic**: 三次方
- **Quart**: 四次方
- **Quint**: 五次方
- **Sine**: 正弦
- **Expo**: 指数
- **Circ**: 圆形
- **Elastic**: 弹性
- **Back**: 回弹
- **Bounce**: 弹跳

**缓动模式:**
- `easeIn`: 缓入
- `easeOut`: 缓出
- `easeInOut`: 缓入缓出

**使用示例:**
```typescript
tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) }, { easing: 'quadOut' })
    .to(1.0, { scale: new Vec3(2, 2, 2) }, { easing: 'elasticOut' })
    .start();
```

### 3. 动画序列系统

Tween 模块支持复杂的动画序列组合。

**序列类型:**
- **串行动画**: 按顺序执行
- **并行动画**: 同时执行
- **重复动画**: 循环执行

**串行序列:**
```typescript
tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) })
    .to(1.0, { position: new Vec3(10, 10, 0) })
    .to(1.0, { position: new Vec3(0, 10, 0) })
    .to(1.0, { position: new Vec3(0, 0, 0) })
    .start();
```

**并行序列:**
```typescript
tween(node)
    .parallel(
        tween().to(1.0, { position: new Vec3(10, 0, 0) }),
        tween().to(1.0, { scale: new Vec3(2, 2, 2) }),
        tween().to(1.0, { rotation: new Quat(0, 0, 0, 1) })
    )
    .start();
```

### 4. 动画控制

Tween 模块提供完整的动画控制功能。

**控制方法:**
```typescript
const t = tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) })
    .start();

// 暂停
t.pause();

// 恢复
t.resume();

// 停止
t.stop();

// 重新开始
t.restart();
```

### 5. 回调系统

Tween 模块支持动画过程中的回调函数。

**回调类型:**
- `call()`: 自定义回调
- `start()`: 动画开始回调
- `update()`: 动画更新回调
- `complete()`: 动画完成回调

**回调使用:**
```typescript
tween(node)
    .call(() => console.log('Start'))
    .to(1.0, { position: new Vec3(10, 0, 0) }, {
        onStart: () => console.log('Move start'),
        onUpdate: (target, ratio) => console.log('Progress:', ratio),
        onComplete: () => console.log('Move complete')
    })
    .call(() => console.log('End'))
    .start();
```

## 核心组件详解

### 1. Tween 缓动类

**职责:**
- 管理缓动动画
- 提供链式调用
- 控制动画播放

**关键方法:**
- `to()`: 绝对值动画
- `by()`: 相对值动画
- `call()`: 回调函数
- `delay()`: 延迟
- `parallel()`: 并行动画
- `sequence()`: 串行动画
- `repeat()`: 重复动画

### 2. TweenAction 缓动动作

**职责:**
- 执行单个缓动动作
- 计算插值
- 应用缓动函数

**关键属性:**
- `duration`: 持续时间
- `easing`: 缓动函数
- `properties`: 属性映射

### 3. TweenSystem 缓动系统

**职责:**
- 管理所有缓动动画
- 驱动动画更新
- 清理完成的动画

**关键方法:**
- `update()`: 更新所有动画
- `add()`: 添加动画
- `remove()`: 移除动画

## 代码示例

### 基本动画

```typescript
import { tween, Vec3 } from 'cc';

// 移动动画
tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) })
    .start();

// 缩放动画
tween(node)
    .to(1.0, { scale: new Vec3(2, 2, 2) })
    .start();

// 旋转动画
tween(node)
    .to(1.0, { rotation: new Quat(0, 0, 0, 1) })
    .start();

// 透明度动画
tween(node)
    .to(1.0, { opacity: 0 })
    .start();
```

### 复杂动画序列

```typescript
import { tween, Vec3 } from 'cc';

// 链式动画
tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) })
    .delay(0.5)
    .to(1.0, { position: new Vec3(10, 10, 0) })
    .delay(0.5)
    .to(1.0, { position: new Vec3(0, 10, 0) })
    .delay(0.5)
    .to(1.0, { position: new Vec3(0, 0, 0) })
    .start();

// 并行动画
tween(node)
    .parallel(
        tween().to(1.0, { position: new Vec3(10, 0, 0) }),
        tween().to(1.0, { scale: new Vec3(2, 2, 2) }),
        tween().to(1.0, { opacity: 0.5 })
    )
    .start();

// 重复动画
tween(node)
    .by(1.0, { rotation: new Quat(0, 0, 0, 1) })
    .repeatForever()
    .start();
```

### UI 动画

```typescript
import { tween, Vec3, Color } from 'cc';

// 按钮点击动画
function buttonClick(button: Node) {
    tween(button)
        .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
        .to(0.1, { scale: new Vec3(1, 1, 1) })
        .call(() => console.log('Clicked'))
        .start();
}

// 淡入淡出
function fadeIn(node: Node) {
    node.setScale(0, 0, 0);
    tween(node)
        .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
}

function fadeOut(node: Node) {
    tween(node)
        .to(0.3, { scale: new Vec3(0, 0, 0) }, { easing: 'backIn' })
        .call(() => node.destroy())
        .start();
}

// 颜色闪烁
function flash(node: Node) {
    const originalColor = node.getComponent(Sprite).color.clone();
    tween(node.getComponent(Sprite))
        .to(0.1, { color: Color.RED })
        .to(0.1, { color: originalColor })
        .repeat(3)
        .start();
}
```

### 自定义缓动

```typescript
import { tween, math } from 'cc';

// 自定义缓动函数
const customEasing = (t: number): number => {
    return math.pingPong(t * 2, 1);
};

tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) }, { easing: customEasing })
    .start();

// 使用内置缓动
tween(node)
    .to(1.0, { position: new Vec3(10, 0, 0) }, { easing: 'elasticOut' })
    .to(1.0, { scale: new Vec3(2, 2, 2) }, { easing: 'bounceOut' })
    .start();
```

## 模块关联

### 上游依赖

Tween 模块依赖:
- **Core**: 数学库、对象管理
- **Scene Graph**: 节点系统
- **Game**: 游戏循环驱动

### 下游依赖

Tween 模块被以下模块使用:
- **UI**: UI 动画
- **Game**: 游戏动画

## 性能优化策略

### 1. 对象池
- 复用 Tween 对象
- 减少内存分配

### 2. 批量更新
- 统一更新所有动画
- 减少遍历次数

### 3. 自动清理
- 自动移除完成的动画
- 避免内存泄漏

## 总结

Tween 模块是 Cocos Creator 缓动动画的核心,其设计体现了:

1. **链式调用**: 流畅的 API 设计
2. **缓动函数**: 丰富的缓动效果
3. **动画序列**: 支持复杂动画组合
4. **动画控制**: 完整的控制功能
5. **回调系统**: 灵活的事件处理

理解 Tween 模块的设计理念,对于创建流畅的游戏动画至关重要。

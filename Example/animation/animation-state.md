# AnimationState — 动画状态

## 概述

`AnimationState` 是动画播放状态的运行时表示，控制单个动画剪辑的播放参数（速度、权重、循环模式等）。通过 `Animation.getState()` 获取。

## 导入方式

```typescript
import { AnimationState, AnimationClip } from 'cc';
```

## 基础用法

### 获取动画状态

```typescript
const animation = node.getComponent(Animation);
const state = animation?.getState('run');
if (state) {
    state.speed = 1.5;
}
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `clip` | `AnimationClip` | 关联的动画剪辑（只读） |
| `name` | `string` | 动画名称（只读） |
| `duration` | `number` | 单次迭代时长 |
| `wrapMode` | `WrapMode` | 循环模式 |
| `repeatCount` | `number` | 重复次数（Infinity 为无限循环） |
| `delay` | `number` | 播放延迟（秒） |
| `speed` | `number` | 播放速度 |
| `time` | `number` | 当前累积时间 |
| `current` | `number` | 当前时间进度（只读） |
| `ratio` | `number` | 播放比例（只读） |
| `weight` | `number` | 动画权重（混合时使用） |
| `playbackRange` | `{ min, max }` | 播放范围（秒） |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `setTime` | `(time) => void` | 设置当前播放时间 |
| `sample` | `() => WrappedInfo` | 在当前时间采样 |

## 进阶用法

### 控制播放速度

```typescript
state.speed = 2.0;
state.speed = 0.5;
```

### 设置循环模式

```typescript
state.wrapMode = AnimationClip.WrapMode.LOOP;
state.repeatCount = Infinity;

state.wrapMode = AnimationClip.WrapMode.NORMAL;
state.repeatCount = 1;
```

### 播放范围控制

```typescript
state.playbackRange = { min: 0.5, max: 2.0 };
```

> 设置 `playbackRange` 后，动画只在指定时间范围内播放。

### 动画权重混合

```typescript
const idleState = animation.getState('idle');
const runState = animation.getState('run');

if (idleState && runState) {
    idleState.weight = 0.3;
    runState.weight = 0.7;
}
```

### 手动采样

```typescript
state.setTime(0.5);
state.sample();
```

### 延迟播放

```typescript
state.delay = 1.0;
```

## 注意事项

- `AnimationState` 不能直接创建，通过 `Animation.getState()` 获取
- `speed` 为负值时动画反向播放
- `weight` 用于动画混合，仅在多个动画同时播放时有效
- `repeatCount` 设为 `Infinity` 时动画无限循环
- `current` 和 `ratio` 是只读属性，通过 `setTime` 修改播放位置

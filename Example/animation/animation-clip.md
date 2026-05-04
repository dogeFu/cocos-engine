# AnimationClip — 动画剪辑

## 概述

`AnimationClip` 是动画数据资源，包含关键帧轨道、事件、时长等信息。一个 AnimationClip 可以被多个 Animation 组件引用。

## 导入方式

```typescript
import { AnimationClip, SpriteFrame } from 'cc';
```

## 基础用法

### 从精灵帧序列创建

```typescript
const clip = AnimationClip.createWithSpriteFrames(frames, 10);
clip.name = 'walk';
clip.wrapMode = AnimationClip.WrapMode.LOOP;
```

### 创建空动画剪辑

```typescript
const clip = new AnimationClip();
clip.name = 'custom';
clip.duration = 2.0;
clip.sample = 60;
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `duration` | `number` | 动画时长（秒） |
| `sample` | `number` | 采样率（fps），默认 60 |
| `speed` | `number` | 播放速度，默认 1 |
| `wrapMode` | `WrapMode` | 循环模式 |
| `tracksCount` | `number` | 轨道数量（只读） |
| `tracks` | `Iterable<Track>` | 轨道迭代器（只读） |
| `events` | `IEvent[]` | 动画事件 |
| `hash` | `number` | 哈希值（只读） |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `createWithSpriteFrames` | `(spriteFrames, sample) => AnimationClip` | 从精灵帧创建（静态） |
| `range` | `() => Range` | 获取轨道时间范围 |
| `getTrack` | `(index) => Track` | 获取轨道 |
| `addTrack` | `(track) => number` | 添加轨道 |
| `removeTrack` | `(index) => void` | 移除轨道 |
| `clearTracks` | `() => void` | 清除所有轨道 |

## WrapMode 枚举

| 值 | 说明 |
|-----|------|
| `NORMAL` | 正常播放一次 |
| `LOOP` | 循环播放 |
| `PING_PONG` | 来回播放 |
| `REVERSE` | 反向播放 |
| `LOOP_REVERSE` | 反向循环 |

## 进阶用法

### 动画事件

```typescript
clip.events = [
    {
        frame: 0.5,
        func: 'onStep',
        params: ['left'],
    },
    {
        frame: 1.0,
        func: 'onStep',
        params: ['right'],
    },
    {
        frame: clip.duration,
        func: 'onComplete',
        params: [],
    },
];
```

### 轨道操作

```typescript
const trackCount = clip.tracksCount;
for (let i = 0; i < trackCount; i++) {
    const track = clip.getTrack(i);
}

clip.removeTrack(0);
clip.clearTracks();
```

### 动态加载动画剪辑

```typescript
const bundle = assetManager.getBundle('resources');
bundle!.load<AnimationClip>('animations/run', AnimationClip, (err, clip) => {
    if (err) return;
    animation.addClip(clip);
    animation.play(clip.name);
});
```

## 注意事项

- `createWithSpriteFrames` 创建的剪辑包含 Sprite 的 `spriteFrame` 属性轨道
- `duration` 为 0 时动画不会播放
- `sample` 决定关键帧的采样精度
- 动画事件在指定帧触发，函数需要在组件中定义
- 修改 `events` 后需要重新设置才能生效

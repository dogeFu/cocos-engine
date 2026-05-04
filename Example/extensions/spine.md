# Spine — Spine 动画

## 概述

Spine 是专业的 2D 骨骼动画工具，Cocos Creator 通过 `sp` 命名空间提供 Spine 运行时支持。支持 Spine 3.8 和 4.2 版本。

## 导入方式

```typescript
import { sp } from 'cc';
```

## 基础用法

### 获取 Spine 组件

```typescript
const skeleton = node.getComponent(sp.Skeleton);
```

### 播放动画

```typescript
skeleton.setAnimation(0, 'walk', true);
skeleton.setAnimation(0, 'idle', true);
```

### 混合动画

```typescript
skeleton.addAnimation(0, 'run', true, 0.3);
skeleton.setAnimation(0, 'idle', true);
skeleton.addAnimation(0, 'walk', true, 0);
skeleton.addAnimation(0, 'run', true, 0.5);
```

## sp.Skeleton 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `skeletonData` | `sp.SkeletonData \| null` | 骨骼数据 |
| `defaultSkin` | `string` | 默认皮肤 |
| `defaultAnimation` | `string` | 默认动画 |
| `loop` | `boolean` | 循环播放 |
| `premultipliedAlpha` | `boolean` | 预乘 Alpha |
| `timeScale` | `number` | 时间缩放 |

## sp.Skeleton 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `setAnimation` | `(trackIndex, name, loop) => sp.TrackEntry` | 设置动画 |
| `addAnimation` | `(trackIndex, name, loop, delay?) => sp.TrackEntry` | 添加动画 |
| `setEmptyAnimation` | `(trackIndex, mixDuration) => sp.TrackEntry` | 设置空动画 |
| `clearTracks` | `() => void` | 清除所有轨道 |
| `clearTrack` | `(trackIndex) => void` | 清除指定轨道 |
| `setSkin` | `(name) => void` | 设置皮肤 |
| `setAttachment` | `(slotName, attachmentName) => void` | 设置附件 |
| `setToSetupPose` | `() => void` | 恢复初始姿态 |
| `getCurrent` | `(trackIndex) => sp.TrackEntry \| null` | 获取当前轨道 |

## 进阶用法

### 切换皮肤

```typescript
skeleton.setSkin('warrior');
skeleton.setToSetupPose();
```

### 切换附件

```typescript
skeleton.setAttachment('weapon', 'sword');
skeleton.setAttachment('weapon', 'bow');
```

### 动画事件

```typescript
skeleton.setEventListener((entry: sp.TrackEntry, event: sp.Event) => {
    switch (event.data.name) {
        case 'footstep':
            break;
        case 'attack':
            break;
    }
});
```

### 动画完成回调

```typescript
const entry = skeleton.setAnimation(0, 'attack', false);
if (entry) {
    entry.complete = () => {
        skeleton.setAnimation(0, 'idle', true);
    };
}
```

### 多轨道动画

```typescript
skeleton.setAnimation(0, 'run', true);
skeleton.setAnimation(1, 'shoot', false);
```

### 时间缩放

```typescript
skeleton.timeScale = 1.5;
skeleton.timeScale = 0.5;
```

## 注意事项

- Spine 版本需要与项目配置匹配（3.8 或 4.2）
- `setAnimation` 会替换当前轨道的动画，`addAnimation` 排队播放
- 切换皮肤后需要调用 `setToSetupPose` 刷新显示
- Spine 动画使用独立的渲染管线，与 Sprite/Label 不共享 Draw Call
- `sp` 命名空间需要启用 Spine 模块才能使用
- Spine 资源文件（.skel/.atlas/.png）需要正确导入

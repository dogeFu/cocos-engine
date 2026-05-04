# DragonBones — 龙骨动画

## 概述

DragonBones（龙骨）是 2D 骨骼动画解决方案，Cocos Creator 通过 `dragonBones` 命名空间提供运行时支持。

## 导入方式

```typescript
import { dragonBones } from 'cc';
```

## 基础用法

### 获取龙骨组件

```typescript
const armatureDisplay = node.getComponent(dragonBones.ArmatureDisplay);
```

### 播放动画

```typescript
armatureDisplay.playAnimation('walk', 0);
armatureDisplay.playAnimation('idle', -1);
```

## dragonBones.ArmatureDisplay 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `dragonAsset` | `DragonBonesAsset \| null` | 龙骨数据 |
| `dragonAtlasAsset` | `DragonBonesAtlasAsset \| null` | 图集数据 |
| `armatureName` | `string` | 骨架名称 |
| `animationName` | `string` | 动画名称 |
| `timeScale` | `number` | 时间缩放 |
| `playTimes` | `number` | 播放次数（-1 为无限） |

## dragonBones.ArmatureDisplay 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `playAnimation` | `(name, playTimes?) => dragonBones.AnimationState` | 播放动画 |
| `getArmature` | `() => dragonBones.Armature` | 获取骨架 |
| `factory` | `dragonBones.BaseFactory` | 龙骨工厂 |

## 进阶用法

### 动画事件

```typescript
armatureDisplay.on(dragonBones.EventObject.COMPLETE, (event: dragonBones.EventObject) => {
}, this);

armatureDisplay.on(dragonBones.EventObject.FRAME_EVENT, (event: dragonBones.EventObject) => {
    const name = event.name;
}, this);
```

### 切换动画

```typescript
armatureDisplay.playAnimation('attack', 1);

armatureDisplay.once(dragonBones.EventObject.COMPLETE, () => {
    armatureDisplay.playAnimation('idle', -1);
}, this);
```

### 时间缩放

```typescript
armatureDisplay.timeScale = 2.0;
armatureDisplay.timeScale = 0.5;
```

## 注意事项

- DragonBones 需要同时设置 `dragonAsset` 和 `dragonAtlasAsset`
- `playTimes` 为 0 表示播放一次，-1 表示无限循环
- DragonBones 与 Spine 是不同的动画系统，不能混用
- 龙骨资源文件（.dbbin/.json + .json 图集）需要正确导入
- `dragonBones` 命名空间需要启用 DragonBones 模块

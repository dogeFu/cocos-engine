# ParticleSystem — 3D 粒子系统

## 概述

`ParticleSystem` 是 3D 粒子系统组件，用于创建各种 3D 视觉效果。支持发射器形状、颜色/大小/速度随时间变化、力场、噪声、拖尾等模块化功能。

## 导入方式

```typescript
import { ParticleSystem, Node } from 'cc';
```

## 基础用法

### 播放/停止粒子

```typescript
const particle = node.getComponent(ParticleSystem);
if (particle) {
    particle.play();
    particle.pause();
    particle.stop();
    particle.clear();
}
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `capacity` | `number` | 最大粒子数 |
| `startColor` | `GradientRange` | 初始颜色 |
| `startSize3D` | `boolean` | 启用 3D 大小 |
| `startSizeX/Y/Z` | `CurveRange` | 各轴初始大小 |
| `startSpeed` | `CurveRange` | 初始速度 |
| `startRotation3D` | `boolean` | 启用 3D 旋转 |
| `startRotationX/Y/Z` | `CurveRange` | 各轴初始旋转 |
| `startDelay` | `CurveRange` | 发射延迟 |
| `startLifetime` | `CurveRange` | 粒子生命周期 |
| `duration` | `number` | 系统持续时间 |
| `loop` | `boolean` | 循环播放 |
| `prewarm` | `boolean` | 预热 |
| `simulationSpace` | `ParticleSpace` | 模拟空间 |
| `simulationSpeed` | `number` | 模拟速度 |
| `playOnAwake` | `boolean` | 自动播放 |
| `gravityModifier` | `CurveRange` | 重力影响 |
| `rateOverTime` | `CurveRange` | 时间发射率 |
| `rateOverDistance` | `CurveRange` | 距离发射率 |
| `bursts` | `Burst[]` | 爆发发射 |
| `isPlaying` | `boolean` | 是否播放中（只读） |
| `isPaused` | `boolean` | 是否暂停（只读） |
| `isStopped` | `boolean` | 是否停止（只读） |
| `time` | `number` | 模拟时间（只读） |

## 功能模块

| 模块属性 | 类型 | 说明 |
|----------|------|------|
| `shapeModule` | `ShapeModule` | 发射器形状 |
| `colorOverLifetimeModule` | `ColorOvertimeModule` | 颜色随时间变化 |
| `sizeOvertimeModule` | `SizeOvertimeModule` | 大小随时间变化 |
| `velocityOvertimeModule` | `VelocityOvertimeModule` | 速度随时间变化 |
| `forceOvertimeModule` | `ForceOvertimeModule` | 力随时间变化 |
| `limitVelocityOvertimeModule` | `LimitVelocityOvertimeModule` | 速度限制 |
| `rotationOvertimeModule` | `RotationOvertimeModule` | 旋转随时间变化 |
| `textureAnimationModule` | `TextureAnimationModule` | 纹理动画 |
| `noiseModule` | `NoiseModule` | 噪声 |
| `trailModule` | `TrailModule` | 拖尾 |

## ParticleSpace 枚举

| 值 | 说明 |
|-----|------|
| `LOCAL` | 本地空间 |
| `WORLD` | 世界空间 |

## 核心方法

| 方法 | 说明 |
|------|------|
| `play()` | 播放 |
| `pause()` | 暂停 |
| `stop()` | 停止并清除粒子 |
| `stopEmitting()` | 停止发射，已有粒子继续 |
| `clear()` | 清除所有粒子 |
| `getParticleCount()` | 获取当前粒子数 |

## 进阶用法

### 配置发射器形状

```typescript
const shape = particle.shapeModule;
if (shape) {
    shape.enable = true;
    shape.shapeType = ShapeType.Box;
    shape.position = new Vec3(0, 0, 0);
    shape.scale = new Vec3(1, 1, 1);
}
```

### 颜色渐变

```typescript
const colorModule = particle.colorOverLifetimeModule;
if (colorModule) {
    colorModule.enable = true;
    colorModule.color.mode = GradientRangeMode.GRADIENT;
}
```

### 爆发发射

```typescript
particle.bursts = [
    { time: 0, count: 20, cycles: 1, repeatInterval: 0.1 },
    { time: 1, count: 50, cycles: 3, repeatInterval: 0.5 },
];
```

### 粒子拖尾

```typescript
const trail = particle.trailModule;
if (trail) {
    trail.enable = true;
    trail.lifeTime = 0.5;
    trail.minVertexDistance = 0.1;
}
```

### 控制模拟速度

```typescript
particle.simulationSpeed = 2.0;
particle.simulationSpace = ParticleSpace.WORLD;
```

## 注意事项

- `capacity` 决定最大粒子数，值越大性能开销越高
- 粒子模块是懒加载的，首次访问时才创建
- `prewarm` 在播放前预模拟一帧，适合循环粒子
- `simulationSpace` 为 `WORLD` 时粒子不受父节点移动影响
- `stopEmitting` 停止发射但让已有粒子自然消亡，适合渐隐效果
- GPU 粒子和 CPU 粒子的模块支持不同

# PhysicsSystem2D — 2D 物理系统

## 概述

`PhysicsSystem2D` 是 2D 物理引擎的全局管理器，负责 2D 物理世界模拟、射线检测等。支持内置物理引擎和 Box2D 后端。

## 导入方式

```typescript
import { PhysicsSystem2D, Vec2 } from 'cc';
```

## 庺础用法

### 获取 2D 物理系统实例

```typescript
const physics2D = PhysicsSystem2D.instance;
```

### 射线检测

```typescript
const results = physics2D.raycast(new Vec2(0, 10), new Vec2(0, 0));
for (const result of results) {
    const point = result.point;
    const normal = result.normal;
    const collider = result.collider;
}
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `enable` | `boolean` | 启用/禁用 |
| `gravity` | `Vec2` | 全局重力 |
| `allowSleep` | `boolean` | 允许休眠 |
| `autoSimulation` | `boolean` | 自动模拟 |
| `fixedTimeStep` | `number` | 固定时间步长 |
| `velocityIterations` | `number` | 速度迭代次数 |
| `positionIterations` | `number` | 位置迭代次数 |
| `debugDrawFlags` | `number` | 调试绘制标志 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `raycast` | `(p1, p2, type?, mask?) => PhysicsRayCastResult2D[]` | 射线检测 |
| `step` | `(dt, deltaTime?) => void` | 手动步进 |
| `syncSceneToPhysics` | `() => void` | 同步到物理 |

## RayCastType 枚举

| 值 | 说明 |
|-----|------|
| `Closest` | 最近点 |
| `Any` | 任意点 |
| `AllClosest` | 所有最近点 |
| `All` | 所有点 |

## 进阶用法

### 修改重力

```typescript
PhysicsSystem2D.instance.gravity = new Vec2(0, -500);
PhysicsSystem2D.instance.gravity = new Vec2(0, 0);
```

### 精确射线检测

```typescript
const results = PhysicsSystem2D.instance.raycast(
    new Vec2(0, 0),
    new Vec2(100, 0),
    ERaycast2DType.Closest
);

if (results.length > 0) {
    const closest = results[0];
    const hitPoint = closest.point;
    const hitNormal = closest.normal;
    const hitCollider = closest.collider;
}
```

### 手动模拟

```typescript
PhysicsSystem2D.instance.autoSimulation = false;

update(dt: number) {
    PhysicsSystem2D.instance.step(1/60, dt);
}
```

### 调整迭代精度

```typescript
PhysicsSystem2D.instance.velocityIterations = 10;
PhysicsSystem2D.instance.positionIterations = 10;
```

> 迭代次数越高，物理模拟越精确，但性能开销也越大。

## 注意事项

- 2D 物理使用 `Vec2` 而非 `Vec3`
- 重力单位是像素/秒²，默认 (0, -320)
- `velocityIterations` 和 `positionIterations` 影响物理精度
- `raycast` 返回的结果数组可能为空
- Box2D 后端比内置物理引擎功能更完整

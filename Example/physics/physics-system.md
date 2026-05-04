# PhysicsSystem — 3D 物理系统

## 概述

`PhysicsSystem` 是 3D 物理引擎的全局管理器，负责物理世界模拟、射线检测、扫掠检测等。它是单例对象，通过 `PhysicsSystem.instance` 访问。

## 导入方式

```typescript
import { PhysicsSystem, geometry, Vec3, Layers } from 'cc';
```

## 基础用法

### 获取物理系统实例

```typescript
const physics = PhysicsSystem.instance;
```

### 射线检测

```typescript
const ray = new geometry.Ray();
ray.o.set(0, 10, 0);
ray.d.set(0, -1, 0);

if (physics.raycast(ray, 0xffffffff, 100)) {
    for (const result of physics.raycastResults) {
        const hitPoint = result.hitPoint;
        const hitNormal = result.hitNormal;
        const distance = result.distance;
        const collider = result.collider;
    }
}
```

### 最近点射线检测

```typescript
if (physics.raycastClosest(ray, 0xffffffff, 100)) {
    const result = physics.raycastClosestResult;
    const hitPoint = result.hitPoint;
    const hitNormal = result.hitNormal;
    const distance = result.distance;
}
```

## 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `enable` | `boolean` | 启用/禁用物理系统 |
| `allowSleep` | `boolean` | 允许自动休眠 |
| `maxSubSteps` | `number` | 每帧最大子步数 |
| `fixedTimeStep` | `number` | 固定时间步长（默认 1/60） |
| `gravity` | `Vec3` | 全局重力（默认 0,-10,0） |
| `sleepThreshold` | `number` | 休眠阈值 |
| `autoSimulation` | `boolean` | 自动模拟 |
| `defaultMaterial` | `PhysicsMaterial` | 默认物理材质 |
| `raycastClosestResult` | `PhysicsRayResult` | 最近射线检测结果 |
| `raycastResults` | `PhysicsRayResult[]` | 所有射线检测结果 |
| `debugDrawFlags` | `number` | 调试绘制标志 |

## 核心方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `raycast` | `(ray, mask?, maxDistance?, queryTrigger?) => boolean` | 射线检测 |
| `raycastClosest` | `(ray, mask?, maxDistance?, queryTrigger?) => boolean` | 最近点射线检测 |
| `sweepBox` | `(ray, halfExtent, orientation, mask?, ...) => boolean` | 盒体扫掠 |
| `sweepSphere` | `(ray, radius, mask?, ...) => boolean` | 球体扫掠 |
| `sweepCapsule` | `(ray, radius, height, orientation, ...) => boolean` | 胶囊体扫掠 |
| `step` | `(fixedTimeStep, deltaTime?, maxSubSteps?) => void` | 手动步进模拟 |
| `syncSceneToPhysics` | `() => void` | 同步场景变换到物理 |
| `emitEvents` | `() => void` | 触发碰撞事件 |
| `resetAccumulator` | `(time?) => void` | 重置时间累加器 |

## PhysicsGroup

```typescript
const group = PhysicsSystem.PhysicsGroup;
```

## 进阶用法

### 屏幕点击射线检测

```typescript
@ccclass('ClickDetector')
export class ClickDetector extends Component {
    @property({ type: Camera })
    public camera: Camera | null = null;

    start() {
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.camera) return;
        const location = event.getUILocation();
        const ray = new geometry.Ray();
        this.camera.screenPointToRay(location.x, location.y, ray);

        if (PhysicsSystem.instance.raycastClosest(ray)) {
            const result = PhysicsSystem.instance.raycastClosestResult;
            const hitNode = result.collider.node;
        }
    }
}
```

### 手动物理模拟

```typescript
PhysicsSystem.instance.autoSimulation = false;

update(dt: number) {
    PhysicsSystem.instance.step(1/60, dt, 3);
    PhysicsSystem.instance.syncSceneToPhysics();
    PhysicsSystem.instance.emitEvents();
}
```

### 修改全局重力

```typescript
PhysicsSystem.instance.gravity = new Vec3(0, -20, 0);
PhysicsSystem.instance.gravity = new Vec3(0, 0, 0);
```

### 扫掠检测

```typescript
const ray = new geometry.Ray();
ray.o.set(0, 5, 0);
ray.d.set(0, -1, 0);

const halfExtent = new Vec3(0.5, 0.5, 0.5);
const orientation = new Quat();

if (PhysicsSystem.instance.sweepBox(ray, halfExtent, orientation, 0xffffffff, 100)) {
}
```

## 注意事项

- `autoSimulation` 默认为 `true`，引擎自动每帧模拟物理
- `fixedTimeStep` 影响物理模拟精度，值越小越精确但开销越大
- `maxSubSteps` 限制每帧最大子步数，防止帧率过低时物理爆炸
- 射线检测的 `mask` 参数用于过滤碰撞层级
- `queryTrigger` 参数控制是否检测 Trigger 碰撞体
- 关闭 `autoSimulation` 后需要手动调用 `step` 和 `emitEvents`
